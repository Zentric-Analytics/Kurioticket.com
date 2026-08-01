import assert from "node:assert/strict";
import test from "node:test";
import { adjustFlightDeparture, airportByCode, changeFlightTripType, changeTraveler, defaultFlightForm, FLIGHT_CABINS, FLIGHT_TRIP_TYPES, flightSearchParams, initializeFlightForm, searchAirports, totalTravelers, validateFlightForm } from "./flightSearchModel";
const today = new Date(2026, 7, 1, 12);

test("a fresh form has no preselected search values", () => {
  const fresh = initializeFlightForm({}, today).form;
  assert.equal(fresh.from, undefined); assert.equal(fresh.to, undefined);
  assert.equal(fresh.departureDate, ""); assert.equal(fresh.returnDate, "");
  assert.deepEqual([fresh.adults, fresh.children, fresh.infants], [0, 0, 0]); assert.equal(fresh.cabin, undefined);
  const errors = validateFlightForm(fresh, today);
  assert.deepEqual(Object.keys(errors), ["from", "to", "departureDate", "returnDate", "travelers", "cabin"]);
});
test("initialization restores only valid, explicitly supplied selections", () => {
  const explicit = initializeFlightForm({ from:["LHR","JFK"], to:"LAX", destination:"Paris", departureDate:"2026-08-15", returnDate:"2026-08-22", adults:"2",children:"1",infants:"1",travelers:"8",cabin:"business" },today).form;
  assert.equal(explicit.from?.code,"LHR"); assert.equal(explicit.to?.code,"LAX"); assert.deepEqual([explicit.adults,explicit.children,explicit.infants],[2,1,1]); assert.equal(explicit.cabin,"Business");
  assert.equal(initializeFlightForm({destination:"Paris"},today).form.to?.code,"CDG"); assert.equal(initializeFlightForm({destination:"New York"},today).form.to?.code,"JFK");
  assert.equal(initializeFlightForm({destination:"not a place"},today).form.to,undefined);
  assert.equal(initializeFlightForm({travelers:"4"},today).form.adults,4); assert.equal(initializeFlightForm({departureDate:"bad",cabin:"Suite"},today).form.cabin,undefined);
});
test("only supported trip types and cabins are modeled",()=>{ assert.deepEqual(FLIGHT_TRIP_TYPES,["round-trip","one-way"]); assert.deepEqual(FLIGHT_CABINS,["Economy","Premium Economy","Business","First"]); });
test("airport search ranks the shared catalogue deterministically",()=>{ assert.equal(searchAirports(" jFk ")[0].code,"JFK"); assert.equal(searchAirports("Paris")[0].code,"CDG"); assert.equal(searchAirports("france")[0].code,"CDG"); assert.equal(searchAirports("los")[0].code,"LOS"); assert.equal(searchAirports("Los Angeles")[0].code,"LAX"); assert.ok(searchAirports("Heathrow").some((airport)=>airport.code==="LHR")); assert.deepEqual(searchAirports("unknown"),[]); assert.equal(new Set(searchAirports("").map(x=>x.code)).size,searchAirports("").length); });
test("validation and serialization align round trip and one way",()=>{ const form={...defaultFlightForm(),from:airportByCode("JFK"),to:airportByCode("LAX"),departureDate:"2026-08-15",returnDate:"2026-08-22",adults:2,children:1,infants:1,cabin:"Business" as const}; assert.deepEqual(validateFlightForm(form,today),{}); const params=flightSearchParams(form); assert.equal(params.travelers,"4"); assert.equal(params.from,"JFK"); assert.equal(params.returnDate,form.returnDate); const one=flightSearchParams({...form,tripType:"one-way"}); assert.equal("returnDate" in one,false); assert.equal(validateFlightForm({...form,to:form.from},today).to,"Origin and destination must be different."); assert.ok(validateFlightForm({...form,departureDate:"2026-07-31"},today).departureDate); assert.ok(validateFlightForm({...form,returnDate:form.departureDate},today).returnDate); });
test("departure selection never invents a return date and traveler bounds preserve contract",()=>{ const form=defaultFlightForm(); const adjusted=adjustFlightDeparture(form,"2026-08-25"); assert.equal(adjusted.form.returnDate,""); let travelers={...form,adults:8,children:1}; travelers=changeTraveler(travelers,"infants",1); assert.equal(totalTravelers(travelers),9); assert.equal(changeTraveler({...form,adults:1},"adults",-1).adults,1); });

test("fresh homepage dates use the local calendar while non-homepage defaults stay empty", () => {
  const homepage = initializeFlightForm({}, today, true).form;
  assert.equal(homepage.departureDate, "2026-08-01");
  assert.equal(homepage.returnDate, "2026-08-08");
  const nonHomepage = initializeFlightForm({}, today).form;
  assert.equal(nonHomepage.departureDate, "");
  assert.equal(nonHomepage.returnDate, "");
});

test("homepage initialization preserves restored and route-param dates", () => {
  const dates = { departureDate: "2026-08-15", returnDate: "2026-08-22" };
  assert.deepEqual(initializeFlightForm(dates, today, true).form, initializeFlightForm(dates, today).form);
  const partialRoute = initializeFlightForm({ departureDate: "2026-08-15" }, today, true).form;
  assert.equal(partialRoute.departureDate, "2026-08-15");
  assert.equal(partialRoute.returnDate, "");
});

test("homepage date changes preserve valid returns and correct invalid returns", () => {
  const form = initializeFlightForm({}, today, true).form;
  const manualReturn = { ...form, returnDate: "2026-08-30" };
  assert.equal(adjustFlightDeparture(manualReturn, "2026-08-10", true).form.returnDate, "2026-08-30");
  assert.equal(adjustFlightDeparture(manualReturn, "2026-09-01", true).form.returnDate, "2026-09-08");
});

test("one-way homepage dates ignore return and switching back restores a valid return", () => {
  const homepage = initializeFlightForm({}, today, true).form;
  const oneWay = changeFlightTripType({ ...homepage, returnDate: "" }, "one-way", true);
  assert.equal(validateFlightForm(oneWay, today).returnDate, undefined);
  const roundTrip = changeFlightTripType(oneWay, "round-trip", true);
  assert.equal(roundTrip.returnDate, "2026-08-08");
});
