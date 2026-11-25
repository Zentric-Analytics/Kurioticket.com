import { JOURNEY_ALL_TIME_FROM } from "./adminJourneyDateRange";
import { encodeActivityJourneyReturn } from "./adminActivityJourneyNavigation";
import type { ActivityRow, IdentityKind } from "./adminIdentityJourney";
import type { ActivityFilters } from "./adminIdentityActivity";

export type RecentSearchSummary = {
  /** The verified SearchHistory ID, not the broader visitor journey ID. */
  id: string;
  /** Latest matching stage in the selected filters. */
  at: Date;
  searchedAt: Date | null;
  journeyId: string | null;
  product: string | null;
  route: string | null;
  searchStatus: string | null;
  platform: "WEB" | "IOS" | "ANDROID" | null;
  resultCount: number | null;
  providers: string[];
  eventCount: number;
  searches: number;
  resultsViewed: number;
  offersSelected: number;
  handoffs: number;
  saved: number;
  unsaved: number;
  shared: number;
  priceAlertsCreated: number;
};

/** Only server-sanitized activity descriptions are available to this display.
 * Prefer the search row's location over a later stage; do not infer a route
 * from provider-only text or from other searches in the visitor journey.
 */
function recordedSearchRoute(event: ActivityRow): string | null {
  if (!["SEARCH_COMPLETED", "RESULTS_VIEWED", "FLIGHT_DETAILS_VIEWED", "OFFER_SELECTED", "PROVIDER_DEAL_SELECTED"].includes(event.stage ?? "")) return null;
  const parts = event.detail.split(" · ");
  if (parts.length < 2) return null;
  if (event.stage === "OFFER_SELECTED" && parts.length < 3) return null;
  const route = parts[1].trim();
  return route && route.length <= 110 ? route : null;
}
const searchableStages = new Set(["SEARCH_COMPLETED", "RESULTS_VIEWED", "FLIGHT_DETAILS_VIEWED", "OFFER_SELECTED", "PROVIDER_DEAL_SELECTED", "PROVIDER_HANDOFF_STARTED",
  "RESULT_SAVED", "RESULT_UNSAVED", "RESULT_SHARED", "PRICE_ALERT_CREATED"]);

/** Read-only recent search presentation, never a redefinition of SearchJourney.
 * One card per explicitly linked SearchHistory ID, even when one consented
 * visitor journey contains flight, hotel, car and repeat searches. Show
 * independently recorded searches too, but NEVER infer missing journey stages
 * by product, route, time proximity or identity.
 *
 * events are already authorized, deduplicated and filtered by the Activity
 * reader. This function does not mutate them or grant new data access.
 */
