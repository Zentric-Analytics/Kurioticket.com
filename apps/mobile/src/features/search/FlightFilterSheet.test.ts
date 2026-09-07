import assert from "node:assert/strict";import{readFileSync}from"node:fs";import test from"node:test";
const sheet=readFileSync("src/features/search/FlightFilterSheet.tsx","utf8");
test("main Filter retains full-screen live editing and a localized live result action",()=>{assert.match(sheet,/fullScreen=\{full\}/);assert.match(sheet,/const working=full\?filters:draft/);assert.match(sheet,/matchingFlightCount\(results,working/);assert.match(sheet,/copy\.viewFlights\(count\)/);assert.match(sheet,/copy\.noFilterTitle/);assert.match(sheet,/emptyFlightFilters\(\)/);});
test("quick filters use isolated drafts with Reset and a localized result action",()=>{assert.match(sheet,/setDraft\(filters\)/);assert.match(sheet,/full\?onChange\(next\):setDraft\(next\)/);assert.match(sheet,/onChange\(draft\);onClose\(\)/);assert.match(sheet,/resetQuick/);assert.match(sheet,/copy\.reset/);assert.match(sheet,/const footerLabel=count===0\?copy\.noFilterTitle:copy\.viewFlights\(count\)/);assert.match(sheet,/accessibilityState=\{\{disabled:count===0\}\} disabled=\{count===0\} onPress=\{\(\)=>\{onChange\(draft\);onClose\(\)\}\} style=\{\[s\.apply,count===0&&s\.viewButtonDisabled\]\}/);assert.match(sheet,/\{footerLabel\}<\/Text><\/Pressable><\/View>\}/);});
test("Airlines supports complete-list search and shortlist expansion",()=>{assert.match(sheet,/accessibilityLabel=\{copy\.searchAirlines\}/);assert.match(sheet,/slice\(0,5\)/);assert.match(sheet,/copy\.showLess/);assert.match(sheet,/copy\.showMore/);assert.match(sheet,/withAirlinePreview/);});
test("Stops and airports retain authoritative distinct facets",()=>{for(const x of ["nonstop","oneStop","twoStops","from","to"])assert.match(sheet,new RegExp(`copy\\.${x}`));assert.match(sheet,/maxStops:null/);assert.match(sheet,/fromAirports/);assert.match(sheet,/toAirports/);assert.match(sheet,/withStopsPreview/);assert.match(sheet,/withAirportPreview/);});
test("main hierarchy includes supported native sections but omits fake quality",()=>{const order=["price","flightTimes","duration","stops","airlines","airports","farePreferences"].map(x=>sheet.indexOf(`title={copy.${x}}`));assert.ok(order.every((x,i)=>x>=0&&(i===0||x>order[i-1])));assert.doesNotMatch(sheet,/title="Flight quality"/);});
test("journey-aware time and safe insight logic remain",()=>{assert.match(sheet,/journeyKey/);assert.match(sheet,/journeyTimeMaximums/);assert.match(sheet,/copy\.takeoffFrom/);assert.match(sheet,/copy\.landingAt/);assert.match(sheet,/flightFilterInsight/);assert.match(sheet,/priceFilteringReady\?priceValue:undefined/);});
test("full filter scroll is constrained and quick facets remain naturally scrollable",()=>{assert.match(sheet,/style=\{full\?s\.fullScroll:s\.quickScroll\}/);assert.match(sheet,/fullScroll:\{flex:1\}/);assert.match(sheet,/quickScroll:\{flexShrink:1\}/);assert.match(sheet,/paddingHorizontal:24/);assert.match(sheet,/paddingBottom:32/);assert.match(sheet,/keyboardShouldPersistTaps="handled"/);assert.match(sheet,/keyboardDismissMode="on-drag"/);});
test("footer stays outside the scroll body and the full header has no Clear all action",()=>{assert.ok(sheet.indexOf("<ScrollView")>sheet.indexOf("footer={"));assert.doesNotMatch(sheet,/import \{ SlidersHorizontal \}/);assert.doesNotMatch(sheet,/headerAction=|copy\.clearAll|headerClear/);});
test("full Flight CTA stays full width without filters and flexes beside Reset with active filters",()=>{
 assert.match(sheet,/footer=\{full\?\(activeCount>0\?<View style=\{s\.footerActions\}>/);
 assert.doesNotMatch(sheet,/footer=\{full\?<View style=\{s\.footerPrimary\}/);
 assert.doesNotMatch(sheet,/footerPrimary:\{flex:1\}/);
 assert.match(sheet,/viewButton:\{width:"100%",minHeight:50,borderRadius:10/);
 assert.match(sheet,/viewButtonFlexible:\{width:"auto",flex:1\}/);
 assert.match(sheet,/style=\{\[s\.viewButton,activeCount>0&&s\.viewButtonFlexible,count===0&&s\.viewButtonDisabled\]\}/);
});
test("active full Filters move localized Reset to the footer without closing the sheet",()=>{
 assert.match(sheet,/activeCount>0\?<View style=\{s\.footerActions\}><Pressable accessibilityRole="button" accessibilityLabel=\{copy\.reset\} onPress=\{\(\)=>onChange\(emptyFlightFilters\(\)\)\}/);
 const fullFooter=sheet.slice(sheet.indexOf("footer={full?"),sheet.indexOf(":<View style={s.footerActions}",sheet.indexOf("footer={full?")));
 assert.match(fullFooter,/\{copy\.reset\}/);
 assert.match(fullFooter,/\{viewAction\}/);
 assert.doesNotMatch(fullFooter,/onClose\(\)|onComplete\(\)/);
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
test("quick Stops show direct safe prices while full Stops retain counts and From-price copy",()=>{
 assert.match(sheet,/const priceLabel=.*formatCurrency\(insight\.lowestPrice,insightCurrency\)/);
 assert.match(sheet,/secondary=\{full&&insight\?countLabel\(insight\.count\):undefined\}/);
 assert.match(sheet,/trailing=\{full&&price\?copy\.fromPrice\(price\):price\}/);
 assert.match(sheet,/accessibilityDetail=\{full\?undefined:insightDetail\(insight,price\)\}/);
 assert.match(sheet,/flightFilterInsight\(results,candidate,insightPriceValue\)/);
 assert.match(sheet,/priceFilteringReady\?priceValue:undefined/);
});
test("quick airline and airport rows show safe prices while full rows retain visible counts",()=>{
 assert.match(sheet,/label=\{name\} trailing=\{full&&insight\?String\(insight\.count\):price\} accessibilityDetail=\{insightDetail\(insight,full\?undefined:price\)\}/);
 assert.match(sheet,/label=\{v\} trailing=\{full&&insight\?String\(insight\.count\):price\} accessibilityDetail=\{insightDetail\(insight,full\?undefined:price\)\}/);
 assert.match(sheet,/const insightDetail=.*countLabel\(insight\.count\),price.*join\(", "\)/);
 assert.match(sheet,/const detail=accessibilityDetail\?\?\[secondary,trailing\]\.filter\(Boolean\)\.join\(", "\)/);
});
test("quick filter headers omit subtitles without removing the full Filters status",()=>{
 assert.match(sheet,/subtitle=\{full&&activeCount\?copy\.appliedCount\(activeCount\):undefined\}/);
 assert.doesNotMatch(sheet,/copy\.allFlightsShown/);
 assert.match(sheet,/flightFilterAppearance=\{full\}/);
 assert.doesNotMatch(sheet,/const quickSubtitle|subtitle=\{quickSubtitle\}/);
 const sort=readFileSync("src/features/search/FlightSortSheet.tsx","utf8");
 assert.doesNotMatch(sort,/subtitle=\{copy\.sortHelp\}/);
 assert.match(sort,/description: copy\.bestHelp/);
 assert.match(sort,/\{copy\.apply\}/);
});
test("fare preference rows keep their checkbox directly before their label",()=>{
 assert.match(sheet,/<Check label=\{copy\.baggageIncluded\} selected=/);
 assert.match(sheet,/<Check label=\{copy\.flexibleRefundable\} selected=/);
});
test("quick facets omit only their redundant top-level titles while full Filters keeps every section title",()=>{
 assert.match(sheet,/showTitle=true/);
 for(const section of ["stops","airlines","airports"]) assert.match(sheet,new RegExp(`title=\\{copy\\.${section}\\} compact=\\{!full\\} showTitle=\\{full\\}`));
 assert.match(sheet,/!full&&s\.compactSubhead/);
 for(const subgroup of ["from","to"]) assert.match(sheet,new RegExp(`\\{copy\\.${subgroup}\\}`));
});
test("quick rows use one neutral surface while checked controls and accessibility expose selection",()=>{
 const check=sheet.slice(sheet.indexOf("function Check("),sheet.indexOf("const s=StyleSheet.create"));
 assert.match(check,/accessibilityRole="checkbox" accessibilityState=\{\{checked:selected\}\}/);
 assert.match(check,/backgroundColor:selected\?ui\.blue:"transparent"/);
 assert.match(check,/color:theme\.textPrimary/);
 assert.doesNotMatch(check,/#F7FAFF|#142B55|#8FB5FF|#004BB8|compact&&selected&&\{backgroundColor/);
 assert.match(sheet,/compactRow:\{minHeight:48/);
});
test("Flight filter outlines are stronger in light mode without changing border geometry",()=>{
 const sort=readFileSync("src/features/search/FlightSortSheet.tsx","utf8");
 const shell=readFileSync("src/features/search/FlightResultsSheetShell.tsx","utf8");
 assert.match(shell,/FLIGHT_FILTER_LIGHT_OUTLINE = "#D8DEE8"/);
 assert.match(sheet,/const filterOutline=theme\.dark\?theme\.border:FLIGHT_FILTER_LIGHT_OUTLINE/);
 assert.match(sheet,/borderColor:selected\?ui\.blue:filterOutline/);
 assert.match(sheet,/box:\{[^}]*borderWidth:1\.5/);
 assert.match(sheet,/reset:\{[^}]*borderWidth:1/);
 assert.match(sheet,/accessibilityLabel=\{copy\.reset\} onPress=\{\(\)=>onChange\(emptyFlightFilters\(\)\)\} style=\{\[s\.reset,\{borderColor:filterOutline\}\]\}/);
 assert.match(sort,/const filterOutline = theme\.dark \? theme\.border : FLIGHT_FILTER_LIGHT_OUTLINE/);
 assert.match(sort,/reset: \{[^}]*borderWidth: 1/);
 assert.match(sort,/borderColor: filterOutline/);
});
