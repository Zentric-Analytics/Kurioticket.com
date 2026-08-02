import type { AggregatedResult, HotelSearchParams, NormalizedHotelResult } from "@/lib/types";
import { rememberHotels } from "@/lib/searchCache";
import { searchHotelbedsHotels } from "@/services/travel/providers/hotelbedsProvider";
import { compareHotelsByAvailablePrice } from "@/lib/hotels/hotelResultAvailability";

/** The sole production hotel pipeline. Editorial properties never enter this service. */
export async function searchHotels(search: HotelSearchParams): Promise<AggregatedResult<NormalizedHotelResult>> {
  const startedAt=Date.now();
  const provider=await searchHotelbedsHotels(search);
  const results=dedupeHotels(provider.results).sort(compareHotelsByAvailablePrice);
  if(results.length)rememberHotels(results);
  return {results,providerStatuses:[provider],warnings:provider.status==="failed"?["Hotel availability is temporarily unavailable. Please try again."]:[],latencyMs:Date.now()-startedAt,...(provider.status!=="success"?{unavailableMessage:"Hotel availability is temporarily unavailable. Please try again."}:{})};
}
function dedupeHotels(results:NormalizedHotelResult[]){const seen=new Map<string,NormalizedHotelResult>();for(const result of results){const key=`${result.name.toLowerCase()}|${result.location.toLowerCase()}`;if(!seen.has(key))seen.set(key,result);}return [...seen.values()];}
