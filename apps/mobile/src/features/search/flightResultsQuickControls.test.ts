import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const controls = readFileSync("src/features/search/FlightResultsQuickControls.tsx", "utf8");
const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");

test("Flight Results rail keeps the required control order and horizontal behavior", () => {
  assert.match(controls, /<ScrollView horizontal/);
  assert.match(controls, /showsHorizontalScrollIndicator=\{false\}/);
  assert.match(controls, /flexWrap: "nowrap"/);
  const order = ['label="Filters"', "sortLabels[safeSort]", 'label="Airlines"', 'label="Stops"', 'label="Airports"'].map((value) => controls.indexOf(value));
  assert.ok(order.every((value) => value >= 0));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test("sort labels are Best, Cheapest, and Fastest", () => {
  assert.match(controls, /best: "Best", price: "Cheapest", duration: "Fastest"/);
  assert.match(controls, /safeSort = sort === "price" \|\| sort === "duration" \? sort : "best"/);
});

test("active controls use compact counts and accessible selected state", () => {
  assert.match(controls, /accessibilityState=\{\{ expanded, selected: active \}\}/);
  assert.match(controls, /count \? <View style=\{\[styles\.count/);
  assert.match(screen, /activeFilterCount=\{activeFilterCount\}/);
  assert.match(screen, /airlineCount=\{filters\.airlines\.length\}/);
  assert.match(screen, /airportCount=\{filters\.fromAirports\.length \+ filters\.toAirports\.length\}/);
  assert.match(screen, /stopsActive=\{filters\.maxStops != null\}/);
  assert.doesNotMatch(controls, /Filter ·/);
});

test("controls retain compact visual geometry with effective 44dp targets", () => {
  assert.match(controls, /rail: \{ height: 44/);
  assert.match(controls, /control: \{ height: 38, minHeight: 38/);
  assert.match(controls, /hitSlop=\{\{ top: 3, bottom: 3, left: 2, right: 2 \}\}/);
  assert.match(controls, /ChevronDown/);
});

test("sticky placement remains below the fading date strip", () => {
  assert.match(screen, /ListHeaderComponent=\{animatedFlightDateStrip\}/);
  assert.match(screen, /if \(status === "loading"\) return <NativeBrandedSearchLoading product=\{product\}/);
  assert.match(screen, /renderSectionHeader=\{\(\) => \([\s\S]*?\{filterRail\}/);
  assert.match(screen, /stickySectionHeadersEnabled/);
});
