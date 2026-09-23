import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const flight = readFileSync("src/features/search/NativeFlightDetails.tsx", "utf8");

test("Flight Details replaces scroll-triggered header protection with a persistent branded header", () => {
  const available = flight.slice(flight.indexOf('return <SafeAreaView edges={[]}'), flight.indexOf("function FlightDetailsLoadingSkeleton"));
  assert.match(available, /<FlightDetailsBrandHeader topInset=\{inset\.top\}/);
  assert.match(available, /<ScrollView testID="flight-details-scroll-content"/);
  assert.ok(available.indexOf("<FlightDetailsBrandHeader") < available.indexOf('<ScrollView testID="flight-details-scroll-content"'));
  assert.doesNotMatch(flight, /flightDetailsHeaderProtectionGeometry|useFlightDetailsHeaderProtection|headerProtected|protectedHeaderHeight|syncHeaderProtection|measureHeaderHero|measureHeaderForeground/);
  assert.doesNotMatch(flight, /flight-details-protected-header|flight-details-loading-protected-header/);
});

test("loaded hero starts below the branded header without safe-area padding", () => {
  assert.match(flight, /<ImageBackground testID="flight-details-hero"[^>]*style=\{s\.hero\}/);
  assert.doesNotMatch(flight, /flight-details-hero"[^>]*paddingTop:inset\.top/);
  assert.match(flight, /brandHeader:\{backgroundColor:"#FFFFFF"\}/);
  assert.match(flight, /brandHeaderRow:\{height:64,paddingHorizontal:16/);
});

test("loading state shares the same header and keeps its hero below it", () => {
  const loading = flight.slice(flight.indexOf("function FlightDetailsLoadingSkeleton"), flight.indexOf("function HeroCurve"));
  assert.match(loading, /<FlightDetailsBrandHeader topInset=\{topInset\} loading\/>/);
  assert.match(loading, /<ScrollView testID="flight-details-loading-scroll"/);
  assert.match(loading, /testID="flight-details-loading-hero"/);
  assert.doesNotMatch(loading, /flight-details-loading-back-control|flight-details-loading-actions|protected-header/);
});
