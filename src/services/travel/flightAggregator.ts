import type { AggregatedResult, FlightSearchParams, NormalizedFlightResult, SortMode } from "@/lib/types";
import { getItineraryDateKey } from "@/lib/utils";
import { rememberFlights } from "@/lib/searchCache";
import { searchDuffelFlights } from "@/services/travel/providers/duffelProvider";

/** The sole production flight pipeline. Provider policy is deliberately not configurable. */
export async function searchFlights(search: FlightSearchParams): Promise<AggregatedResult<NormalizedFlightResult>> {
  const startedAt = Date.now();
  const provider = await searchDuffelFlights(search);
  const results = assignBadges(sortFlights(
    dedupeFlights(provider.results.filter((result) => matchesDeparture(result, search.departureDate))),
    search.sort || "cheapest",
  ));
  if (results.length) rememberFlights(results);
  return {
    results,
    providerStatuses: [provider],
    warnings: provider.status === "failed" ? ["Flight results are temporarily unavailable. Please try again."] : [],
    latencyMs: Date.now() - startedAt,
    ...(provider.status !== "success" ? { unavailableMessage: "Flight results are temporarily unavailable. Please try again." } : {}),
  };
}

export function sortFlights(results: NormalizedFlightResult[], sort: SortMode) {
  const sorted = [...results];
  if (sort === "best") return sorted.sort((a,b)=>b.valueScore-a.valueScore||a.price-b.price);
  if (sort === "fastest") return sorted.sort((a,b)=>a.durationMinutes-b.durationMinutes||a.price-b.price);
  if (sort === "stops") return sorted.sort((a,b)=>a.stops-b.stops||a.price-b.price);
  return sorted.sort((a,b)=>a.price-b.price||b.valueScore-a.valueScore);
}
const matchesDeparture=(result:NormalizedFlightResult,date:string)=>!date||getItineraryDateKey(result.legs?.find(leg=>leg.direction==="outbound")?.departureTime||result.departureTime)===date;
function dedupeFlights(results:NormalizedFlightResult[]){const seen=new Map<string,NormalizedFlightResult>();for(const result of results){const key=[result.airlineName.toLowerCase(),result.originAirport,result.destinationAirport,result.departureTime,result.arrivalTime,result.stops].join("|");const current=seen.get(key);if(!current||result.price<current.price)seen.set(key,result);}return [...seen.values()];}
function assignBadges(results:NormalizedFlightResult[]){if(!results.length)return results;const cheapest=[...results].sort((a,b)=>a.price-b.price)[0].id;const fastest=[...results].sort((a,b)=>a.durationMinutes-b.durationMinutes)[0].id;return results.map(result=>({...result,badges:[result.id===cheapest?"Lowest Price":"",result.id===fastest?"Fastest":"",result.travelConfidenceScore>=78?"Recommended":""].filter(Boolean)}));}

export function filterFlightsByRequestedOutboundDate(results:NormalizedFlightResult[],requestedDepartureDate:string){return results.filter(result=>matchesDeparture(result,requestedDepartureDate));}
