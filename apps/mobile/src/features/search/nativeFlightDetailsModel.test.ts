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

test("fare cards preserve accessible selection and authoritative content",()=>{const rail=fareRail();assert.match(rail,/accessibilityRole="radiogroup"/);assert.match(rail,/accessibilityLabel="Available fares"/);assert.match(rail,/details\.fareChoices\.map\(\(choice\)=>/);assert.match(rail,/<Pressable accessibilityRole="radio" accessibilityState=\{\{selected:isSelected\}\} onPress=\{\(\)=>setSelectedKey\(choice\.key\)\}/);assert.match(rail,/\{choice\.label\}/);assert.match(rail,/displayPrices\[choice\.key\]\?\.formatted/);assert.match(rail,/accessibilityLabel=\{displayPrices\[choice\.key\]\?\.accessibilityLabel\}/);assert.match(rail,/<View style=\{s\.fareIdentity\}>[\s\S]*?<Luggage[\s\S]*?\{choice\.label\}[\s\S]*?<\/View>\s*<Text numberOfLines=\{1\}/);assert.match(rail,/compactFareTerms\(choice\.distinguishingTerms,details\.search\.tripType,5\)/);assert.doesNotMatch(rail,/slice\(0,\s*3\)/);});

test("fare disclosures preserve status semantics and expose only authoritative detail",()=>{const rail=fareRail();const status=between("function FareStatusIcon", "function FareBenefitRow");const benefit=between("function FareBenefitRow", "function Itinerary");assert.match(source,/ChevronDown/);assert.match(rail,/<Luggage size=\{15\} color=\{ui\.blue\}/);assert.doesNotMatch(rail,/fareIconContainer,\{backgroundColor/);assert.match(benefit,/<FareStatusIcon semantic=\{semantic\}/);assert.match(benefit,/const \{title,detail\}=nativeFareBenefitPresentation\(category,text\)/);assert.match(benefit,/<ChevronDown[^>]*style=\{expanded\?s\.fareBenefitChevronExpanded:undefined\}/);assert.match(benefit,/\{expanded\?<Text/);assert.match(benefit,/accessibilityRole="button"/);assert.match(benefit,/accessibilityState=\{\{expanded\}\}/);assert.match(benefit,/accessibilityLabel=\{`\$\{title\}\$\{expanded\?`, \$\{detail\}`:""\}, \$\{expanded\?"collapse details":"expand details"\}`\}/);assert.doesNotMatch(benefit,/return detail\?/);assert.match(status,/semantic==="positive"\?<FlowIcon name="check"/);assert.match(status,/semantic==="negative"\?<View style=\{s\.fareStatusMinus\}/);});

test("responsive fare widths use one compact size for every fare count",()=>{
  const widths=[320,360,375,390,430];
  const expected=[230,248,255,260,260];
  for(const fareCount of [1,2,5]) assert.deepEqual(widths.map((width)=>nativeLoadedFareCardWidth(width,fareCount)),expected);
  widths.forEach((width,index)=>{
    const values=[1,2,5].map((count)=>nativeLoadedFareCardWidth(width,count));
    assert.equal(new Set(values).size,1,`${width}px card width must not depend on fare count`);
    assert.equal(values[0],expected[index]);
  });
  assert.equal(nativeLoadedFareCardWidth(1000),260,"wide phones must respect the compact maximum");
  assert.match(fareRail(),/details\.fareChoices\.length>1\?s\.faresMultiple:s\.faresSingle/);
});
test("fare cards and disclosures keep independent natural heights",()=>{const rail=fareRail();const styles=between("small:","fareInfoDeck:");const fareCard=between("fareCard:","fareCardSelected:");assert.match(styles,/fares:\{alignItems:"flex-start",gap:10\}/);assert.doesNotMatch(fareCard,/(?:minHeight|height):/);assert.doesNotMatch(fareCard,/flex(?:Grow)?:/);assert.match(rail,/details\.fareChoices\.map\(\(choice\)=>/);assert.match(rail,/expandedFareBenefit===benefitKey/);assert.match(rail,/setExpandedFareBenefit\(\(current\)=>current===benefitKey\?null:benefitKey\)/);});

test("fare hierarchy centers a left-aligned, wrapping benefit block",()=>{const rail=fareRail();const styles=between("fareSectionTitle:","fareInfoDeck:");assert.match(styles,/fareCard:\{borderRadius:15,paddingHorizontal:12,paddingVertical:10,gap:5\}/);assert.doesNotMatch(styles,/fareCard:\{[^}]*minHeight|fareCard:\{[^}]*marginHorizontal/);assert.match(styles,/fareSelectionControl:\{alignSelf:"stretch",alignItems:"center",gap:1\}/);assert.match(styles,/fareBenefits:\{alignSelf:"center",maxWidth:"100%",alignItems:"flex-start",gap:4\}/);assert.match(styles,/fareBenefitRow:\{maxWidth:"100%",flexDirection:"row",alignItems:"flex-start",gap:7\}/);assert.match(styles,/fareBenefitCopy:\{flexShrink:1,minWidth:0,gap:1\}/);assert.doesNotMatch(styles,/fareBenefitCopy:\{[^}]*flex:1/);assert.match(styles,/fareIdentity:\{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6\}/);assert.match(styles,/farePrice:\{maxWidth:"100%"[^}]*textAlign:"center"\}/);assert.match(styles,/fareBenefitHeading:\{alignSelf:"flex-start"[^}]*gap:4\}/);assert.doesNotMatch(styles,/fareBenefitRow:\{[^}]*justifyContent:"space-between"/);assert.match(styles,/fareBenefitTitle:\{flexShrink:1/);assert.match(styles,/fareBenefitChevronExpanded:\{transform:\[\{rotate:"180deg"\}\]\}/);assert.match(rail,/width:loadedFareCardWidth/);});

test("empty compact terms do not mount a filler benefits section",()=>{const rail=fareRail();assert.match(rail,/\{fareTerms\.length\?<View style=\{s\.fareBenefits\}>/);assert.doesNotMatch(rail,/fareTerms\.length\?[^:]+:<View/);});

test("fare cards do not duplicate itinerary or provider diagnostics",()=>{const rail=fareRail();for(const field of ["offer.airlineName","flightNumber","departureTime","arrivalTime","distanceKm","aircraft","totalEmissionsKg"]){assert.doesNotMatch(rail,new RegExp(field.replace(".","\\.")));}});

test("loading and loaded cards share compact width geometry",()=>{assert.match(source,/const fareCardWidth = nativeLoadedFareCardWidth\(windowWidth\)/);assert.match(source,/FlightDetailsLoadingSkeleton[^;]*fareCardWidth=\{fareCardWidth\}/);assert.match(fareRail(),/width:loadedFareCardWidth/);assert.doesNotMatch(fareRail(),/width:fareCardWidth/);});

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
