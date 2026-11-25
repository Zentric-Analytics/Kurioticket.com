import assert from "node:assert/strict";
import test, {beforeEach,afterEach} from "node:test";
let savedMode: string | undefined;
beforeEach(()=>{savedMode=process.env.NODE_ENV;Object.assign(process.env,{NODE_ENV:"test"});});
afterEach(()=>{if(savedMode===undefined)Reflect.deleteProperty(process.env,"NODE_ENV");else Object.assign(process.env,{NODE_ENV:savedMode});});
import { providersFor, executeRegisteredProvider, type ProviderRegistration, type SearchProduct, type ProductContracts } from "./providerRegistry";
import { searchFlights } from "./flightAggregator";
import { searchHotels, searchHotelBatch } from "./hotelAggregator";
import { searchCars } from "./carAggregator";
import { buildStaticHotelResults } from "./staticHotelResults";
import { buildStaticCarResults } from "./staticCarResults";
import { setFlightResultCacheBackendForTests } from "@/lib/searchCache";
import type { NormalizedFlightResult } from "@/lib/types";

/** Fixture adapters are injected only by tests; there is no runtime registration switch. */
export function fixtureProvider<P extends SearchProduct>(product: P, rows: ProductContracts[P]["offer"][]): ProviderRegistration<P> {
  return { id: `fixture-${product}`, label: `Fixture ${product}`, product, timeoutMs: 50,
    capabilities: { ...providersFor(product)[0].capabilities, mode: "test", environments: ["test"], refresh: "none", handoff: "none", booking: "none", details: "none" },
    supports: () => true,
    execute: async () => ({provider:`Fixture ${product}`,status:"success",results:rows,latencyMs:0}),
  };
}

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
    assert.deepEqual(flights.results.map(row=>row.id),[flight.id]);
    assert.equal(flights.providerStatuses[0].provider,"Fixture flights");
    const hotelQuery = {destination:"New York",checkIn:"2099-12-25",checkOut:"2099-12-29",guests:2,rooms:1};
    const hotel = {...buildStaticHotelResults(hotelQuery)[0],id:"fixture:hotels:1",provider:"Fixture hotels",dataSource:"live" as const};
    const hotels = await searchHotels(hotelQuery,{providers:[fixtureProvider("hotels",[hotel])],dependencies:{searchKayak:async()=>{throw new Error("wrong integration");},persist:async()=>{}}});
    assert.deepEqual(hotels.results.map(row=>row.id),[hotel.id]);
    const carQuery = {pickupLocation:"LHR",dropoffLocation:"LHR",pickupDate:"2099-12-25",dropoffDate:"2099-12-29",pickupTime:"10:00",dropoffTime:"10:00",driverAge:"25"};
    const car = {...buildStaticCarResults(carQuery)[0],id:"fixture:cars:1"};
    const cars = await searchCars(carQuery,{providers:[fixtureProvider("cars",[car])],dependencies:{searchKayak:async()=>{throw new Error("wrong integration");},rememberResults:async()=>{},rememberCohort:async()=>{}}});
    assert.deepEqual(cars.results.map(row=>row.id),[car.id]);
    assert.equal(cars.providerStatuses[0].provider,"Fixture cars");
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
  const options={providers:[provider],getCohort:async()=>[first,foreign],persist:async(rows:typeof first[])=>{published=rows.map(row=>row.id);}};
  const outcome=await searchHotelBatch(query,{clientIp:"192.0.2.1"},"snapshot",checkpoint,options);
  assert.equal(outcome.supported,true);
  assert.deepEqual(published,[first.id,second.id]);
  await assert.rejects(searchHotelBatch(query,{clientIp:"192.0.2.1"},"snapshot",checkpoint,{...options,getCohort:async()=>[]}),/snapshot expired/);
  provider.hotelBatch=async()=>{throw new Error("upstream continuation failed");};
  await assert.rejects(searchHotelBatch(query,{clientIp:"192.0.2.1"},"snapshot",checkpoint,options),/batch unavailable/);
  assert.deepEqual(published,[first.id,second.id]);
});
