import type {
  AggregatedResult,
  FlightSearchParams,
  NormalizedFlightResult,
  ProviderResult,
  SortMode,
} from "@/lib/types";
import { getItineraryDateKey } from "@/lib/utils";
import { getSearchLegs } from "@/lib/flights/flightSearchJourney";
import { rememberFlights } from "@/lib/searchCache";
import { searchDuffelFlights } from "@/services/travel/providers/duffelProvider";
import {
  deduplicateFlightOffers,
  isFlightProviderOfferUsableAt,
} from "@/services/travel/flightOfferInventory";

/** The sole production flight pipeline. Provider policy is deliberately not configurable. */
export async function searchFlights(
  search: FlightSearchParams,
  options: { signal?: AbortSignal; deadlineMs?: number; onProviderStart?: () => void; requestId?: string } = {},
): Promise<AggregatedResult<NormalizedFlightResult> & {
  performance: {
    supplierMs: number;
    offerCount: number;
    connectingOfferCount: number;
    normalizationMs: number;
    deduplicationMs: number;
    aggregationMs: number;
  };
  resultsCacheValidForMs?: number;
}> {
  const startedAt = Date.now();
  const provider = await runWithFlightSearchDeadline(
    (signal) => {
      options.onProviderStart?.();
      return searchDuffelFlights(search, signal);
    },
    options,
  );
  const providerPerformance = (provider as typeof provider & {
    performance?: { supplierMs: number; normalizationMs: number; offerCount: number; connectingOfferCount: number };
  }).performance;
  const now = Date.now();
  const aggregationStartedAt = performance.now();
  const deduplicationStartedAt = performance.now();
  const usableResults = provider.results.filter(
    (result) =>
      matchesRequestedLegs(result, search) &&
      isFlightProviderOfferUsableAt(result, now),
  );
  const deduplicatedResults = deduplicateFlightOffers(usableResults);
  const deduplicationMs = performance.now() - deduplicationStartedAt;
  const results = assignBadges(
    sortFlights(
      deduplicatedResults,
      search.sort || "cheapest",
    ),
  );
  const aggregationMs = performance.now() - aggregationStartedAt;
  const cacheResult = results.length
    ? await rememberFlights(results, now, search, options.requestId)
    : { persisted: true, validForMs: 0 };
  const actionableResults = cacheResult.persisted ? results : [];
  const cacheUnavailable = results.length > 0 && !cacheResult.persisted;
  return {
    results: actionableResults,
    providerStatuses: [provider],
    warnings:
      provider.status === "failed" || cacheUnavailable
        ? ["Flight results are temporarily unavailable. Please try again."]
        : [],
    latencyMs: Date.now() - startedAt,
    performance: {
      supplierMs: providerPerformance?.supplierMs ?? provider.latencyMs,
      offerCount: providerPerformance?.offerCount ?? provider.results.length,
      connectingOfferCount: providerPerformance?.connectingOfferCount ??
        provider.results.filter((result) => result.stops > 0).length,
      normalizationMs: providerPerformance?.normalizationMs ?? 0,
      deduplicationMs,
      aggregationMs,
    },
    resultsCacheValidForMs: cacheResult.validForMs,
    ...(provider.status !== "success" || cacheUnavailable
      ? {
          unavailableMessage:
            "Flight results are temporarily unavailable. Please try again.",
        }
      : {}),
  };
}

/** Leaves response time for route serialization before the mobile hard timeout. */
export const FLIGHT_SEARCH_DEADLINE_MS = 12_000;

export async function runWithFlightSearchDeadline<T>(
  task: (signal: AbortSignal) => Promise<ProviderResult<T>>,
  options: { signal?: AbortSignal; deadlineMs?: number } = {},
) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort, { once: true });
  if (options.signal?.aborted) controller.abort();
  let timeout: ReturnType<typeof setTimeout>;
  const deadlineResult = new Promise<ProviderResult<T>>((resolve) => {
    timeout = setTimeout(() => {
      controller.abort();
      resolve({ provider: "Duffel", results: [], status: "failed", latencyMs: Date.now() - startedAt, error: "provider_timeout", errorCategory: "timeout", errorReason: "provider_timeout" });
    }, options.deadlineMs ?? FLIGHT_SEARCH_DEADLINE_MS);
  });
  try {
    return await Promise.race([task(controller.signal), deadlineResult]);
  } finally {
    clearTimeout(timeout!);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

export function sortFlights(results: NormalizedFlightResult[], sort: SortMode) {
  const sorted = [...results];
  if (sort === "best")
    return sorted.sort(
      (a, b) => b.valueScore - a.valueScore || a.price - b.price,
    );
  if (sort === "fastest")
    return sorted.sort(
      (a, b) => a.durationMinutes - b.durationMinutes || a.price - b.price,
    );
  if (sort === "stops")
    return sorted.sort((a, b) => a.stops - b.stops || a.price - b.price);
  return sorted.sort(
    (a, b) => a.price - b.price || b.valueScore - a.valueScore,
  );
}
const matchesDeparture = (result: NormalizedFlightResult, date: string) =>
  !date ||
  getItineraryDateKey(
    result.legs?.find((leg) => leg.direction === "outbound")?.departureTime ||
      result.departureTime,
  ) === date;
const matchesRequestedLegs = (result: NormalizedFlightResult, search: FlightSearchParams) => {
  const requested = getSearchLegs(search);
  const actual = result.legs ?? [];
  return actual.length === requested.length && requested.every((leg, index) => {
    const candidate = actual[index];
    return candidate?.originAirport.toUpperCase() === leg.origin.toUpperCase() &&
      candidate.destinationAirport.toUpperCase() === leg.destination.toUpperCase() &&
      getItineraryDateKey(candidate.departureTime) === leg.departureDate;
  });
};
function assignBadges(results: NormalizedFlightResult[]) {
  if (!results.length) return results;
  const cheapest = [...results].sort((a, b) => a.price - b.price)[0].id;
  const fastest = [...results].sort(
    (a, b) => a.durationMinutes - b.durationMinutes,
  )[0].id;
  return results.map((result) => ({
    ...result,
    badges: [
      result.id === cheapest ? "Lowest Price" : "",
      result.id === fastest ? "Fastest" : "",
      result.travelConfidenceScore >= 78 ? "Recommended" : "",
    ].filter(Boolean),
  }));
}

export function filterFlightsByRequestedOutboundDate(
  results: NormalizedFlightResult[],
  requestedDepartureDate: string,
) {
  return results.filter((result) =>
    matchesDeparture(result, requestedDepartureDate),
  );
}

export function filterFlightsByRequestedLegs(results: NormalizedFlightResult[], search: FlightSearchParams) {
  return results.filter((result) => matchesRequestedLegs(result, search));
}
