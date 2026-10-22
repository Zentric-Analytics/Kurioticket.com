import { trackAnalyticsEvent } from "@/services/analyticsService";
import { resolveRequestActivityIdentity } from "@/services/requestActivityIdentity";
import { journeyEventKey, recordJourneyEvent } from "@/services/searchJourneyService";
import { journeySourcePath } from "@/lib/search-journey";
import { recordProviderRedirect, type AttributedHandoff, type HandoffReceipt, type ProviderHandoffActivity } from "./providerHandoffStore";

export type { ProviderHandoffActivity } from "./providerHandoffStore";
type ActivityDependencies = {
  identity: typeof resolveRequestActivityIdentity;
  redirect: (input: AttributedHandoff) => Promise<unknown>;
  event: typeof trackAnalyticsEvent;
  journey?: typeof recordJourneyEvent;
};

const dependencies: ActivityDependencies = {
  identity: resolveRequestActivityIdentity,
  redirect: recordProviderRedirect,
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
  const redirect = await record.redirect({ ...input, ...identity }).catch(() => null);
  // A rejected/reused key or unavailable durable write must not create a
  // second, independent redirect count in the legacy analytics table.
  if (redirect === null) return;
  const receipt = redirect && typeof redirect === "object" && "id" in redirect
    ? redirect as HandoffReceipt : null;
  const attribution = receipt ? { userId: receipt.userId, visitorId: receipt.visitorId } : identity;
  if (receipt?.created !== false) {
    await Promise.allSettled([record.event({
      ...attribution,
      type: "REDIRECT",
      name: `${input.type}_partner_redirect`,
      metadata: { provider: input.provider, route: input.route },
    })]);
  }

  const redirectLogId = receipt?.id ?? (typeof redirect === "string" ? redirect : null);
  if (redirectLogId) {
    const sourcePage = journeySourcePath(input.sourcePage);
    await record.journey?.({
      ...attribution,
      type: "PROVIDER_HANDOFF_STARTED",
      eventKey: journeyEventKey("redirect", redirectLogId),
      product: input.type === "flight" ? "FLIGHT" : "HOTEL",
      provider: input.provider,
      redirectLogId,
      ...(receipt?.searchHistoryId ? { searchHistoryId: receipt.searchHistoryId } : {}),
      metadata: { ...(sourcePage ? { sourcePage } : {}), resultId: input.resultId },
    });
  }
}
