import type { AggregatedResult, FlightSearchParams, NormalizedFlightResult, SortMode } from "@/lib/types";
import { canUseDevelopmentFallbacks, getFlightProviderPrimary } from "@/lib/env";
import { rememberFlights } from "@/lib/searchCache";
import { fallbackFlights } from "@/services/travel/fallbackData";
import { searchDuffelFlights } from "@/services/travel/providers/duffelProvider";
import { skippedProvider } from "@/services/travel/providerUtils";

export async function searchFlights(search: FlightSearchParams): Promise<AggregatedResult<NormalizedFlightResult>> {
  const startedAt = Date.now();
  const providers = await Promise.all([selectFlightProvider(search)]);

  const merged = providers.flatMap((provider) => provider.results);
  const deduped = assignBadges(sortFlights(dedupeFlights(merged), search.sort || "cheapest"));
  const providerWarnings = providers
    .filter((provider) => provider.status === "failed")
    .map((provider) => `${provider.provider} provider failed internally.`);

  if (deduped.length > 0) {
    rememberFlights(deduped);
    return {
      results: deduped,
      providerStatuses: providers,
      warnings: [],
      servedFromFallback: false,
      latencyMs: Date.now() - startedAt,
    };
  }

  if (!canUseDevelopmentFallbacks()) {
    return {
      results: [],
      providerStatuses: providers,
      warnings: providerWarnings,
      servedFromFallback: false,
      latencyMs: Date.now() - startedAt,
      unavailableMessage: "Live flight results are temporarily unavailable. Please try again shortly.",
    };
  }

  const fallback = assignBadges(sortFlights(fallbackFlights(search), search.sort || "cheapest"));
  rememberFlights(fallback);

  return {
    results: fallback,
    providerStatuses: providers,
    warnings: providerWarnings.length
      ? ["Local development fallback mode is enabled while live providers are unavailable."]
      : ["Local development fallback mode is enabled without live provider credentials."],
    servedFromFallback: true,
    latencyMs: Date.now() - startedAt,
  };
}

function selectFlightProvider(search: FlightSearchParams) {
  const primaryProvider = getFlightProviderPrimary();

  if (primaryProvider === "duffel") {
    return searchDuffelFlights(search);
  }

  return Promise.resolve(
    skippedProvider<NormalizedFlightResult>(
      "Flight Provider",
      "no_live_flight_provider",
    ),
  );
}

export function sortFlights(results: NormalizedFlightResult[], sort: SortMode) {
  const sorted = [...results];
  if (sort === "best") return sorted.sort((a, b) => b.valueScore - a.valueScore || a.price - b.price);
  if (sort === "fastest") return sorted.sort((a, b) => a.durationMinutes - b.durationMinutes || a.price - b.price);
  if (sort === "stops") return sorted.sort((a, b) => a.stops - b.stops || a.price - b.price);
  return sorted.sort((a, b) => a.price - b.price || b.valueScore - a.valueScore);
}

function dedupeFlights(results: NormalizedFlightResult[]) {
  const seen = new Map<string, NormalizedFlightResult>();

  for (const result of results) {
    const key = [
      result.airlineName.toLowerCase(),
      result.originAirport,
      result.destinationAirport,
      roundedTime(result.departureTime),
      roundedTime(result.arrivalTime),
      result.stops,
    ].join("|");
    const existing = seen.get(key);
    if (!existing || result.price < existing.price) {
      seen.set(key, result);
    }
  }

  return [...seen.values()];
}

function assignBadges(results: NormalizedFlightResult[]) {
  if (!results.length) return results;

  const cheapest = minBy(results, (flight) => flight.price)?.id;
  const fastest = minBy(results, (flight) => flight.durationMinutes)?.id;
  const fewestStops = minBy(results, (flight) => flight.stops)?.id;
  const bestValue = maxBy(results, (flight) => flight.valueScore)?.id;
  const lowRisk = results.filter((flight) => flight.riskScore <= 35).map((flight) => flight.id);

  return results.map((result) => ({
    ...result,
    badges: [
      result.id === cheapest ? "Lowest Price" : "",
      result.id === fastest ? "Fastest" : "",
      result.id === fewestStops ? "Fewest Stops" : "",
      result.id === bestValue ? "Best Value" : "",
      lowRisk.includes(result.id) ? "Low Risk" : "",
      result.travelConfidenceScore >= 78 ? "Recommended" : "",
    ].filter(Boolean),
  }));
}

function roundedTime(value: string) {
  const date = new Date(value);
  date.setMinutes(Math.round(date.getMinutes() / 10) * 10, 0, 0);
  return date.toISOString();
}

function minBy<T>(items: T[], getter: (item: T) => number) {
  return items.reduce<T | null>((best, item) => (!best || getter(item) < getter(best) ? item : best), null);
}

function maxBy<T>(items: T[], getter: (item: T) => number) {
  return items.reduce<T | null>((best, item) => (!best || getter(item) > getter(best) ? item : best), null);
}
