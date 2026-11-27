import { inventoryAccounting } from "@/shared/search/inventory";
import { createSearchDiagnostics } from "@/shared/search/diagnostics";
import { settleWithDeadline } from "./metasearch";
import { providersFor, runRegisteredProviders, type ProviderRegistration } from "./providerRegistry";
import { productionSandboxInventory } from "@/lib/productionSandboxPolicy";
import type {
  AggregatedResult,
  FlightSearchParams,
  NormalizedFlightResult,
  ProviderResult,
  SortMode,
} from "@/lib/types";
import { getItineraryDateKey } from "@/lib/utils";
import { getSearchLegs } from "@/lib/flights/flightSearchJourney";
import { FLIGHT_CACHE_TTL_MS, rememberFlights } from "@/lib/searchCache";
import {
  deduplicateFlightOffers,
  isFlightProviderOfferUsableAt,
} from "@/services/travel/flightOfferInventory";
import { type KayakRequestContext } from "./kayakMetasearchProvider";
import { providerSearchWarnings } from "./providerSearchOutcome";

/** The sole production flight pipeline. Provider policy is deliberately not configurable. */
export async function searchFlights(
  search: FlightSearchParams,
  options: { signal?: AbortSignal; deadlineMs?: number; onProviderStart?: () => void; requestId?: string; kayak?: KayakRequestContext; fareOnly?: boolean; providers?: readonly ProviderRegistration<"flights">[] } = {},
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
  resultsCacheValidUntil?: number;
}> {
  const startedAt = Date.now();
  const providerStatuses = await runRegisteredProviders(providersFor("flights", options.providers), search, options);
  const provider = providerStatuses.find(result => result.provider === "Duffel") ?? providerStatuses[0] ?? {provider:"none",results:[],status:"skipped" as const,latencyMs:0};
  const providerPerformance = (provider as typeof provider & {
    performance?: { supplierMs: number; normalizationMs: number; offerCount: number; connectingOfferCount: number };
  }).performance;
  const now = Date.now();
  const aggregationStartedAt = performance.now();
  const deduplicationStartedAt = performance.now();
  const usableResults = providerStatuses.flatMap(provider => provider.results).filter(
    (result) =>
      matchesRequestedLegs(result, search) &&
      isFlightProviderOfferUsableAt(result, now),
  );
  const deduplicatedResults = deduplicateFlightOffers(usableResults);
  const deduplicationMs = performance.now() - deduplicationStartedAt;
  createSearchDiagnostics("flight", options.requestId, "server", { span: "aggregation" })("deduplication", { count: deduplicatedResults.length, durationMs: deduplicationMs });
  const results = assignBadges(
    sortFlights(
      deduplicatedResults,
      search.sort || "cheapest",
    ),
  );
  const aggregationMs = performance.now() - aggregationStartedAt;
  const liveResults = results.filter(result=>!productionSandboxInventory(result));
  const groups=new Map<string,NormalizedFlightResult[]>();
  for(const row of liveResults) { const group=groups.get(row.provider);if(group)group.push(row);else groups.set(row.provider,[row]); }
  const certifications=await Promise.all((options.fareOnly?[]:[...groups.values()]).map(async rows=>{
    try { return {rows,certificate:await rememberFlights(rows,now,search,options.requestId)}; }
    catch {return {rows,certificate:{persisted:false,validForMs:0}};}
  }));
  const certifiedIds=new Set(certifications.flatMap(item=>item.certificate.persisted?item.rows.map(row=>row.id):[]));
  const validCertificates=certifications.filter(item=>item.certificate.persisted);
  const cacheResult={persisted:certifications.every(item=>item.certificate.persisted),validForMs:options.fareOnly?results.reduce((remaining,row)=>Math.min(remaining,(row.providerExpiresAt??Infinity)-now),FLIGHT_CACHE_TTL_MS):validCertificates.length?Math.min(...validCertificates.map(item=>item.certificate.validForMs)):0};
  const actionableResults = options.fareOnly?results:results.filter(row=>productionSandboxInventory(row)||certifiedIds.has(row.id));
  const cacheUnavailable = !options.fareOnly && liveResults.some(row=>!certifiedIds.has(row.id));
  console.info("[search:inventory-accounting]",{requestId:options.requestId,product:"flights",stages:inventoryAccounting([{stage:"normalized",rows:providerStatuses.flatMap(provider=>provider.results)},{stage:"deduplicated",rows:results},{stage:"policy-eligible",rows:actionableResults}])});
  return {
    results: actionableResults,
    providerStatuses,
    warnings:
      providerStatuses.some(provider=>provider.status === "failed") || cacheUnavailable
        ? ["Flight results are temporarily unavailable. Please try again."]
        : providerSearchWarnings(providerStatuses, actionableResults.length),
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
    resultsCacheValidUntil: now + cacheResult.validForMs,
    ...((!actionableResults.length && (providerStatuses.some(provider=>provider.status === "failed") || cacheUnavailable))
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
  const startedAt=Date.now();
  return settleWithDeadline<ProviderResult<T>>(task,options.deadlineMs??FLIGHT_SEARCH_DEADLINE_MS,options.signal,reason=>({provider:"Duffel",results:[],status:"failed",latencyMs:Date.now()-startedAt,error:reason==="failed"?"provider_failed":"provider_timeout",errorCategory:reason==="failed"?"failed":"timeout",errorReason:reason==="failed"?"provider_failed":"provider_timeout"}));
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
