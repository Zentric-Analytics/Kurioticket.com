import type { AdminJourneySearchDetails } from "./adminJourneyContract";

/** Never return raw SearchHistory.query: it also contains private attribution/network fields. */
export function safeAdminJourneySearchDetails(product: string | null, storedQuery: unknown): AdminJourneySearchDetails | null {
  if (!storedQuery || typeof storedQuery !== "object" || Array.isArray(storedQuery)) return null;
  const query = storedQuery as Record<string, unknown>;
  const day = (value: unknown): string | undefined =>
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T00:00:00Z"))
      && new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value ? value : undefined;
  const time = (value: unknown): string | undefined =>
    typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : undefined;
  const number = (value: unknown, min: number, max: number): number | undefined =>
    (typeof value === "number" || (typeof value === "string" && /^\d{1,2}$/.test(value)))
      && Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= max
      ? Number(value) : undefined;

  if (product === "FLIGHT") {
    const tripType = ["one-way", "round-trip", "multi-city"].includes(String(query.tripType))
      ? query.tripType as "one-way" | "round-trip" | "multi-city" : undefined;
    const cabinClass = ["economy", "premium-economy", "business", "first"].includes(String(query.cabinClass))
      ? query.cabinClass as "economy" | "premium-economy" | "business" | "first" : undefined;
    const legs = Array.isArray(query.legs) ? query.legs.slice(0, 8).flatMap(value => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return [];
      const leg = value as Record<string, unknown>;
      const origin = typeof leg.origin === "string" && /^[A-Z]{3}$/.test(leg.origin) ? leg.origin : null;
      const destination = typeof leg.destination === "string" && /^[A-Z]{3}$/.test(leg.destination) ? leg.destination : null;
      const departureDate = day(leg.departureDate);
      return origin && destination && departureDate ? [{ origin, destination, departureDate }] : [];
    }) : [];
    return { product: "FLIGHT", ...(tripType ? { tripType } : {}),
      ...(day(query.departureDate) ? { departureDate: day(query.departureDate) } : {}),
      ...(day(query.returnDate) ? { returnDate: day(query.returnDate) } : {}),
      ...(cabinClass ? { cabinClass } : {}),
      ...(number(query.adults, 1, 9) !== undefined ? { adults: number(query.adults, 1, 9) } : {}),
      ...(number(query.children, 0, 8) !== undefined ? { children: number(query.children, 0, 8) } : {}),
      ...(number(query.infants, 0, 8) !== undefined ? { infants: number(query.infants, 0, 8) } : {}),
      ...(number(query.travelers, 1, 9) !== undefined ? { travelers: number(query.travelers, 1, 9) } : {}),
      ...(tripType === "multi-city" && legs.length ? { legs } : {}) };
  }
  if (product === "HOTEL") return { product: "HOTEL",
    ...(day(query.checkIn) ? { checkIn: day(query.checkIn) } : {}),
    ...(day(query.checkOut) ? { checkOut: day(query.checkOut) } : {}),
    ...(number(query.rooms, 1, 6) !== undefined ? { rooms: number(query.rooms, 1, 6) } : {}),
    ...(number(query.guests, 1, 12) !== undefined ? { guests: number(query.guests, 1, 12) } : {}),
    ...(number(query.adults, 1, 12) !== undefined ? { adults: number(query.adults, 1, 12) } : {}),
    ...(number(query.children, 0, 11) !== undefined ? { children: number(query.children, 0, 11) } : {}) };
  if (product === "CAR") {
    const age = typeof query.driverAge === "string" && query.driverAge === "18-70"
      ? "18-70" : number(query.driverAge, 18, 70)?.toString();
    return { product: "CAR",
      ...(day(query.pickupDate) ? { pickupDate: day(query.pickupDate) } : {}),
      ...(time(query.pickupTime) ? { pickupTime: time(query.pickupTime) } : {}),
      ...(day(query.dropoffDate) ? { dropoffDate: day(query.dropoffDate) } : {}),
      ...(time(query.dropoffTime) ? { dropoffTime: time(query.dropoffTime) } : {}),
      ...(age ? { driverAge: age } : {}) };
  }
  return null;
}
