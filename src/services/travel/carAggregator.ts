import type { CarInventoryStatus, CarSearchParams, LocationBoundCarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import { buildStaticCarResults } from "@/services/travel/staticCarResults";
import { searchKayakCars, type KayakRequestContext } from "./kayakMetasearchProvider";
import { getProviderResult, rememberProviderResults } from "./providerResultCache";

export type CarSearchResult={results:NormalizedCarResult[];status:CarInventoryStatus;warnings:string[]};
export async function searchCars(search:LocationBoundCarSearchParams,options:{kayak?:KayakRequestContext}={}):Promise<CarSearchResult>{
  if(!search.pickupLocation||!search.pickupDate||!search.dropoffDate)return{results:[],status:"invalid-search",warnings:[]};
  const [catalogue,kayak]=await Promise.all([Promise.resolve(buildStaticCarResults(search)),searchKayakCars(search,options.kayak)]);
  await rememberProviderResults("car", kayak.results, search);
  return{results:[...catalogue,...kayak.results],status:"available",warnings:kayak.status==="failed"?["KAYAK is temporarily unavailable. Other provider results are shown."]:[]};
}
export async function getCarDetails(id:string,search?:CarSearchParams){
  const cached=await getProviderResult<NormalizedCarResult>("car",id);
  if(cached) return cached;
  return search?buildStaticCarResults(search).find(car=>car.id===id)??null:null;
}
