import { timezones } from "../../services/travel/airportTimeZones";

export class SavedFlightTimeError extends Error {}

const ISO = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})?$/;

/** Resolve airport wall time to an instant. Never guess at DST folds or gaps.
 * Explicit provider offsets are authoritative. Airport-local values require an
 * IANA zone from the licensed airport catalogue or provider airport metadata.
 * Persist the instant separately from the original provider/display value.
 */
export function resolveSavedFlightTime(value: string, airport?: string, providerZone?: string) {
  const match = ISO.exec(value);
  if (!match) throw new SavedFlightTimeError("Invalid saved flight datetime.");
  const [, day, clock, seconds = "00", fraction = "", offset] = match;
  const local = `${day}T${clock}:${seconds}.${fraction.padEnd(3, "0").slice(0, 3)}`;
  const nominal = Date.parse(`${local}Z`);
  if (!Number.isFinite(nominal) || new Date(nominal).toISOString() !== `${local}Z`)
    throw new SavedFlightTimeError("Invalid saved flight datetime.");
  if (offset) {
    const instant = Date.parse(value);
    if (!Number.isFinite(instant)) throw new SavedFlightTimeError("Invalid saved flight datetime.");
    return { instant: new Date(instant).toISOString(), local: value, timeZone: null };
  }
  const timeZone = timezones[airport?.trim().toUpperCase() ?? ""] || providerZone?.trim();
  if (!timeZone) throw new SavedFlightTimeError("The flight airport timezone is unavailable. Please search again.");
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  } catch { throw new SavedFlightTimeError("The flight airport timezone is unavailable. Please search again."); }
  const wall = (instant: number) => {
    const parts = formatter.formatToParts(new Date(instant));
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)!.value;
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
  };
  // Sample both sides of a zone transition, then round-trip every candidate.
  // Includes half-hour, quarter-hour and date-line offsets without using the
  // device's timezone or selecting an arbitrary side of an ambiguous clock.
  const offsets = new Set<number>();
  for (let hours = -48; hours <= 48; hours += 6) {
    const sample = nominal + hours * 3_600_000;
    offsets.add(Date.parse(`${wall(sample)}Z`) - Math.floor(sample / 1000) * 1000);
  }
  const candidates = [...offsets].map(zoneOffset => nominal - zoneOffset)
    .filter(instant => wall(instant) === local.slice(0, 19));
  if (candidates.length !== 1)
    throw new SavedFlightTimeError("The flight local time is ambiguous or nonexistent at a timezone transition. Please search again.");
  return { instant: new Date(candidates[0]).toISOString(), local: value, timeZone };
}

export function canonicalSavedFlightDateTime(value: string, airport?: string, timeZone?: string) {
  return resolveSavedFlightTime(value, airport, timeZone).instant;
}

export function savedFlightTimeFields(flight: { departureTime: string; arrivalTime: string; originAirport: string; destinationAirport: string }) {
  const departure = resolveSavedFlightTime(flight.departureTime, flight.originAirport);
  const arrival = resolveSavedFlightTime(flight.arrivalTime, flight.destinationAirport);
  return { departureTime: departure.instant, arrivalTime: arrival.instant,
    flightTime: { version: 1, departure, arrival } };
}

/** Only versioned new metadata is used; historical persisted instants are untouched. */
export function savedFlightLocalTimes(payload: unknown): { departure?: string; arrival?: string } {
  if (!payload || typeof payload !== "object") return {};
  const time = (payload as { flightTime?: { version?: number; departure?: { local?: unknown }; arrival?: { local?: unknown } } }).flightTime;
  if (time?.version !== 1) return {};
  const safe = (value: unknown) => typeof value === "string" && ISO.test(value) ? value : undefined;
  return { departure: safe(time.departure?.local), arrival: safe(time.arrival?.local) };
}

export function savedFlightLocalSummary(item: { payload?: unknown; originAirport?: string; destinationAirport?: string }) {
  const { departure, arrival } = savedFlightLocalTimes(item.payload);
  if (!departure || !arrival) return undefined;
  return `${item.originAirport ?? ""} ${departure.slice(0, 16).replace("T", " ")} → ${item.destinationAirport ?? ""} ${arrival.slice(0, 16).replace("T", " ")}`;
}
