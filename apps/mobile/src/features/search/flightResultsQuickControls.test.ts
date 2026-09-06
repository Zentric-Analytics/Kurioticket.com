import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const controls = readFileSync("src/features/search/FlightResultsQuickControls.tsx", "utf8");
const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");

test("Flight Results rail keeps the required control order and horizontal behavior", () => {
  assert.match(controls, /<ScrollView[\s\S]*?horizontal/);
  assert.match(controls, /showsHorizontalScrollIndicator=\{false\}/);
  assert.match(controls, /flexWrap: "nowrap"/);
  const order = ['label="Filter"', "sortLabels[safeSort]", 'label="Airlines"', 'label="Stops"', 'label="Airports"'].map((value) => controls.indexOf(value));
  assert.ok(order.every((value) => value >= 0));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test("sort labels are Best, Cheapest, and Fastest", () => {
  assert.match(controls, /best: "Best"/);
  assert.match(controls, /price: "Cheapest"/);
  assert.match(controls, /duration: "Fastest"/);
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
  assert.match(controls, /accessibilityLabelOverride=\{fullFilterAccessibilityLabel\}/);
  assert.match(controls, /const fullFilterAccessibilityLabel = "Filters"/);
  assert.match(controls, /filterIcon \? <SlidersHorizontal[\s\S]*?<Text numberOfLines=\{1\}[\s\S]*?>\{label\}<\/Text>/);
  assert.match(controls, /label="Filter"/);
  assert.match(controls, /!filterIcon \? <ChevronDown/);
  assert.match(controls, /onPress=\{\(\) => openSheet\("all"\)\}/);
});

test("sticky placement remains below the naturally scrolling date strip", () => {
  assert.match(screen, /ListHeaderComponent=\{flightDateStrip\}/);
  assert.match(screen, /if \(status === "loading"\) return <NativeBrandedSearchLoading product=\{product\}/);
  assert.match(screen, /renderSectionHeader=\{\(\) => \([\s\S]*?\{filterRail\}/);
  assert.match(screen, /stickySectionHeadersEnabled/);
});
