import {registeredIntegrationStatus} from "./providerIntegrationStatus";
import { classifyFlights,classifyHotels,classifyCars } from "@/lib/travel/searchContract";
import {toPublicFlight,toPublicHotel} from "@/lib/searchCache";
import assert from "node:assert/strict";
import test, {beforeEach,afterEach} from "node:test";
let savedMode: string | undefined;
beforeEach(()=>{savedMode=process.env.NODE_ENV;Object.assign(process.env,{NODE_ENV:"test"});});
afterEach(()=>{if(savedMode===undefined)Reflect.deleteProperty(process.env,"NODE_ENV");else Object.assign(process.env,{NODE_ENV:savedMode});});
import { providersFor, executeRegisteredProvider, registeredProviderReady, type ProductContracts } from "./providerRegistry";
import { searchFlights } from "./flightAggregator";
import { searchHotels, searchHotelBatch } from "./hotelAggregator";
import { searchCars } from "./carAggregator";
import { buildStaticHotelResults } from "./staticHotelResults";
import { buildStaticCarResults } from "./staticCarResults";
import { setFlightResultCacheBackendForTests } from "@/lib/searchCache";
import type { NormalizedFlightResult } from "@/lib/types";

import {fixtureProvider} from "./fixtures/testProviders";
import {withProductionSandboxRequest} from "@/lib/productionSandboxPolicy";

test("new sandbox registrations require production grants and remain neutral and inert",async()=>{
 const previous=process.env.NEXT_PUBLIC_APP_URL;
 process.env.NEXT_PUBLIC_APP_URL="https://kurioticket.com";
 try {
  const query={destination:"New York",checkIn:"2099-12-25",checkOut:"2099-12-29",guests:2,rooms:1};
  const row={...buildStaticHotelResults(query)[0],inventoryKind:"bookable" as const,pricePerNight:100,totalPrice:400,currency:"USD",id:"sandbox-new-one",provider:"New sandbox",bookingUrl:"https://provider.example/checkout",partnerRedirectUrl:""};
  const provider=fixtureProvider("hotels",[row]);provider.capabilities={...provider.capabilities,mode:"sandbox"};
  let calls=0;provider.execute=async()=>{calls++;return {provider:"New sandbox",results:[row],status:"success",latencyMs:0};};
  const request=new Request("https://kurioticket.com/api/hotels/search",{headers:{"x-sandbox-results-policy":"1"}});
  const run=()=>executeRegisteredProvider(provider,query,{}).then(value=>Response.json({results:value.results,status:"available"}));
  const denied=await withProductionSandboxRequest(request,run,async()=>({enabled:false,revision:"r1",available:true}));
  assert.equal((await denied.json()).results.length,0);assert.equal(calls,0);
  const allowed=await withProductionSandboxRequest(request,run,async()=>({enabled:true,revision:"r1",available:true}));
  const result=(await allowed.json()).results[0];assert.equal(calls,1);
  assert.equal(result.sandboxDisplayOnly,true);assert.equal(result.sandboxRevision,"r1");
  assert.equal(result.searchPolicy.source,"metasearch");assert.equal(result.searchPolicy.action.kind,"none");assert.equal(result.bookingUrl,"");
 }finally{if(previous===undefined)delete process.env.NEXT_PUBLIC_APP_URL;else process.env.NEXT_PUBLIC_APP_URL=previous;}
});

test("compatibility batches cannot bypass central readiness or environment admission",async()=>{
 const provider=fixtureProvider("hotels",[]);provider.id="kayak";
 let called=0;
 provider.hotelBatch=async()=>{called++;return {supported:true,batch:{offers:[],providerRows:0,checkpoint:null},results:[]};};
 const query={destination:"New York",checkIn:"2099-12-25",checkOut:"2099-12-29",guests:2,rooms:1};
 for(const readiness of [{configured:false,enabled:true},{configured:true,enabled:false}]){
  provider.readiness=()=>readiness;
  assert.equal(registeredProviderReady(provider),false);
  assert.equal((await searchHotelBatch(query,{clientIp:"192.0.2.1"},"snapshot",undefined,{providers:[provider]})).supported,false);
 }
 provider.readiness=()=>({configured:true,enabled:true});
 provider.capabilities={...provider.capabilities,environments:["production"]};
 assert.equal(registeredProviderReady(provider),false);
 assert.equal((await searchHotelBatch(query,{clientIp:"192.0.2.1"},"snapshot",undefined,{providers:[provider]})).supported,false);
 assert.equal(called,0);
 provider.capabilities={...provider.capabilities,environments:["test"]};
 assert.equal((await searchHotelBatch(query,{clientIp:"192.0.2.1"},"snapshot",undefined,{providers:[provider],persist:async()=>{}})).supported,true);
 assert.equal(called,1);
});

