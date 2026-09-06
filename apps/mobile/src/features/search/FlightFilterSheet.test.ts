import assert from "node:assert/strict";import{readFileSync}from"node:fs";import test from"node:test";
const sheet=readFileSync("src/features/search/FlightFilterSheet.tsx","utf8");
test("main Filter retains full-screen live editing and a localized live result action",()=>{assert.match(sheet,/fullScreen=\{full\}/);assert.match(sheet,/const working=full\?filters:draft/);assert.match(sheet,/matchingFlightCount\(results,working/);assert.match(sheet,/copy\.viewFlights\(count\)/);assert.match(sheet,/copy\.noFilterTitle/);assert.match(sheet,/emptyFlightFilters\(\)/);});
test("quick filters use isolated drafts with Reset and Apply",()=>{assert.match(sheet,/setDraft\(filters\)/);assert.match(sheet,/full\?onChange\(next\):setDraft\(next\)/);assert.match(sheet,/onChange\(draft\);onClose\(\)/);assert.match(sheet,/resetQuick/);assert.match(sheet,/copy\.reset/);assert.match(sheet,/copy\.apply/);});
test("Airlines supports complete-list search and shortlist expansion",()=>{assert.match(sheet,/accessibilityLabel=\{copy\.searchAirlines\}/);assert.match(sheet,/slice\(0,5\)/);assert.match(sheet,/copy\.showLess/);assert.match(sheet,/copy\.showMore/);assert.match(sheet,/withAirlinePreview/);});
test("Stops and airports retain authoritative distinct facets",()=>{for(const x of ["nonstop","oneStop","twoStops","from","to"])assert.match(sheet,new RegExp(`copy\\.${x}`));assert.match(sheet,/maxStops:null/);assert.match(sheet,/fromAirports/);assert.match(sheet,/toAirports/);assert.match(sheet,/withStopsPreview/);assert.match(sheet,/withAirportPreview/);});
test("main hierarchy includes supported native sections but omits fake quality",()=>{const order=["price","flightTimes","duration","stops","airlines","airports","farePreferences"].map(x=>sheet.indexOf(`title={copy.${x}}`));assert.ok(order.every((x,i)=>x>=0&&(i===0||x>order[i-1])));assert.doesNotMatch(sheet,/title="Flight quality"/);});
test("journey-aware time and safe insight logic remain",()=>{assert.match(sheet,/journeyKey/);assert.match(sheet,/journeyTimeMaximums/);assert.match(sheet,/copy\.takeoffFrom/);assert.match(sheet,/copy\.landingAt/);assert.match(sheet,/flightFilterInsight/);assert.match(sheet,/priceFilteringReady\?priceValue:undefined/);});
test("full filter scroll is constrained and quick facets remain naturally scrollable",()=>{assert.match(sheet,/style=\{full\?s\.fullScroll:s\.quickScroll\}/);assert.match(sheet,/fullScroll:\{flex:1\}/);assert.match(sheet,/quickScroll:\{flexShrink:1\}/);assert.match(sheet,/paddingHorizontal:24/);assert.match(sheet,/paddingBottom:32/);assert.match(sheet,/keyboardShouldPersistTaps="handled"/);assert.match(sheet,/keyboardDismissMode="on-drag"/);});
test("footer stays outside the scroll body and zero-state header has no decorative slider",()=>{assert.ok(sheet.indexOf("<ScrollView")>sheet.indexOf("footer={"));assert.doesNotMatch(sheet,/import \{ SlidersHorizontal \}/);assert.match(sheet,/headerAction=\{full&&activeCount\?<Pressable/);});
test("full Flight CTA is a direct footer child and cannot flex-collapse below the viewport",()=>{
 assert.match(sheet,/footer=\{full\?<Pressable accessibilityRole="button"/);
 assert.doesNotMatch(sheet,/footer=\{full\?<View style=\{s\.footerPrimary\}/);
 assert.doesNotMatch(sheet,/footerPrimary:\{flex:1\}/);
 assert.match(sheet,/viewButton:\{width:"100%",minHeight:50,borderRadius:10/);
});
test("Web-style option rows put the checkbox before flexible copy and trailing data",()=>{
 const check=sheet.slice(sheet.indexOf("function Check("),sheet.indexOf("const s=StyleSheet.create"));
 assert.ok(check.indexOf("s.box")<check.indexOf("s.rowCopy"));
 assert.ok(check.indexOf("s.rowCopy")<check.indexOf("s.rowTrailing"));
 assert.match(sheet,/row:\{minHeight:46,flexDirection:"row",alignItems:"center"/);
 assert.match(sheet,/box:\{width:20,height:20,flexShrink:0/);
 assert.match(sheet,/rowCopy:\{flex:1,minWidth:0\}/);
 assert.match(sheet,/rowTrailing:\{flexShrink:0[\s\S]*?textAlign:"right"/);
});
test("stop insights remain structured into count and safe trailing price",()=>{
 assert.match(sheet,/stops:new Map<StopBucket,FlightFilterInsight>/);
 assert.match(sheet,/secondary=\{insight\?countLabel\(insight.count\):undefined\}/);
 assert.match(sheet,/trailing=\{insight\?\.lowestPrice==null\?undefined:copy\.fromPrice/);
 assert.doesNotMatch(sheet,/detail=\{insights\.stops/);
 assert.match(sheet,/flightFilterInsight\(results,candidate,insightPriceValue\)/);
 assert.match(sheet,/priceFilteringReady\?priceValue:undefined/);
});
test("full airline and airport rows use count-only trailing columns with unit-qualified accessibility",()=>{
 assert.match(sheet,/label=\{name\} trailing=\{insight\?String\(insight.count\):undefined\} accessibilityDetail=\{insight\?countLabel\(insight.count\):undefined\}/);
 assert.match(sheet,/label=\{v\} trailing=\{insight\?String\(insight.count\):undefined\} accessibilityDetail=\{insight\?countLabel\(insight.count\):undefined\}/);
 assert.match(sheet,/const detail=accessibilityDetail\?\?\[secondary,trailing\]\.filter\(Boolean\)\.join\(", "\)/);
});
test("fare preference rows keep their checkbox directly before their label",()=>{
 assert.match(sheet,/<Check label=\{copy\.baggageIncluded\} selected=/);
 assert.match(sheet,/<Check label=\{copy\.flexibleRefundable\} selected=/);
});
