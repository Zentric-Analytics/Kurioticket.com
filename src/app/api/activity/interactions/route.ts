import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { getOptionalPrisma } from "@/lib/prisma";
import { readBoundedJsonBody } from "@/lib/bounded-json-body";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isSameOriginRequest } from "@/lib/visitor-identity";
import { withEnvironmentMetadata } from "@/lib/stagingSafety";
import { lockConsentedVisitor } from "@/services/visitorActivityIdentity";
import { resolveRequestActivityIdentity } from "@/services/requestActivityIdentity";

export const runtime = "nodejs";

const payloadSchema = z.object({
  action: z.enum(["local_saved", "local_unsaved", "share_link_copied", "share_sheet_completed"]),
  product: z.enum(["FLIGHT", "HOTEL", "CAR"]),
  resultId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9._:-]+$/),
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
      await tx.analyticsEvent.create({ data: {
        userId: identity.userId, visitorId: identity.visitorId,
        type, name,
        metadata: withEnvironmentMetadata({
          product: parsed.data.product,
          resultId: parsed.data.resultId,
          eventId: parsed.data.eventId,
          outcome: "client_confirmed",
          applicationSource: identity.applicationSource,
        }) as Prisma.InputJsonValue,
      } });
      return true;
    });
    return json({ accepted: recorded });
  } catch {
    return json({ accepted: false }, 503);
  }
}
