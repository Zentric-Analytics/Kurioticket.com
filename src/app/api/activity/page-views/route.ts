import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { customerPageProvenance, optionalAnalyticsPurpose } from "@/lib/activityTrackingContract";
import { matchesInteractionSearch } from "@/lib/verifiedInteractionSearch";
import { z } from "zod";
import { getOptionalPrisma } from "@/lib/prisma";
import { readBoundedJsonBody } from "@/lib/bounded-json-body";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isSameOriginRequest, isNativeVisitorRequest } from "@/lib/visitor-identity";
import { isPageViewKey, pageViewInfo, pageViewCanLink } from "@/lib/pageViewCatalog";
import { getPublicEnvironment, withEnvironmentMetadata } from "@/lib/stagingSafety";
import { lockConsentedVisitor } from "@/services/visitorActivityIdentity";
import { consentedGuestAccessObservation } from "@/lib/guestAccessObservation";
import { resolveRequestActivityIdentity } from "@/services/requestActivityIdentity";

export const runtime = "nodejs";
const schema = z.object({
  eventId: z.string().uuid(),
  pageKey: z.string().refine(isPageViewKey),
  previousPageKey: z.string().refine(isPageViewKey).optional(),
  requestId: z.string().uuid().optional(),
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
  if (!(native ? page.nativePath : page.webPath)) return json({ accepted: false }, 400);
  const previousPage = pageViewInfo(parsed.data.previousPageKey);
  if (parsed.data.previousPageKey && !(native ? previousPage?.nativePath : previousPage?.webPath)) {
    return json({ accepted: false }, 400);
  }
  const declaredPlatform = request.headers.get("x-mobile-platform");
  // Guest native OS and web device class are reported transport attributes,
  // not device attestation or authorization. Never collect raw user-agent.
  const source = identity.applicationSource;
  const platform = source === "IOS" ? "iOS app" : source === "ANDROID" ? "Android app"
    : native ? declaredPlatform === "ios" ? "iOS app (reported)" : declaredPlatform === "android" ? "Android app (reported)" : "Native app"
    : request.headers.get("sec-ch-ua-mobile") === "?1" || /Mobile|Android|iPhone|iPad/i.test(request.headers.get("user-agent") ?? "")
      ? "Mobile web (reported)" : request.headers.get("sec-ch-ua-mobile") === "?0" || /Windows|Macintosh|X11|Linux/i.test(request.headers.get("user-agent") ?? "") ? "Desktop web (reported)" : "Website";
  try {
    const db = getOptionalPrisma();
    if (!db) return json({ accepted: false }, 503);
    const accepted = await db.$transaction(async tx => {
      // The existing visitor row lock serializes duplicate event IDs and
      // rechecks account ownership and consent against concurrent withdrawal.
      // Page readers require an exclusively linked Visitor for registered
      // events. Normal clients confirm the link before enabling capture.
      if (!await lockConsentedVisitor(tx, identity.visitorId!, identity.userId, { requireExclusiveLink: true })) {
        return { accepted: false, retryable: false };
      }
      // Match the existing expression index while keeping lookup scoped to the
      // authenticated Visitor and this deployment.
      const [existing] = await tx.$queryRaw<Array<{ id: string; userId: string | null; metadata: unknown }>>`
        SELECT "id", "userId", "metadata" FROM "AnalyticsEvent"
        WHERE "metadata"->>'eventId' = ${parsed.data.eventId}
          AND "visitorId" = ${identity.visitorId} AND "type" = 'PAGE_VIEW'
          AND "metadata"->>'environment' = ${getPublicEnvironment()}
      `;
      const meta = existing?.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
        ? existing.metadata as Record<string, unknown> : null;
      // The same occurrence can never move to a new actor during sign-in.
      if (existing && (existing.userId !== identity.userId || meta?.pageKey !== parsed.data.pageKey
        || meta?.transport !== (native ? "native" : "web"))) return { accepted: false, retryable: false };
      let verifiedLink: { linkedJourneyId: string; linkedSearchHistoryId: string } | null = null;
      // Only an explicit, current search response/reference can link a product
      // results or details view. A support visit or guessed latest search cannot.
      if (parsed.data.requestId && page.product && pageViewCanLink(parsed.data.pageKey) && !meta?.linkedJourneyId) {
        const search = await tx.searchHistory.findUnique({
          where: { requestId: parsed.data.requestId.toLowerCase() },
          select: { id: true, visitorId: true, userId: true, type: true, query: true, createdAt: true },
        });
        if (search && matchesInteractionSearch(search, identity, page.product, getPublicEnvironment(), new Date())) {
          const candidates = await tx.journeyEvent.findMany({
            where: { type: "SEARCH_COMPLETED", searchHistoryId: search.id,
              journey: { visitorId: identity.visitorId! },
              metadata: { path: ["environment"], equals: getPublicEnvironment() } },
            select: { journeyId: true }, distinct: ["journeyId"], take: 2,
          });
          if (candidates.length === 1) verifiedLink = { linkedJourneyId: candidates[0].journeyId, linkedSearchHistoryId: search.id };
        }
      }
      if (existing) {
        if (verifiedLink) await tx.analyticsEvent.update({
          where: { id: existing.id },
          data: { metadata: { ...meta, ...verifiedLink } as Prisma.InputJsonValue },
        });
        return { accepted: true, retryable: Boolean(parsed.data.requestId && pageViewCanLink(parsed.data.pageKey) && !meta?.linkedJourneyId && !verifiedLink) };
      }
      // Optional device evidence is captured only for a newly accepted, consented guest visit.
      // It does not create a new event, credential, or authenticated session.
      // New optional descriptive fields are staging-only until the privacy/retention review.
      const guestAccess = !identity.userId && getPublicEnvironment() === "staging"
        ? consentedGuestAccessObservation(request, platform, native ? "native" : "web") : undefined;
      await tx.analyticsEvent.create({ data: {
        type: "PAGE_VIEW", name: "page_viewed", userId: identity.userId, visitorId: identity.visitorId,
        metadata: withEnvironmentMetadata({
          recordPurpose: optionalAnalyticsPurpose,
          ...customerPageProvenance(identity.userId),
          eventId: parsed.data.eventId, pageKey: parsed.data.pageKey,
          ...(parsed.data.previousPageKey ? { previousPageKey: parsed.data.previousPageKey } : {}),
          transport: native ? "native" : "web", platform,
          ...(guestAccess ? { guestAccess } : {}),
          ...(page.product ? { product: page.product } : {}),
          ...(verifiedLink ?? {}),
        }) as Prisma.InputJsonValue,
      } });
      return { accepted: true, retryable: Boolean(parsed.data.requestId && pageViewCanLink(parsed.data.pageKey) && !verifiedLink) };
    });
    return json(accepted);
  } catch (error) {
    // The existing unique expression index also rejects collisions outside the
    // verified Visitor scope. Expose neither the other row nor its identity.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return json({ accepted: false, retryable: false }, 409);
    }
    return json({ accepted: false }, 503);
  }
}
