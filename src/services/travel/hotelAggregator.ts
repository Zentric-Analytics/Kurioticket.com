import type { AggregatedResult, HotelSearchParams, NormalizedHotelResult } from "@/lib/types";
import { canUseDevelopmentFallbacks, getHotelResultsMode } from "@/lib/env";
import { rememberHotels } from "@/lib/searchCache";
import { fallbackHotels } from "@/services/travel/fallbackData";
import { buildDemoHotelResults } from "@/services/travel/demoHotelResults";
import { searchHotelProvider } from "@/services/travel/providers/hotelProvider";
import {
  compareHotelsByAvailablePrice,
  getComparableHotelTotalUsd,
  getLowestPricedHotelId,
  hasHotelPrice,
} from "@/lib/hotels/hotelResultAvailability";

export async function searchHotels(search: HotelSearchParams): Promise<AggregatedResult<NormalizedHotelResult>> {
  const startedAt = Date.now();
  const hotelResultsMode = getHotelResultsMode();

  if (hotelResultsMode === "demo") {
    const results = assignBadges(sortHotels(buildDemoHotelResults(search), search.sort || "cheapest"));
    rememberHotels(results);

    return {
      results,
      providerStatuses: [
        {
          provider: "Demo Hotel Catalogue",
          results,
          status: "success",
          latencyMs: Date.now() - startedAt,
        },
      ],
      warnings: ["Demo hotel listings are illustrative and are not live inventory."],
      servedFromFallback: false,
      latencyMs: Date.now() - startedAt,
    };
  }

  const providers = await Promise.all([searchHotelProvider(search)]);
  const merged = providers.flatMap((provider) => provider.results);
  const deduped = assignBadges(sortHotels(dedupeHotels(merged), search.sort || "cheapest"));
  const warnings = providers
    .filter((provider) => provider.status !== "success")
    .map((provider) => sanitizeHotelWarning(provider.error));

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
        "Live hotel search is temporarily unavailable. Please try again shortly.",
    };
  }

  const fallback = assignBadges(sortHotels(fallbackHotels(search), search.sort || "cheapest"));
  rememberHotels(fallback);

  return {
    results: fallback,
    providerStatuses: providers,
    warnings: warnings.length
      ? ["Local development fallback mode is enabled while hotel providers are unavailable."]
      : ["Local development fallback mode is enabled without hotel provider credentials."],
    servedFromFallback: true,
    latencyMs: Date.now() - startedAt,
  };
}

function sanitizeHotelWarning(error?: string) {
  if (error === "no_live_hotel_provider") return "no_live_hotel_provider";
  if (error === "unsupported_destination") return "unsupported_destination";
  return "provider_unavailable";
}

function sortHotels(results: NormalizedHotelResult[], sort: NonNullable<HotelSearchParams["sort"]>) {
  const sorted = results.map((hotel, index) => ({ hotel, index }));
  const stablePriceTie = (a: NormalizedHotelResult, b: NormalizedHotelResult) =>
    compareHotelsByAvailablePrice(a, b);

  if (sort === "best") {
    return sorted
      .sort((a, b) => b.hotel.valueScore - a.hotel.valueScore || stablePriceTie(a.hotel, b.hotel) || a.index - b.index)
      .map(({ hotel }) => hotel);
  }
  if (sort === "rating") {
    return sorted
      .sort((a, b) => b.hotel.rating - a.hotel.rating || stablePriceTie(a.hotel, b.hotel) || a.index - b.index)
      .map(({ hotel }) => hotel);
  }
  if (sort === "location") {
    return sorted
      .sort((a, b) => b.hotel.arrivalSuitabilityScore - a.hotel.arrivalSuitabilityScore || stablePriceTie(a.hotel, b.hotel) || a.index - b.index)
      .map(({ hotel }) => hotel);
  }
  return sorted
    .sort((a, b) => compareHotelsByAvailablePrice(a.hotel, b.hotel) || b.hotel.valueScore - a.hotel.valueScore || a.index - b.index)
    .map(({ hotel }) => hotel);
}

function shouldReplaceDuplicate(existing: NormalizedHotelResult, result: NormalizedHotelResult) {
  const existingPriced = hasHotelPrice(existing);
  const resultPriced = hasHotelPrice(result);
  if (!existingPriced && resultPriced) return true;
  if (existingPriced && !resultPriced) return false;
  if (!existingPriced && !resultPriced) return false;

  const existingTotal = getComparableHotelTotalUsd(existing);
  const resultTotal = getComparableHotelTotalUsd(result);
  return resultTotal !== null && (existingTotal === null || resultTotal < existingTotal);
}

function dedupeHotels(results: NormalizedHotelResult[]) {
  const seen = new Map<string, NormalizedHotelResult>();
  for (const result of results) {
    const key = `${result.name.toLowerCase()}|${result.location.toLowerCase()}`;
    const existing = seen.get(key);
    if (!existing || shouldReplaceDuplicate(existing, result)) {
      seen.set(key, result);
    }
  }
  return [...seen.values()];
}

function assignBadges(results: NormalizedHotelResult[]) {
  if (!results.length) return results;

  const cheapest = getLowestPricedHotelId(results);
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

function maxBy<T>(items: T[], getter: (item: T) => number) {
  return items.reduce<T | null>((best, item) => (!best || getter(item) > getter(best) ? item : best), null);
}