test("central registrations participate in all three active product services", async () => {
  const previous = process.env.NODE_ENV;
  Object.assign(process.env,{NODE_ENV:"test"});
  try {
    setFlightResultCacheBackendForTests({write:async rows=>rows.map(row=>row.publicResultId),find:async()=>null,findCompatible:async()=>[],cleanupExpired:async()=>0});
    const query = {tripType:"one-way" as const, origin:"HOU",destination:"SFO",departureDate:"2099-12-25",adults:1,children:0,infants:0,travelers:1,cabinClass:"economy" as const};
    const flight: NormalizedFlightResult = {
      id:"fixture:flights:1",provider:"Fixture flights",airlineName:"Fixture Air",originAirport:"HOU",destinationAirport:"SFO",
      departureTime:"2099-12-25T10:00:00Z",arrivalTime:"2099-12-25T14:00:00Z",duration:"4h",durationMinutes:240,stops:0,layovers:[],
      cabinClass:"economy",baggageInfo:"Unknown",refundInfo:"Unknown",price:200,currency:"USD",bookingUrl:"",partnerRedirectUrl:"",
      valueScore:50,riskScore:0,comfortScore:50,travelConfidenceScore:50,travelEffortScore:50,recommendationReasons:[],badges:[],
      legs:[{direction:"outbound",originAirport:"HOU",destinationAirport:"SFO",departureTime:"2099-12-25T10:00:00Z",arrivalTime:"2099-12-25T14:00:00Z",duration:"4h",durationMinutes:240,stops:0,layovers:[],segments:[]}],
    };
    const flights = await searchFlights(query,{providers:[fixtureProvider("flights",[flight])]});
    assert.deepEqual(flights.results.map(row=>row.id),[`fixture-flights:${flight.id}`]);
    assert.equal(flights.providerStatuses[0].provider,"Fixture flights");
    const projectedFlight=classifyFlights(flights.results.map(toPublicFlight),query,[],"fixture");
    assert.equal(projectedFlight.results[0].searchPolicy.source,"metasearch");
    assert.equal(projectedFlight.results[0].inventoryProvenance?.providerId,"fixture-flights");
    assert.deepEqual(projectedFlight.results[0].searchPolicy.action,{kind:"none",enabled:false});
    const second=fixtureProvider("flights",[{...flight,id:"fixture:second:1"}]);second.id="fixture-second";second.label="Second fixture";
    setFlightResultCacheBackendForTests({write:async rows=>rows.filter(row=>row.normalizedResult.provider!=="Second fixture").map(row=>row.publicResultId),find:async()=>null,findCompatible:async()=>[],cleanupExpired:async()=>0});
    const partial=await searchFlights(query,{providers:[fixtureProvider("flights",[flight]),second]});
    assert.deepEqual(partial.results.map(row=>row.id),[`fixture-flights:${flight.id}`]);assert.equal(partial.unavailableMessage,undefined);assert(partial.warnings.length);

    const hotelQuery = {destination:"New York",checkIn:"2099-12-25",checkOut:"2099-12-29",guests:2,rooms:1};
    const hotel = {...buildStaticHotelResults(hotelQuery)[0],id:"fixture:hotels:1",provider:"Fixture hotels",dataSource:"demo" as const};
    const hotels = await searchHotels(hotelQuery,{providers:[fixtureProvider("hotels",[hotel])],dependencies:{searchKayak:async()=>{throw new Error("wrong integration");},persist:async()=>{}}});
    assert.equal(hotels.results.length,1);assert(hotels.results[0].id.startsWith("fixture-hotels:"));assert(hotels.results[0].id.endsWith(":"+hotel.id));
    const projectedHotel=classifyHotels(hotels.results.map(toPublicHotel),[],"fixture");
    assert.equal(projectedHotel.results[0].inventoryProvenance?.providerId,"fixture-hotels");
    assert.deepEqual(projectedHotel.results[0].searchPolicy.action,{kind:"none",enabled:false});
    const carQuery = {pickupLocation:"LHR",dropoffLocation:"LHR",pickupDate:"2099-12-25",dropoffDate:"2099-12-29",pickupTime:"10:00",dropoffTime:"10:00",driverAge:"25"};
    const car = {...buildStaticCarResults(carQuery)[0],id:"fixture:cars:1"};
    const cars = await searchCars(carQuery,{providers:[fixtureProvider("cars",[car])],dependencies:{searchKayak:async()=>{throw new Error("wrong integration");},rememberResults:async()=>{},rememberCohort:async()=>{}}});
    assert.equal(cars.results.length,1);assert(cars.results[0].id.startsWith("fixture-cars:"));assert(cars.results[0].id.endsWith(":"+car.id));
    assert.equal(cars.providerStatuses[0].provider,"Fixture cars");
    const projectedCar=classifyCars(cars.results,carQuery,"fixture");
    assert.equal(projectedCar.results[0].inventorySource,"metasearch");
    assert.equal(projectedCar.results[0].inventoryProvenance?.providerId,"fixture-cars");
    assert.deepEqual(projectedCar.results[0].searchPolicy.action,{kind:"none",enabled:false});
  } finally { if(previous===undefined) Reflect.deleteProperty(process.env,"NODE_ENV"); else Object.assign(process.env,{NODE_ENV:previous}); }
});

