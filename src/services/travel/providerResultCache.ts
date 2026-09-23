import { createHash } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import type { HotelSearchParams, NormalizedHotelResult } from "@/lib/types";
import type { LocationBoundCarSearchParams, NormalizedCarResult } from "@/lib/cars/types";

export type ProviderDetailsVertical = "hotel" | "car";
const TTL_MS = 30 * 60 * 1000;
const HOTEL_SEARCH_COHORT_PREFIX = "__hotel-search-cohort__:";
const CAR_SEARCH_COHORT_PREFIX = "__car-search-cohort__:";
const MEMORY_CAR_RESULT_LIMIT = 500;
const memoryCarResults = new Map<
  string,
  { value: unknown; expiresAt: number }
>();

const cacheKey = (vertical: ProviderDetailsVertical, resultId: string) =>
  `${vertical}:${resultId}`;

function rememberCarInMemory(key: string, value: unknown, expiresAt: number) {
  const now = Date.now();
  for (const [candidate, entry] of memoryCarResults) {
    if (entry.expiresAt <= now) memoryCarResults.delete(candidate);
  }
  if (
    !memoryCarResults.has(key) &&
    memoryCarResults.size >= MEMORY_CAR_RESULT_LIMIT
  ) {
    const oldest = memoryCarResults.keys().next().value;
    if (oldest) memoryCarResults.delete(oldest);
  }
  memoryCarResults.delete(key);
  memoryCarResults.set(key, {
    value: structuredClone(value),
    expiresAt,
  });
}

function readCarInMemory<T>(key: string, now: number): T | null {
  const entry = memoryCarResults.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    memoryCarResults.delete(key);
    return null;
  }
  return structuredClone(entry.value) as T;
}

function hotelSearchCohortId(search: HotelSearchParams) {
  const identity = JSON.stringify([
    "hotel-search-cohort-v1",
    search.destination.trim().toLocaleLowerCase(),
    search.checkIn,
    search.checkOut,
    search.guests,
    search.rooms,
  ]);
  return `${HOTEL_SEARCH_COHORT_PREFIX}${createHash("sha256").update(identity).digest("hex")}`;
}

function carLocationTargetIdentity(
  target: LocationBoundCarSearchParams["pickupLocationTarget"],
) {
  return target
    ? [
        target.id,
        target.selectionToken ?? "",
        target.codes?.iata ?? "",
        target.submittedValue,
      ]
    : null;
}

function carSearchCohortId(search: LocationBoundCarSearchParams) {
  const identity = JSON.stringify([
    "car-search-cohort-v2",
    search.pickupLocation.trim().toLocaleLowerCase(),
    carLocationTargetIdentity(search.pickupLocationTarget),
    search.dropoffLocation.trim().toLocaleLowerCase(),
    carLocationTargetIdentity(search.dropoffLocationTarget),
    search.pickupDate,
    search.pickupTime,
    search.dropoffDate,
    search.dropoffTime,
    search.driverAge,
  ]);
  return `${CAR_SEARCH_COHORT_PREFIX}${createHash("sha256").update(identity).digest("hex")}`;
}

export async function rememberProviderResults<T extends { id: string }>(
  vertical: ProviderDetailsVertical,
  results: T[],
  searchContext: unknown,
  now = Date.now(),
) {
  if (!results.length) return;
  const expiresAt = new Date(now + TTL_MS);
  if (vertical === "car") {
    for (const result of results) {
      rememberCarInMemory(
        cacheKey("car", result.id),
        result,
        expiresAt.getTime(),
      );
    }
  }
  try {
    await Promise.all(results.map((result) => getPrisma().providerResultCache.upsert({
      where: { cacheKey: cacheKey(vertical, result.id) },
      create: {
        cacheKey: cacheKey(vertical, result.id),
        vertical,
        resultId: result.id,
        normalizedResult: result as never,
        searchContext: searchContext as never,
        expiresAt,
      },
      update: {
        normalizedResult: result as never,
        searchContext: searchContext as never,
        expiresAt,
      },
    })));
  } catch {
    console.error("[provider-result-cache]", { event: "write_error", vertical });
  }
}

