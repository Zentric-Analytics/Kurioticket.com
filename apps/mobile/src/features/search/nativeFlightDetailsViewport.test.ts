import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { nativeLoadedFareCardWidth } from "./nativeFareRailGeometry";

const source = readFileSync("src/features/search/NativeFlightDetails.tsx", "utf8");

test("loaded and loading vertical content containers are explicitly bounded to the live viewport", () => {
  assert.match(source, /contentContainerStyle=\{\[s\.content,\{width:windowWidth,maxWidth:windowWidth,paddingBottom:120\+inset\.bottom\}\]\}/);
  assert.match(source, /viewportWidth=\{windowWidth\}/);
  assert.match(source, /contentContainerStyle=\{\[s\.content,\{width:viewportWidth,maxWidth:viewportWidth,paddingBottom:120\+bottomInset\}\]\}/);
  assert.doesNotMatch(source, /safe:\{[^}]*overflow:"hidden"/);
});

test("loaded and loading root scrollers lock native overscroll at the viewport boundary", () => {
  assert.match(source, /testID="flight-details-scroll-content"[\s\S]*?contentInsetAdjustmentBehavior="never"[\s\S]*?bounces=\{false\}[\s\S]*?alwaysBounceVertical=\{false\}[\s\S]*?overScrollMode="never"/);
  assert.match(source, /testID="flight-details-loading-scroll"[\s\S]*?contentInsetAdjustmentBehavior="never"[\s\S]*?bounces=\{false\}[\s\S]*?alwaysBounceVertical=\{false\}[\s\S]*?overScrollMode="never"/);
});

test("the overlapped itinerary remains inside the viewport gutter at representative phone widths", () => {
  const bodyPadding = 18;
  const overlap = 10;
  for (const width of [320, 360, 375, 390, 412, 430]) {
    const renderedWidth = width - (2 * bodyPadding) + (2 * overlap);
    assert.ok(renderedWidth <= width, `${width}px itinerary must not exceed its viewport`);
    assert.ok(renderedWidth > 0);
    assert.ok(nativeLoadedFareCardWidth(width) < width, `${width}px fare card leaves a visible rail affordance`);
  }
  assert.match(source, /itineraryStack:\{gap:14,marginHorizontal:-10,marginTop:-104,zIndex:1\}/);
});

test("viewport bounding preserves the two intentional horizontal rails", () => {
  assert.match(source, /accessibilityRole="radiogroup" accessibilityLabel="Available fares" horizontal/);
  assert.match(source, /testID="flight-details-fare-price-loading"[\s\S]*?horizontal/);
  assert.match(source, /<ScrollView horizontal showsHorizontalScrollIndicator=\{false\} style=\{\[s\.fareTabRail/);
});
