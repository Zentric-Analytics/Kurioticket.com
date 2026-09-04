import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(path), "utf8").replace(/\r\n/g, "\n");
const results = read("src/features/search/ApprovedResultsScreen.tsx");
const rootLayout = read("app/_layout.tsx");
const hotelHeader = results.slice(
  results.indexOf("function HotelResultsHeader"),
  results.indexOf("const HotelResultsShortcut"),
);
const flightHeader = results.slice(
  results.indexOf("function FlightResultsHeader"),
  results.indexOf("function HotelResultsHeader"),
);
const hotelLayout = results.slice(results.indexOf(") : (\n        <>", results.indexOf("<Animated.SectionList")), results.indexOf("<FlightSortSheet"));
const hotelRoute = rootLayout.match(
  /<Stack\.Screen\s+name="hotel-results"[\s\S]*?\/>/,
)?.[0] ?? "";

test("Hotel Results keeps one fixed navigation header with Back and Edit", () => {
  assert.match(hotelHeader, /accessibilityLabel="Go back"/);
  assert.match(hotelHeader, /router\.back\(\)/);
  assert.match(hotelHeader, /<ArrowLeft\b/);
  assert.match(hotelHeader, /accessibilityLabel=\{`Edit hotel search/);
  assert.equal(hotelLayout.match(/<HotelResultsHeader/g)?.length, 1);
  assert.ok(hotelLayout.indexOf("<HotelResultsHeader") < hotelLayout.indexOf('<ScrollView ref={hotelScrollRef}'));
  assert.doesNotMatch(results, /hotelCompactHeader|compactTarget|compactContext|compactDestination|compactMeta/);
});

test("Flight Results retains its visible Back navigation control", () => {
  assert.match(flightHeader, /accessibilityLabel="Go back"/);
  assert.match(flightHeader, /router\.back\(\)/);
  assert.match(flightHeader, /<ArrowLeft\b/);
});

test("Hotel Results explicitly uses the native stack edge-back gesture", () => {
  assert.ok(hotelRoute, "Hotel Results must have a route-specific Stack.Screen configuration");
  assert.match(hotelRoute, /gestureEnabled:\s*true/);
  assert.doesNotMatch(hotelRoute, /gestureEnabled:\s*false|fullScreenGestureEnabled/);
  assert.doesNotMatch(results, /PanResponder|GestureDetector|Gesture\.Pan\(|Swipeable|BackHandler/);
});
