/**
 * Exact search and alert identity checks. Product and request UUID alone are
 * not enough: a customer can run multiple searches before creating an alert.
 * Fail closed rather than attaching an alert to the wrong journey.
 */
type Search = {
  type: string;
  origin: string | null;
  destination: string | null;
  checkIn: Date | null;
  checkOut: Date | null;
  query: unknown;
};
type Alert = {
  type: string;
  origin: string | null;
  destination: string;
  query: unknown;
};
const comparable = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : "";
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const sameDate = (a: string | Date | null | undefined, b: unknown) =>
  Boolean(a && comparable(a instanceof Date ? a.toISOString().slice(0, 10) : a) === comparable(b));

export function priceAlertMatchesRecordedSearch(search: Search, alert: Alert): boolean {
  if (search.type !== alert.type) return false;
  if (!comparable(search.destination) || comparable(search.destination) !== comparable(alert.destination)) return false;
  if (search.type !== "HOTEL" && (!comparable(search.origin) || comparable(search.origin) !== comparable(alert.origin))) return false;
  const details = object(search.query);
  const alertDetails = object(alert.query);
  if (search.type === "HOTEL") {
    return sameDate(search.checkIn, alertDetails.checkIn) && sameDate(search.checkOut, alertDetails.checkOut);
  }
  if (search.type === "FLIGHT") {
    // An opaque request ID anchors the source search, but alert settings must
    // still identify the same itinerary: no time-only or route-only joins.
    if (!comparable(details.departureDate) || !comparable(details.tripType)) return false;
    return ["departureDate", "returnDate", "tripType", "cabinClass", "adults", "children", "infants"].every(key =>
      comparable(details[key]) === comparable(alertDetails[key]));
  }
  if (search.type === "CAR") {
    return ["pickupDate", "dropoffDate", "pickupTime", "dropoffTime", "driverAge"].every(key =>
      Boolean(comparable(details[key]) && comparable(details[key]) === comparable(alertDetails[key])));
  }
  return false;
}
