import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source=readFileSync(resolve("src/features/search/NativeFlightDetails.tsx"),"utf8");
const itinerary=source.slice(source.indexOf("function Itinerary"),source.indexOf("function FareSurface"));

test("route context stays outside the card and limits metadata to trip type and travelers",()=>{
  assert.match(source,/flightDetailsRouteLabel\(details\.search\.tripType,offer\.legs\?\?\[\]/);
  assert.ok(source.includes('const tripMetadata=[`${FLIGHT_TRIP_TYPE_LABELS[details.search.tripType]}`,`${details.search.travelers} traveler${details.search.travelers===1?"":"s"}`].join(" • ");'));
  assert.doesNotMatch(source,/const searchDates=/);
  assert.doesNotMatch(source,/tripMetadata=.*departureDate/);
  assert.doesNotMatch(source,/tripMetadata=.*returnDate/);
  assert.match(source,/<View testID="flight-details-route-summary"[^>]*>[\s\S]*?<View style=\{s\.routeActions\}>[\s\S]*?<\/View>\s*<View style=\{s\.itineraryStack\}>/);
});

test("the route transitions directly to every authoritative leg card without an itinerary heading",()=>{
  assert.doesNotMatch(source,/>Flight itinerary<\/Text>/);
  assert.match(source,/<View style=\{s\.itineraryStack\}>\{\(offer\.legs\?\.length\?offer\.legs:\[\]\)\.map\(\(leg,index\)=><Itinerary/);
  assert.doesNotMatch(source,/itinerarySectionLabel:/);
  assert.match(source,/itineraryStack:\{gap:14,marginHorizontal:-6\}/);
  assert.match(itinerary,/leg\.direction==="outbound"\?"Outbound":leg\.direction==="return"\?"Return":`Flight \$\{leg\.legIndex\?\?index\+1\}`/);
  assert.doesNotMatch(source,/Edit search/);
});

test("direction and provider-local departure date share a narrow-screen-safe header row",()=>{
  assert.match(itinerary,/<View style=\{s\.itineraryHeader\}>\s*<Text style=\{s\.direction\}>\{label\}<\/Text>\s*<Text style=\{\[s\.itineraryDate/);
  assert.match(source,/itineraryHeader:\{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:12\}/);
  assert.match(source,/direction:\{color:ui\.blue,flexShrink:1/);
  assert.match(source,/itineraryDate:\{flexShrink:0[^}]*textAlign:"right"/);
});

test("provider-local full and endpoint dates use the selected app locale without device-timezone conversion or visible day offsets",()=>{
  assert.match(source,/const \{ locale \} = useMobileLocalization\(\)/);
  assert.match(source,/mobileLocales\.find\(\(option\) => option\.code === locale\)\?\.intl \?\? "en-US"/);
  assert.match(source,/intlLocale=\{intlLocale\}/);
  assert.match(itinerary,/providerLocalFlightDateLong\(leg\.departureTime,intlLocale\)/);
  assert.match(itinerary,/departureShortDate=providerLocalFlightDate\(leg\.departureTime,intlLocale\)/);
  assert.match(itinerary,/arrivalShortDate=providerLocalFlightDate\(leg\.arrivalTime,intlLocale\)/);
  assert.doesNotMatch(itinerary,/new Date\(leg\.(?:departureTime|arrivalTime)\)/);
  assert.match(itinerary,/s\.airportCode[^>]*>\{leg\.originAirport\}<\/Text>\s*\{departureShortDate\?<Text numberOfLines=\{1\} style=\{\[s\.airportDate/);
  assert.match(itinerary,/s\.airportCode[^>]*>\{leg\.destinationAirport\}<\/Text>\s*\{arrivalShortDate\?<Text numberOfLines=\{1\} style=\{\[s\.airportDate,s\.arrivalText/);
  assert.doesNotMatch(itinerary,/arrivalDayOffset|flightArrivalDayOffset|arrivalDayOffsetAccessibility|>\+\{/);
  assert.match(source,/airportDate:\{marginTop:1,fontSize:9\.5,lineHeight:12,fontWeight:"500"\}/);
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

test("journey remains the visual hero with a restrained details scale",()=>{
  for(const fact of ["leg.departureTime","leg.arrivalTime","leg.originAirport","leg.destinationAirport","leg.duration","leg.stops"]) assert.match(itinerary,new RegExp(fact.replace(".","\\.")));
  assert.match(itinerary,/Non-stop/);
  assert.match(itinerary,/<FlowIcon name="flight"/);
  assert.equal(itinerary.match(/numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.85\} style=\{\[s\.journeyTime/g)?.length,2);
  assert.match(source,/route:\{fontSize:18,lineHeight:22,fontWeight:"800"\}/);
  assert.match(source,/routeMetadata:\{fontSize:11,lineHeight:15,fontWeight:"500"\}/);
  assert.match(source,/journeyTime:\{fontSize:16,lineHeight:21,fontWeight:"700"\}/);
  assert.match(source,/airportCode:\{fontSize:12,lineHeight:16,fontWeight:"700"\}/);
  assert.match(source,/journeyDuration:\{fontSize:11,lineHeight:16,fontWeight:"600"/);
  assert.match(source,/stopStatus:\{fontSize:10,lineHeight:13,fontWeight:"500"/);
});

test("airport names retain provider fallback order and terminals remain conditional",()=>{
  assert.match(itinerary,/point\?\.name\?\?point\?\.cityName\?\?point\?\.iataCode\?\?fallback/);
  assert.match(itinerary,/departurePoint\?\.terminal\?<Text[^>]*>Terminal \{departurePoint\.terminal\}/);
  assert.match(itinerary,/arrivalPoint\?\.terminal\?<Text[^>]*>Terminal \{arrivalPoint\.terminal\}/);
  assert.match(source,/airportName:\{fontSize:12,lineHeight:17,fontWeight:"500"\}/);
  assert.match(source,/terminal:\{fontSize:11,lineHeight:16,fontWeight:"400"\}/);
  assert.equal(itinerary.match(/s\.airportName[^>]*color:theme\.textPrimary/g)?.length,2);
  assert.equal(itinerary.match(/s\.terminal[^>]*color:theme\.textSecondary/g)?.length,2);
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

test("Flight info preserves its compact scale while labels lead readable regular values without icons",()=>{
  assert.match(source,/technicalHeading:\{fontSize:11,lineHeight:15,fontWeight:"600"/);
  assert.match(source,/technicalLabel:\{[^}]*fontSize:11,lineHeight:16,fontWeight:"500"\}/);
  assert.match(source,/technicalValue:\{[^}]*fontSize:11,lineHeight:16,fontWeight:"400"/);
  assert.match(itinerary,/s\.technicalHeading,\{color:theme\.textPrimary\}/);
  assert.ok((itinerary.match(/s\.technicalLabel,\{color:theme\.textPrimary\}/g)?.length??0)>=3);
  assert.ok((itinerary.match(/s\.technicalValue,\{color:theme\.textSecondary\}/g)?.length??0)>=3);
  const flightInfo=itinerary.slice(itinerary.indexOf('<View style={s.technicalInformation}>'),itinerary.indexOf('</>:null}',itinerary.indexOf('<View style={s.technicalInformation}>')));
  assert.doesNotMatch(flightInfo,/<(?:FlowIcon|AirlineLogo)|\bicon\b/i);
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

test("itinerary breadth expands from 18dp to 12dp side gaps without changing fare-card geometry",()=>{
  assert.match(source,/content:\{paddingHorizontal:18,paddingTop:5,gap:14\}/);
  assert.match(source,/itineraryStack:\{gap:14,marginHorizontal:-6\}/);
  assert.match(source,/itineraryCard:\{borderWidth:1,borderRadius:15,padding:15/);
  assert.match(source,/fareCard:\{borderRadius:15,padding:12,gap:8\}/);
  assert.doesNotMatch(source,/fareCard:\{[^}]*marginHorizontal:-6/);
});
