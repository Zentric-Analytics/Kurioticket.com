import type { FlightSearchLeg, PublicFlightResult } from "@/lib/types";

export const FLIGHT_RESULTS_SESSION_CACHE_KEY =
  "kurioticket:flight-results-snapshot:v3";
export const FLIGHT_RESULTS_SESSION_CACHE_TTL_MS = 30 * 60 * 1000;

export type FlightResultsSessionSnapshot = {
  version: 3;
  searchKey: string;
  savedAt: number;
  validUntil: number;
  results: PublicFlightResult[];
  warnings: string[];
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function buildFlightResultsSearchKey(body: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  tripType: string;
  legs?: FlightSearchLeg[];
  adults: number;
  children: number;
  infants: number;
  travelers: number;
  cabinClass: string;
  currency?: string;
}) {
  const journeyKey = body.legs?.length
    ? body.legs
        .map(
          (leg) =>
            `${leg.origin.trim().toUpperCase()}>${leg.destination.trim().toUpperCase()}@${leg.departureDate}`,
        )
        .join("|")
    : "";

  return [
    body.origin.trim().toUpperCase(),
    body.destination.trim().toUpperCase(),
    body.departureDate,
    body.returnDate || "",
    body.tripType,
    journeyKey,
    body.adults,
    body.children,
    body.infants,
    body.travelers,
    body.cabinClass,
    body.currency || "",
  ].join("|");
}

function browserSessionStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function removeSnapshot(storage: StorageLike) {
  try {
    storage.removeItem(FLIGHT_RESULTS_SESSION_CACHE_KEY);
  } catch {
    // Storage may be disabled. Cache cleanup must not affect navigation.
  }
}

export function readFlightResultsSessionSnapshot(
  searchKey: string,
  storage: StorageLike | null = browserSessionStorage(),
  now = Date.now(),
): FlightResultsSessionSnapshot | null {
  if (!storage) return null;

  let serialized: string | null;
  try {
    serialized = storage.getItem(FLIGHT_RESULTS_SESSION_CACHE_KEY);
  } catch {
    return null;
  }
  if (!serialized) return null;

  try {
    const value = JSON.parse(serialized) as Partial<FlightResultsSessionSnapshot>;
    const valid =
      value !== null &&
      typeof value === "object" &&
      value.version === 3 &&
      typeof value.searchKey === "string" &&
      typeof value.savedAt === "number" &&
      Number.isFinite(value.savedAt) &&
      typeof value.validUntil === "number" &&
      Number.isFinite(value.validUntil) &&
      value.validUntil > value.savedAt &&
      Array.isArray(value.results) &&
      value.results.every((result) => result !== null && typeof result === "object") &&
      Array.isArray(value.warnings) &&
      value.warnings.every((warning) => typeof warning === "string");

    if (!valid) {
      removeSnapshot(storage);
      return null;
    }

    if (now >= value.validUntil! || now - value.savedAt! >= FLIGHT_RESULTS_SESSION_CACHE_TTL_MS) {
      removeSnapshot(storage);
      return null;
    }

    if (value.searchKey !== searchKey) return null;
    return value as FlightResultsSessionSnapshot;
  } catch {
    removeSnapshot(storage);
    return null;
  }
}

export function writeFlightResultsSessionSnapshot(
  searchKey: string,
  results: PublicFlightResult[],
  warnings: string[],
  resultsCacheValidForMs: number,
  storage: StorageLike | null = browserSessionStorage(),
  now = Date.now(),
): void {
  if (!storage || !Number.isFinite(resultsCacheValidForMs) || resultsCacheValidForMs <= 0) return;

  try {
    const publicResults = results.map((result) => {
      const copy = { ...result } as PublicFlightResult & {
        rawProviderReference?: unknown;
      };
      delete copy.rawProviderReference;
      return copy;
    });
    const snapshot: FlightResultsSessionSnapshot = {
      version: 3,
      searchKey,
      savedAt: now,
      validUntil: now + Math.min(FLIGHT_RESULTS_SESSION_CACHE_TTL_MS, resultsCacheValidForMs),
      results: publicResults,
      warnings: [...warnings],
    };
    storage.setItem(FLIGHT_RESULTS_SESSION_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Quota, serialization, and disabled-storage errors are deliberately ignored.
  }
}
