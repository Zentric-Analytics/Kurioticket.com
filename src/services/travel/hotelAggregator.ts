import type { AggregatedResult, HotelSearchParams, NormalizedHotelResult } from "@/lib/types";
import { rememberHotels } from "@/lib/searchCache";
import { buildStaticHotelResults } from "@/services/travel/staticHotelResults";
import { compareHotelsByAvailablePrice } from "@/lib/hotels/hotelResultAvailability";
import { searchKayakHotels, type KayakRequestContext } from "./kayakMetasearchProvider";
import { rememberProviderResults } from "./providerResultCache";

/** The sole current hotel pipeline: deterministic, destination-relevant planning inventory. */
export async function searchHotels(search: HotelSearchParams, options: { kayak?: KayakRequestContext } = {}): Promise<AggregatedResult<NormalizedHotelResult>> {
  const startedAt=Date.now();
  const [catalogue,kayak]=await Promise.all([Promise.resolve(buildStaticHotelResults(search)),searchKayakHotels(search,options.kayak)]);
  const results=dedupeHotels([...catalogue,...kayak.results]).sort(compareHotelsByAvailablePrice);
  if(results.length)rememberHotels(results);
  await rememberProviderResults("hotel", kayak.results, search);
  return {results,providerStatuses:[{provider:"Kurioticket static catalogue",results:catalogue,status:"success",latencyMs:Date.now()-startedAt},kayak],warnings:kayak.status==="failed"?["KAYAK is temporarily unavailable. Other provider results are shown."]:[],latencyMs:Date.now()-startedAt};
}
function dedupeHotels(results:NormalizedHotelResult[]){const seen=new Map<string,NormalizedHotelResult>();for(const result of results){const key=`${result.name.toLowerCase()}|${result.location.toLowerCase()}`;if(!seen.has(key))seen.set(key,result);}return [...seen.values()];}
