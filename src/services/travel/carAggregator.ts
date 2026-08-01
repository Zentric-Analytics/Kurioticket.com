import type { CarInventoryStatus, CarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import { buildStaticCarResults } from "@/services/travel/staticCarResults";

export type CarSearchResult={results:NormalizedCarResult[];status:CarInventoryStatus};
export async function searchCars(search:CarSearchParams):Promise<CarSearchResult>{
  if(!search.pickupLocation||!search.pickupDate||!search.dropoffDate)return{results:[],status:"invalid-search"};
  return{results:buildStaticCarResults(search),status:"available"};
}
export async function getCarDetails(id:string,search?:CarSearchParams){return search?buildStaticCarResults(search).find(car=>car.id===id)??null:null;}
