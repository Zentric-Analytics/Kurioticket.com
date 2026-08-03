import type { CarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import { buildCarDetailsHref } from "@/lib/cars/carResults";
import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";

export type TravelInventorySource="duffel"|"kurioticket-static-hotels"|"kurioticket-static-cars";
export type TravelSearchStatus="available"|"partial"|"empty"|"unavailable";
export type TravelResultAction={kind:"internal-detail";href:string;enabled:true}|{kind:"provider";href:string;enabled:true}|{kind:"none";enabled:false};
export type TravelResultPolicy={source:TravelInventorySource;bookable:boolean;action:TravelResultAction};
export type ContractResult<T>=T&{searchPolicy:TravelResultPolicy};
export type TravelSearchResponse<T>={results:ContractResult<T>[];status:TravelSearchStatus;source:TravelInventorySource;warnings:string[];partial:boolean;requestId:string};

const status=(count:number,warnings:string[]):TravelSearchStatus=>count?(warnings.length?"partial":"available"):"empty";
export function classifyFlights(results:PublicFlightResult[],warnings:string[],requestId:string):TravelSearchResponse<PublicFlightResult>{const classified=results.map(result=>({...result,searchPolicy:{source:"duffel" as const,bookable:true,action:{kind:"internal-detail" as const,href:`/flights/details/${encodeURIComponent(result.id)}`,enabled:true as const}}}));return{results:classified,status:status(classified.length,warnings),source:"duffel",warnings,partial:Boolean(warnings.length),requestId};}
export function classifyHotels(results:PublicHotelResult[],warnings:string[],requestId:string):TravelSearchResponse<PublicHotelResult>{const classified=results.map(result=>({...result,searchPolicy:{source:"kurioticket-static-hotels" as const,bookable:false,action:{kind:"internal-detail" as const,href:`/hotels/details/${encodeURIComponent(result.id)}`,enabled:true as const}}}));return{results:classified,status:status(classified.length,warnings),source:"kurioticket-static-hotels",warnings,partial:Boolean(warnings.length),requestId};}
export function classifyCars(results:NormalizedCarResult[],search:CarSearchParams,requestId:string):TravelSearchResponse<NormalizedCarResult>{const classified=results.map(result=>({...result,searchPolicy:{source:"kurioticket-static-cars" as const,bookable:false,action:{kind:"internal-detail" as const,href:buildCarDetailsHref(result.id,search),enabled:true as const}}}));return{results:classified,status:classified.length?"available":"empty",source:"kurioticket-static-cars",warnings:[],partial:false,requestId};}
