import { JOURNEY_ALL_TIME_FROM } from "./adminJourneyDateRange";
import { encodeActivityJourneyReturn } from "./adminActivityJourneyNavigation";
import type { ActivityRow, IdentityKind } from "./adminIdentityJourney";
import type { ActivityFilters } from "./adminIdentityActivity";

export type RecentJourneySummary = {
  id: string;
  at: Date;
  startedAt: Date | null;
  products: string[];
  route: string | null;
  providers: string[];
  eventCount: number;
  searches: number;
  resultsViewed: number;
  offersSelected: number;
  handoffs: number;
};

/** Read-only presentation. Aggregate by actual journey ID, never timestamps,
 * route similarity or provider. Do not lose unlinked searches or account actions.
 */
export function activityOverviewRows(events: readonly ActivityRow[], limit = 5) {
  const byJourney = new Map<string, RecentJourneySummary>();
  const other: ActivityRow[] = [];
  for (const event of events) {
    if (!event.journeyId) {
      other.push(event);
      continue;
    }
    let item = byJourney.get(event.journeyId);
    if (!item) {
      item = {
        id: event.journeyId, at: event.at, startedAt: event.journeyStartedAt ?? null,
        products: [], providers: [], route: null, eventCount: 0,
        searches: 0, resultsViewed: 0, offersSelected: 0, handoffs: 0,
      };
      byJourney.set(event.journeyId, item);
    }
    item.eventCount++;
    if (event.at > item.at) item.at = event.at;
    if (event.journeyStartedAt && (!item.startedAt || event.journeyStartedAt < item.startedAt))
      item.startedAt = event.journeyStartedAt;
    if (event.product && !item.products.includes(event.product)) item.products.push(event.product);
    if (event.provider && !item.providers.includes(event.provider)) item.providers.push(event.provider);
    if (event.stage === "SEARCH_COMPLETED") item.searches++;
    else if (event.stage === "RESULTS_VIEWED") item.resultsViewed++;
    else if (event.stage === "OFFER_SELECTED") item.offersSelected++;
    else if (event.stage === "PROVIDER_HANDOFF_STARTED") item.handoffs++;

    // The existing Activity reader supplies a sanitized product · route ·
    // outcome description. Never infer a journey relationship from this text.
    if (!item.route && ["SEARCH_COMPLETED", "RESULTS_VIEWED"].includes(event.stage ?? "")) {
      const parts = event.detail.split(" · ");
      const recordedRoute = parts.length >= 2 ? parts[1].trim() : "";
      if (recordedRoute && recordedRoute.length <= 110) item.route = recordedRoute;
    }
  }
  const journeys = [...byJourney.values()].sort((a, b) =>
    b.at.getTime() - a.at.getTime() || a.id.localeCompare(b.id));
  const unlinked = other.sort((a,b) =>
    b.at.getTime() - a.at.getTime() || a.id.localeCompare(b.id));
  return {
    journeys: journeys.slice(0, limit),
    other: unlinked.slice(0, limit),
    matchingJourneyCount: journeys.length,
    otherCount: unlinked.length,
  };
}

const stages = new Set(["SEARCH_COMPLETED", "RESULTS_VIEWED", "OFFER_SELECTED", "PROVIDER_HANDOFF_STARTED"]);
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
  // The older Activity bookmarks treat UTC date-only 'to' as inclusive,
  // whereas Journeys requires strict UTC instants with an exclusive end.
  const legacyDates = dateOnly.test(filters.from) || dateOnly.test(filters.to);
  params.set("range", legacyDates ? "custom"
    : rawRange && ranges.has(rawRange) ? rawRange : "today");
  if (filters.from) {
    params.set("from", dateOnly.test(filters.from)
      ? filters.from + "T00:00:00.000Z" : filters.from);
  }
  if (filters.to) {
    params.set("to", dateOnly.test(filters.to)
      ? new Date(Date.parse(filters.to + "T00:00:00.000Z") + 86400000).toISOString()
      : filters.to);
  }
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
