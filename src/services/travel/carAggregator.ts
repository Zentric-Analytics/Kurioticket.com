import type { CarInventoryStatus, CarSearchParams, LocationBoundCarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import { buildStaticCarResults } from "@/services/travel/staticCarResults";
import { searchKayakCars, type KayakRequestContext } from "./kayakMetasearchProvider";
import { getCarSearchCohort, getProviderResult, rememberCarSearchCohort, rememberProviderResults } from "./providerResultCache";

export type CarSearchResult={results:NormalizedCarResult[];status:CarInventoryStatus;warnings:string[]};
type CarSearchDependencies = {
  searchKayak: typeof searchKayakCars;
  rememberResults: typeof rememberProviderResults<NormalizedCarResult>;
  rememberCohort: typeof rememberCarSearchCohort;
};
const carSearchDependencies: CarSearchDependencies = {
  searchKayak: searchKayakCars,
  rememberResults: rememberProviderResults,
  rememberCohort: rememberCarSearchCohort,
};
export async function searchCars(search:LocationBoundCarSearchParams,options:{kayak?:KayakRequestContext;requestId?:string;dependencies?:CarSearchDependencies}={}):Promise<CarSearchResult>{
  if(!search.pickupLocation||!search.pickupDate||!search.dropoffDate)return{results:[],status:"invalid-search",warnings:[]};
  const dependencies = options.dependencies ?? carSearchDependencies;
  const [catalogue,kayak]=await Promise.all([Promise.resolve(buildStaticCarResults(search)),dependencies.searchKayak(search,options.kayak)]);
  console.info("[car-search:provider-diagnostics]", {
    requestId: options.requestId,
    kayakClientIpPresent: Boolean(options.kayak?.clientIp),
    pickupLocationTargetPresent: Boolean(search.pickupLocationTarget),
    dropoffLocationTargetPresent: Boolean(search.dropoffLocationTarget),
    provider: kayak.provider,
    status: kayak.status,
    resultCount: kayak.results.length,
    latencyMs: kayak.latencyMs,
    errorCategory: kayak.errorCategory,
    errorReason: kayak.errorReason,
  });
  await Promise.all([
    dependencies.rememberResults("car", kayak.results, search),
    dependencies.rememberCohort(kayak.results, search),
  ]);
  return{results:[...catalogue,...kayak.results],status:"available",warnings:kayak.status==="failed"?["KAYAK is temporarily unavailable. Other provider results are shown."]:[]};
}
const KAYAK_CAR_ID_PREFIX = "kayak-sandbox:";

export function isKayakCarResultId(id: string) {
  const opaqueId = id.startsWith(KAYAK_CAR_ID_PREFIX) ? id.slice(KAYAK_CAR_ID_PREFIX.length) : "";
  return opaqueId.length > 0 && opaqueId.length <= 512 && !/[\\/?#\u0000-\u001f\u007f]/.test(opaqueId);
}

function isExactKayakCar(result: NormalizedCarResult | null | undefined, id: string) {
  const policy = (result as (NormalizedCarResult & { searchPolicy?: { source?: string } }) | null | undefined)?.searchPolicy;
  return Boolean(result && result.id === id && result.inventorySource === "kayak-sandbox" &&
    (!policy || policy.source === "kayak-sandbox") && Array.isArray(result.offers));
}

export type CarDetailsDependencies = {
  getExact: typeof getProviderResult<NormalizedCarResult>;
  getCohort: typeof getCarSearchCohort;
  searchKayak: typeof searchKayakCars;
  rememberExact: typeof rememberProviderResults<NormalizedCarResult>;
  rememberCohort: typeof rememberCarSearchCohort;
  buildStatic: typeof buildStaticCarResults;
};

const carDetailsDependencies: CarDetailsDependencies = {
  getExact: (vertical, id) => getProviderResult<NormalizedCarResult>(vertical, id),
  getCohort: getCarSearchCohort,
  searchKayak: searchKayakCars,
  rememberExact: rememberProviderResults,
  rememberCohort: rememberCarSearchCohort,
  buildStatic: buildStaticCarResults,
};

/** Resolve provider IDs without ever interpreting them as static catalogue IDs.
 * All accepted result data comes from server-owned cache records or a fresh
 * provider response; the URL supplies only identity and canonical criteria. */
export async function resolveCarDetails(
  id: string,
  search?: CarSearchParams,
  kayak?: KayakRequestContext,
  dependencies: CarDetailsDependencies = carDetailsDependencies,
) {
  if (!id.startsWith(KAYAK_CAR_ID_PREFIX)) {
    return search ? dependencies.buildStatic(search).find(car => car.id === id) ?? null : null;
  }
  if (!isKayakCarResultId(id)) return null;

  const cached = await dependencies.getExact("car", id);
  if (isExactKayakCar(cached, id)) return cached;
  if (!search) return null;

  const cohortMatch = (await dependencies.getCohort(search)).find(result => isExactKayakCar(result, id));
  if (cohortMatch) return cohortMatch;

  const recovered = await dependencies.searchKayak(search, kayak);
  const exact = recovered.results.find(result => isExactKayakCar(result, id)) ?? null;
  if (exact) {
    await Promise.all([
      dependencies.rememberExact("car", recovered.results, search),
      dependencies.rememberCohort(recovered.results, search),
    ]);
  }
  return exact;
}

export const getCarDetails = resolveCarDetails;