export async function getProviderResult<T>(
  vertical: ProviderDetailsVertical,
  resultId: string,
  now = Date.now(),
): Promise<T | null> {
  if (vertical === "car") {
    const memory = readCarInMemory<T>(cacheKey("car", resultId), now);
    if (memory) return memory;
  }
  try {
    const row = await getPrisma().providerResultCache.findUnique({
      where: { cacheKey: cacheKey(vertical, resultId) },
    });
    if (!row || row.expiresAt.getTime() <= now) return null;
    return structuredClone(row.normalizedResult) as T;
  } catch {
    console.error("[provider-result-cache]", { event: "read_error", vertical });
    return null;
  }
}

export async function getProviderResultWithContext<T>(
  vertical: ProviderDetailsVertical,
  resultId: string,
  now = Date.now(),
): Promise<{ result: T; searchContext: unknown } | null> {
  try {
    const row = await getPrisma().providerResultCache.findUnique({
      where: { cacheKey: cacheKey(vertical, resultId) },
    });
    if (!row || row.expiresAt.getTime() <= now) return null;
    return {
      result: structuredClone(row.normalizedResult) as T,
      searchContext: row.searchContext ? structuredClone(row.searchContext) : null,
    };
  } catch {
    console.error("[provider-result-cache]", { event: "context_read_error", vertical });
    return null;
  }
}

/** A server-owned copy of the complete provider result set provides continuity
 * when an individual upsert fails. It is keyed by canonical search fields, not
 * by client-supplied result data. */
export async function rememberCarSearchCohort(
  results: NormalizedCarResult[],
  search: LocationBoundCarSearchParams,
  now = Date.now(),
) {
  if (!results.length) return;
  const resultId = carSearchCohortId(search);
  rememberCarInMemory(
    cacheKey("car", resultId),
    results,
    now + TTL_MS,
  );
  try {
    await getPrisma().providerResultCache.upsert({
      where: { cacheKey: cacheKey("car", resultId) },
      create: {
        cacheKey: cacheKey("car", resultId), vertical: "car", resultId,
        normalizedResult: results as never, searchContext: search as never,
        expiresAt: new Date(now + TTL_MS),
      },
      update: {
        normalizedResult: results as never, searchContext: search as never,
        expiresAt: new Date(now + TTL_MS),
      },
    });
  } catch {
    console.error("[provider-result-cache]", { event: "cohort_write_error", vertical: "car" });
  }
}

export async function getCarSearchCohort(
  search: LocationBoundCarSearchParams,
  now = Date.now(),
): Promise<NormalizedCarResult[]> {
  const resultId = carSearchCohortId(search);
  const memory = readCarInMemory<NormalizedCarResult[]>(
    cacheKey("car", resultId),
    now,
  );
  if (memory) return memory;
  try {
    const row = await getPrisma().providerResultCache.findUnique({
      where: { cacheKey: cacheKey("car", resultId) },
    });
    if (!row || row.expiresAt.getTime() <= now || !Array.isArray(row.normalizedResult)) return [];
    return structuredClone(row.normalizedResult) as unknown as NormalizedCarResult[];
  } catch {
    console.error("[provider-result-cache]", { event: "cohort_read_error", vertical: "car" });
    return [];
  }
}

export async function rememberHotelSearchCohort(
  results: NormalizedHotelResult[],
  search: HotelSearchParams,
  now = Date.now(),
) {
  if (!results.length) return;
  const resultId = hotelSearchCohortId(search);
  try {
    await getPrisma().providerResultCache.upsert({
      where: { cacheKey: cacheKey("hotel", resultId) },
      create: {
        cacheKey: cacheKey("hotel", resultId),
        vertical: "hotel",
        resultId,
        normalizedResult: results as never,
        searchContext: search as never,
        expiresAt: new Date(now + TTL_MS),
      },
      update: {
        normalizedResult: results as never,
        searchContext: search as never,
        expiresAt: new Date(now + TTL_MS),
      },
    });
  } catch {
    console.error("[provider-result-cache]", { event: "cohort_write_error", vertical: "hotel" });
  }
}

export async function getHotelSearchCohort(
  search: HotelSearchParams,
  now = Date.now(),
): Promise<NormalizedHotelResult[]> {
  const resultId = hotelSearchCohortId(search);
  try {
    const row = await getPrisma().providerResultCache.findUnique({
      where: { cacheKey: cacheKey("hotel", resultId) },
    });
    if (!row || row.expiresAt.getTime() <= now || !Array.isArray(row.normalizedResult)) return [];
    return structuredClone(row.normalizedResult) as unknown as NormalizedHotelResult[];
  } catch {
    console.error("[provider-result-cache]", { event: "cohort_read_error", vertical: "hotel" });
    return [];
  }
}
