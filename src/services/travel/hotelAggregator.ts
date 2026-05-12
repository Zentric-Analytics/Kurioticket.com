import type { AggregatedResult, HotelSearchParams, NormalizedHotelResult } from "@/lib/types";
import { canUseDevelopmentFallbacks } from "@/lib/env";
import { rememberHotels } from "@/lib/searchCache";
import { fallbackHotels } from "@/services/travel/fallbackData";
import { searchHotelProvider } from "@/services/travel/providers/hotelProvider";

export async function searchHotels(search: HotelSearchParams): Promise<AggregatedResult<NormalizedHotelResult>> {
  const startedAt = Date.now();
  const providers = await Promise.all([searchHotelProvider(search)]);
  const merged = providers.flatMap((provider) => provider.results);
  const deduped = assignBadges(sortHotels(dedupeHotels(merged), search.sort || "cheapest"));
  const warnings = providers
    .filter((provider) => provider.status !== "success")
    .map((provider) => `${provider.provider}: ${provider.error || "Unavailable"}`);

  if (deduped.length > 0) {
    rememberHotels(deduped);
    return {
      results: deduped,
      providerStatuses: providers,
      warnings,
      servedFromFallback: false,
      latencyMs: Date.now() - startedAt,
    };
  }

  if (!canUseDevelopmentFallbacks()) {
    return {
      results: [],
      providerStatuses: providers,
      warnings,
      servedFromFallback: false,
      latencyMs: Date.now() - startedAt,
      unavailableMessage:
        "Live hotel search is temporarily unavailable. Our provider connections are being checked, and we are not showing development fallback stays in production.",
    };
  }

  const fallback = assignBadges(sortHotels(fallbackHotels(search), search.sort || "cheapest"));
  rememberHotels(fallback);

  return {
    results: fallback,
    providerStatuses: providers,
    warnings: warnings.length
      ? warnings
      : ["Hotel providers are not configured yet. Showing development fallback results."],
    servedFromFallback: true,
    latencyMs: Date.now() - startedAt,
  };
}

function sortHotels(results: NormalizedHotelResult[], sort: NonNullable<HotelSearchParams["sort"]>) {
  const sorted = [...results];
  if (sort === "best") return sorted.sort((a, b) => b.valueScore - a.valueScore || a.totalPrice - b.totalPrice);
  if (sort === "rating") return sorted.sort((a, b) => b.rating - a.rating || a.totalPrice - b.totalPrice);
  if (sort === "location") {
    return sorted.sort((a, b) => b.arrivalSuitabilityScore - a.arrivalSuitabilityScore || a.totalPrice - b.totalPrice);
  }
  return sorted.sort((a, b) => a.totalPrice - b.totalPrice || b.valueScore - a.valueScore);
}

function dedupeHotels(results: NormalizedHotelResult[]) {
  const seen = new Map<string, NormalizedHotelResult>();
  for (const result of results) {
    const key = `${result.name.toLowerCase()}|${result.location.toLowerCase()}`;
    const existing = seen.get(key);
    if (!existing || result.totalPrice < existing.totalPrice) {
      seen.set(key, result);
    }
  }
  return [...seen.values()];
}

function assignBadges(results: NormalizedHotelResult[]) {
  if (!results.length) return results;

  const cheapest = minBy(results, (hotel) => hotel.totalPrice)?.id;
  const bestValue = maxBy(results, (hotel) => hotel.valueScore)?.id;
  const arrival = maxBy(results, (hotel) => hotel.arrivalSuitabilityScore)?.id;

  return results.map((result) => ({
    ...result,
    badges: [
      result.id === cheapest ? "Lowest Price" : "",
      result.id === bestValue ? "Best Value" : "",
      result.id === arrival ? "Easy Arrival" : "",
      result.travelConfidenceScore >= 78 ? "Recommended" : "",
    ].filter(Boolean),
  }));
}

function minBy<T>(items: T[], getter: (item: T) => number) {
  return items.reduce<T | null>((best, item) => (!best || getter(item) < getter(best) ? item : best), null);
}

function maxBy<T>(items: T[], getter: (item: T) => number) {
  return items.reduce<T | null>((best, item) => (!best || getter(item) > getter(best) ? item : best), null);
}
