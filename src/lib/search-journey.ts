const journeyIdleWindowMs = 30 * 60 * 1000;

export const clientJourneyDecisionTypes = ["SEARCH_EDIT_APPLIED", "SEARCH_FILTER_APPLIED", "SEARCH_SORT_CHANGED", "RESULT_DETAILS_OPENED", "RATE_DETAILS_OPENED"] as const;
export type ClientJourneyDecisionType = (typeof clientJourneyDecisionTypes)[number];
export const journeyFilterGroups = ["all", "price", "stops", "airlines", "airports", "duration", "baggage", "stars", "facilities", "roomTypes", "vehicle", "transmission", "other"] as const;
export type JourneyFilterGroup = (typeof journeyFilterGroups)[number];
export const journeyFilterSelectionGroups = ["price", "pricePerDay", "stops", "airlines", "airports", "duration", "baggage", "stars", "facilities", "roomTypes", "vehicle", "vehicleType", "transmission", "locations", "propertyTypes", "meals", "accessibility", "travellerFeatures", "bedTypes", "cancellation", "seats", "bags", "fuelPolicy", "mileagePolicy", "pickupLocationType"] as const;
export type JourneyFilterSelectionGroup = (typeof journeyFilterSelectionGroups)[number];
/** Only UI-chosen option identifiers, never customer-entered search text. */
export type JourneyFilterSelection = { group: JourneyFilterSelectionGroup; option: string };
export const journeySortModes = ["price", "best", "fastest", "stops", "rating", "recommended", "other"] as const;
export type JourneySortMode = (typeof journeySortModes)[number];
/** Actual selectable sort keys, not generalized categories or translated labels. */
export const journeySortChoices = ["best", "cheapest", "fastest", "stops", "bestValue", "topRated", "recommended", "lowestTotal"] as const;
export type JourneySortChoice = (typeof journeySortChoices)[number];
export function normalizeJourneySortChoice(value: string): JourneySortChoice | undefined {
  return (journeySortChoices as readonly string[]).includes(value) ? value as JourneySortChoice : undefined;
}

/** Convert only known UI choices to coarse, non-sensitive values. */
export function normalizeJourneySortMode(value: string): JourneySortMode {
  const key = value.trim().toLowerCase();
  if (/price|cheap|lowest|total/.test(key)) return "price";
  if (/fast|duration|quick/.test(key)) return "fastest";
  if (/stops?/.test(key)) return "stops";
  if (/rat(?:e|ing)|review/.test(key)) return "rating";
  if (/best|value/.test(key)) return "best";
  if (/recommend/.test(key)) return "recommended";
  return "other";
}
export const clientJourneyEventTypes = ["RESULTS_VIEWED", "FLIGHT_DETAILS_VIEWED", "OFFER_SELECTED", "PROVIDER_DEAL_SELECTED", ...clientJourneyDecisionTypes] as const;
export type ClientJourneyEventType = (typeof clientJourneyEventTypes)[number];
export type JourneyEventReceipt = { accepted: boolean; retryable?: boolean };

const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Only opaque request identifiers may become persistent search correlation keys. */
export function resolveSearchRequestId(value: string | null | undefined) {
  const candidate = value?.trim();
  return candidate && requestIdPattern.test(candidate) ? candidate.toLowerCase() : crypto.randomUUID();
}

export function isJourneySourcePath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") && !/[?#\\\s\u0000-\u001f\u007f]/.test(value);
}

/** Handoff callers also use short page names; retain only a bounded path. */
export function journeySourcePath(value: string) {
  const path = value.split(/[?#]/, 1)[0];
  if (path.length > 240) return undefined;
  if (isJourneySourcePath(path)) return path;
  return /^[a-z0-9_-]{1,100}$/i.test(path) ? `/${path}` : undefined;
}

export function getJourneyActivityCutoff(now = new Date()) {
  return new Date(now.getTime() - journeyIdleWindowMs);
}

export function journeyEventKey(namespace: "client" | "search" | "redirect", value: string) {
  return `${namespace}:${value}`;
}
