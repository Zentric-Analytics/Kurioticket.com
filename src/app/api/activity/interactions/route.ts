import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { getOptionalPrisma } from "@/lib/prisma";
import { readBoundedJsonBody } from "@/lib/bounded-json-body";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isSameOriginRequest } from "@/lib/visitor-identity";
import { getPublicEnvironment, withEnvironmentMetadata } from "@/lib/stagingSafety";
import { lockConsentedVisitor } from "@/services/visitorActivityIdentity";
import { resolveRequestActivityIdentity } from "@/services/requestActivityIdentity";
import { matchesInteractionSearch } from "@/lib/verifiedInteractionSearch";

export const runtime = "nodejs";

const payloadSchema = z.object({
  action: z.enum(["local_saved", "local_unsaved", "saved_item_confirmed", "saved_item_removed", "share_link_copied", "share_sheet_completed"]),
  product: z.enum(["FLIGHT", "HOTEL", "CAR"]),
  resultId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9._:-]+$/),
  requestId: z.string().uuid().optional(),
  eventId: z.string().uuid(),
}).strict();
const json = (body: unknown, status = 202) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store" },
});

/** Optional, consent-gated records only. Never promote a local favorite to a
 * durable account save, nor infer the destination of a native share sheet.
 * The server derives identity and environment; clients supply no user IDs.
 */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return json({ error: "Invalid request origin." }, 403);
  const limit = checkRateLimit("activity-interaction:" + getClientIp(request), 40, 60_000);
  if (!limit.allowed) return json({ accepted: false }, 429);
  const parsed = payloadSchema.safeParse(await readBoundedJsonBody(request, 1024).catch(() => null));
  if (!parsed.success) return json({ error: "Invalid interaction event." }, 400);
  const identity = await resolveRequestActivityIdentity(request);
  // A guest or account without explicit, valid analytics visitor consent
  // produces no optional interaction activity.
  if (!identity.visitorId) return json({ accepted: false });
  const name = parsed.data.action;
  const type = name.startsWith("share_") ? "SHARE" as const : "SAVE" as const;
  try {
    const db = getOptionalPrisma();
    if (!db) return json({ accepted: false }, 503);
    const recorded = await db.$transaction(async tx => {
      if (!await lockConsentedVisitor(tx, identity.visitorId!, identity.userId)) return false;
      // Retry-safe by matching the same per-action UUID within its owner's
      // recorded metadata. Never reinterpret a conflicting ID as a new action.
      const existing = await tx.analyticsEvent.findFirst({
        where: {
          visitorId: identity.visitorId, userId: identity.userId,
          metadata: { path: ["eventId"], equals: parsed.data.eventId },
        },
        select: { id: true },
      });
      if (existing) return true;
      const isConfirmedAccountAction = name === "saved_item_confirmed" || name === "saved_item_removed";
      // Account-save confirmations come from the saved-item mutation service.
      // Do not accept a client's assertion of success without its matching
      // server-written, recent and owner-scoped save audit evidence.
      const confirmedAudit = isConfirmedAccountAction && identity.userId
        ? await tx.analyticsEvent.findFirst({
          where: {
            userId: identity.userId, type: "SAVE", name,
            createdAt: { gte: new Date(Date.now() - 60_000) },
            AND: [
              { metadata: { path: ["resultId"], equals: parsed.data.resultId } },
              { metadata: { path: ["product"], equals: parsed.data.product } },
              { metadata: { path: ["environment"], equals: getPublicEnvironment() } },
            ],
          },
          select: { id: true, metadata: true },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }) : null;
      if (isConfirmedAccountAction && !confirmedAudit) return false;
      // Search provenance must be established on the server. A client-supplied
      // request UUID alone does not establish journey ownership or a save/share
      // for another user's search. Missing/invalid links stay in account history.
      let verifiedLink: { linkedJourneyId: string; linkedSearchHistoryId: string; linkedRequestId: string } | null = null;
      if (parsed.data.requestId) {
        const search = await tx.searchHistory.findUnique({
          where: { requestId: parsed.data.requestId },
          select: { id: true, visitorId: true, userId: true, type: true, query: true, createdAt: true },
        });
        if (matchesInteractionSearch(search, identity, parsed.data.product, getPublicEnvironment(), new Date())) {
          const candidates = await tx.journeyEvent.findMany({
            where: { type: "SEARCH_COMPLETED", searchHistoryId: search.id,
              journey: { visitorId: identity.visitorId! },
              metadata: { path: ["environment"], equals: getPublicEnvironment() },
            },
            select: { journeyId: true },
            distinct: ["journeyId"],
            take: 2,
          });
          // A search linked to more than one journey is ambiguous; fail closed.
          if (candidates.length === 1) verifiedLink = {
            linkedJourneyId: candidates[0].journeyId,
            linkedSearchHistoryId: search.id,
            linkedRequestId: parsed.data.requestId,
          };
        }
      }
      if (!isConfirmedAccountAction) {
        await tx.analyticsEvent.create({ data: {
          userId: identity.userId, visitorId: identity.visitorId,
          type, name,
          metadata: withEnvironmentMetadata({
            product: parsed.data.product,
            resultId: parsed.data.resultId,
            eventId: parsed.data.eventId,
            ...(verifiedLink ?? {}),
            outcome: "client_confirmed",
            applicationSource: identity.applicationSource,
          }) as Prisma.InputJsonValue,
        } });
      } else if (verifiedLink && confirmedAudit) {
        // Link the original mutation evidence instead of writing a duplicate
        // SAVE analytic event that would inflate account activity counts.
        const metadata = confirmedAudit.metadata && typeof confirmedAudit.metadata === "object"
          && !Array.isArray(confirmedAudit.metadata)
          ? confirmedAudit.metadata as Record<string, unknown> : {};
        await tx.analyticsEvent.update({
          where: { id: confirmedAudit.id },
          data: { metadata: { ...metadata, ...verifiedLink, eventId: parsed.data.eventId } as Prisma.InputJsonValue },
        });
      }
      if (verifiedLink) {
        // Exactly the same verified canonical search powers the journey event.
        // Never create a journey stage for an uncorrelated result or other owner.
        const stage = name === "local_saved" || name === "saved_item_confirmed" ? "RESULT_SAVED"
          : name === "local_unsaved" || name === "saved_item_removed" ? "RESULT_UNSAVED" : "RESULT_SHARED";
        await tx.journeyEvent.create({
          data: {
            journeyId: verifiedLink.linkedJourneyId,
            searchHistoryId: verifiedLink.linkedSearchHistoryId,
            eventKey: confirmedAudit ? "saved-audit:" + confirmedAudit.id : "interaction:" + parsed.data.eventId,
            type: stage,
            product: parsed.data.product,
            metadata: withEnvironmentMetadata({
              action: name,
              resultId: parsed.data.resultId,
              interactionEventId: parsed.data.eventId,
              requestId: verifiedLink.linkedRequestId,
            }) as Prisma.InputJsonValue,
          },
        });
      }
      return true;
    });
    return json({ accepted: recorded });
  } catch {
    return json({ accepted: false }, 503);
  }
}
