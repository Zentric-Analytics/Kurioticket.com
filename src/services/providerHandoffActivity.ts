import { withOptionalDb } from "@/lib/prisma";
import { trackAnalyticsEvent } from "@/services/analyticsService";
import { resolveRequestActivityIdentity } from "@/services/requestActivityIdentity";
import { journeyEventKey, recordJourneyEvent } from "@/services/searchJourneyService";

export type ProviderHandoffActivity = {
  type: "flight" | "hotel";
  provider: string;
  route?: string;
  price?: number;
  currency?: string;
  destinationUrl: string;
  sourcePage: string;
  resultId: string;
};
type AttributedHandoff = ProviderHandoffActivity & { userId: string | null; visitorId: string | null };
type ActivityDependencies = {
  identity: typeof resolveRequestActivityIdentity;
  redirect: (input: AttributedHandoff) => Promise<unknown>;
  event: typeof trackAnalyticsEvent;
  journey?: typeof recordJourneyEvent;
};

const dependencies: ActivityDependencies = {
  identity: resolveRequestActivityIdentity,
  redirect: (input) => withOptionalDb(async (db) => {
    const redirectLog = await db.redirectLog.create({ data: {
      userId: input.userId,
      visitorId: input.visitorId,
      type: input.type === "flight" ? "FLIGHT" : "HOTEL",
      provider: input.provider,
      route: input.route,
      price: input.price,
      currency: input.currency,
      destinationUrl: input.destinationUrl,
      userType: input.userId ? "user" : "guest",
      sourcePage: input.sourcePage,
      metadata: { resultId: input.resultId },
    } });
    return redirectLog.id;
  }, null),
  event: trackAnalyticsEvent,
  journey: recordJourneyEvent,
};

/** Schedule only after a verified provider URL is ready; this does not confirm a booking. */
export async function recordProviderHandoffActivity(
  request: Request,
  input: ProviderHandoffActivity,
  record: ActivityDependencies = dependencies,
) {
  const identity = await record.identity(request).catch(() => ({ userId: null, visitorId: null }));
  const [redirect] = await Promise.allSettled([
    record.redirect({ ...input, ...identity }),
    record.event({
      ...identity,
      type: "REDIRECT",
      name: `${input.type}_partner_redirect`,
      metadata: { provider: input.provider, route: input.route },
    }),
  ]);

  const redirectLogId = redirect.status === "fulfilled" && typeof redirect.value === "string"
    ? redirect.value
    : null;
  if (redirectLogId) {
    await record.journey?.({
      visitorId: identity.visitorId,
      type: "PROVIDER_HANDOFF_STARTED",
      eventKey: journeyEventKey("redirect", redirectLogId),
      product: input.type === "flight" ? "FLIGHT" : "HOTEL",
      provider: input.provider,
      redirectLogId,
      metadata: { sourcePage: input.sourcePage },
    });
  }
}
