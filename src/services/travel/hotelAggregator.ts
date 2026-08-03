import type { AggregatedResult, HotelSearchParams, NormalizedHotelResult } from "@/lib/types";
import { rememberHotels } from "@/lib/searchCache";
import { buildStaticHotelResults } from "@/services/travel/staticHotelResults";
import { compareHotelsByAvailablePrice } from "@/lib/hotels/hotelResultAvailability";

/** The sole current hotel pipeline: deterministic, destination-relevant planning inventory. */
export async function searchHotels(search: HotelSearchParams): Promise<AggregatedResult<NormalizedHotelResult>> {
  const startedAt=Date.now();
  const results=dedupeHotels(buildStaticHotelResults(search)).sort(compareHotelsByAvailablePrice);
  if(results.length)rememberHotels(results);
  return {results,providerStatuses:[{provider:"Kurioticket static catalogue",results,status:"success",latencyMs:Date.now()-startedAt}],warnings:[],latencyMs:Date.now()-startedAt};
}
function dedupeHotels(results:NormalizedHotelResult[]){const seen=new Map<string,NormalizedHotelResult>();for(const result of results){const key=`${result.name.toLowerCase()}|${result.location.toLowerCase()}`;if(!seen.has(key))seen.set(key,result);}return [...seen.values()];}
