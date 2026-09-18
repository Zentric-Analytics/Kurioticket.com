import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source=readFileSync(resolve("src/features/search/NativeFlightDetails.tsx"),"utf8");
const itinerary=source.slice(source.indexOf("function Itinerary"),source.indexOf("function FareSurface"));

test("route context stays outside the card and limits metadata to trip type, travelers, and cabin",()=>{
  assert.match(source,/flightDetailsRouteLabel\(details\.search\.tripType,offer\.legs\?\?\[\]/);
  assert.ok(source.includes('const tripMetadata=[FLIGHT_TRIP_TYPE_LABELS[details.search.tripType],`${details.search.travelers} traveler${details.search.travelers===1?"":"s"}`,titleCase(details.search.cabinClass)].join(" · ");'));
  assert.doesNotMatch(source,/const searchDates=/);
  assert.doesNotMatch(source,/tripMetadata=.*departureDate/);
  assert.doesNotMatch(source,/tripMetadata=.*returnDate/);
  assert.match(source,/<ImageBackground testID="flight-details-hero"[\s\S]*?<View testID="flight-details-route-summary"[\s\S]*?<\/ImageBackground>\s*<View style=\{s\.contentBody\}>[\s\S]*?testID="flight-details-itinerary-overlap"/);
  assert.match(source,/\]\.join\(" · "\)/);
  assert.doesNotMatch(source,/tripMetadata=.*(?:provider|price|departureDate|returnDate)/);
});

