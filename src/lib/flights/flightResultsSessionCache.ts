import { hasDisplayOnlyInventory, containsSandboxInventory } from "@/shared/presentation/sandboxInventory";
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
  requestId?: string;
};

export type FlightResultsSessionSnapshotState = {
  snapshot: FlightResultsSessionSnapshot;
  isFresh: boolean;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// One public cohort per tab/storage scope. Sandbox results never enter browser
// persistence; production display-only inventory is excluded from this path.
// A WeakMap also avoids a process-global server/user cache: SSR has no Storage.
const volatileSnapshots = new WeakMap<StorageLike, FlightResultsSessionSnapshot>();
const copySnapshot = (snapshot: FlightResultsSessionSnapshot) =>
  JSON.parse(JSON.stringify(snapshot)) as FlightResultsSessionSnapshot;

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
  volatileSnapshots.delete(storage);
  try {
    storage.removeItem(FLIGHT_RESULTS_SESSION_CACHE_KEY);
  } catch {
    // Storage may be disabled. Cache cleanup must not affect navigation.
  }
}

export function readFlightResultsSessionSnapshotForRefresh(
  searchKey: string,
  storage: StorageLike | null = browserSessionStorage(),
  now = Date.now(),
): FlightResultsSessionSnapshotState | null {
  if (!storage) return null;

  const volatile = volatileSnapshots.get(storage);
  if (volatile) {
    if (now - volatile.savedAt >= FLIGHT_RESULTS_SESSION_CACHE_TTL_MS || hasDisplayOnlyInventory(volatile)) {
      removeSnapshot(storage);
    } else if (volatile.searchKey === searchKey) {
      return { snapshot: copySnapshot(volatile), isFresh: now < volatile.validUntil };
    }
  }

  let serialized: string | null;
  try {
    serialized = storage.getItem(FLIGHT_RESULTS_SESSION_CACHE_KEY);
  } catch {
    return null;
  }
  if (!serialized) return null;

  try {
    const value = JSON.parse(serialized) as Partial<FlightResultsSessionSnapshot>;
    if (hasDisplayOnlyInventory(value) || containsSandboxInventory(value)) { removeSnapshot(storage); return null; }
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

    if (now - value.savedAt! >= FLIGHT_RESULTS_SESSION_CACHE_TTL_MS) {
      removeSnapshot(storage);
      return null;
    }

    if (value.searchKey !== searchKey) return null;
    return {
      snapshot: value as FlightResultsSessionSnapshot,
      isFresh: now < value.validUntil!,
    };
  } catch {
    removeSnapshot(storage);
    return null;
  }
}

export function readFlightResultsSessionSnapshot(
  searchKey: string,
  storage: StorageLike | null = browserSessionStorage(),
  now = Date.now(),
): FlightResultsSessionSnapshot | null {
  const state = readFlightResultsSessionSnapshotForRefresh(searchKey, storage, now);
  if (!state) return null;
  if (!state.isFresh) {
    if (storage) removeSnapshot(storage);
    return null;
  }
  return state.snapshot;
}

export function writeFlightResultsSessionSnapshot(
  searchKey: string,
  results: PublicFlightResult[],
  warnings: string[],
  resultsCacheValidUntil: number,
  storage: StorageLike | null = browserSessionStorage(),
  now = Date.now(),
  requestId?: string,
): void {
  if (!storage) return;
  volatileSnapshots.delete(storage);
  const hadSandbox = hasDisplayOnlyInventory(results);
  results = results.filter(result=>!hasDisplayOnlyInventory(result));
  if (hadSandbox && !results.length) { removeSnapshot(storage); return; }
  if (!Number.isFinite(resultsCacheValidUntil) || resultsCacheValidUntil <= now) {
    removeSnapshot(storage);
    return;
  }

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
      validUntil: Math.min(now + FLIGHT_RESULTS_SESSION_CACHE_TTL_MS, resultsCacheValidUntil),
      results: publicResults,
      warnings: [...warnings],
      ...(requestId ? { requestId } : {}),
    };
    if (containsSandboxInventory(snapshot)) {
      removeSnapshot(storage);
      if (!hadSandbox) volatileSnapshots.set(storage, copySnapshot(snapshot));
      return;
    }
    storage.setItem(FLIGHT_RESULTS_SESSION_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Quota, serialization, and disabled-storage errors are deliberately ignored.
  }
}
