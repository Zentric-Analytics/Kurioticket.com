import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalPrisma } from "@/lib/prisma";
import { readBoundedJsonBody } from "@/lib/bounded-json-body";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isSameOriginRequest, isNativeVisitorRequest } from "@/lib/visitor-identity";
import { isPageViewKey, pageViewInfo } from "@/lib/pageViewCatalog";
import { getPublicEnvironment, withEnvironmentMetadata } from "@/lib/stagingSafety";
import { lockConsentedVisitor } from "@/services/visitorActivityIdentity";
import { resolveRequestActivityIdentity } from "@/services/requestActivityIdentity";

export const runtime = "nodejs";
const schema = z.object({
  eventId: z.string().uuid(),
  pageKey: z.string().refine(isPageViewKey),
  previousPageKey: z.string().refine(isPageViewKey).optional(),
}).strict();
const json = (body: unknown, status = 202) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store" },
});

/** Optional first-party navigation observations, never operational tracking.
 * Route names come from a closed catalogue. No URL parameters or user IDs.
 */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return json({ accepted: false }, 403);
  const limit = checkRateLimit("page-view:" + getClientIp(request), 90, 60_000);
  if (!limit.allowed) return json({ accepted: false }, 429);
  const parsed = schema.safeParse(await readBoundedJsonBody(request, 512).catch(() => null));
  if (!parsed.success) return json({ accepted: false }, 400);
  const identity = await resolveRequestActivityIdentity(request);
  if (!identity.visitorId) return json({ accepted: false });
  const page = pageViewInfo(parsed.data.pageKey);
  if (!page) return json({ accepted: false }, 400);
  const native = isNativeVisitorRequest(request);
  const declaredPlatform = request.headers.get("x-mobile-platform");
  // Guest native OS and web device class are reported transport attributes,
  // not device attestation or authorization. Never collect raw user-agent.
  const source = identity.applicationSource;
  const platform = source === "IOS" ? "iOS app" : source === "ANDROID" ? "Android app"
    : native ? declaredPlatform === "ios" ? "iOS app (reported)" : declaredPlatform === "android" ? "Android app (reported)" : "Native app"
    : request.headers.get("sec-ch-ua-mobile") === "?1" || /Mobile|Android|iPhone|iPad/i.test(request.headers.get("user-agent") ?? "")
      ? "Mobile web (reported)" : "Website";
  try {
    const db = getOptionalPrisma();
    if (!db) return json({ accepted: false }, 503);
    const accepted = await db.$transaction(async tx => {
      // The existing visitor row lock serializes duplicate event IDs and
      // rechecks account ownership and consent against concurrent withdrawal.
      if (!await lockConsentedVisitor(tx, identity.visitorId!, identity.userId)) return false;
      const existing = await tx.analyticsEvent.findFirst({
        where: { visitorId: identity.visitorId, userId: identity.userId, type: "PAGE_VIEW",
          AND: [{ metadata: { path: ["eventId"], equals: parsed.data.eventId } },
            { metadata: { path: ["environment"], equals: getPublicEnvironment() } }] },
        select: { metadata: true },
      });
      if (existing) {
        const meta = existing.metadata as { pageKey?: unknown } | null;
        return meta?.pageKey === parsed.data.pageKey;
      }
      await tx.analyticsEvent.create({ data: {
        type: "PAGE_VIEW", name: "page_viewed", userId: identity.userId, visitorId: identity.visitorId,
        metadata: withEnvironmentMetadata({
          eventId: parsed.data.eventId, pageKey: parsed.data.pageKey,
          ...(parsed.data.previousPageKey ? { previousPageKey: parsed.data.previousPageKey } : {}),
          transport: native ? "native" : "web", platform,
          ...(page.product ? { product: page.product } : {}),
        }),
      } });
      return true;
    });
    return json({ accepted });
  } catch { return json({ accepted: false }, 503); }
}