test("registration preserves truthful request context without session or credential fields", async () => {
  const provider = fixtureProvider("flights",[]);
  let received: unknown;
  provider.execute = async (_query,context) => { received=context;return {provider:"Wrong adapter label",results:[],status:"success",latencyMs:0}; };
  const context={requestId:"correlation-only",kayak:{clientIp:"192.0.2.1",userAgent:"Kurioticket-Android/fixture",trackId:"tracking-only"}};
  const response=await executeRegisteredProvider(provider,{} as ProductContracts["flights"]["query"],context);
  assert.equal(received,context);
  assert.equal(response.provider,"Fixture flights");
});

test("test injection and duplicate registrations cannot become runtime inventory", () => {
  const previous=process.env.NODE_ENV;
  try {
    Object.assign(process.env,{NODE_ENV:"production"});
    assert.throws(()=>providersFor("hotels",[fixtureProvider("hotels",[])]),/test-only/);
    Object.assign(process.env,{NODE_ENV:"test"});
    const provider=fixtureProvider("hotels",[]);
    assert.throws(()=>providersFor("hotels",[provider,provider]),/Invalid/);
    assert.throws(()=>providersFor("hotels",[{...provider,id:"../invalid"}]),/Invalid/);
  } finally { if(previous===undefined)Reflect.deleteProperty(process.env,"NODE_ENV");else Object.assign(process.env,{NODE_ENV:previous}); }
});

test("compatibility batches use shared hotel cohort rules and fail closed on lost continuation", async () => {
  const query={destination:"New York",checkIn:"2099-12-25",checkOut:"2099-12-29",guests:2,rooms:1};
  const base=buildStaticHotelResults(query)[0];
  const first={...base,id:"kayak-sandbox:snapshot:one",provider:"KAYAK sandbox"};
  const second={...base,id:"kayak-sandbox:snapshot:two",provider:"KAYAK sandbox"};
  const foreign={...base,id:"kayak-sandbox:other:three",provider:"KAYAK sandbox"};
  const provider=fixtureProvider("hotels",[]);
  provider.id="kayak";
  provider.hotelBatch=async()=>({supported:true,batch:{offers:[],providerRows:2,checkpoint:null},results:[second,second]});
  const checkpoint={nextPage:1,total:2,pageHashes:["hash"]};
  let published:string[]=[];
  const defer=(_task:()=>Promise<void>)=>{};
  const options={providers:[provider],getCohort:async()=>[first,foreign],defer,persist:async(rows:typeof first[],_search:unknown,receivedDefer?:typeof defer)=>{assert.equal(receivedDefer,defer);published=rows.map(row=>row.id);}};
  const outcome=await searchHotelBatch(query,{clientIp:"192.0.2.1"},"snapshot",checkpoint,options);
  assert.equal(outcome.supported,true);
  assert.deepEqual(published,[first.id,second.id]);
  await assert.rejects(searchHotelBatch(query,{clientIp:"192.0.2.1"},"snapshot",checkpoint,{...options,getCohort:async()=>[]}),/snapshot expired/);
  provider.hotelBatch=async()=>{throw new Error("upstream continuation failed");};
  await assert.rejects(searchHotelBatch(query,{clientIp:"192.0.2.1"},"snapshot",checkpoint,options),/batch unavailable/);
  assert.deepEqual(published,[first.id,second.id]);
});

test("new provider snapshots cannot collide across providers or later searches",async()=>{
 const query={destination:"Paris",checkIn:"2099-12-25",checkOut:"2099-12-29",guests:1,rooms:1};
 const row={...buildStaticHotelResults(query)[0],id:"reused-row",provider:"Fixture hotels"};
 const first=fixtureProvider("hotels",[row]);const second={...first,id:"second-fixture",label:"Second fixture"};
 const a=await executeRegisteredProvider(first,query,{requestId:"snapshot-one"});
 const b=await executeRegisteredProvider(second,query,{requestId:"snapshot-one"});
 const c=await executeRegisteredProvider(first,query,{requestId:"snapshot-two"});
 assert.equal(new Set([a.results[0].id,b.results[0].id,c.results[0].id]).size,3);
});

test("central readiness governs dispatch and safely projects a future approved provider",async()=>{
 const provider=fixtureProvider("hotels",[]);let calls=0;
 provider.execute=async()=>{calls++;return {provider:provider.label,results:[],status:"success",latencyMs:0};};
 provider.readiness=()=>({configured:false,enabled:false});
 assert.equal((await executeRegisteredProvider(provider,{} as ProductContracts["hotels"]["query"],{})).status,"skipped");assert.equal(calls,0);
 assert.equal(registeredIntegrationStatus(provider),null,"test fixtures never become real provider readiness");
 const approved={...provider,id:"future-approved",label:"Approved provider",capabilities:{...provider.capabilities,mode:"live" as const},readiness:()=>({configured:true,enabled:true}),privateCredential:"synthetic-not-a-key"};
 const projected=registeredIntegrationStatus(approved);assert(projected);assert.equal(projected.searchEnabled,true);assert.deepEqual(projected.products,["HOTELS"]);assert.equal("privateCredential" in projected,false);assert.equal("readiness" in projected,false);assert.equal(projected.bookingEnabled,false);
});
