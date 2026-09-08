import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const controls = readFileSync("src/features/search/FlightResultsQuickControls.tsx", "utf8");
const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");

test("Flight Results rail keeps the required control order and horizontal behavior", () => {
  assert.match(controls, /<ScrollView[\s\S]*?horizontal/);
  assert.match(controls, /showsHorizontalScrollIndicator=\{false\}/);
  assert.match(controls, /flexWrap: "nowrap"/);
  const order = ['label={copy.filters}', "sortLabels[safeSort]", 'label={copy.airlines}', 'label={copy.stops}', 'label={copy.airports}'].map((value) => controls.indexOf(value));
  assert.ok(order.every((value) => value >= 0));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test("sort labels are Best, Cheapest, and Fastest", () => {
  assert.match(controls, /best: copy\.best/);
  assert.match(controls, /price: copy\.cheapest/);
  assert.match(controls, /duration: copy\.fastest/);
  assert.match(controls, /safeSort = sort === "price" \|\| sort === "duration" \? sort : "best"/);
});

test("Flight rail inherits the results canvas while chips keep their neutral surfaces", () => {
  assert.match(controls, /const webFilterBorder = "#D8E1EC"/);
  assert.match(controls, /const webFilterText = "#142033"/);
  assert.match(controls, /const webFilterPressed = "#F8FAFC"/);
  assert.match(controls, /const webFilterSurface = "#FFFFFF"/);
  assert.match(controls, /const surface = light \? webFilterSurface : theme\.surface/);
  assert.match(controls, /style=\{styles\.rail\}/);
  assert.doesNotMatch(controls, /const railSurface = theme\.background/);
  assert.doesNotMatch(controls, /backgroundColor: railSurface/);
  assert.doesNotMatch(controls, /ui\.pale|#EEF4FF/);
});

test("quick controls stay visually neutral even when selected or expanded", () => {
  assert.match(controls, /accessibilityState=\{\{ expanded, selected: active \}\}/);
  assert.match(controls, /backgroundColor: pressed && light \? webFilterPressed : surface/);
  assert.match(controls, /borderColor: border/);
  assert.doesNotMatch(controls, /backgroundColor: active \?/);
  assert.doesNotMatch(controls, /borderColor: active \?/);
  assert.doesNotMatch(controls, /webFilterAccent/);
  assert.match(controls, /const webFilterCountBackground = "#F1F5F9"/);
  assert.match(screen, /activeFilterCount=\{activeFilterCount\}/);
  assert.match(screen, /airlineCount=\{filters\.airlines\.length\}/);
  assert.match(screen, /airportCount=\{filters\.fromAirports\.length \+ filters\.toAirports\.length\}/);
  assert.match(screen, /stopsCount=\{filters\.stops\?\.length \|\| Number\(filters\.maxStops != null\)\}/);
});

test("Flight rail starts left of result cards while retaining screen-edge breathing room", () => {
  assert.match(controls, /rail: \{ height: 44/);
  assert.match(controls, /touchTarget: \{[\s\S]*?minWidth: 44,[\s\S]*?minHeight: 44/);
  assert.match(controls, /capsule: \{[\s\S]*?height: 36/);
  assert.match(controls, /borderRadius: 9/);
  assert.match(controls, /paddingHorizontal: 10/);
  assert.match(controls, /label: \{[\s\S]*?fontSize: 13/);
  assert.match(controls, /content: \{[\s\S]*?paddingLeft: 8,[\s\S]*?paddingRight: 16,[\s\S]*?gap: 6/);
  assert.doesNotMatch(controls, /paddingLeft: (?:24|0)/);
  assert.doesNotMatch(controls, /paddingHorizontal: 20/);
});

test("full Filter launcher shows its label with the filter icon and keeps its accessible contract", () => {
  assert.match(controls, /<SlidersHorizontal accessible=\{false\}/);
  assert.match(controls, /accessibilityLabelOverride=\{copy\.filters\}/);
  assert.match(controls, /filterIcon \? <SlidersHorizontal[\s\S]*?<Text numberOfLines=\{1\}[\s\S]*?>\{label\}<\/Text>/);
  assert.match(controls, /label=\{copy\.filters\}/);
  assert.match(controls, /!filterIcon \? <ChevronDown/);
  assert.match(controls, /onPress=\{\(\) => openSheet\("all"\)\}/);
});

test("sticky placement remains below the naturally scrolling date strip", () => {
  assert.match(screen, /ListHeaderComponent=\{flightDateStrip\}/);
  assert.match(screen, /if \(status === "loading" && product !== "flight"\) return <NativeBrandedSearchLoading product=\{product\}/);
  assert.match(screen, /renderSectionHeader=\{\(\) => \([\s\S]*?\{filterRail\}/);
  assert.match(screen, /stickySectionHeadersEnabled/);
});

test("native sticky layout owns one rail without the Android pinned-copy workaround", () => {
  const flightList = screen.slice(screen.indexOf("<Animated.SectionList"), screen.indexOf(") : (", screen.indexOf("<Animated.SectionList")));
  assert.equal(screen.match(/<FlightResultsQuickControls/g)?.length, 1);
  assert.doesNotMatch(screen, /flightFilterAnchor|flightScrollOffset|flightRailHorizontalOffset|inlineFlightRailRef|pinnedFlightRailRef|flightRailPinned|shouldPinFlightQuickControls|flightPinnedFilterRail/);
  assert.doesNotMatch(screen, /stickySectionHeadersEnabled=/);
  assert.doesNotMatch(flightList, /pointerEvents=|importantForAccessibility=|accessibilityElementsHidden=/);
});

test("Android bypasses Pressability with non-responder touch observation", () => {
  const androidBranch = controls.slice(controls.indexOf('if (Platform.OS === "android")'), controls.indexOf("return (", controls.indexOf('if (Platform.OS === "android")') + 20));
  assert.match(controls, /if \(Platform\.OS === "android"\)[\s\S]*onTouchStart=[\s\S]*onTouchMove=[\s\S]*onTouchCancel=[\s\S]*onTouchEnd=/);
  assert.doesNotMatch(androidBranch, /Pressable|onStartShouldSetResponder|onMoveShouldSetResponder/);
  assert.match(controls, /const touchRejected = useRef\(false\)/);
  assert.match(controls, /touchRejected\.current = true/);
  assert.match(controls, /const rejected = touchRejected\.current/);
  assert.match(controls, /if \(start && !rejected && isFlightQuickControlTap\(start, touch\(event\)\)\) onPress\(\)/);
});

test("iOS keeps ordinary Pressable behavior and both paths preserve accessibility", () => {
  assert.match(controls, /<Pressable[\s\S]*accessibilityRole="button"[\s\S]*onPress=\{onPress\}/);
  assert.match(controls, /accessible[\s\S]*accessibilityRole="button"[\s\S]*accessibilityLabel=\{accessibilityLabel\}[\s\S]*accessibilityState=\{\{ expanded, selected: active \}\}/);
  assert.match(controls, /accessibilityActions=\{\[\{ name: "activate" \}\]\}[\s\S]*onAccessibilityAction=/);
});