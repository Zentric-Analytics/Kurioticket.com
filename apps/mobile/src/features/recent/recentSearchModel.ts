export type RecentInput = { id: string; type: "flight" | "hotel" | "car"; label: string; subtitle: string; href: string; params: Record<string, unknown> };

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${stable(child)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function recentSearchId(type: RecentInput["type"], params: Record<string, unknown>) {
  let hash = 2166136261;
  for (const char of `${type}:${stable(params)}`) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return `mobile-${type}-${(hash >>> 0).toString(16)}`;
}

export function buildRecentSearch(type: RecentInput["type"], payload: Record<string, unknown>): RecentInput | null {
  if (type === "flight") {
    const origin = String(payload.origin || ""); const destination = String(payload.destination || ""); const departureDate = String(payload.departureDate || "");
    if (!origin || !destination || !departureDate) return null;
    const params = { tripType: payload.tripType === "one-way" ? "one-way" : "round-trip", origin, destination, departureDate, ...(payload.returnDate ? { returnDate: String(payload.returnDate) } : {}), adults: Number(payload.adults) || 1, children: Number(payload.children) || 0, infants: Number(payload.infants) || 0, travelers: Number(payload.travelers) || Number(payload.adults) || 1, cabinClass: String(payload.cabinClass || "economy") };
    return { id: recentSearchId(type, params), type, label: `${origin} to ${destination}`, subtitle: departureDate, href: "/flights/results", params };
  }
  if (type === "hotel") {
    const destination = String(payload.destination || ""); const checkIn = String(payload.checkIn || ""); const checkOut = String(payload.checkOut || "");
    if (!destination || !checkIn || !checkOut || !payload.guests || !payload.rooms) return null;
    const params = { destination, checkIn, checkOut, guests: Number(payload.guests), rooms: Number(payload.rooms) };
    return { id: recentSearchId(type, params), type, label: destination, subtitle: `${checkIn} – ${checkOut}`, href: "/hotels/results", params };
  }
  const pickupLocation = String(payload.pickupLocation || ""); const dropoffLocation = String(payload.dropoffLocation || "");
  const pickupDate = String(payload.pickupDate || ""); const pickupTime = String(payload.pickupTime || "");
  const dropoffDate = String(payload.dropoffDate || ""); const dropoffTime = String(payload.dropoffTime || ""); const driverAge = String(payload.driverAge || "");
  if (![pickupLocation, dropoffLocation, pickupDate, pickupTime, dropoffDate, dropoffTime, driverAge].every(Boolean)) return null;
  const params = { pickupLocation, dropoffLocation, pickupDate, pickupTime, dropoffDate, dropoffTime, driverAge };
  return { id: recentSearchId(type, params), type, label: pickupLocation === dropoffLocation ? pickupLocation : `${pickupLocation} → ${dropoffLocation}`, subtitle: `${pickupDate} – ${dropoffDate}`, href: "/cars/results", params };
}
