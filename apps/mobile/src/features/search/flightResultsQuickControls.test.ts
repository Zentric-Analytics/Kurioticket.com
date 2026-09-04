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
  assert.match(controls, /count \? \([\s\S]*?styles\.count/);
  assert.match(screen, /activeFilterCount=\{activeFilterCount\}/);
  assert.match(screen, /airlineCount=\{filters\.airlines\.length\}/);
  assert.match(screen, /airportCount=\{filters\.fromAirports\.length \+ filters\.toAirports\.length\}/);
  assert.match(screen, /stopsActive=\{filters\.maxStops != null\}/);
});

test("controls match web 44px geometry and retain horizontal compactness", () => {
  assert.match(controls, /rail: \{ height: 48/);
  assert.match(controls, /control: \{[\s\S]*?height: 44,[\s\S]*?minHeight: 44/);
  assert.match(controls, /borderRadius: 11/);
  assert.match(controls, /paddingHorizontal: 14/);
  assert.match(controls, /label: \{[\s\S]*?fontSize: 14/);
  assert.match(controls, /ChevronDown/);
});

test("sticky placement remains below the fading date strip", () => {
  assert.match(screen, /ListHeaderComponent=\{animatedFlightDateStrip\}/);
  assert.match(screen, /if \(status === "loading"\) return <NativeBrandedSearchLoading product=\{product\}/);
  assert.match(screen, /renderSectionHeader=\{\(\) => \([\s\S]*?\{filterRail\}/);
  assert.match(screen, /stickySectionHeadersEnabled/);
});
