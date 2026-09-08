import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source=readFileSync(resolve("src/features/search/NativeFlightDetails.tsx"),"utf8");
const itinerary=source.slice(source.indexOf("function Itinerary"),source.indexOf("function FareSurface"));

test("authoritative route summary uses the shared complete route model",()=>assert.match(source,/flightDetailsRouteLabel\(details\.search\.tripType,offer\.legs\?\?\[\]/));

test("each leg uses the same itinerary card without a redundant section heading",()=>{
  assert.doesNotMatch(source,/>Flight itinerary<\/Text>/);
  assert.match(source,/<View style=\{s\.itineraryStack\}>\{\(offer\.legs\?\.length\?offer\.legs:\[\]\)\.map\(\(leg,index\)=><Itinerary/);
  assert.match(source,/itineraryStack:\{gap:14,marginTop:-8\}/);
  assert.match(itinerary,/leg\.direction==="outbound"\?"Outbound":leg\.direction==="return"\?"Return":`Flight \$\{leg\.legIndex\?\?index\+1\}`/);
});

test("itinerary prioritizes the passenger journey summary with balanced single-line times",()=>{
  for(const fact of ["leg.departureTime","leg.arrivalTime","leg.originAirport","leg.destinationAirport","leg.duration","leg.stops"]){
    assert.match(itinerary,new RegExp(fact.replace(".","\\.")));
  }
  assert.match(itinerary,/Intl\.DateTimeFormat/);
  assert.match(itinerary,/Non-stop/);
  assert.match(itinerary,/<FlowIcon name="flight"/);
  assert.equal(itinerary.match(/numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.85\} style=\{\[s\.journeyTime/g)?.length,2);
  assert.match(source,/journeyTime:\{fontSize:22,lineHeight:28,fontWeight:"700"\}/);
  assert.match(source,/journeyEndpoint:\{flex:1\.1,minWidth:0,gap:3\}/);
  assert.match(source,/journeyCenter:\{flex:\.8,minWidth:72/);
});

test("itinerary presents airport names and only supplied terminals",()=>{
  for(const fact of ["point?.name","point?.cityName","departurePoint?.terminal","arrivalPoint?.terminal"]){
    assert.match(itinerary,new RegExp(fact.replace(/[?.]/g,(character)=>character==="?"?"\\?":"\\.")));
  }
  assert.match(itinerary,/Terminal \{departurePoint\.terminal\}/);
  assert.match(itinerary,/Terminal \{arrivalPoint\.terminal\}/);
});

test("multi-stop itineraries retain every passenger connection location and duration",()=>{
  assert.match(itinerary,/leg\.stops>1&&leg\.layovers\.length/);
  assert.match(itinerary,/leg\.layovers\.map/);
  assert.match(itinerary,/\{layover\.airport\} · \{layover\.duration\}/);
});

test("airline rows retain identity, flight number, and supplied segment distance",()=>{
  assert.match(itinerary,/resolveSegmentCarrierName/);
  assert.match(itinerary,/<AirlineLogo airlineName=\{carrier\}/);
  assert.match(itinerary,/canUseOfferAirlineLogo/);
  assert.match(itinerary,/segment\.marketingFlightNumber\?\?segment\.flightNumber/);
  assert.match(itinerary,/segment\.distanceKm!==undefined/);
  assert.match(itinerary,/Flight distance · \{segment\.distanceKm\.toLocaleString\(\)\} km/);
  assert.match(source,/flightDistance:\{fontSize:11,lineHeight:16,fontWeight:"500",marginTop:1\}/);
  assert.match(itinerary,/leg\.segments\.map/);
});

test("itinerary card uses a restrained card-only blur shadow",()=>{
  assert.match(source,/itineraryCard:\{[^\n]*shadowColor:"#0F172A"[^\n]*shadowOffset:\{width:0,height:3\}[^\n]*shadowOpacity:\.07[^\n]*shadowRadius:12[^\n]*elevation:1\}/);
  const sharedCardStyle=source.match(/(?:^|,)card:\{([^}]*)\}/)?.[1]??"";
  assert.notEqual(sharedCardStyle,"");
  assert.doesNotMatch(sharedCardStyle,/shadowOpacity/);
});

test("default itinerary omits provider diagnostics and technical-stop presentation",()=>{
  for(const detail of ["point.timeZone","segment.aircraft","segment.cabinDetails","segment.technicalStops","stop.arrivalTime","stop.departureTime","Technical stop at"]){
    assert.doesNotMatch(itinerary,new RegExp(detail.replace(".","\\.")));
  }
  assert.doesNotMatch(itinerary,/technical stop/i);
  assert.doesNotMatch(itinerary,/Connection:/);
  assert.match(itinerary,/leg\.stops/);
  assert.match(itinerary,/leg\.layovers\.length===1/);
});
