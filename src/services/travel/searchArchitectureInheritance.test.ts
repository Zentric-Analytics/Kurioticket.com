import assert from "node:assert/strict";
import test from "node:test";
import {writeFileSync} from "node:fs";
import {fixtureProvider} from "./fixtures/testProviders";
import {searchFlights,filterFlightsByRequestedLegs} from "./flightAggregator";
import {searchHotels,hotelSearchRequiresCanonicalResponse} from "./hotelAggregator";
import {searchCars} from "./carAggregator";
import {buildStaticHotelResults} from "./staticHotelResults";
import {buildStaticCarResults} from "./staticCarResults";
import {setFlightResultCacheBackendForTests,toPublicFlight,toPublicHotel} from "@/lib/searchCache";
import {classifyFlights,classifyHotels,classifyCars} from "@/lib/travel/searchContract";
import {flightSearchSchema,hotelSearchSchema} from "@/lib/validation";
import {searchLifecycle} from "@/shared/search/lifecycle";
import {groupHotelOffers} from "@/lib/hotels/groupHotelOffers";
import {sortCarResults} from "@/lib/cars/carResults";
import {recentSearchInputSchema} from "@/services/recentSearchesService";
import type {NormalizedFlightResult,FlightSearchParams} from "@/lib/types";

const mobile="../../../apps/mobile/src/";
const {nativeTravelApiHarness}=await import(mobile+"api/testsupport/travelApiHarness.ts");
const {buildSearchPlan,validFlight,safeCanonicalHotelResult,safeCanonicalCarResult}=await import(mobile+"features/flow/travelSearchModel.ts");
const {acceptCanonicalResults}=await import(mobile+"features/flow/canonicalResultAcceptance.ts");
const {buildRecentSearch}=await import(mobile+"features/recent/recentSearchModel.ts");
const {sanitizeSearchParams}=await import(mobile+"features/flow/savedSearchContext.ts");
const {presentSearchResults}=await import(mobile+"features/search/searchFailurePresentation.ts");

function flightFixture(search:FlightSearchParams):NormalizedFlightResult {
 const legs=search.legs!.map((leg,index)=>({direction:index===0?"outbound" as const:"return" as const,originAirport:leg.origin,destinationAirport:leg.destination,departureTime:`${leg.departureDate}T10:00:00Z`,arrivalTime:`${leg.departureDate}T12:00:00Z`,duration:"2h",durationMinutes:120,stops:0,layovers:[],segments:[]}));
 return {id:"fixture:flight:one",provider:"Fixture flights",airlineName:"Fixture Air",originAirport:search.origin,destinationAirport:search.destination,departureTime:legs[0].departureTime,arrivalTime:legs[0].arrivalTime,legs,duration:"2h",durationMinutes:120,stops:0,layovers:[],cabinClass:"economy",price:100,currency:"USD",bookingUrl:"",partnerRedirectUrl:"",baggageInfo:"Unknown",refundInfo:"Unknown",valueScore:50,riskScore:0,comfortScore:50,travelConfidenceScore:50,travelEffortScore:50,recommendationReasons:[],badges:[]};
}

