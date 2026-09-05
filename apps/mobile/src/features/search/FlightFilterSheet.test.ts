import assert from "node:assert/strict";import{readFileSync}from"node:fs";import test from"node:test";
const sheet=readFileSync("src/features/search/FlightFilterSheet.tsx","utf8");
test("main Filter retains full-screen live editing and a live result action",()=>{assert.match(sheet,/fullScreen=\{full\}/);assert.doesNotMatch(sheet,/fullScreenFooter(?:Minimum|Extra)BottomPadding/);assert.match(sheet,/const working=full\?filters:draft/);assert.match(sheet,/matchingFlightCount\(results,working/);assert.match(sheet,/View \$\{count\}/);assert.match(sheet,/No matching flights/);assert.match(sheet,/emptyFlightFilters\(\)/);});
test("quick filters use isolated drafts with Reset and Apply",()=>{assert.match(sheet,/setDraft\(filters\)/);assert.match(sheet,/full\?onChange\(next\):setDraft\(next\)/);assert.match(sheet,/onChange\(draft\);onClose\(\)/);assert.match(sheet,/resetQuick/);assert.match(sheet,/>Reset</);assert.match(sheet,/>Apply</);});
test("Airlines supports complete-list search and shortlist expansion",()=>{assert.match(sheet,/accessibilityLabel="Search airlines"/);assert.match(sheet,/slice\(0,5\)/);assert.match(sheet,/Show less/);assert.match(sheet,/Show more/);assert.match(sheet,/withAirlinePreview/);});
test("Stops and airports retain authoritative distinct facets",()=>{for(const x of ["Nonstop","1 stop","2+ stops","FROM","TO"])assert.match(sheet,new RegExp(x.replace("+","\\+")));assert.match(sheet,/maxStops:null/);assert.match(sheet,/fromAirports/);assert.match(sheet,/toAirports/);assert.match(sheet,/withStopsPreview/);assert.match(sheet,/withAirportPreview/);});
test("main hierarchy includes supported native sections but omits fake quality",()=>{const order=["Price","Flight times","Duration","Stops","Airlines","Airports","Fare preferences"].map(x=>sheet.indexOf(`title="${x}"`));assert.ok(order.every((x,i)=>x>=0&&(i===0||x>order[i-1])));assert.doesNotMatch(sheet,/title="Flight quality"/);});
test("journey-aware time and safe insight logic remain",()=>{assert.match(sheet,/journeyKey/);assert.match(sheet,/journeyTimeMaximums/);assert.match(sheet,/Takeoff time from/);assert.match(sheet,/Landing time at/);assert.match(sheet,/flightFilterInsight/);assert.match(sheet,/priceFilteringReady\?priceValue:undefined/);});
test("full filter scroll is constrained and quick facets remain naturally scrollable",()=>{assert.match(sheet,/style=\{full\?s\.fullScroll:s\.quickScroll\}/);assert.match(sheet,/fullScroll:\{flex:1\}/);assert.match(sheet,/quickScroll:\{flexShrink:1\}/);assert.match(sheet,/paddingHorizontal:24/);assert.match(sheet,/paddingBottom:32/);assert.match(sheet,/keyboardShouldPersistTaps="handled"/);assert.match(sheet,/keyboardDismissMode="on-drag"/);});
test("footer stays outside the scroll body and zero-state header has no decorative slider",()=>{assert.ok(sheet.indexOf("<ScrollView")>sheet.indexOf("footer={"));assert.doesNotMatch(sheet,/import \{ SlidersHorizontal \}/);assert.match(sheet,/headerAction=\{full&&activeCount\?<Pressable/);});
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
 assert.match(sheet,/trailing=\{insight\?\.lowestPrice==null\?undefined:`From \$\{formatCurrency\(insight.lowestPrice,insightCurrency\)\}`\}/);
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
 assert.match(sheet,/<Check label="Baggage included" selected=/);
 assert.match(sheet,/<Check label="Flexible \/ refundable" selected=/);
});
