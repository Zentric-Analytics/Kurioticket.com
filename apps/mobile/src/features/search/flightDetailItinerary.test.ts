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
  assert.match(source,/airportCode:\{fontSize:17,lineHeight:22,fontWeight:"700"\}/);
  assert.match(source,/journeyDuration:\{fontSize:12,lineHeight:17,fontWeight:"600"/);
  assert.match(source,/stopStatus:\{fontSize:12,lineHeight:17,fontWeight:"500"/);
  assert.match(source,/journeyEndpoint:\{flex:1\.1,minWidth:0,gap:3\}/);
  assert.match(source,/journeyCenter:\{flex:\.8,minWidth:72/);
});

test("itinerary presents airport names and only supplied terminals with secondary typography",()=>{
  for(const fact of ["point?.name","point?.cityName","departurePoint?.terminal","arrivalPoint?.terminal"]){
    assert.match(itinerary,new RegExp(fact.replace(/[?.]/g,(character)=>character==="?"?"\\?":"\\.")));
  }
  assert.match(itinerary,/Terminal \{departurePoint\.terminal\}/);
  assert.match(itinerary,/Terminal \{arrivalPoint\.terminal\}/);
  assert.match(source,/airportName:\{fontSize:13,lineHeight:18,fontWeight:"500"\}/);
  assert.match(source,/terminal:\{fontSize:12,lineHeight:17,fontWeight:"400"\}/);
});

test("itinerary renders the prescribed information order",()=>{
  const markers=["s.itineraryHeader","s.airlineRows","s.journeySummary","s.airportDetails","s.connectionList","s.itineraryDivider","s.technicalInformation"];
  const positions=markers.map((marker)=>itinerary.indexOf(marker));
  positions.forEach((position,index)=>assert.notEqual(position,-1,`missing ${markers[index]}`));
  assert.deepEqual([...positions].sort((left,right)=>left-right),positions);
});

test("one-stop and multi-stop itineraries map every authoritative layover in a separate band",()=>{
  assert.match(itinerary,/leg\.stops>0&&leg\.layovers\.length>0/);
  assert.match(itinerary,/leg\.layovers\.map/);
  assert.match(itinerary,/\{layover\.duration\} layover/);
  assert.match(itinerary,/\{layover\.airport\}/);
  assert.doesNotMatch(itinerary,/1 stop ·/);
  assert.match(itinerary,/leg\.stops===1\?"stop":"stops"/);
});

test("airline identity preserves every segment while distance moves to provider-backed technical rows",()=>{
  assert.match(itinerary,/resolveSegmentCarrierName/);
  assert.match(itinerary,/<AirlineLogo airlineName=\{carrier\}/);
  assert.match(itinerary,/canUseOfferAirlineLogo/);
  assert.match(itinerary,/segment\.marketingFlightNumber\?\?segment\.flightNumber/);
  assert.match(itinerary,/segment\.operatingCarrier/);
  assert.match(itinerary,/segment\.operatingFlightNumber/);
  assert.match(itinerary,/Operated by/);
  assert.match(itinerary,/leg\.segments\.map/);
  assert.match(itinerary,/distanceSegments=leg\.segments\.filter\(\(segment\)=>segment\.distanceKm!==undefined\)/);
  assert.match(itinerary,/Math\.round\(segment\.distanceKm!\)\.toLocaleString\(\)/);
  assert.match(itinerary,/leg\.segments\.length===1\?"Flight distance":`\$\{segment\.originAirport\} → \$\{segment\.destinationAirport\} distance`/);
  const airlineIdentity=itinerary.slice(itinerary.indexOf('<View style={s.airlineRows}'),itinerary.indexOf('<View style={s.journeySummary}'));
  assert.doesNotMatch(airlineIdentity,/distanceKm|Flight distance/);
  assert.doesNotMatch(itinerary,/reduce\(|totalDistance|journeyDistance/);
  assert.match(source,/airlineName:\{fontSize:14,lineHeight:19,fontWeight:"600"\}/);
  assert.match(source,/flightNumber:\{fontSize:12,lineHeight:17,fontWeight:"500"\}/);
  assert.match(source,/technicalLabel:\{[^}]*fontSize:11[^}]*fontWeight:"400"/);
});

test("timezone rows use only authoritative endpoint values and distinguish unequal or partial data",()=>{
  assert.match(itinerary,/const departureTimeZone=departurePoint\?\.timeZone/);
  assert.match(itinerary,/const arrivalTimeZone=arrivalPoint\?\.timeZone/);
  assert.match(itinerary,/departureTimeZone===arrivalTimeZone/);
  assert.match(itinerary,/>Time zone</);
  assert.match(itinerary,/>Departure time zone</);
  assert.match(itinerary,/>Arrival time zone</);
  assert.doesNotMatch(itinerary,/resolvedOptions\(\)\.timeZone|airportTimeZone|timeZoneMap|timezoneMap/);
});

test("itinerary spacing is tightened locally without touching shared fare cards",()=>{
  assert.match(source,/itineraryCard:\{borderWidth:1,borderRadius:15,padding:15/);
  assert.match(source,/journeySummary:\{[^\n]*marginTop:14\}/);
  assert.match(source,/airportDetails:\{[^\n]*marginTop:14\}/);
  assert.match(source,/airportColumn:\{[^\n]*gap:6\}/);
  assert.match(source,/itineraryDivider:\{height:StyleSheet\.hairlineWidth,marginVertical:12\}/);
  assert.match(source,/airlineCopy:\{flex:1,minWidth:0,gap:1\}/);
  assert.match(source,/card:\{borderWidth:1,borderRadius:14,padding:14,gap:7\}/);
});

test("itinerary card uses a restrained card-only blur shadow",()=>{
  assert.match(source,/itineraryCard:\{[^\n]*shadowColor:"#0F172A"[^\n]*shadowOffset:\{width:0,height:3\}[^\n]*shadowOpacity:\.07[^\n]*shadowRadius:12[^\n]*elevation:1\}/);
  const sharedCardStyle=source.match(/(?:^|,)card:\{([^}]*)\}/)?.[1]??"";
  assert.notEqual(sharedCardStyle,"");
  assert.doesNotMatch(sharedCardStyle,/shadowOpacity/);
});

test("itinerary remains isolated from loading, generic fare cards, and unrelated diagnostics",()=>{
  for(const detail of ["segment.aircraft","segment.cabinDetails","segment.technicalStops","stop.arrivalTime","stop.departureTime","Technical stop at"]){
    assert.doesNotMatch(itinerary,new RegExp(detail.replace(".","\\.")));
  }
  assert.doesNotMatch(itinerary,/technical stop|Connection:/i);
  assert.match(source,/loadingItineraryCard:\{height:226,borderWidth:1,borderRadius:15,padding:15\}/);
  assert.match(source,/loadingJourneyRow:\{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:18,marginTop:25\}/);
  assert.match(source,/card:\{borderWidth:1,borderRadius:14,padding:14,gap:7\}/);
  assert.match(source,/fareCard:\{minHeight:176,borderRadius:15,padding:15,gap:16\}/);
});
