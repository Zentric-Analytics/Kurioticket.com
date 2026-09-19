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

test("brightened hero protects its lower text with a localized soft fade rather than a metadata badge",()=>{
  assert.match(source,/heroOverlay:\{\.\.\.StyleSheet\.absoluteFillObject,backgroundColor:"rgba\(5, 13, 26, 0\.30\)"\}/);
  assert.match(source,/testID="flight-details-hero-text-fade" pointerEvents="none" accessible=\{false\}/);
  assert.match(source,/<LinearGradient id="flightHeroTextFade"[\s\S]*?<Stop offset="0"[^>]*stopOpacity="0"[\s\S]*?<Stop offset="1"[^>]*stopOpacity="0\.42"/);
  assert.match(source,/heroTextFade:\{position:"absolute",left:0,right:0,bottom:66,height:150\}/);
  assert.match(source,/<Text numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.75\} style=\{s\.routeMetadata\}>\{tripMetadata\}<\/Text>/);
  assert.doesNotMatch(source,/routeMetadataBackdrop|backgroundColor:[^}]*routeMetadata/);
});

test("hero controls preserve actions and semantics with inset Hotel light glass surfaces",()=>{
  const controlsStart=source.indexOf('testID="flight-details-floating-controls"');
  const controlsEnd=source.indexOf('<ScrollView testID="flight-details-scroll-content"',controlsStart);
  const controls=source.slice(controlsStart,controlsEnd);
  assert.match(controls,/accessibilityRole="button" accessibilityLabel="Back to results"/);
  assert.match(controls,/label=\{saved\?"Remove saved flight":"Save flight"\}/);
  assert.match(controls,/label="Share flight"/);
  assert.match(controls,/savedFlights\.toggle/);
  assert.match(controls,/onPress=\{\(\)=>void share\(\)\}/);
  assert.match(source,/heroActions:\{width:88,height:44/);
  assert.match(source,/heroActionsGlass:\{position:"absolute",left:0,right:0,top:2,bottom:2,borderRadius:20\}/);
  assert.match(source,/heroAction:\{width:44,height:44/);
  assert.match(source,/heroIconButton:\{width:44,height:44/);
  assert.match(source,/heroIconGlass:\{position:"absolute",left:2,right:2,top:2,bottom:2,borderRadius:20\}/);
  assert.equal((controls.match(/variant="hotelLight"/g)??[]).length,2);
  assert.match(controls,/<DetailGlassSurface dark=\{false\} variant="hotelLight"/);
  assert.match(controls,/<Heart size=\{17\}/);
  assert.match(controls,/<FlowIcon name="share" size=\{17\}/);
});

test("the route transitions directly to every authoritative leg card without an itinerary heading",()=>{
  assert.doesNotMatch(source,/>Flight itinerary<\/Text>/);
  assert.match(source,/<View testID="flight-details-itinerary-overlap"[^\n]*style=\{s\.itineraryStack\}>\{\(offer\.legs\?\.length\?offer\.legs:\[\]\)\.map\(\(leg,index\)=><Itinerary/);
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

test("journey times remain the visual anchor with tabular numerals and a restrained details scale",()=>{
  for(const fact of ["leg.departureTime","leg.arrivalTime","leg.originAirport","leg.destinationAirport","leg.duration","leg.stops"]) assert.match(itinerary,new RegExp(fact.replace(".","\\.")));
  assert.match(itinerary,/Non-stop/);
  assert.match(itinerary,/<FlowIcon name="flight"/);
  assert.equal(itinerary.match(/numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.85\} style=\{\[s\.journeyTime/g)?.length,2);
  assert.match(source,/route:\{color:"#FFFFFF",fontSize:27,lineHeight:32,fontWeight:"800"/);
  assert.match(source,/routeMetadata:\{color:"#FFFFFF",fontSize:11,lineHeight:16,fontWeight:"700"/);
  assert.match(source,/journeyTime:\{fontSize:19,lineHeight:24,fontWeight:"800",fontVariant:\["tabular-nums"\]\}/);
  assert.match(source,/airportCode:\{fontSize:13,lineHeight:17,fontWeight:"700"\}/);
  assert.match(source,/journeyDuration:\{fontSize:11,lineHeight:16,fontWeight:"600"/);
  assert.match(source,/stopStatus:\{fontSize:10,lineHeight:13,fontWeight:"500"/);
});

test("itinerary surface pairs controlled depth with a light-only gloss finish shared by the loading card",()=>{
  assert.match(source,/itineraryCardLight:\{shadowColor:ui\.navy,shadowOffset:\{width:0,height:6\},shadowOpacity:\.14,shadowRadius:18,elevation:4\}/);
  assert.match(source,/itineraryCardDark:\{shadowColor:"#000000",shadowOffset:\{width:0,height:5\},shadowOpacity:\.32,shadowRadius:18,elevation:4\}/);
  assert.match(itinerary,/theme\.dark\?s\.itineraryCardDark:s\.itineraryCardLight/);
  assert.match(source,/testID="flight-details-loading-itinerary" style=\{\[s\.itineraryCard,s\.loadingItineraryCard,theme\.dark\?s\.itineraryCardDark:s\.itineraryCardLight/);
  assert.match(source,/const surfaceBorderColor=theme\.dark\?FLIGHT_DETAILS_DARK_BORDER:FLIGHT_DETAILS_LIGHT_BORDER/);
  assert.match(source,/const FLIGHT_DETAILS_LIGHT_ITINERARY_SURFACE = "#FCFDFE"/);
  assert.match(source,/const FLIGHT_DETAILS_LIGHT_ITINERARY_BORDER = "#E1E7EF"/);
  assert.match(source,/function ItineraryGlossSurface[\s\S]*?if\(dark\)return null/);
  assert.match(source,/<Svg testID=\{testID\} pointerEvents="none" accessible=\{false\} style=\{s\.itineraryGlossSurface\}/);
  assert.match(source,/<LinearGradient[^>]*x1="0" y1="0" x2="0" y2="1"/);
  assert.match(itinerary,/<ItineraryGlossSurface dark=\{theme\.dark\} testID="flight-details-itinerary-gloss"\/>/);
  assert.match(source,/<ItineraryGlossSurface dark=\{theme\.dark\} testID="flight-details-loading-itinerary-gloss"\/>/);
  assert.match(source,/itineraryGlossSurface:\{\.\.\.StyleSheet\.absoluteFillObject,borderRadius:14,overflow:"hidden"\}/);
});

test("the polished route retains dot-line-plane-line-dot without nested itinerary cards",()=>{
  assert.match(itinerary,/<View style=\{s\.pathDot\}\/?>\s*<View style=\{\[s\.pathLine/);
  assert.match(itinerary,/<FlowIcon name="flight" size=\{16\} color=\{ui\.blue\}\/?>\s*<View style=\{\[s\.pathLine/);
  assert.equal(itinerary.match(/<View[^>]*style=\{\[s\.itineraryCard/g)?.length,1);
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
  assert.match(itinerary,/testID="flight-details-connection-row"/);
  assert.match(itinerary,/<FlowIcon name="clock" size=\{13\} strokeWidth=\{1\.8\} color=\{connectionAccent\}\/?>/);
  assert.match(itinerary,/<Text numberOfLines=\{1\} ellipsizeMode="tail"[^>]*>Connection at \{layoverLabel\(layover\.airport\)\}<Text[^>]*> · \{layover\.duration\}<\/Text><\/Text>/);
  assert.match(itinerary,/candidate\?\.iataCode===airport/);
  assert.match(itinerary,/point\?\.cityName&&point\.cityName!==airport\?`\$\{point\.cityName\} • \$\{airport\}`:airport/);
  assert.doesNotMatch(itinerary,/s\.connectionList/);
});

test("connection polish stays compact and uses restrained theme-aware surfaces",()=>{
  assert.match(itinerary,/const connectionSurface=theme\.dark\?"#182536":"#F3F7FC"/);
  assert.match(itinerary,/const connectionBorder="#D6E2F0"/);
  assert.match(itinerary,/theme\.dark&&\{borderColor:theme\.border\}/);
  assert.match(itinerary,/const connectionAccent=theme\.dark\?"#8FA9CC":"#5F7799"/);
  assert.match(source,/segmentConnection:\{borderWidth:StyleSheet\.hairlineWidth,borderRadius:9,paddingHorizontal:11,paddingVertical:8,marginBottom:2,flexDirection:"row",alignItems:"center",gap:7\}/);
  assert.match(source,/segmentConnectionText:\{flex:1,minWidth:0,fontSize:11,lineHeight:16,fontWeight:"600"\}/);
  assert.match(source,/segmentConnectionDuration:\{fontWeight:"500"\}/);
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
  assert.match(source,/technicalHeading:\{fontSize:12,lineHeight:16,fontWeight:"700"/);
  assert.match(source,/technicalLabel:\{[^}]*fontSize:11,lineHeight:16,fontWeight:"600"\}/);
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
  assert.match(source,/itineraryCard:\{position:"relative",borderWidth:1,borderRadius:15,padding:15/);
  assert.match(source,/fareCard:\{borderWidth:1\.5,borderRadius:15,minHeight:142,position:"relative",paddingHorizontal:12,paddingTop:6,paddingBottom:8,gap:4\}/);
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
  assert.match(source,/<View testID="flight-details-itinerary-overlap"[^\n]*style=\{s\.itineraryStack\}>\{\(offer\.legs\?\.length\?offer\.legs:\[\]\)\.map/);
  assert.doesNotMatch(itinerary,/HeroCurve|flight-details-hero|marginTop:-104/);
});
