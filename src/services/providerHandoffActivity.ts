import { trackAnalyticsEvent } from "@/services/analyticsService";
import { readOperationalSearchSession, operationalSessionMetadata } from "@/lib/operationalSearchSession";
import { applicationMetadata } from "@/lib/application-source";
import { resolveRequestActivityIdentity } from "@/services/requestActivityIdentity";
import { journeyEventKey, recordJourneyEvent } from "@/services/searchJourneyService";
import { journeySourcePath } from "@/lib/search-journey";
import { kayakHotelSnapshot, resolveHotelOperationalBinding } from "@/services/travel/hotelOperationalBinding";
import { recordProviderRedirect, type AttributedHandoff, type HandoffReceipt, type ProviderHandoffActivity } from "./providerHandoffStore";

export type { ProviderHandoffActivity } from "./providerHandoffStore";
type ActivityDependencies = {
  identity: typeof resolveRequestActivityIdentity;
  redirect: (input: AttributedHandoff) => Promise<unknown>;
  event: typeof trackAnalyticsEvent;
  journey?: typeof recordJourneyEvent;
  hotelBinding?: typeof resolveHotelOperationalBinding;
};

const dependencies: ActivityDependencies = {
  identity: resolveRequestActivityIdentity,
  redirect: recordProviderRedirect,
  event: trackAnalyticsEvent,
  journey: recordJourneyEvent,
  hotelBinding: resolveHotelOperationalBinding,
};

/** Schedule only after a verified provider URL is ready; this does not confirm a booking. */
export async function recordProviderHandoffActivity(
  request: Request,
  input: ProviderHandoffActivity,
  record: ActivityDependencies = dependencies,
) {
  const identity = await record.identity(request).catch(() => ({ userId: null, visitorId: null, applicationSource: "UNKNOWN" as const }));
  const operationalSession = readOperationalSearchSession(request);
  if (input.operationalHotelSnapshotId) {
    // The redirect route extracted this snapshot from its already validated,
    // server-cached selected offer. Do not manufacture Analytics attribution.
    const snapshot = input.type === "hotel" ? kayakHotelSnapshot({ id: input.resultId, provider: input.provider }) : undefined;
    const bound = snapshot === input.operationalHotelSnapshotId && operationalSession && record.hotelBinding
      ? await record.hotelBinding(snapshot, operationalSession, identity.userId).catch(() => undefined) : undefined;
    input = { ...input, operationalRequestId: bound,
      requestId: identity.visitorId && bound && input.requestId === bound ? input.requestId : undefined };
  }
  const redirect = await record.redirect({ ...input, ...identity, ...(operationalSession ? operationalSessionMetadata(operationalSession) : {}) }).catch(() => null);
  // A rejected/reused key or unavailable durable write must not create a
  // second, independent redirect count in the legacy analytics table.
  if (redirect === null) return;
  const receipt = redirect && typeof redirect === "object" && "id" in redirect
    ? redirect as HandoffReceipt : null;
  const attribution = receipt ? { userId: receipt.userId, visitorId: receipt.visitorId } : identity;
  // The operational redirect is complete; only a consented visitor may produce optional events.
  if (!attribution.visitorId) return;
  if (receipt?.created !== false) {
    await Promise.allSettled([record.event({
      ...attribution,
      ...applicationMetadata(identity),
      type: "REDIRECT",
      name: `${input.type}_partner_redirect`,
      metadata: { applicationSource: identity.applicationSource ?? "UNKNOWN", provider: input.provider, route: input.route },
    })]);
  }

  const redirectLogId = receipt?.id ?? (typeof redirect === "string" ? redirect : null);
  if (redirectLogId) {
    const sourcePage = journeySourcePath(input.sourcePage);
    await record.journey?.({
      ...attribution,
      type: "PROVIDER_HANDOFF_STARTED",
      eventKey: journeyEventKey("redirect", redirectLogId),
      product: input.type === "flight" ? "FLIGHT" : input.type === "hotel" ? "HOTEL" : "CAR",
      provider: input.provider,
      redirectLogId,
      ...(receipt?.searchHistoryId ? { searchHistoryId: receipt.searchHistoryId } : {}),
      metadata: { applicationSource: identity.applicationSource ?? "UNKNOWN", ...(sourcePage ? { sourcePage } : {}), resultId: input.resultId },
    });
  }
}
