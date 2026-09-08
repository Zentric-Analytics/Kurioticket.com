import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source=readFileSync(resolve("src/features/search/NativeFlightDetails.tsx"),"utf8");
const itinerary=source.slice(source.indexOf("function Itinerary"),source.indexOf("function FareSurface"));

test("authoritative route summary uses the shared complete route model",()=>assert.match(source,/flightDetailsRouteLabel\(details\.search\.tripType,offer\.legs\?\?\[\]/));

test("each leg uses the same Flight itinerary card",()=>{
  assert.match(source,/>Flight itinerary<\/Text>/);
  assert.match(source,/\.map\(\(leg,index\)=>\s*<Itinerary/);
  assert.match(itinerary,/leg\.direction==="outbound"\?"Outbound":leg\.direction==="return"\?"Return":`Flight \$\{leg\.legIndex\?\?index\+1\}`/);
});

test("itinerary prioritizes the passenger journey summary",()=>{
  for(const fact of ["leg.departureTime","leg.arrivalTime","leg.originAirport","leg.destinationAirport","leg.duration","leg.stops"]){
    assert.match(itinerary,new RegExp(fact.replace(".","\\.")));
  }
  assert.match(itinerary,/Intl\.DateTimeFormat/);
  assert.match(itinerary,/Non-stop/);
  assert.match(itinerary,/<FlowIcon name="flight"/);
});

test("itinerary presents airport names and only supplied terminals",()=>{
  for(const fact of ["point?.name","point?.cityName","departurePoint?.terminal","arrivalPoint?.terminal"]){
    assert.match(itinerary,new RegExp(fact.replace(/[?.]/g,(character)=>character==="?"?"\\?":"\\.")));
  }
  assert.match(itinerary,/Terminal \{departurePoint\.terminal\}/);
  assert.match(itinerary,/Terminal \{arrivalPoint\.terminal\}/);
});

test("airline rows retain resolved identity, compact logos, and flight numbers",()=>{
  assert.match(itinerary,/resolveSegmentCarrierName/);
  assert.match(itinerary,/<AirlineLogo airlineName=\{carrier\}/);
  assert.match(itinerary,/canUseOfferAirlineLogo/);
  assert.match(itinerary,/segment\.marketingFlightNumber\?\?segment\.flightNumber/);
  assert.match(itinerary,/leg\.segments\.map/);
});

test("default itinerary omits provider diagnostics and technical-stop presentation",()=>{
  for(const detail of ["point.timeZone","segment.aircraft","segment.distanceKm","segment.cabinDetails","segment.technicalStops","stop.arrivalTime","stop.departureTime","Technical stop at"]){
    assert.doesNotMatch(itinerary,new RegExp(detail.replace(".","\\.")));
  }
  assert.doesNotMatch(itinerary,/technical stop/i);
  assert.doesNotMatch(itinerary,/Connection:/);
  assert.match(itinerary,/leg\.stops/);
  assert.match(itinerary,/leg\.layovers\.length===1/);
});
