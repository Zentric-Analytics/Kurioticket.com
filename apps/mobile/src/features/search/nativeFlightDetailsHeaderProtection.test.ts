import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { flightDetailsHeaderProtectionGeometry } from "./flightDetailsHeaderProtection";

const flight = readFileSync("src/features/search/NativeFlightDetails.tsx", "utf8");
const hotel = readFileSync("src/features/search/HotelDetailsScreen.tsx", "utf8");

test("Flight header protection derives its threshold from the measured first foreground content", () => {
  assert.deepEqual(flightDetailsHeaderProtectionGeometry(47, 318, -104), {
    protectedHeight: 111,
    threshold: 103,
  });
  assert.deepEqual(flightDetailsHeaderProtectionGeometry(47, 382, -104), {
    protectedHeight: 111,
    threshold: 167,
  });
  assert.deepEqual(flightDetailsHeaderProtectionGeometry(24, 350, -88), {
    protectedHeight: 88,
    threshold: 174,
  });
});

test("Flight header protection clamps the threshold when the hero is shorter than the protected region", () => {
  assert.deepEqual(flightDetailsHeaderProtectionGeometry(47, 100), {
    protectedHeight: 111,
    threshold: 0,
  });
});

test("loaded Flight content drives a non-interactive protected layer while controls stay fixed above it", () => {
  const available = flight.slice(flight.indexOf('return <SafeAreaView edges={[]}'), flight.indexOf("function FlightDetailsLoadingSkeleton"));
  const layer = available.indexOf('testID="flight-details-protected-header"');
  const controls = available.indexOf('testID="flight-details-floating-controls"');
  const scroll = available.indexOf('testID="flight-details-scroll-content"');

  assert.ok(layer > -1 && layer < controls && controls < scroll);
  assert.match(available, /testID="flight-details-protected-header" pointerEvents="none"/);
  assert.match(available, /s\.protectedHeader,Platform\.OS==="android"&&s\.androidFlatControlLayer,\{height:protectedHeaderHeight,backgroundColor:headerProtected\?contentCanvasColor:"transparent"\}/);
  assert.match(available, /s\.heroControls,s\.floatingControls,Platform\.OS==="android"&&s\.androidFlatControlLayer/);
  assert.match(available, /onScroll=\{\(\{ nativeEvent \}\)=>syncHeaderProtection\(nativeEvent\.contentOffset\.y\)\}/);
  assert.match(available, /scrollEventThrottle=\{16\}/);
  assert.match(available, /testID="flight-details-hero"[^>]*onLayout=\{\(\{ nativeEvent \}\)=>measureHeaderHero\(nativeEvent\.layout\.height\)\}/);
  assert.match(available, /testID="flight-details-itinerary-overlap"[^>]*onLayout=\{\(\{ nativeEvent \}\)=>measureHeaderForeground\(nativeEvent\.layout\.y\)\}/);
  assert.match(flight, /const reload = useCallback\(\(\) => \{ resetHeaderProtection\(\); setRevision\(\(value\) => value \+ 1\); \}, \[resetHeaderProtection\]\);/);
  assert.match(flight, /protectedHeader:\{position:"absolute",left:0,right:0,top:0,zIndex:10,elevation:11\}/);
  assert.match(flight, /floatingControls:\{zIndex:20,elevation:12\}/);
  assert.match(flight, /androidFlatControlLayer:\{elevation:0\}/);
});

test("loading Flight content receives equivalent protection because its skeleton is scrollable", () => {
  const loading = flight.slice(flight.indexOf("function FlightDetailsLoadingSkeleton"), flight.indexOf("function HeroCurve"));
  assert.match(loading, /testID="flight-details-loading-protected-header" pointerEvents="none"/);
  assert.match(loading, /s\.protectedHeader,Platform\.OS==="android"&&s\.androidFlatControlLayer/);
  assert.match(loading, /s\.heroControls,s\.floatingControls,Platform\.OS==="android"&&s\.androidFlatControlLayer/);
  assert.match(loading, /backgroundColor:headerProtected\?contentCanvasColor:"transparent"/);
  assert.match(loading, /testID="flight-details-loading-scroll"[\s\S]*?onScroll=\{\(\{ nativeEvent \}\)=>syncHeaderProtection\(nativeEvent\.contentOffset\.y\)\}/);
  assert.match(loading, /testID="flight-details-loading-hero"[^>]*onLayout=\{\(\{ nativeEvent \}\)=>measureHeaderHero\(nativeEvent\.layout\.height\)\}/);
  assert.match(loading, /testID="flight-details-loading-itinerary-overlap"[^>]*onLayout=\{\(\{ nativeEvent \}\)=>measureHeaderForeground\(nativeEvent\.layout\.y\)\}/);
});

test("Hotel reference still owns its original independent sticky protection", () => {
  assert.match(hotel, /const hotelStickyTabsTop = inset\.top \+ 72/);
  assert.match(hotel, /stickyHeaderIndices=\{\[2\]\}/);
  assert.match(hotel, /backgroundColor: hotelTabsPinned \? hotelCanvasColor : "transparent"/);
});
