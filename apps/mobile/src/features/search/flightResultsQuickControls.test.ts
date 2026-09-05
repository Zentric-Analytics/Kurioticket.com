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

test("web mobile filter colors are carried into native light mode", () => {
  assert.match(controls, /const webFilterBorder = "#D8E1EC"/);
  assert.match(controls, /const webFilterText = "#142033"/);
  assert.match(controls, /const webFilterAccent = "#004BB8"/);
  assert.match(controls, /const webFilterPressed = "#F8FAFC"/);
  assert.match(controls, /const webFilterSurface = "#FFFFFF"/);
  assert.match(controls, /const surface = light \? webFilterSurface : theme\.surface/);
  assert.match(controls, /const railSurface = theme\.background/);
  assert.match(controls, /backgroundColor: railSurface/); assert.doesNotMatch(controls, /const railSurface = theme\.dark \? theme\.surface : webFilterSurface/);
  assert.doesNotMatch(controls, /ui\.pale|#EEF4FF/);
});

test("active controls use subtle count badges without filling the whole chip", () => {
  assert.match(controls, /accessibilityState=\{\{ expanded, selected: active \}\}/);
  assert.match(controls, /webFilterCountBackground = "rgba\(0,75,184,0\.08\)"/);
  assert.match(controls, /count \? <View style=\{\[styles\.count/);
  assert.match(screen, /activeFilterCount=\{activeFilterCount\}/);
  assert.match(screen, /airlineCount=\{filters\.airlines\.length\}/);
  assert.match(screen, /airportCount=\{filters\.fromAirports\.length \+ filters\.toAirports\.length\}/);
  assert.match(screen, /stopsCount=\{filters\.stops\?\.length \|\| Number\(filters\.maxStops != null\)\}/);
  assert.match(controls, /count=\{stopsCount \|\| undefined\}/);
});

test("controls use compact capsules inside accessible touch targets", () => {
  assert.match(controls, /rail: \{ height: 44/);
  assert.match(controls, /touchTarget: \{[\s\S]*?minHeight: 44/);
  assert.match(controls, /capsule: \{[\s\S]*?height: 36/);
  assert.match(controls, /borderRadius: 9/);
  assert.match(controls, /paddingHorizontal: 10/);
  assert.match(controls, /label: \{[\s\S]*?fontSize: 13/);
  assert.match(controls, /content: \{[\s\S]*?gap: 6/);
});

test("full Filter launcher is icon-only while preserving its accessible contract", () => {
  assert.match(controls, /<SlidersHorizontal accessible=\{false\}/);
  assert.match(controls, /accessibilityLabelOverride=\{fullFilterAccessibilityLabel\}/);
  assert.match(controls, /const fullFilterAccessibilityLabel = "Filters"/);
  assert.match(controls, /filterIcon \? <SlidersHorizontal[\s\S]*?: <Text/);
  assert.match(controls, /!filterIcon \? <ChevronDown/);
  assert.match(controls, /onPress=\{\(\) => openSheet\("all"\)\}/);
});

test("sticky placement remains below the naturally scrolling date strip", () => {
  assert.match(screen, /ListHeaderComponent=\{flightDateStrip\}/);
  assert.match(screen, /if \(status === "loading"\) return <NativeBrandedSearchLoading product=\{product\}/);
  assert.match(screen, /renderSectionHeader=\{\(\) => \([\s\S]*?\{filterRail\}/);
  assert.match(screen, /stickySectionHeadersEnabled/);
});
