import type { AggregatedResult, HotelSearchParams, NormalizedHotelResult } from "@/lib/types";
import { rememberHotels } from "@/lib/searchCache";
import { buildStaticHotelResults } from "@/services/travel/staticHotelResults";
import { compareHotelsByAvailablePrice } from "@/lib/hotels/hotelResultAvailability";
import { searchKayakHotels, type KayakRequestContext } from "./kayakMetasearchProvider";
import { rememberHotelSearchCohort, rememberProviderResults } from "./providerResultCache";

export type HotelProviderMode = "kayak-sandbox";

async function persistHotelProviderResults(
  results: NormalizedHotelResult[],
  search: HotelSearchParams,
) {
  if (results.length) rememberHotels(results, search);
  await Promise.all([
    rememberProviderResults("hotel", results, search),
    rememberHotelSearchCohort(results, search),
  ]);
}

/** Provider-only search mode used by gated diagnostics while retaining the canonical Hotel UI contract. */
export async function searchHotelsByProvider(
  search: HotelSearchParams,
  provider: HotelProviderMode,
  options: { kayak?: KayakRequestContext } = {},
): Promise<AggregatedResult<NormalizedHotelResult>> {
  const startedAt = Date.now();
  if (provider !== "kayak-sandbox") {
    return {
      results: [],
      providerStatuses: [],
      warnings: ["Unsupported Hotel provider mode."],
      latencyMs: Date.now() - startedAt,
      unavailableMessage: "This Hotel provider mode is unavailable.",
    };
  }

  const kayak = await searchKayakHotels(search, options.kayak);
  const results = [...kayak.results].sort(compareHotelsByAvailablePrice);
  await persistHotelProviderResults(results, search);

  return {
    results,
    providerStatuses: [kayak],
    warnings:
      kayak.status === "failed"
        ? ["KAYAK is temporarily unavailable."]
        : [],
    latencyMs: Date.now() - startedAt,
  };
}

/** The sole current hotel pipeline: deterministic catalogue inventory plus enabled providers. */
export async function searchHotels(
  search: HotelSearchParams,
  options: { kayak?: KayakRequestContext } = {},
): Promise<AggregatedResult<NormalizedHotelResult>> {
  const startedAt = Date.now();
  const [catalogue, kayak] = await Promise.all([
    Promise.resolve(buildStaticHotelResults(search)),
    searchKayakHotels(search, options.kayak),
  ]);
  const results = dedupeHotels([...catalogue, ...kayak.results]).sort(
    compareHotelsByAvailablePrice,
  );
  if (results.length) rememberHotels(results, search);
  await Promise.all([
    rememberProviderResults("hotel", kayak.results, search),
    rememberHotelSearchCohort(results, search),
  ]);
  return {
    results,
    providerStatuses: [
      {
        provider: "Kurioticket static catalogue",
        results: catalogue,
        status: "success",
        latencyMs: Date.now() - startedAt,
      },
      kayak,
    ],
    warnings:
      kayak.status === "failed"
        ? ["KAYAK is temporarily unavailable. Other provider results are shown."]
        : [],
    latencyMs: Date.now() - startedAt,
  };
}

function dedupeHotels(results: NormalizedHotelResult[]) {
  const seen = new Map<string, NormalizedHotelResult>();
  for (const result of results) {
    const key = `${result.name.toLowerCase()}|${result.location.toLowerCase()}`;
    if (!seen.has(key)) seen.set(key, result);
  }
  return [...seen.values()];
}
