import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { flightQuickFilterColors } from "./flightResultsPresentation";
const controls=readFileSync("src/features/search/FlightResultsQuickControls.tsx","utf8");
const screen=readFileSync("src/features/search/ApprovedResultsScreen.tsx","utf8");
test("Flight Results rail keeps the required control order and horizontal behavior",()=>{
 assert.match(controls,/<ScrollView horizontal/);assert.match(controls,/showsHorizontalScrollIndicator=\{false\}/);assert.match(controls,/flexWrap: "nowrap"/);
 const order=['label={copy.filters}',"sortLabels[safeSort]",'label={copy.airlines}','label={copy.stops}','label={copy.airports}'].map(x=>controls.indexOf(x));assert.ok(order.every(x=>x>=0));assert.deepEqual([...order].sort((a,b)=>a-b),order);
});
test("sort labels are Best, Cheapest, and Fastest",()=>{assert.match(controls,/best: copy\.best/);assert.match(controls,/price: copy\.cheapest/);assert.match(controls,/duration: copy\.fastest/);assert.match(controls,/safeSort = sort === "price" \|\| sort === "duration" \? sort : "best"/);});
test("neutral chips retain white surfaces, standard border and Results text",()=>{
 const c=flightQuickFilterColors({dark:false,surface:"",border:"",textPrimary:"",textSecondary:"",background:""},false);assert.equal(c.surface,"#FFFFFF");assert.equal(c.foreground,"#142033");assert.equal(c.border,"#D8E1EC");assert.match(controls,/style=\{styles\.rail\}/);
});
test("selected quick groups use navy and white, preserve counts and expose independent clear actions",()=>{
 const c=flightQuickFilterColors({dark:false,surface:"",border:"",textPrimary:"",textSecondary:"",background:""},true);assert.equal(c.surface,"#142033");assert.equal(c.foreground,"#FFFFFF");
 assert.match(controls,/selectedVisual = active && Boolean\(onClear\)/);assert.match(controls,/colors\.foreground/);assert.match(controls,/\{count\}<\/Text>/);
 for(const group of ["airlines","stops","airports"])assert.ok(controls.includes(`clearGroup("${group}")`));
 for(const count of ['airlineCount={filters.airlines.length}','airportCount={filters.fromAirports.length + filters.toAirports.length}','stopsCount={filters.stops?.length || Number(filters.maxStops != null)}'])assert.ok(screen.includes(count));
 assert.match(controls,/<RailAction clear label=\{`\$\{copy\.clearFilters\}: \$\{label\}`\} onPress=\{onClear\}/);
});
test("rail and result cards use a shared 12px inset with compact accessible controls",()=>{
 for(const regex of [/rail: \{ height: 44/,/minWidth: 44, minHeight: 44/,/capsule: \{ height: 36/,/borderRadius: 9/,/paddingHorizontal: 10/,/fontSize: 13/,/paddingLeft: 12, paddingRight: 12, gap: 6/])assert.match(controls,regex);
});
test("full Filter launcher keeps its text, icon and accessible open action",()=>{
 assert.match(controls,/<SlidersHorizontal accessible=\{false\}/);assert.match(controls,/filterIcon \? <SlidersHorizontal[\s\S]*<Text numberOfLines=\{1\}[^>]*>\{label\}<\/Text>/);assert.match(controls,/label=\{copy\.filters\}/);assert.match(controls,/!filterIcon \? <ChevronDown/);assert.match(controls,/onPress=\{\(\) => openSheet\("all"\)\}/);
});
test("one header-owned filter rail precedes naturally scrolling date content",()=>{
 const header=screen.slice(screen.indexOf("function FlightResultsHeader"),screen.indexOf("function HotelResultsHeader"));
 const list=screen.slice(screen.indexOf("<Animated.SectionList"),screen.indexOf(") : (",screen.indexOf("<Animated.SectionList")));
 assert.doesNotMatch(screen,/ListHeaderComponent=\{flightDateStrip\}/);assert.match(header,/accessibilityLabel="Flight result filters"[\s\S]*?\{filterRail\}/);assert.doesNotMatch(list,/renderSectionHeader|stickySectionHeadersEnabled|\{filterRail\}/);assert.match(screen,/flightResultsIntro[\s\S]*\{flightDateStrip\}/);
});
test("native header owns one rail without a pinned-copy workaround",()=>{
 assert.equal(screen.match(/<FlightResultsQuickControls/g)?.length,1);assert.doesNotMatch(screen,/flightFilterAnchor|flightScrollOffset|flightRailHorizontalOffset|inlineFlightRailRef|pinnedFlightRailRef|flightRailPinned|shouldPinFlightQuickControls|flightPinnedFilterRail|stickySectionHeadersEnabled/);
 const list=screen.slice(screen.indexOf("<Animated.SectionList"),screen.indexOf(") : (",screen.indexOf("<Animated.SectionList")));assert.doesNotMatch(list,/pointerEvents=|importantForAccessibility=|accessibilityElementsHidden=|renderSectionHeader/);
});
test("Android main and clear controls use non-responder tap-versus-drag observation",()=>{
 const action=controls.slice(controls.indexOf("function RailAction"),controls.indexOf("function Control"));assert.match(action,/if \(Platform.OS === "android"\)[\s\S]*onTouchStart=[\s\S]*onTouchMove=[\s\S]*onTouchCancel=[\s\S]*onTouchEnd=/);
 const android=action.slice(action.indexOf('if (Platform.OS === "android")'),action.lastIndexOf("  return ("));assert.doesNotMatch(android,/Pressable|onStartShouldSetResponder|onMoveShouldSetResponder/);
 assert.match(action,/touchRejected.current = true/);assert.match(action,/const rejected = touchRejected.current/);assert.match(action,/if \(start && !rejected && isFlightQuickControlTap\(start, touch\(event\)\)\) onPress\(\)/);
});
test("iOS keeps Pressable and both actions preserve accessible activation",()=>{
 assert.match(controls,/<Pressable\s+accessibilityRole="button"\s+accessibilityLabel=\{label\}\s+accessibilityState=\{\{ expanded, selected \}\}\s+onPress=\{onPress\}/);assert.match(controls,/accessible\s+accessibilityRole="button"\s+accessibilityLabel=\{label\}/);assert.match(controls,/accessibilityActions=\{\[\{ name: "activate" \}\]\}/);assert.match(controls,/onAccessibilityAction=/);
});
