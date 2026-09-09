import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const details = readFileSync("src/features/search/NativeFlightDetails.tsx", "utf8");
const loadingStart = details.indexOf("function FlightDetailsLoadingSkeleton");
const loadingEnd = details.indexOf("function TopBar", loadingStart);
const loading = details.slice(loadingStart, loadingEnd);

test("entry loading renders an accessible, theme-aware Flight Details skeleton", () => {
  assert.match(details, /state === "loading"\) return <FlightDetailsLoadingSkeleton/);
  assert.match(loading, /testID="flight-details-loading-skeleton"/);
  assert.match(loading, /accessibilityRole="progressbar" accessibilityState=\{\{busy:true\}\} accessibilityLabel="Loading flight details"/);
  assert.match(loading, /theme\.background/);
  assert.match(loading, /theme\.surface/);
  assert.match(loading, /theme\.border/);
  assert.doesNotMatch(details, /Checking current flight details/);
});

test("entry skeleton anticipates route, itinerary, fare carousel, and information deck", () => {
  for (const style of ["loadingRouteSummary", "loadingItineraryCard", "loadingFareHeading", "loadingFareCard", "loadingInfoDeck"]) assert.match(loading, new RegExp(`s\\.${style}`));
  assert.match(loading, /<ScrollView horizontal showsHorizontalScrollIndicator=\{false\}/);
  assert.match(loading, /width:fareCardWidth/);
  assert.match(loading, /32\+bottomInset/);
});

test("skeleton pulse honors reduced motion and leaves Back to results interactive", () => {
  assert.match(details, /AccessibilityInfo/);
  assert.match(loading, /AccessibilityInfo\.isReduceMotionEnabled/);
  assert.match(loading, /reduceMotionChanged/);
  assert.match(loading, /if\(reduceMotion\)\{opacity\.setValue\(\.7\);return;\}/);
  assert.match(loading, /Animated\.loop\(Animated\.sequence/);
  assert.equal(loading.match(/useNativeDriver:true/g)?.length, 2);
  assert.match(loading, /<TopBar backgroundColor=\{theme\.background\}\/>/);
  assert.match(loading, /<Animated\.View pointerEvents="none"/);
  assert.match(details, /function TopBar[\s\S]*?accessibilityLabel="Back to results" onPress=\{\(\)=>router\.back\(\)\}/);
  assert.doesNotMatch(loading, /router\.(?:push|replace)/);
});

test("loading presentation remains isolated from success and existing failure states", () => {
  assert.match(details, /state !== "available" \|\| !details \|\| !selected/);
  assert.match(details, /This flight is no longer available/);
  assert.match(details, /We couldn’t load this flight/);
  assert.match(details, /label="Retry" onPress=\{reload\}/);
  assert.match(details, /testID="flight-details-scroll-content"/);
  assert.match(details, /testID="fare-information-deck"/);
});
