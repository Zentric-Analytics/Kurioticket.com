import { shiftCalendarDate } from "./dateStripModel";

export const NEARBY_FARE_RANGE_SIZE = 10;
export const NEARBY_FARE_DAYS_BEFORE_ANCHOR = 4;
export const NEARBY_FARE_REQUEST_CONCURRENCY = 4;
export const NEARBY_FARE_CACHE_TTL_MS = 10 * 60 * 1000;

export type NearbyFareState =
  | { date: string; status: "loading" }
  | { date: string; status: "success"; amount: number; currency: string; fetchedAt: number }
  | { date: string; status: "unavailable" | "error"; fetchedAt: number };

export function localTodayIso(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getNearbyFareDates(selectedDate: string, today = localTodayIso()) {
  const preferredStart = shiftCalendarDate(selectedDate, -NEARBY_FARE_DAYS_BEFORE_ANCHOR);
  const start = preferredStart < today ? today : preferredStart;
  return Array.from({ length: NEARBY_FARE_RANGE_SIZE }, (_, index) => shiftCalendarDate(start, index));
}

export function calendarDayDistance(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

export function preserveRoundTripDuration(
  departureDate: string,
  returnDate: string | undefined,
  nextDepartureDate: string,
) {
  if (!returnDate) return undefined;
  return shiftCalendarDate(nextDepartureDate, Math.max(0, calendarDayDistance(departureDate, returnDate)));
}

export function buildNearbyFarePayload(payload: Record<string, unknown>, departureDate: string) {
  const next: Record<string, unknown> = { ...payload, departureDate };
  if (payload.tripType === "round-trip" && typeof payload.returnDate === "string") {
    next.returnDate = preserveRoundTripDuration(String(payload.departureDate), payload.returnDate, departureDate);
  }
  return next;
}

export function prioritizeNearbyDates(dates: string[], selectedDate: string) {
  const selectedIndex = dates.indexOf(selectedDate);
  return [...dates].sort((left, right) =>
    Math.abs(dates.indexOf(left) - selectedIndex) - Math.abs(dates.indexOf(right) - selectedIndex)
    || dates.indexOf(left) - dates.indexOf(right));
}

export function selectNearbyFareResult<T extends { price: number; currency: string }>(
  results: readonly T[],
  normalizePrice: (result: T) => number | null,
) {
  let lowestComparable: { result: T; value: number } | undefined;
  let providerCurrencyFallback: T | undefined;

  for (const result of results) {
    if (!Number.isFinite(result.price) || !result.currency?.trim()) continue;
    providerCurrencyFallback ??= result;
    const value = normalizePrice(result);
    if (value == null || !Number.isFinite(value)) continue;
    if (!lowestComparable || value < lowestComparable.value) {
      lowestComparable = { result, value };
    }
  }

  return lowestComparable?.result ?? providerCurrencyFallback;
}

export function nearbyFareCacheKey(payload: Record<string, unknown>, departureDate: string, displayCurrency: string) {
  return JSON.stringify([buildNearbyFarePayload(payload, departureDate), displayCurrency.toUpperCase()]);
}

export function freshNearbyFare(
  cache: Map<string, NearbyFareState>,
  key: string,
  now = Date.now(),
) {
  const value = cache.get(key);
  if (!value || value.status === "loading" || now - value.fetchedAt > NEARBY_FARE_CACHE_TTL_MS) {
    if (value) cache.delete(key);
    return undefined;
  }
  return value;
}

export async function runNearbyFareQueue(
  dates: string[],
  worker: (date: string) => Promise<void>,
  isCurrent: () => boolean,
  concurrency = NEARBY_FARE_REQUEST_CONCURRENCY,
) {
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, dates.length) }, async () => {
    while (isCurrent()) {
      const date = dates[nextIndex++];
      if (!date) return;
      await worker(date);
    }
  }));
}