test("one central provider per product reaches actual web and shared Android/iOS consumption contracts",async context=>{
 context.mock.timers.enable({apis:["Date"],now:Date.UTC(2026,10,24,12)});
 const previous=process.env.NODE_ENV;Object.assign(process.env,{NODE_ENV:"test"});
 try {
  setFlightResultCacheBackendForTests({write:async rows=>rows.map(row=>row.publicResultId),find:async()=>null,findCompatible:async()=>[],cleanupExpired:async()=>0});
  const flight=flightSearchSchema.parse({tripType:"round-trip",origin:"LAX",destination:"SFO",departureDate:"2026-12-25",returnDate:"2026-12-29",adults:1,children:0,infants:0,travelers:1,cabinClass:"economy",currency:"USD"});
  const hotel=hotelSearchSchema.parse({destination:"New York, United States",checkIn:"2026-12-25",checkOut:"2026-12-29",guests:2,adults:2,children:0,rooms:1});
  const car={pickupLocation:"London Heathrow Airport (LHR)",dropoffLocation:"London Heathrow Airport (LHR)",pickupDate:"2026-12-25",dropoffDate:"2026-12-29",pickupTime:"10:00",dropoffTime:"10:00",driverAge:"25"};
  const flights=await searchFlights(flight,{providers:[fixtureProvider("flights",[flightFixture(flight)])]});
  assert.equal(hotelSearchRequiresCanonicalResponse([fixtureProvider("hotels",[])]),true);
  const hotels=await searchHotels(hotel,{providers:[fixtureProvider("hotels",[{...buildStaticHotelResults(hotel)[0],id:"fixture:hotel:one",provider:"Fixture hotels",dataSource:"demo"}])],dependencies:{searchKayak:async()=>{throw Error("wrong supplier");},persist:async()=>{}}});
  const cars=await searchCars(car,{providers:[fixtureProvider("cars",[{...buildStaticCarResults(car)[0],id:"fixture:car:one"}])],dependencies:{searchKayak:async()=>{throw Error("wrong supplier");},rememberResults:async()=>{},rememberCohort:async()=>{}}});
  const envelopes={flight:classifyFlights(flights.results.map(toPublicFlight),flight,flights.warnings,"00000000-0000-4000-8000-000000000001"),hotel:classifyHotels(hotels.results.map(toPublicHotel),hotels.warnings,"00000000-0000-4000-8000-000000000002"),car:classifyCars(cars.results,car,"00000000-0000-4000-8000-000000000003")};
  // These are the actual domain readers used by web result components.
  assert.equal(filterFlightsByRequestedLegs(envelopes.flight.results,flight).length,1);
  assert.equal(groupHotelOffers(envelopes.hotel.results).length,1);
  assert.equal(sortCarResults(envelopes.car.results,"recommended").length,1);
  for(const platform of ["android","ios"]){
   const transport=nativeTravelApiHarness(platform,"0.3.0","https://fixture.invalid",async(url:string,init:RequestInit)=>{const product=url.includes("/flights/")?"flight":url.includes("/hotels/")?"hotel":"car";assert(init.body);return Response.json(envelopes[product]);});
   const plans={flight:buildSearchPlan("flight",Object.fromEntries(Object.entries(flight).filter(([,value])=>typeof value!=="object").map(([key,value])=>[key,String(value)]))).plan,hotel:buildSearchPlan("hotel",Object.fromEntries(Object.entries(hotel).map(([key,value])=>[key,String(value)]))).plan,car:buildSearchPlan("car",car).plan};
   assert(plans.flight&&plans.hotel&&plans.car,platform);
   assert.deepEqual(flightSearchSchema.parse(plans.flight.payload),flight);
   assert.deepEqual(hotelSearchSchema.parse(plans.hotel.payload),hotel);
   const transported=await Promise.all([transport.api.searchFlights(plans.flight.payload),platform==="android"?transport.api.searchHotelsProgressive(plans.hotel.payload,null):transport.api.searchHotels(plans.hotel.payload),transport.api.searchCars(plans.car.payload)]);
   assert.deepEqual(transported.map((response:{results:{id:string}[]})=>response.results[0].id),[envelopes.flight.results[0].id,envelopes.hotel.results[0].id,envelopes.car.results[0].id]);
   assert(transport.calls.every((call:{init:RequestInit})=>new Headers(call.init.headers).get("x-mobile-platform")===platform));
   const accepted={flight:acceptCanonicalResults(envelopes.flight.results,(row:typeof envelopes.flight.results[number])=>validFlight(row,plans.flight)),hotel:acceptCanonicalResults(envelopes.hotel.results,safeCanonicalHotelResult),car:acceptCanonicalResults(envelopes.car.results,safeCanonicalCarResult)};
   for(const product of ["flight","hotel","car"] as const){
    assert.deepEqual(accepted[product].rejectedIds,[],`${platform}/${product}`);
    assert.deepEqual(accepted[product].accepted.map((row:{id:string})=>row.id),envelopes[product].results.map(row=>row.id));
    assert.equal(presentSearchResults(product,accepted[product].accepted.length,envelopes[product]).status,"ready");
    assert.equal(searchLifecycle({count:accepted[product].accepted.length,status:envelopes[product].status}),"available");
    assert.equal(envelopes[product].results[0].searchPolicy.action.kind,"none");
    assert.equal(envelopes[product].results[0].inventoryProvenance?.mode,"test");
   }
  }
  if(process.env.SEARCH_ACCEPTANCE_OUTPUT)writeFileSync(process.env.SEARCH_ACCEPTANCE_OUTPUT,JSON.stringify({criteria:{flight,hotel,car},envelopes},null,2));
 } finally {if(previous===undefined)Reflect.deleteProperty(process.env,"NODE_ENV");else Object.assign(process.env,{NODE_ENV:previous});}
});

test("hotel composition survives the actual recent-search admission and native restoration chain",()=>{
 const payload={destination:"New York",checkIn:"2099-12-25",checkOut:"2099-12-29",guests:4,adults:3,children:1,rooms:2,petFriendly:true,roomComposition:[{adults:1,children:1},{adults:2,children:0}]};
 const record=buildRecentSearch("hotel",payload);
 const admitted=recentSearchInputSchema.parse(record);
 const restored=buildSearchPlan("hotel",sanitizeSearchParams("hotel",admitted.params)).plan;
 assert(restored);assert.deepEqual(restored.payload.roomComposition,payload.roomComposition);assert.equal(restored.payload.petFriendly,true);assert.equal(restored.payload.children,1);
});

test("multi-city recent searches preserve every leg rather than silently becoming round trips",()=>{
 const payload={tripType:"multi-city",origin:"LAX",destination:"JFK",departureDate:"2099-12-25",adults:1,children:0,infants:0,travelers:1,cabinClass:"economy",currency:"USD",legs:[{origin:"LAX",destination:"SFO",departureDate:"2099-12-25"},{origin:"SFO",destination:"JFK",departureDate:"2099-12-29"}]};
 const admitted=recentSearchInputSchema.parse(buildRecentSearch("flight",payload));
 const restored=buildSearchPlan("flight",sanitizeSearchParams("flight",admitted.params)).plan;
 assert(restored);assert.equal(restored.payload.tripType,"multi-city");
 assert.deepEqual(restored.payload.legs,payload.legs);
 assert.equal(restored.payload.currency,"USD");
});
