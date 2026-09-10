import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source=readFileSync(resolve("src/features/search/NativeFlightDetails.tsx"),"utf8");
const itinerary=source.slice(source.indexOf("function Itinerary"),source.indexOf("function FareSurface"));

test("route context stays outside the card and includes truthful search date context",()=>{
  assert.match(source,/flightDetailsRouteLabel\(details\.search\.tripType,offer\.legs\?\?\[\]/);
  assert.match(source,/details\.search\.tripType==="multi-city"\?details\.search\.legs\.map\(\(\{departureDate\}\)=>departureDate\):\[details\.search\.departureDate,details\.search\.returnDate\]/);
  assert.match(source,/providerLocalFlightDateLong\(value\)/);
  assert.match(source,/\.join\(" • "\)/);
  assert.match(source,/<View testID="flight-details-route-summary"[^>]*>.*<\/View>\s*<Text style=\{\[s\.itinerarySectionLabel/s);
});

test("a quiet Flight itinerary label precedes every authoritative leg card",()=>{
  assert.match(source,/>Flight itinerary<\/Text>/);
  assert.match(source,/<View style=\{s\.itineraryStack\}>\{\(offer\.legs\?\.length\?offer\.legs:\[\]\)\.map\(\(leg,index\)=><Itinerary/);
  assert.match(source,/itinerarySectionLabel:\{fontSize:11[^}]*textTransform:"uppercase"/);
  assert.match(itinerary,/leg\.direction==="outbound"\?"Outbound":leg\.direction==="return"\?"Return":`Flight \$\{leg\.legIndex\?\?index\+1\}`/);
});

test("provider-local leg dates and conditional accessible arrival-day offsets are used",()=>{
  assert.match(itinerary,/providerLocalFlightDateLong\(leg\.departureTime\)/);
  assert.doesNotMatch(itinerary,/new Date\(leg\.departureTime\)/);
  assert.match(itinerary,/flightArrivalDayOffset\(leg\.departureTime,leg\.arrivalTime\)/);
  assert.match(itinerary,/\{arrivalDayOffset\?<Text accessible accessibilityLabel=\{arrivalDayOffsetAccessibility\(arrivalDayOffset\)\?\?undefined\}/);
  assert.match(itinerary,/>\+\{arrivalDayOffset\} \{arrivalDayOffset===1\?"day":"days"\}<\/Text>:null/);
});

test("airline identity uses Results logo language and preserves every segment identity",()=>{
  assert.match(itinerary,/leg\.segments\.map/);
  assert.match(itinerary,/resolveSegmentCarrierName/);
  assert.match(itinerary,/<AirlineLogo airlineName=\{carrier\}[^>]*variant="result-card"/);
  assert.match(itinerary,/segment\.marketingFlightNumber\?\?segment\.flightNumber/);
  assert.match(itinerary,/segment\.operatingCarrier/);
  assert.match(itinerary,/segment\.operatingFlightNumber/);
  assert.match(itinerary,/Operated by/);
});

test("journey remains the visual hero in balanced departure, path, and arrival columns",()=>{
  for(const fact of ["leg.departureTime","leg.arrivalTime","leg.originAirport","leg.destinationAirport","leg.duration","leg.stops"]) assert.match(itinerary,new RegExp(fact.replace(".","\\.")));
  assert.match(itinerary,/Non-stop/);
  assert.match(itinerary,/<FlowIcon name="flight"/);
  assert.equal(itinerary.match(/numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.85\} style=\{\[s\.journeyTime/g)?.length,2);
  assert.match(source,/journeyTime:\{fontSize:22,lineHeight:28,fontWeight:"700"\}/);
  assert.match(source,/journeyEndpoint:\{flex:1\.1,minWidth:0/);
  assert.match(source,/journeyCenter:\{flex:\.8,minWidth:72/);
});

test("airport names retain provider fallback order and terminals remain conditional",()=>{
  assert.match(itinerary,/point\?\.name\?\?point\?\.cityName\?\?point\?\.iataCode\?\?fallback/);
  assert.match(itinerary,/departurePoint\?\.terminal\?<Text[^>]*>Terminal \{departurePoint\.terminal\}/);
  assert.match(itinerary,/arrivalPoint\?\.terminal\?<Text[^>]*>Terminal \{arrivalPoint\.terminal\}/);
  assert.match(source,/airportName:\{fontSize:13,lineHeight:18,fontWeight:"500"\}/);
});

test("each layover has a separate band with provider city and safe airport-only fallback",()=>{
  assert.match(itinerary,/leg\.layovers\.map/);
  assert.match(itinerary,/\{layover\.duration\} layover/);
  assert.match(itinerary,/candidate\?\.iataCode===airport/);
  assert.match(itinerary,/point\?\.cityName&&point\.cityName!==airport\?`\$\{point\.cityName\} • \$\{airport\}`:airport/);
  assert.doesNotMatch(itinerary,/1 stop ·/);
});

test("Flight info includes only provider-backed segment distance, aircraft, and endpoint timezone facts",()=>{
  assert.match(itinerary,/>Flight info<\/Text>/);
  assert.match(itinerary,/distanceSegments=leg\.segments\.filter\(\(segment\)=>segment\.distanceKm!==undefined\)/);
  assert.match(itinerary,/segment\.aircraft\?\.name\?\.trim\(\)\|\|segment\.aircraft\?\.iataCode\?\.trim\(\)/);
  assert.match(itinerary,/leg\.segments\.length===1\?"Distance":`\$\{segment\.originAirport\} → \$\{segment\.destinationAirport\} distance`/);
  assert.match(itinerary,/leg\.segments\.length===1\?"Aircraft":`\$\{segment\.originAirport\} → \$\{segment\.destinationAirport\} aircraft`/);
  assert.doesNotMatch(itinerary,/reduce\(|totalDistance|journeyDistance/);
  assert.match(itinerary,/departureTimeZone===arrivalTimeZone/);
  assert.match(itinerary,/>Time zone</);
  assert.match(itinerary,/>Departure time zone</);
  assert.match(itinerary,/>Arrival time zone</);
});

test("the complete Flight info divider and section disappear without provider facts",()=>{
  assert.match(itinerary,/hasTechnicalInformation=distanceSegments\.length>0\|\|aircraftSegments\.length>0\|\|Boolean\(departureTimeZone\)\|\|Boolean\(arrivalTimeZone\)/);
  assert.match(itinerary,/\{hasTechnicalInformation\?<>\s*<View style=\{\[s\.itineraryDivider/);
});

test("information progresses from identity through journey and airports to connections and technical facts",()=>{
  const markers=["s.itineraryHeader","s.airlineRows","s.journeySummary","s.airportDetails","s.connectionList","s.itineraryDivider","s.technicalInformation"];
  const positions=markers.map((marker)=>itinerary.indexOf(marker));
  positions.forEach((position,index)=>assert.notEqual(position,-1,`missing ${markers[index]}`));
  assert.deepEqual([...positions].sort((a,b)=>a-b),positions);
});

test("card depth and flexible technical copy remain locally scoped",()=>{
  assert.match(source,/itineraryCard:\{[^\n]*shadowOpacity:\.07[^\n]*shadowRadius:12[^\n]*elevation:1/);
  assert.match(source,/technicalLabel:\{flex:1,minWidth:0/);
  assert.match(source,/technicalValue:\{flexShrink:1,maxWidth:"52%"/);
  assert.match(source,/card:\{borderWidth:1,borderRadius:14,padding:14,gap:7\}/);
  assert.match(source,/fareCard:\{borderRadius:15,padding:15,gap:14\}/);
});
