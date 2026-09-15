import type { CarInventoryStatus, CarSearchParams, LocationBoundCarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import { buildStaticCarResults } from "@/services/travel/staticCarResults";
import { searchKayakCars, type KayakRequestContext } from "./kayakMetasearchProvider";

export type CarSearchResult={results:NormalizedCarResult[];status:CarInventoryStatus;warnings:string[]};
const detailsCache = new Map<string,{value:NormalizedCarResult;expiresAt:number}>();
const DETAILS_TTL_MS = 30 * 60 * 1000;
function rememberCars(results: NormalizedCarResult[]) {
  const now = Date.now();
  for (const [id, entry] of detailsCache) if (entry.expiresAt <= now) detailsCache.delete(id);
  for (const result of results) detailsCache.set(result.id,{value:result,expiresAt:now+DETAILS_TTL_MS});
}
export async function searchCars(search:LocationBoundCarSearchParams,options:{kayak?:KayakRequestContext}={}):Promise<CarSearchResult>{
  if(!search.pickupLocation||!search.pickupDate||!search.dropoffDate)return{results:[],status:"invalid-search",warnings:[]};
  const [catalogue,kayak]=await Promise.all([Promise.resolve(buildStaticCarResults(search)),searchKayakCars(search,options.kayak)]);
  const results=[...catalogue,...kayak.results];
  rememberCars(results);
  return{results,status:"available",warnings:kayak.status==="failed"?["KAYAK is temporarily unavailable. Other provider results are shown."]:[]};
}
export async function getCarDetails(id:string,search?:CarSearchParams){
  const cached=detailsCache.get(id);
  if(cached&&cached.expiresAt>Date.now()) return cached.value;
  return search?buildStaticCarResults(search).find(car=>car.id===id)??null:null;
}
