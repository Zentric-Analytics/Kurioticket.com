import { inventoryAccounting } from "@/shared/search/inventory";
import { settleWithDeadline } from "./metasearch";
import { providersFor, runRegisteredProviders, type ProviderRegistration } from "./providerRegistry";
import type { AggregatedResult, HotelSearchParams, NormalizedHotelResult } from "@/lib/types";
import { rememberHotels } from "@/lib/searchCache";
import { providerSearchWarnings } from "./providerSearchOutcome";
import { compareHotelsByAvailablePrice } from "@/lib/hotels/hotelResultAvailability";
import { searchKayakHotels, type KayakRequestContext } from "./kayakMetasearchProvider";
import { getHotelSearchCohort, rememberHotelSearchCohort, rememberProviderResults } from "./providerResultCache";
import { persistHotelInventory } from "./persistHotelInventory";
type HotelSearchOptions = { signal?: AbortSignal; deadlineMs?: number; requestId?: string; providers?: readonly ProviderRegistration<"hotels">[]; kayak?: KayakRequestContext; defer?: (task: () => Promise<void>) => void;
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

  const providerStatuses = await runRegisteredProviders(providersFor("hotels", options.providers).map(registration =>
    options.dependencies && registration.id === "kayak" ? {...registration, execute: (query: HotelSearchParams, context: import("./providerRegistry").ProviderExecutionContext) => options.dependencies!.searchKayak(query, context.kayak)} : registration), search, options);
  const inventory = providerStatuses.flatMap(provider => provider.results);
  const results = [...inventory].sort(compareHotelsByAvailablePrice);
  await (options.dependencies?.persist ?? persistHotelProviderResults)(results, search, options.defer);

  console.info("[search:inventory-accounting]",{requestId:options.requestId,product:"hotels",stages:inventoryAccounting([{stage:"normalized",rows:inventory},{stage:"deduplicated",rows:results}])});
  return {
    results,
    providerStatuses,
    warnings: providerSearchWarnings(providerStatuses, results.length),
    latencyMs: Date.now() - startedAt,
  };
}

/** Availability results contain provider offers only. Catalogue planning data is not inventory. */
export async function searchHotels(
  search: HotelSearchParams,
  options: HotelSearchOptions = {},
): Promise<AggregatedResult<NormalizedHotelResult>> {
  const startedAt = Date.now();
  const providerStatuses = await runRegisteredProviders(providersFor("hotels", options.providers).map(registration =>
    options.dependencies && registration.id === "kayak" ? {...registration, execute: (query: HotelSearchParams, context: import("./providerRegistry").ProviderExecutionContext) => options.dependencies!.searchKayak(query, context.kayak)} : registration), search, options);
  const inventory = providerStatuses.flatMap(provider => provider.results);
  const results = dedupeHotels(inventory).sort(
    compareHotelsByAvailablePrice,
  );
  await (options.dependencies?.persist ?? persistHotelProviderResults)(results, search, options.defer);
  console.info("[search:inventory-accounting]",{requestId:options.requestId,product:"hotels",stages:inventoryAccounting([{stage:"normalized",rows:inventory},{stage:"deduplicated",rows:results}])});
  return {
    results,
    providerStatuses,
    warnings: providerSearchWarnings(providerStatuses, results.length),
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

/** Authoritative hotel business service used by the signed legacy transport. */
export async function searchHotelBatch(search:HotelSearchParams, context:KayakRequestContext, snapshot:string, checkpoint?:import("./kayakSandbox").KayakHotelBatchCheckpoint, options: {providers?:readonly ProviderRegistration<"hotels">[];getCohort?:typeof getHotelSearchCohort;persist?:typeof persistHotelProviderResults} = {}) {
  const registration=providersFor("hotels",options.providers).find(provider=>provider.id==="kayak");
  if(!registration?.hotelBatch || !registration.supports(search)) return {supported:false as const};
  const outcome=await settleWithDeadline(signal=>registration.hotelBatch!(search,{...context,signal},snapshot,checkpoint),registration.timeoutMs,context.signal,()=>null);
  if(!outcome) throw new Error("Hotel batch unavailable");
  if(!outcome.supported) return outcome;
  const previous=checkpoint ? (await (options.getCohort??getHotelSearchCohort)(search)).filter(row=>row.id.startsWith("kayak-sandbox:"+snapshot+":")) : [];
  if(checkpoint && !previous.length) throw new Error("Hotel snapshot expired");
  const cumulative=dedupeHotels([...previous,...outcome.results]);
  await (options.persist??persistHotelProviderResults)(cumulative,search);
  return {...outcome,cumulative};
}