test("hero presents the airport route first, metadata second, and no city-route row",()=>{
  const heroStart=source.indexOf('<View testID="flight-details-route-summary"');
  const heroEnd=source.indexOf('</View>',heroStart);
  const heroCopy=source.slice(heroStart,heroEnd);
  const route=heroCopy.indexOf('style={s.route}');
  const metadata=heroCopy.indexOf('style={s.routeMetadata}');
  assert.ok(route>=0,"missing airport route heading");
  assert.ok(metadata>route,"trip metadata must follow the airport route");
  assert.match(heroCopy,/style=\{s\.route\}>\{flightDetailsRouteLabel/);
  assert.match(heroCopy,/style=\{s\.routeMetadata\}>\{tripMetadata\}/);
  assert.doesNotMatch(heroCopy,/cityRoute|s\.cityRoute|nativeFlightDetailsCityRouteLabel/);
  assert.equal((heroCopy.match(/<Text\b/g)??[]).length,2);
});

test("hero controls preserve actions and semantics while reducing only their visible glass surfaces",()=>{
  const controlsStart=source.indexOf('testID="flight-details-floating-controls"');
  const controlsEnd=source.indexOf('<ScrollView testID="flight-details-scroll-content"',controlsStart);
  const controls=source.slice(controlsStart,controlsEnd);
  assert.match(controls,/accessibilityRole="button" accessibilityLabel="Back to results"/);
  assert.match(controls,/label=\{saved\?"Remove saved flight":"Save flight"\}/);
  assert.match(controls,/label="Share flight"/);
  assert.match(controls,/savedFlights\.toggle/);
  assert.match(controls,/onPress=\{\(\)=>void share\(\)\}/);
  assert.match(source,/heroActions:\{width:88,height:44/);
  assert.match(source,/heroActionsGlass:\{[^}]*top:2,bottom:2[^}]*borderRadius:20/s);
  assert.match(source,/heroAction:\{width:44,height:44/);
  assert.match(source,/heroIconButton:\{width:44,height:44/);
  assert.match(source,/heroIconGlass:\{[^}]*top:2,bottom:2[^}]*borderRadius:20/s);
  assert.match(controls,/<Heart size=\{17\}/);
  assert.match(controls,/<FlowIcon name="share" size=\{17\}/);
});

test("the route transitions directly to every authoritative leg card without an itinerary heading",()=>{
  assert.doesNotMatch(source,/>Flight itinerary<\/Text>/);
  assert.match(source,/<View testID="flight-details-itinerary-overlap" style=\{s\.itineraryStack\}>\{\(offer\.legs\?\.length\?offer\.legs:\[\]\)\.map\(\(leg,index\)=><Itinerary/);
  assert.doesNotMatch(source,/itinerarySectionLabel:/);
  assert.match(source,/itineraryStack:\{gap:14,marginHorizontal:-10,marginTop:-104,zIndex:1\}/);
  assert.match(itinerary,/leg\.direction==="outbound"\?"Outbound":leg\.direction==="return"\?"Return":`Flight \$\{leg\.legIndex\?\?index\+1\}`/);
  assert.doesNotMatch(source,/Edit search/);
});

test("offer notices stay below the independently hero-overlapped itinerary",()=>{
  const contentStart=source.indexOf('<View style={s.contentBody}>',source.indexOf('<ImageBackground testID="flight-details-hero"'));
  const contentEnd=source.indexOf('<Text style={[s.fareSectionTitle',contentStart);
  const content=source.slice(contentStart,contentEnd);
  const itineraryPosition=content.indexOf('testID="flight-details-itinerary-overlap"');
  const noticePosition=content.indexOf('{message?<View accessibilityRole="alert"');
  assert.ok(itineraryPosition>=0,"missing overlapped itinerary");
  assert.ok(noticePosition>itineraryPosition,"notice must render after the negative-margin itinerary so the card cannot cover it");
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

test("journey summary is shown before every authoritative flight segment",()=>{
  const journeyPosition=itinerary.indexOf("s.journeySummary");
  const segmentPosition=itinerary.indexOf("s.segmentList");
  assert.notEqual(journeyPosition,-1);
  assert.notEqual(segmentPosition,-1);
  assert.ok(journeyPosition<segmentPosition);
  assert.match(itinerary,/leg\.segments\.map/);
  assert.match(itinerary,/resolveSegmentCarrierName/);
  assert.match(itinerary,/<AirlineLogo airlineName=\{carrier\}[^>]*variant="result-card"/);
  assert.match(itinerary,/segment\.originAirport} → \{segment\.destinationAirport/);
  assert.match(itinerary,/clock\(segment\.departureTime\).*clock\(segment\.arrivalTime\)/s);
  assert.match(itinerary,/segment\.marketingFlightNumber\?\?segment\.flightNumber/);
  assert.match(itinerary,/segment\.operatingCarrier/);
  assert.match(itinerary,/segment\.operatingFlightNumber/);
  assert.match(itinerary,/Operated by/);
});

test("native Flight Details prefers each provider-supplied segment airline logo before the same-carrier offer fallback",()=>{
  assert.match(itinerary,/logoUrl=\{segment\.airlineLogo\?\?\(canUseOfferAirlineLogo\(segment,offerAirlineName,offerAirlineLogo\)\?offerAirlineLogo:null\)\}/);
});

test("journey remains the visual hero with a restrained details scale",()=>{
  for(const fact of ["leg.departureTime","leg.arrivalTime","leg.originAirport","leg.destinationAirport","leg.duration","leg.stops"]) assert.match(itinerary,new RegExp(fact.replace(".","\\.")));
  assert.match(itinerary,/Non-stop/);
  assert.match(itinerary,/<FlowIcon name="flight"/);
  assert.equal(itinerary.match(/numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.85\} style=\{\[s\.journeyTime/g)?.length,2);
  assert.match(source,/route:\{color:"#FFFFFF",fontSize:27,lineHeight:32,fontWeight:"800"/);
  assert.match(source,/routeMetadata:\{color:"#FFFFFF",fontSize:11,lineHeight:16,fontWeight:"700"/);
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

test("connections sit between their corresponding authoritative segments",()=>{
  assert.match(itinerary,/const layover=i>0\?leg\.layovers\[i-1\]:undefined/);
  assert.match(itinerary,/Connection at \{layoverLabel\(layover\.airport\)\} · \{layover\.duration\}/);
  assert.match(itinerary,/candidate\?\.iataCode===airport/);
  assert.match(itinerary,/point\?\.cityName&&point\.cityName!==airport\?`\$\{point\.cityName\} • \$\{airport\}`:airport/);
  assert.doesNotMatch(itinerary,/s\.connectionList/);
});

test("segment rows carry airline, flight number, aircraft and distance while Flight info is reserved for endpoint timezones",()=>{
  assert.match(itinerary,/Aircraft: \{aircraftName\}\{aircraftSuffix\}/);
  assert.match(itinerary,/Flight distance: \{Math\.round\(segment\.distanceKm\)\.toLocaleString\(\)\} km/);
  assert.match(itinerary,/>Flight info<\/Text>/);
  assert.match(itinerary,/hasTechnicalInformation=Boolean\(departureTimeZone\)\|\|Boolean\(arrivalTimeZone\)/);
  assert.doesNotMatch(itinerary,/distanceSegments=/);
  assert.doesNotMatch(itinerary,/aircraftSegments=/);
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
  assert.ok((itinerary.match(/s\.technicalLabel,\{color:theme\.textPrimary\}/g)?.length??0)>=2);
  assert.ok((itinerary.match(/s\.technicalValue,\{color:theme\.textSecondary\}/g)?.length??0)>=2);
  const flightInfo=itinerary.slice(itinerary.indexOf('<View style={s.technicalInformation}>'),itinerary.indexOf('</>:null}',itinerary.indexOf('<View style={s.technicalInformation}>')));
  assert.doesNotMatch(flightInfo,/<(?:FlowIcon|AirlineLogo)|\bicon\b/i);
});

test("the complete Flight info divider and section disappear without endpoint timezone facts",()=>{
  assert.match(itinerary,/hasTechnicalInformation=Boolean\(departureTimeZone\)\|\|Boolean\(arrivalTimeZone\)/);
  assert.match(itinerary,/\{hasTechnicalInformation\?<>\s*<View style=\{\[s\.itineraryDivider/);
});

test("information progresses from journey summary to airports, segment details, connections and endpoint technical facts",()=>{
  const markers=["s.itineraryHeader","s.journeySummary","s.airportDetails","s.segmentList","s.technicalInformation"];
  const positions=markers.map((marker)=>itinerary.indexOf(marker));
  positions.forEach((position,index)=>assert.notEqual(position,-1,`missing ${markers[index]}`));
  assert.deepEqual([...positions].sort((a,b)=>a-b),positions);
  assert.doesNotMatch(itinerary,/s\.airlineRows/);
});

test("itinerary breadth expands from 18dp to 8dp side gaps while preserving current fare-card geometry",()=>{
  assert.match(source,/contentBody:\{paddingHorizontal:18,gap:14\}/);
  assert.match(source,/itineraryStack:\{gap:14,marginHorizontal:-10,marginTop:-104,zIndex:1\}/);
  assert.match(source,/itineraryCard:\{borderWidth:1,borderRadius:15,padding:15/);
  assert.match(source,/fareCard:\{borderRadius:15,minHeight:142,position:"relative",paddingHorizontal:12,paddingTop:4,paddingBottom:8,gap:4\}/);
  assert.doesNotMatch(source,/fareCard:\{[^}]*marginHorizontal/);
});

test("only the first itinerary card overlaps an extended hero with a smooth full-width curve",()=>{
  const heroStart=source.indexOf('<ImageBackground testID="flight-details-hero"');
  const heroEnd=source.indexOf("</ImageBackground>",heroStart);
  const hero=source.slice(heroStart,heroEnd);
  assert.match(source,/hero:\{minHeight:318[^}]*paddingBottom:122/);
  assert.match(hero,/<HeroCurve testID="flight-details-hero-curve" color=\{contentCanvasColor\}\/?>/);
  assert.match(source,/function HeroCurve[\s\S]*?<Svg[^>]*viewBox="0 0 100 64"[^>]*preserveAspectRatio="none"[\s\S]*?<Path d="M0 12 Q50 64 100 12 L100 64 L0 64 Z"/);
  assert.match(source,/heroCurve:\{position:"absolute",left:0,right:0,bottom:-1,width:"100%",height:65\}/);
  assert.match(source,/<View testID="flight-details-itinerary-overlap" style=\{s\.itineraryStack\}>\{\(offer\.legs\?\.length\?offer\.legs:\[\]\)\.map/);
  assert.doesNotMatch(itinerary,/HeroCurve|flight-details-hero|marginTop:-104/);
});
