import type { AggregatedResult, HotelSearchParams, NormalizedHotelResult } from "@/lib/types";
import { rememberHotels } from "@/lib/searchCache";
import { providerSearchWarnings } from "./providerSearchOutcome";
import { compareHotelsByAvailablePrice } from "@/lib/hotels/hotelResultAvailability";
import { searchKayakHotels, type KayakRequestContext } from "./kayakMetasearchProvider";
import { rememberHotelSearchCohort, rememberProviderResults } from "./providerResultCache";
import { persistHotelInventory } from "./persistHotelInventory";
type HotelSearchOptions = { kayak?: KayakRequestContext; defer?: (task: () => Promise<void>) => void;
  dependencies?: { searchKayak: typeof searchKayakHotels; persist: typeof persistHotelProviderResults } };

export type HotelProviderMode = "kayak-sandbox";

async function persistHotelProviderResults(
  results: NormalizedHotelResult[],
  search: HotelSearchParams,
  defer?: HotelSearchOptions["defer"],
) {
  if (results.length) rememberHotels(results, search);
  await persistHotelInventory(
    () => rememberHotelSearchCohort(results, search),
    () => rememberProviderResults("hotel", results, search),
    defer,
  );
}

/** Provider-only search mode used by gated diagnostics while retaining the canonical Hotel UI contract. */
export async function searchHotelsByProvider(
  search: HotelSearchParams,
  provider: HotelProviderMode,
  options: HotelSearchOptions = {},
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

  const kayak = await (options.dependencies?.searchKayak ?? searchKayakHotels)(search, options.kayak);
  const results = [...kayak.results].sort(compareHotelsByAvailablePrice);
  await (options.dependencies?.persist ?? persistHotelProviderResults)(results, search, options.defer);

  return {
    results,
    providerStatuses: [kayak],
    warnings: providerSearchWarnings([kayak], results.length),
    latencyMs: Date.now() - startedAt,
  };
}

/** Availability results contain provider offers only. Catalogue planning data is not inventory. */
export async function searchHotels(
  search: HotelSearchParams,
  options: HotelSearchOptions = {},
): Promise<AggregatedResult<NormalizedHotelResult>> {
  const startedAt = Date.now();
  const kayak = await (options.dependencies?.searchKayak ?? searchKayakHotels)(search, options.kayak);
  const results = dedupeHotels(kayak.results).sort(
    compareHotelsByAvailablePrice,
  );
  await (options.dependencies?.persist ?? persistHotelProviderResults)(results, search, options.defer);
  return {
    results,
    providerStatuses: [kayak],
    warnings: providerSearchWarnings([kayak], results.length),
    latencyMs: Date.now() - startedAt,
  };
}

export function dedupeHotels(results: NormalizedHotelResult[]) {
  const seen = new Map<string, NormalizedHotelResult>();
  for (const result of results) {
    // Names are not property identities, and properties can have distinct rates.
    // Remove only repetitions of the same provider offer; never let catalogue
    // ordering erase live offers or their room/cancellation terms.
    const key = JSON.stringify([result.provider, result.id]);
    if (!seen.has(key)) seen.set(key, result);
  }
  return [...seen.values()];
}
