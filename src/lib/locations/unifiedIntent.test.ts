import assert from "node:assert/strict";
import test from "node:test";
import { fromFlightPlaceSuggestion } from "./flightDiscovery";
import { publicLocationSelection, issueLocationSelection } from "./selectionAuthority";
import { discoverLocations } from "./discovery";
import {canonicalFromProvider} from "./providerDiscoveryAdapters";
import { searchLocations } from "./search";
import { fromHotelDestination } from "./adapters";
import { hotelDestinations } from "@/data/hotelDestinations";
import { flightSearchSchema, hotelSearchSchema } from "@/lib/validation";
import { hasMinimumLocationSearchLetters } from "@/shared/locations/query";
const mobileFlow = "../../../apps/mobile/src/features/flow/";
const { initializeFlightForm, validateFlightForm, flightSearchParams } = await import(mobileFlow + "flightSearchModel.ts");
const { buildSearchPlan } = await import(mobileFlow + "travelSearchModel.ts");
const { initializeHotelForm, hotelSearchParams } = await import(mobileFlow + "hotelSearchModel.ts");
import { adaptKayakHotelSearch } from "@/services/travel/kayakSearchAdapter";

test("central typed airport authority survives native route/restore and server admission without seed membership", () => {
  const now = new Date();
  const departure = new Date(now.valueOf()+30*86400000).toISOString().slice(0,10);
  const back = new Date(now.valueOf()+34*86400000).toISOString().slice(0,10);
  for (const code of ["VNY", "ONT", "HOU", "IAH", "LAX", "SFO", "LHR"]) {
    const canonical = publicLocationSelection(fromFlightPlaceSuggestion({ code, city: "Selected airport", airport: `${code} Airport`, type: "airport", duffelPlaceId: `fixture-${code}` }), "flights");
    const route = { from: code, to: code === "SFO" ? "LAX" : "SFO", fromLocation: JSON.stringify(canonical), departureDate: departure, returnDate: back, tripType: "round-trip", adults: "1", cabin: "Economy" };
    const form = initializeFlightForm(route, now).form;
    assert.deepEqual(validateFlightForm(form, now), {});
    const plan = buildSearchPlan("flight", flightSearchParams(form), now).plan!;
    const admitted = flightSearchSchema.safeParse(plan.payload);
    assert.equal(admitted.success, true, JSON.stringify(admitted));
    assert.equal(plan.payload.origin, code);
    assert.equal(flightSearchSchema.safeParse({...plan.payload,origin:"JFK",originLocation:{...canonical,codes:{iata:"JFK"}}}).success,false);
    const cityToken=issueLocationSelection({...fromFlightPlaceSuggestion({code,city:"City",airport:"All airports",type:"city",duffelPlaceId:"arp_0000AAtestPlace0000000001"}),id:canonical.id},"flights");
    assert.equal(flightSearchSchema.safeParse({...plan.payload,originLocation:{...canonical,selectionToken:cityToken}}).success,false);
    const tampered = { ...canonical, selectionToken: canonical.selectionToken!.slice(0,-3)+"bad" };
    assert.equal(flightSearchSchema.safeParse({...plan.payload, originLocation:tampered}).success,false);
    const expired = {...canonical,selectionToken:issueLocationSelection(fromFlightPlaceSuggestion({code,city:"Test",airport:"Airport",type:"airport",duffelPlaceId:"fixture"}),"flights",0)};
    assert.equal(flightSearchSchema.safeParse({...plan.payload,originLocation:expired}).success,false);
  }
});

test("same-code city and airport do not share identity or airport authority", () => {
  const city=fromFlightPlaceSuggestion({code:"LAX",city:"Los Angeles",airport:"All airports",type:"city",duffelPlaceId:"fixture-city"});
  const airport=fromFlightPlaceSuggestion({code:"LAX",city:"Los Angeles",airport:"International",type:"airport",duffelPlaceId:"fixture-airport"});
  assert.notEqual(city.id,airport.id);
  assert.equal(city.kind,"city");assert.equal(airport.kind,"airport");
});

test("one shared query/rank correction reaches product discovery consumers without silent selection", () => {
  const catalog=hotelDestinations.map(fromHotelDestination);
  for(const query of ["New York","NYC","NewYork","New Yrok"]){assert(searchLocations(catalog,query).some(m=>m.match.location.id==="hotel:us-new-york"),query);}
  for(const query of ["東京","北京","São Paulo","München"]){assert(hasMinimumLocationSearchLetters(query));}
  assert(!hasMinimumLocationSearchLetters("🙂1"));
});

test("noncooperative discovery cannot hold completion or append late inventory", async () => {
  const result=await discoverLocations({query:"New York",product:"hotels",catalog:[],timeoutMs:5,adapters:[{provider:"fixture-only",products:["hotels"],discover:()=>new Promise(()=>{})}]});
  assert.deepEqual(result.suggestions,[]);assert.equal(result.sources[0].status,"timeout");
});

test("native occupancy and pet intent reach server schema and are honestly unsupported by KAYAK", () => {
  const checkIn=new Date(Date.now()+30*86400000).toISOString().slice(0,10),checkOut=new Date(Date.now()+34*86400000).toISOString().slice(0,10);
  const serialized=hotelSearchParams({destination:"New York",checkIn,checkOut,guests:2,rooms:1,adults:1,children:1,petFriendly:true});
  const plan=buildSearchPlan("hotel",serialized).plan!;
  assert.equal(plan.payload.adults,1);assert.equal(plan.payload.children,1);assert.equal(plan.payload.petFriendly,true);
  assert(hotelSearchSchema.safeParse(plan.payload).success);
  const adapted=adaptKayakHotelSearch(Object.fromEntries(Object.entries(plan.payload).map(([k,v])=>[k,String(v)])));
  assert.equal(adapted.supported,false);
  assert.equal(buildSearchPlan("hotel",{...serialized,roomComposition:"broken"}).plan,undefined);
});


test("hotel room composition survives edit-search restoration", () => {
 const rooms=[{adults:1,children:1},{adults:2,children:0}];
 const serialized=hotelSearchParams({destination:"Paris",checkIn:"2028-02-01",checkOut:"2028-02-04",guests:4,rooms:2,adults:3,children:1,roomComposition:rooms});
 assert.deepEqual(initializeHotelForm(serialized,new Date("2028-01-01")).form.roomComposition,rooms);
});

test("same-label provider geographies retain distinct typed identities",()=>{
 const city=canonicalFromProvider("fixture","city-id","London, United Kingdom","city");
 const metro=canonicalFromProvider("fixture","metro-id","London, United Kingdom","metropolitan-area");
 const rental=canonicalFromProvider("fixture","rental-id","London, United Kingdom","rental-area");
 assert.equal(metro.kind,"metropolitan-area");assert.equal(rental.kind,"rental-area");
 assert.equal(new Set([city.id,metro.id,rental.id]).size,3);
});

test("cancelled older discovery cannot contribute to a newer query",async()=>{
 const controller=new AbortController();
 const old=discoverLocations({query:"New",product:"hotels",catalog:[],signal:controller.signal,timeoutMs:100,adapters:[{provider:"fixture",products:["hotels"],discover:()=>new Promise(resolve=>setTimeout(()=>resolve(hotelDestinations.map(fromHotelDestination)),20))}]});
 controller.abort();
 const current=await discoverLocations({query:"NYC",product:"hotels",catalog:hotelDestinations.map(fromHotelDestination)});
 assert.equal((await old).state,"cancelled");assert.deepEqual((await old).suggestions,[]);
 assert(current.suggestions.some(row=>row.id==="hotel:us-new-york"));
});
