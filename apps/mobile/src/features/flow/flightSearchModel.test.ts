import assert from "node:assert/strict";
import test from "node:test";
import { adjustFlightDeparture, airportByCode, changeTraveler, defaultFlightForm, FLIGHT_CABINS, FLIGHT_TRIP_TYPES, flightSearchParams, initializeFlightForm, searchAirports, totalTravelers, validateFlightForm } from "./flightSearchModel";
const today = new Date(2026, 7, 1, 12);

test("initialization supports arrays, explicit precedence, Explore and safe defaults", () => {
  const defaults = initializeFlightForm({}, today).form; assert.equal(defaults.departureDate,"2026-08-15"); assert.equal(defaults.returnDate,"2026-08-22");
  const explicit = initializeFlightForm({ from:["LHR","JFK"], to:"LAX", destination:"Paris", adults:"2",children:"1",infants:"1",travelers:"8",cabin:"business" },today).form;
  assert.equal(explicit.from?.code,"LHR"); assert.equal(explicit.to?.code,"LAX"); assert.deepEqual([explicit.adults,explicit.children,explicit.infants],[2,1,1]); assert.equal(explicit.cabin,"Business");
  assert.equal(initializeFlightForm({destination:"Paris"},today).form.to?.code,"CDG"); assert.equal(initializeFlightForm({destination:"New York"},today).form.to?.code,"JFK");
  assert.equal(initializeFlightForm({destination:"not a place"},today).form.to,undefined);
  assert.equal(initializeFlightForm({travelers:"4"},today).form.adults,4); assert.equal(initializeFlightForm({departureDate:"bad",cabin:"Suite"},today).form.cabin,"Economy");
});
test("only supported trip types and cabins are modeled",()=>{ assert.deepEqual(FLIGHT_TRIP_TYPES,["round-trip","one-way"]); assert.deepEqual(FLIGHT_CABINS,["Economy","Premium Economy","Business","First"]); });
test("airport search ranks canonical results deterministically",()=>{ assert.equal(searchAirports(" jFk ")[0].code,"JFK"); assert.equal(searchAirports("Paris")[0].code,"CDG"); assert.equal(searchAirports("france")[0].code,"CDG"); assert.equal(searchAirports("los")[0].code,"LOS"); assert.equal(searchAirports("ing")[0].code,"KIN"); assert.deepEqual(searchAirports("unknown"),[]); assert.equal(new Set(searchAirports("").map(x=>x.code)).size,searchAirports("").length); });
test("validation and serialization align round trip and one way",()=>{ const form={...defaultFlightForm(today),from:airportByCode("JFK"),to:airportByCode("LAX"),adults:2,children:1,infants:1,cabin:"Business" as const}; assert.deepEqual(validateFlightForm(form,today),{}); const params=flightSearchParams(form); assert.equal(params.travelers,"4"); assert.equal(params.from,"JFK"); assert.equal(params.returnDate,form.returnDate); const one=flightSearchParams({...form,tripType:"one-way"}); assert.equal("returnDate" in one,false); assert.equal(validateFlightForm({...form,to:form.from},today).to,"Origin and destination must be different."); assert.ok(validateFlightForm({...form,departureDate:"2026-07-31"},today).departureDate); assert.ok(validateFlightForm({...form,returnDate:form.departureDate},today).returnDate); });
test("departure adjustment and traveler bounds preserve contract",()=>{ const form=defaultFlightForm(today); const adjusted=adjustFlightDeparture(form,"2026-08-25"); assert.equal(adjusted.form.returnDate,"2026-08-26"); let travelers={...form,adults:8,children:1}; travelers=changeTraveler(travelers,"infants",1); assert.equal(totalTravelers(travelers),9); assert.equal(changeTraveler({...form,adults:1},"adults",-1).adults,1); });
