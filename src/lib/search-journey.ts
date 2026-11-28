const journeyIdleWindowMs = 30 * 60 * 1000;

export const clientJourneyDecisionTypes = ["SEARCH_EDIT_APPLIED", "SEARCH_FILTER_APPLIED", "SEARCH_SORT_CHANGED", "RESULT_DETAILS_OPENED", "RATE_DETAILS_OPENED"] as const;
export type ClientJourneyDecisionType = (typeof clientJourneyDecisionTypes)[number];
export const journeySearchEditFieldLabels = {
  origin: "Origin", destination: "Destination", dates: "Dates", trip_type: "Trip type",
  travelers: "Travelers", cabin: "Cabin", segments: "Flight segments", rooms: "Rooms", pet_policy: "Pet policy",
  pickup_location: "Pick-up location", dropoff_location: "Drop-off location",
  rental_dates: "Rental dates", rental_times: "Rental times", driver_age: "Driver age",
} as const;
export type JourneySearchEditField = keyof typeof journeySearchEditFieldLabels;
export function isJourneySearchEditField(value: unknown): value is JourneySearchEditField {
  return typeof value === "string" && Object.hasOwn(journeySearchEditFieldLabels, value);
}
const journeySearchEditProductFields: Record<string, readonly JourneySearchEditField[]> = {
  FLIGHT: ["origin", "destination", "dates", "trip_type", "travelers", "cabin", "segments"],
  HOTEL: ["destination", "dates", "travelers", "rooms", "pet_policy"],
  CAR: ["pickup_location", "dropoff_location", "rental_dates", "rental_times", "driver_age"],
};
export function safeJourneySearchEditFields(value: unknown, product: string | null): JourneySearchEditField[] {
  if (!Array.isArray(value) || !product || !Object.hasOwn(journeySearchEditProductFields, product)) return [];
  const fields = journeySearchEditProductFields[product];
  return [...new Set(value.slice(0, 7).filter((field): field is JourneySearchEditField =>
    isJourneySearchEditField(field) && fields.includes(field)))];
}

export function journeyDecisionSourceProduct(path: string | undefined) {
  const match = path?.match(/^\/(?:packages\/journey\/)?(flight|hotel|car)s?[-/](?:results|details)$/);
  return match?.[1].toUpperCase() ?? null;
}
export const journeyFilterGroups = ["all", "price", "stops", "airlines", "airports", "duration", "baggage", "stars", "facilities", "roomTypes", "vehicle", "transmission", "other"] as const;
export type JourneyFilterGroup = (typeof journeyFilterGroups)[number];
export const journeyFilterSelectionGroups = ["price", "pricePerDay", "stops", "airlines", "airports", "duration", "baggage", "stars", "facilities", "roomTypes", "vehicle", "vehicleType", "transmission", "locations", "propertyTypes", "meals", "accessibility", "travellerFeatures", "bedTypes", "cancellation", "seats", "bags", "fuelPolicy", "mileagePolicy", "pickupLocationType", "fromAirports", "toAirports", "quality", "areas"] as const;
export type JourneyFilterSelectionGroup = (typeof journeyFilterSelectionGroups)[number];
/** Only UI-chosen option identifiers, never customer-entered search text. */
export type JourneyFilterSelection = { group: JourneyFilterSelectionGroup; option: string };
/** UI-observed detail at the time of selection; never treat it as server-confirmed
 * price evidence. Store only result card labels, supplier, and quoted price.
 */
export type JourneyObservedResult = {
  label: string;
  provider: string;
  amount: number;
  currency: string;
  priceBasis: "total" | "per_night" | "per_day";
  totalAmount?: number;
};

/** Preserve only explicitly chosen UI options. Never serialize typed search terms
 * or present an incomplete subset as if it were the entire filter selection.
 */
export function boundedJourneyFilterSelections(
  groups: Array<{ group: JourneyFilterSelectionGroup; options: readonly string[] }>,
): JourneyFilterSelection[] | undefined {
  const selections = groups.flatMap(({ group, options }) => options.map(option => ({ group, option })));
  if (selections.length > 20) return undefined;
  if (selections.some(value => !/^[\p{L}\p{N} ._:+\-']{1,72}$/u.test(value.option))) return undefined;
  return selections;
}
export const journeySortModes = ["price", "best", "fastest", "stops", "rating", "recommended", "other"] as const;
export type JourneySortMode = (typeof journeySortModes)[number];
/** Actual selectable sort keys, not generalized categories or translated labels. */
export const journeySortChoices = ["best", "cheapest", "fastest", "stops", "bestValue", "topRated", "recommended", "lowestTotal", "price", "duration", "departure-asc", "departure-desc"] as const;
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
