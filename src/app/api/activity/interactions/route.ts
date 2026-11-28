import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { getOptionalPrisma } from "@/lib/prisma";
import { readBoundedJsonBody } from "@/lib/bounded-json-body";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isNativeVisitorRequest, isSameOriginRequest } from "@/lib/visitor-identity";
import { getPublicEnvironment, withEnvironmentMetadata } from "@/lib/stagingSafety";
import { lockConsentedVisitor } from "@/services/visitorActivityIdentity";
import { resolveObservedActivityIdentity } from "@/services/requestActivityIdentity";
import { matchesInteractionSearch } from "@/lib/verifiedInteractionSearch";
import { customerObservedPlatform, customerPageProvenance, optionalAnalyticsPurpose } from "@/lib/activityTrackingContract";
import { dealsPackageModes } from "@/lib/deals/dealsSearchParams";

export const runtime = "nodejs";

const resultInteractionSchema = z.object({
  action: z.enum(["local_saved", "local_unsaved", "saved_item_confirmed", "saved_item_removed", "share_link_copied", "share_sheet_completed", "share_sheet_requested"]),
  product: z.enum(["FLIGHT", "HOTEL", "CAR"]),
  resultId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9._:-]+$/),
  requestId: z.string().uuid().optional(),
  eventId: z.string().uuid(),
  observedResult: z.object({
    label: z.string().trim().min(1).max(120).regex(/^[^\u0000-\u001f\u007f<>]+$/),
    provider: z.string().trim().min(1).max(100).regex(/^[^\u0000-\u001f\u007f<>]+$/),
    amount: z.number().finite().positive().max(1_000_000_000),
    currency: z.string().regex(/^[A-Z]{3}$/),
    priceBasis: z.enum(["total", "per_night", "per_day"]),
    totalAmount: z.number().finite().positive().max(1_000_000_000).optional(),
  }).strict().optional(),
}).strict();
const payloadSchema = z.union([resultInteractionSchema, z.object({
  action: z.literal("package_search_submitted"),
  mode: z.enum(dealsPackageModes),
  eventId: z.string().uuid(),
}).strict()]);
const json = (body: unknown, status = 202) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store" },
});
const metadataRecord = (value: unknown) => value && typeof value === "object" && !Array.isArray(value)
  ? value as Record<string, unknown> : {};

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
  const event = parsed.data;
  const eventId = event.eventId.toLowerCase();
  const native = isNativeVisitorRequest(request);
  if (event.action === "package_search_submitted" && native) return json({ accepted: false }, 400);
  if (event.action === "share_sheet_requested" && (
    request.headers.get("x-mobile-platform")?.trim().toLowerCase() !== "android" ||
    !/^[a-f0-9]{64}$/.test(event.resultId) || event.observedResult
  )) return json({ accepted: false }, 400);
  const identity = await resolveObservedActivityIdentity(request);
  // A guest or account without explicit, valid analytics visitor consent
  // produces no optional interaction activity.
  if (!identity.visitorId) return json({ accepted: false });
  if (event.action === "share_sheet_requested" && identity.applicationSource === "IOS") return json({ accepted: false }, 400);
  const name = event.action;
  const type = name === "package_search_submitted" ? "SEARCH" : name.startsWith("share_") ? "SHARE" : "SAVE";
  const environment = getPublicEnvironment();
  const platform = customerObservedPlatform(request, native, identity.applicationSource);
  try {
    const db = getOptionalPrisma();
    if (!db) return json({ accepted: false }, 503);
    const recorded = await db.$transaction(async tx => {
      if (!await lockConsentedVisitor(tx, identity.visitorId!, identity.userId, { requireExclusiveLink: true })) return { accepted: false };
      // Retry-safe by matching the same per-action UUID within its owner's
      // recorded metadata. Never reinterpret a conflicting ID as a new action.
      const existing = await tx.analyticsEvent.findFirst({
        where: {
          visitorId: identity.visitorId, userId: identity.userId,
          AND: [
            { metadata: { path: ["eventId"], equals: eventId } },
            { metadata: { path: ["environment"], equals: environment } },
          ],
        },
        select: { id: true, name: true, type: true, metadata: true },
      });
      const priorMetadata = metadataRecord(existing?.metadata);
      if (existing && (existing.name !== name || existing.type !== type)) return { accepted: false };
      if (event.action === "package_search_submitted") {
        if (existing) return { accepted: priorMetadata.mode === event.mode };
        // The guided form submits once, then requests product inventory in
        // separate stages. This observation makes no claim about supplier execution.
        await tx.analyticsEvent.create({ data: {
          userId: identity.userId, visitorId: identity.visitorId, type, name,
          metadata: withEnvironmentMetadata({
            ...customerPageProvenance(identity.userId), recordPurpose: optionalAnalyticsPurpose,
            product: "PACKAGE", mode: event.mode, eventId,
            applicationSource: identity.applicationSource, platform, outcome: "submitted",
          }) as Prisma.InputJsonValue,
        } });
        return { accepted: true };
      }
      const requestId = event.requestId?.toLowerCase();
      // A commitment allows enrichment of the same occurrence without saving
      // an unverified search pointer. Only a verified match can create a link.
      const pendingSearchReference = requestId
        ? createHash("sha256").update(`interaction-search:${requestId}`).digest("hex") : undefined;
      if (existing) {
        if (priorMetadata.resultId !== event.resultId || priorMetadata.product !== event.product) return { accepted: false };
        if (!priorMetadata.pendingSearchReference) return { accepted: true };
        if (priorMetadata.pendingSearchReference !== pendingSearchReference) return { accepted: false };
      }
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
              { metadata: { path: ["resultId"], equals: event.resultId } },
              { metadata: { path: ["product"], equals: event.product } },
              { metadata: { path: ["environment"], equals: environment } },
            ],
          },
          select: { id: true, metadata: true },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }) : null;
      if (isConfirmedAccountAction && !confirmedAudit) return { accepted: false };
      if (confirmedAudit) {
        // A confirmed mutation is a single observed save/remove. Replayed
        // browser reports must not create a second journey step.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('journey-saved-audit'), hashtext(${confirmedAudit.id}))`;
        const alreadyLinked = await tx.journeyEvent.findUnique({
          where: { eventKey: "saved-audit:" + confirmedAudit.id },
          select: { id: true },
        });
        if (alreadyLinked) return { accepted: true };
      }
      // Search provenance must be established on the server. A client-supplied
      // request UUID alone does not establish journey ownership or a save/share
      // for another user's search. Missing/invalid links stay in account history.
      let verifiedLink: { linkedJourneyId: string; linkedSearchHistoryId: string; linkedRequestId: string } | null = null;
      let retryable = false;
      if (requestId) {
        const search = await tx.searchHistory.findUnique({
          where: { requestId },
          select: { id: true, visitorId: true, userId: true, type: true, query: true, createdAt: true },
        });
        retryable = !search;
        if (search && matchesInteractionSearch(search, identity, event.product, environment, new Date())) {
          const candidates = await tx.journeyEvent.findMany({
            where: { type: "SEARCH_COMPLETED", searchHistoryId: search.id,
              journey: { visitorId: identity.visitorId! },
              metadata: { path: ["environment"], equals: environment },
            },
            select: { journeyId: true },
            distinct: ["journeyId"],
            take: 2,
          });
          // A search linked to more than one journey is ambiguous; fail closed.
          retryable = candidates.length === 0;
          if (candidates.length === 1) verifiedLink = {
            linkedJourneyId: candidates[0].journeyId,
            linkedSearchHistoryId: search.id,
            linkedRequestId: requestId,
          };
        }
      }
      if (existing && (verifiedLink || !retryable)) {
        const metadata: Record<string, unknown> = { ...priorMetadata, ...verifiedLink };
        delete metadata.pendingSearchReference;
        await tx.analyticsEvent.update({ where: { id: existing.id }, data: { metadata: metadata as Prisma.InputJsonValue } });
      } else if (!existing && !isConfirmedAccountAction) {
        await tx.analyticsEvent.create({ data: {
          userId: identity.userId, visitorId: identity.visitorId,
          type, name,
          metadata: withEnvironmentMetadata({
            ...customerPageProvenance(identity.userId), recordPurpose: optionalAnalyticsPurpose,
            product: event.product,
            resultId: event.resultId,
            eventId,
            ...(verifiedLink ?? {}),
            ...(retryable && pendingSearchReference ? { pendingSearchReference } : {}),
            outcome: name === "share_sheet_requested" ? "requested" : "client_confirmed",
            applicationSource: identity.applicationSource, platform,
            ...(event.observedResult ? { observedResult: event.observedResult, observedSource: "customer_display" } : {}),
          }) as Prisma.InputJsonValue,
        } });
      } else if (verifiedLink && confirmedAudit) {
        // Link the original mutation evidence instead of writing a duplicate
        // SAVE analytic event that would inflate account activity counts.
        const metadata = metadataRecord(confirmedAudit.metadata);
        await tx.analyticsEvent.update({
          where: { id: confirmedAudit.id },
          data: { metadata: { ...metadata, ...verifiedLink, eventId,
            ...(event.observedResult ? { observedResult: event.observedResult, observedSource: "customer_display" } : {}) } as Prisma.InputJsonValue },
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
            eventKey: confirmedAudit ? "saved-audit:" + confirmedAudit.id : "interaction:" + eventId,
            type: stage,
            product: event.product,
            metadata: withEnvironmentMetadata({
              ...customerPageProvenance(identity.userId),
              action: name,
              applicationSource: identity.applicationSource,
              platform,
              resultId: event.resultId,
              interactionEventId: eventId,
              requestId: verifiedLink.linkedRequestId,
              ...(event.observedResult ? { observedResult: event.observedResult, observedSource: "customer_display" } : {}),
            }) as Prisma.InputJsonValue,
          },
        });
      }
      return { accepted: !isConfirmedAccountAction || !retryable, ...(retryable ? { retryable: true } : {}) };
    });
    return json(recorded);
  } catch {
    return json({ accepted: false }, 503);
  }
}
