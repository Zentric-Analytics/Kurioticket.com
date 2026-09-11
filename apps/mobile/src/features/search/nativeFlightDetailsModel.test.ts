import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { flightDetailsRouteLabel } from "../../../../../src/lib/flights/flightDetailsContract";
import { compactFareTerms } from "../../../../../src/lib/flights/flightDetailsPresentation";
import { nativeFareRailHorizontalInset, nativeInitialFareRailOffset, nativeLoadedFareCardWidth } from "./nativeFareRailGeometry";

const source=readFileSync("src/features/search/NativeFlightDetails.tsx","utf8");
const between=(start:string,end:string)=>{const startIndex=source.indexOf(start);assert.notEqual(startIndex,-1,`missing ${start}`);const endIndex=source.indexOf(end,startIndex+start.length);assert.notEqual(endIndex,-1,`missing ${end}`);return source.slice(startIndex,endIndex);};
const fareRail=()=>between('<Text style={[s.fareSectionTitle,{color:theme.textPrimary}]}>Pick your fare</Text>','<View accessibilityRole="tablist"');
const legs=(pairs:string[][])=>pairs.map(([originAirport,destinationAirport])=>({originAirport,destinationAirport}));

test("route summaries represent one-way, round-trip, continuous and discontinuous trips",()=>{assert.equal(flightDetailsRouteLabel("one-way",legs([["LOS","LHR"]]),"LOS","LHR"),"LOS → LHR");assert.equal(flightDetailsRouteLabel("round-trip",legs([["LOS","LHR"],["LHR","LOS"]]),"LOS","LHR"),"LOS → LHR");assert.equal(flightDetailsRouteLabel("multi-city",legs([["LOS","LHR"],["LHR","JFK"],["JFK","LAX"]]),"",""),"LOS → LHR → JFK → LAX");assert.equal(flightDetailsRouteLabel("multi-city",legs([["LOS","LHR"],["JFK","LAX"]]),"",""),"LOS → LHR · JFK → LAX");});
test("compact terms prioritize restrictions and consolidate round-trip baggage",()=>{const terms=[{category:"fare",semantic:"informational",text:"Basic"},{category:"baggage",semantic:"positive",text:"Outbound: 1 carry-on included"},{category:"baggage",semantic:"positive",text:"Return: 1 carry-on included"},{category:"refund",semantic:"negative",text:"Refund not allowed"}] as const;assert.deepEqual(compactFareTerms([...terms],"round-trip").map(x=>x.text),["1 carry-on included each way","Refund not allowed","Basic"]);});
test("selection, currency, all-leg edit state and safe legal links are encoded",()=>{assert.match(source,/current && fares\.some/);assert.match(source,/selectedOffer/);assert.match(source,/\^\[A-Za-z\]\{3\}\$/);assert.match(source,/result\[`origin\$\{n\}`\]/);assert.match(source,/result\[`destination\$\{n\}`\]/);assert.match(source,/result\[`departureDate\$\{n\}`\]/);assert.ok(source.includes("^https:\\/\\/"));assert.match(source,/new Map\(entries\.map/);});
test("all fares and every independently-priced deal share one rates resolution",()=>{assert.match(source,/Object\.fromEntries\(details\.fareChoices\.map/);assert.match(source,/choice\.deals\.map\(deal=>\[`deal:/);assert.equal((source.match(/travelApi\.currencyRates\(\)/g)??[]).length,1);});
test("scrolled top bar keeps only its bounded bottom separation",()=>{const topBarScrolled=between("topBarScrolled:","back:");assert.match(topBarScrolled,/borderBottomWidth:StyleSheet\.hairlineWidth/);assert.match(topBarScrolled,/borderBottomColor:/);assert.doesNotMatch(topBarScrolled,/elevation|boxShadow|shadowColor|shadowOffset|shadowOpacity|shadowRadius/);assert.match(source,/hasScrolled&&s\.topBarScrolled/);assert.match(source,/const next=nativeEvent\.contentOffset\.y>1/);assert.match(source,/setHasScrolled\(next\)/);});

test("fare cards preserve accessible selection and authoritative content",()=>{const rail=fareRail();assert.match(rail,/accessibilityRole="radiogroup"/);assert.match(rail,/accessibilityLabel="Available fares"/);assert.match(rail,/details\.fareChoices\.map\(\(choice\)=>/);assert.match(rail,/accessibilityRole="radio"/);assert.match(rail,/accessibilityState=\{\{selected:isSelected\}\}/);assert.match(rail,/const isSelected=choice\.key===selected\.key/);assert.match(rail,/onPress=\{\(\)=>setSelectedKey\(choice\.key\)\}/);assert.match(rail,/\{choice\.label\}/);assert.match(rail,/displayPrices\[choice\.key\]\?\.formatted/);assert.match(rail,/accessibilityLabel=\{displayPrices\[choice\.key\]\?\.accessibilityLabel\}/);assert.match(rail,/<View style=\{s\.fareIdentity\}>\s*<View[^>]*s\.fareIconContainer[^>]*>[\s\S]*?<Luggage[\s\S]*?<\/View>\s*<Text[^>]*s\.fareLabel[^>]*>\{choice\.label\}<\/Text>\s*<Text numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.8\}[^>]*s\.farePrice/);assert.match(rail,/compactFareTerms\(choice\.distinguishingTerms,details\.search\.tripType\)/);assert.match(rail,/category=\{row\.term\.category\}/);assert.doesNotMatch(rail,/•|slice\(0,\s*3\)|Choose fare|Select fare|Book fare|Continue/);});

test("fare benefit presentation partitions only authoritative baggage quantities and penalties",()=>{const presentation=between("export function nativeFareBenefitPresentation", "function savedFlightOffer");assert.match(presentation,/category==="baggage"/);assert.match(presentation,/carry-ons\?\|checked bags\?/);assert.match(presentation,/Carry-on baggage/);assert.match(presentation,/Checked baggage/);assert.match(presentation,/included\$\{baggage\[3\]/);assert.match(presentation,/category==="change"\|\|category==="refund"/);assert.match(presentation,/penalty=body\.match/);assert.match(presentation,/detail:penalty\[2\]/);assert.match(presentation,/return \{title:text\}/);});

test("fare identity and statuses use the native icon language and term semantics",()=>{const rail=fareRail();const status=between("function FareStatusIcon", "function FareBenefitRow");const benefit=between("function FareBenefitRow", "function Itinerary");assert.match(source,/import \{[^\n]*Luggage[^\n]*\} from "lucide-react-native"/);assert.match(rail,/<Luggage size=\{15\} color=\{ui\.blue\}/);assert.match(rail,/backgroundColor:isSelected\?"rgba\(7, 94, 232, 0\.08\)":theme\.background/);assert.doesNotMatch(rail,/<FlowIcon name="briefcase"/);assert.match(rail,/semantic=\{row\.term\.semantic\}/);assert.match(benefit,/<FareStatusIcon semantic=\{semantic\}/);assert.match(benefit,/presentation\.value/);assert.match(benefit,/presentation\.detail/);assert.match(status,/semantic==="positive"\?<FlowIcon name="check" size=\{10\} color=\{ui\.green\}/);assert.match(status,/semantic==="negative"\?<View style=\{s\.fareStatusMinus\}/);assert.match(status,/:<View style=\{s\.fareStatusDot\}/);assert.doesNotMatch(`${rail}${status}${benefit}` ,/[🧳✅❌⚠️]/u);});

test("responsive fare widths exercise the production geometry helper",()=>{
  const widths=[320,360,375,390,430];
  const expectedSingle=[284,324,339,354,394];
  const expectedMultiple=[236,270,285,300,330];
  assert.deepEqual(widths.map((width)=>nativeLoadedFareCardWidth(width,1)),expectedSingle);
  assert.deepEqual(widths.map((width)=>nativeLoadedFareCardWidth(width,2)),expectedMultiple);
  widths.forEach((width,index)=>{
    const available=width-nativeFareRailHorizontalInset;
    const single=nativeLoadedFareCardWidth(width,1);
    const multiple=nativeLoadedFareCardWidth(width,2);
    assert.equal(single,available,`${width}px single fare should fill its content width`);
    assert.ok(multiple>=236,`${width}px multiple fare remains usable`);
    assert.ok(multiple<available,`${width}px multiple-fare rail reveals another fare`);
    assert.ok(available-multiple>=48,`${width}px has a discoverable next-card clue`);
    assert.equal(multiple,expectedMultiple[index]);
  });
  assert.match(fareRail(),/details\.fareChoices\.length>1\?s\.faresMultiple:s\.faresSingle/);
  assert.match(source,/faresSingle:\{paddingRight:0\}/);
  assert.match(source,/faresMultiple:\{paddingRight:38\}/);
});

test("fare hierarchy is restrained and fare-card breadth remains unchanged",()=>{const rail=fareRail();const styles=between("fareSectionTitle:","fareInfoDeck:");assert.match(styles,/fareSectionTitle:\{fontSize:17,lineHeight:22,fontWeight:"700"/);assert.match(styles,/fareCard:\{borderRadius:15,padding:12,gap:8\}/);assert.doesNotMatch(styles,/fareCard:\{[^}]*minHeight/);assert.doesNotMatch(styles,/fareCard:\{[^}]*marginHorizontal/);assert.match(styles,/fareCardSelected:\{borderWidth:1\.5\}/);assert.match(styles,/fareCardUnselected:\{borderWidth:1\}/);assert.match(styles,/farePrice:\{flexShrink:1,maxWidth:"55%",fontSize:18,lineHeight:22,fontWeight:"800",textAlign:"right"\}/);assert.match(styles,/fareLabel:\{flex:1,minWidth:0,fontSize:13,lineHeight:17,fontWeight:"700"\}/);assert.match(styles,/fareBenefitTitle:\{[^}]*fontSize:12[^}]*fontWeight:"600"/);assert.match(styles,/fareBenefitDetail:\{fontSize:11,lineHeight:16,fontWeight:"400"\}/);assert.match(styles,/fareIdentity:\{flexDirection:"row",alignItems:"center",gap:8\}/);assert.match(styles,/fareIconContainer:\{width:30,height:30/);assert.match(styles,/fareBenefits:\{gap:6\}/);assert.match(styles,/fareBenefitRow:\{[^}]*gap:7\}/);assert.match(styles,/fareStatusColumn:\{width:15,alignItems:"center"\}/);assert.match(styles,/fareStatus:\{width:14,height:14,borderRadius:7,borderWidth:1/);assert.doesNotMatch(styles,/fareCard:\{[^}]*minHeight/);assert.match(rail,/backgroundColor:theme\.surface/);assert.doesNotMatch(rail,/backgroundColor:isSelected\?ui\.blue|opacity:/);assert.match(rail,/color:isSelected\?ui\.blue:theme\.textPrimary/);});

test("empty compact terms do not mount a filler benefits section",()=>{const rail=fareRail();assert.match(rail,/\{fareTerms\.length\?<View style=\{s\.fareBenefits\}>/);assert.doesNotMatch(rail,/fareTerms\.length\?[^:]+:<View/);});

test("fare cards do not duplicate itinerary or provider diagnostics",()=>{const rail=fareRail();for(const field of ["offer.airlineName","flightNumber","departureTime","arrivalTime","distanceKm","aircraft","totalEmissionsKg"]){assert.doesNotMatch(rail,new RegExp(field.replace(".","\\.")));}});

test("loading geometry remains isolated from loaded fare geometry",()=>{assert.match(source,/const fareCardWidth = Math\.min\(290, Math\.max\(250, windowWidth - 86\)\)/);assert.match(source,/FlightDetailsLoadingSkeleton[^;]*fareCardWidth=\{fareCardWidth\}/);assert.match(fareRail(),/width:loadedFareCardWidth/);assert.doesNotMatch(fareRail(),/width:fareCardWidth/);});

test("initial selected fare is positioned once without changing selection",()=>{
  assert.equal(nativeInitialFareRailOffset(0,270,324,3),0);
  assert.equal(nativeInitialFareRailOffset(1,270,324,1),0);
  assert.ok(nativeInitialFareRailOffset(1,270,324,3)>0);
  const rail=fareRail();
  assert.match(rail,/positionedFareSetRef\.current===fareSet/);
  assert.match(rail,/findIndex\(\(\{key\}\)=>key===selected\.key\)/);
  assert.match(rail,/scrollTo\(\{x:nativeInitialFareRailOffset/);
  assert.match(rail,/animated:false/);
  assert.equal((rail.match(/scrollTo\(/g)??[]).length,1);
});