export function activityOverviewRows(events: readonly ActivityRow[], limit = 10) {
  const bySearch = new Map<string, RecentSearchSummary>();
  const other: ActivityRow[] = [];
  const seenEventIds = new Set<string>();
  const matchedJourneyIds = new Set<string>();
  let unlinkedStageCount = 0;
  for (const event of events) {
    if (seenEventIds.has(event.id)) continue;
    seenEventIds.add(event.id);
    if (!searchableStages.has(event.stage ?? "")) {
      other.push(event);
      continue;
    }
    const searchId = event.searchHistoryId;
    if (!searchId) {
      // Some handoffs or older selections have no verified search reference.
      // Leave them in Journey History instead of assigning them by time/route.
      unlinkedStageCount++;
      continue;
    }
    let item = bySearch.get(searchId);
    // A verified search can span multiple visitor journeys after the idle
    // rollover. SearchHistory ID is the authoritative correlation; identity,
    // consent and environment were already checked by the activity reader.
    if (!item) {
      item = {
        id: searchId, at: event.at, searchedAt: null,
        journeyId: event.journeyId ?? null, product: event.product ?? null,
        route: null, searchStatus: null, platform: event.platform ?? null,
        resultCount: event.resultCount ?? null, providers: [], eventCount: 0,
        searches: 0, resultsViewed: 0, offersSelected: 0, handoffs: 0,
        saved: 0, unsaved: 0, shared: 0, priceAlertsCreated: 0,
      };
      bySearch.set(searchId, item);
    }
    if (event.journeyId) {
      matchedJourneyIds.add(event.journeyId);
      if (!item.journeyId) item.journeyId = event.journeyId;
    }
    if (event.at > item.at) item.at = event.at;
    if (event.platform) item.platform = event.platform;
    if (typeof event.resultCount === "number") item.resultCount = event.resultCount;
    item.eventCount++;
    if (!item.product && event.product) item.product = event.product;
    if (event.provider && !item.providers.includes(event.provider)) item.providers.push(event.provider);
    const route = recordedSearchRoute(event);
    if (route && (!item.route || event.stage === "SEARCH_COMPLETED")) item.route = route;
    if (event.stage === "SEARCH_COMPLETED") {
      item.searches++;
      if (!item.searchedAt || event.at < item.searchedAt) item.searchedAt = event.at;
      const status = event.detail.split(" · ").at(-1)?.trim() ?? "";
      if (["SUCCESS", "PARTIAL", "FAILED", "UNAVAILABLE", "ZERO_RESULTS"].includes(status))
        item.searchStatus = status;
    } else if (event.stage === "RESULTS_VIEWED") item.resultsViewed++;
    else if (event.stage === "OFFER_SELECTED") item.offersSelected++;
    else if (event.stage === "PROVIDER_HANDOFF_STARTED") item.handoffs++;
    else if (event.stage === "RESULT_SAVED") item.saved++;
    else if (event.stage === "RESULT_UNSAVED") item.unsaved++;
    else if (event.stage === "RESULT_SHARED") item.shared++;
    else if (event.stage === "PRICE_ALERT_CREATED") item.priceAlertsCreated++;
  }
  const searches = [...bySearch.values()].sort((a, b) =>
    b.at.getTime() - a.at.getTime() || a.id.localeCompare(b.id));
  const otherSorted = other.sort((a, b) =>
    b.at.getTime() - a.at.getTime() || a.id.localeCompare(b.id));

  return {
    searches: searches.slice(0, Math.max(0, limit)),
    matchingSearchCount: searches.length,
    matchingJourneyCount: matchedJourneyIds.size,
    unlinkedStageCount,
    other: otherSorted.slice(0, Math.max(0, limit)),
    otherCount: otherSorted.length,
  };
}

const stages = new Set(["SEARCH_COMPLETED", "RESULTS_VIEWED", "FLIGHT_DETAILS_VIEWED", "OFFER_SELECTED", "PROVIDER_DEAL_SELECTED", "PROVIDER_HANDOFF_STARTED"]);
const ranges = new Set(["today", "24h", "7d", "30d", "90d", "all", "custom"]);

/** Only shared, supported date/product/stage filters move to Journey History.
 * Search text and account-action filters have no exact journey equivalent and
 * therefore stay solely in the signed-down navigation return context.
 */
export function journeyHistoryHrefFromActivity(
  kind: IdentityKind,
  id: string,
  filters: ActivityFilters,
  rawRange: string | undefined,
  returnHref: string,
) {
  const params = new URLSearchParams();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
  // Both views interpret calendar dates in the active reporting time zone.
  const legacyDates = dateOnly.test(filters.from) || dateOnly.test(filters.to);
  params.set("range", legacyDates ? "custom"
    : rawRange && ranges.has(rawRange) ? rawRange : "today");
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.product !== "all") params.set("product", filters.product);
  if (stages.has(filters.stage)) params.set("stage", filters.stage);
  const returnToken = encodeActivityJourneyReturn(returnHref);
  if (returnToken) params.set("activityReturn", returnToken);
  return "/admin/users/" + kind + "/" + encodeURIComponent(id) + "/journeys?" + params.toString();
}

/** A journey drill-down always displays the complete authorized chronology,
 * not an invented +/- 1 day window or a subset from the summary's filters.
 * The parent filter context is kept for Back navigation only.
 */
export function completeJourneyDetailHref(
  journeyId: string,
  kind: IdentityKind,
  id: string,
  environment: "staging" | "production",
  now: Date,
  returnHref: string,
) {
  const params = new URLSearchParams({
    from: JOURNEY_ALL_TIME_FROM,
    to: now.toISOString(),
    environment,
    identity: kind === "user" ? "registered" : "guest",
    ...(kind === "user" ? { userId: id } : { visitorId: id }),
  });
  const token = encodeActivityJourneyReturn(returnHref);
  if (token) params.set("activityReturn", token);
  return "/admin/journeys/" + encodeURIComponent(journeyId) + "?" + params.toString();
}
