import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const cars = readFileSync("src/features/search/ApprovedCarResultsScreen.tsx", "utf8").replace(/\r\n/g, "\n");

test("Native Cars Results has no floating Back-to-top affordance", () => {
  for (const removed of [
    /CAR_BACK_TO_TOP_HIDE_NEAR_END/,
    /carBackToTop/,
    /carBackToTopVisibleRef/,
    /setCarBackToTop/,
    /handleCarScroll/,
    /accessibilityLabel="Back to top"/,
    /\bArrowUp\b/,
  ]) assert.doesNotMatch(cars, removed);
});

test("Cars retains its scroll ref and legitimate transition positioning", () => {
  assert.match(cars, /carScrollRef=useRef<ScrollView>\(null\)/);
  assert.match(cars, /ref=\{carScrollRef\}/);
  assert.match(cars, /startCarResultsTransition=.*?carScrollRef\.current\?\.scrollTo\(\{y:0,animated:true\}\)/);
  assert.match(cars, /onApplySort=.*?carScrollRef\.current\?\.scrollTo\(\{y:0,animated:true\}\)/);
});

test("Cars vertical owner is cross-platform stable and safe-area aware", () => {
  const owner = cars.match(/<ScrollView ref=\{carScrollRef\}[^>]*>/)?.[0];
  assert.ok(owner);
  for (const contract of [/alwaysBounceVertical=\{false\}/, /bounces=\{false\}/, /overScrollMode="never"/]) assert.match(owner, contract);
  assert.doesNotMatch(owner, /scrollEventThrottle=|onScroll=/);
  assert.match(owner, /contentContainerStyle=\{\[r\.body,\{paddingBottom:Math\.max\(insets\.bottom \+ 16,16\)\}\]\}/);
  assert.match(cars, /edges=\{\["top"\]\}/);
  const horizontal = cars.match(/<ScrollView horizontal[^>]*>/)?.[0];
  assert.ok(horizontal);
  for (const contract of [/alwaysBounceHorizontal=\{false\}/, /bounces=\{false\}/, /overScrollMode="never"/]) assert.match(horizontal, contract);
  assert.doesNotMatch(horizontal, /carScrollRef|alwaysBounceVertical/);
  assert.doesNotMatch(cars, /body:\{[^}]*paddingBottom/);
});

test("Cars keeps result content behavior without a floating control", () => {
  assert.match(cars, /filtered\.map\(\(result,index\)/);
  assert.doesNotMatch(cars, /Page \{page\}|label="Previous"|label="Next"/);
});
