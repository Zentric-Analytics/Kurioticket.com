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
  assert.match(cars, /carScrollRef=useRef<FlatList<CarResult>>\(null\)/);
  assert.match(cars, /ref=\{carScrollRef\}/);
  assert.match(cars, /startCarResultsTransition=.*?carScrollRef\.current\?\.scrollToOffset\(\{offset:0,animated:true\}\)/);
  assert.match(cars, /onApplySort=.*?startCarResultsTransition\(\)/);
  assert.doesNotMatch(cars.match(/onApplySort=\{\(next\)=>\{[\s\S]*?\}\}/)?.[0] ?? "", /scrollTo/);
});

test("Cars vertical owner is cross-platform stable, virtualized, and safe-area aware", () => {
  const start = cars.indexOf("<FlatList ref={carScrollRef}");
  const contentStyleStart = cars.indexOf("contentContainerStyle=", start);
  const owner = cars.slice(start, cars.indexOf("/>", contentStyleStart) + 2);
  assert.ok(start >= 0 && contentStyleStart > start);
  for (const contract of [/alwaysBounceVertical=\{false\}/, /bounces=\{false\}/, /overScrollMode="never"/]) assert.match(owner, contract);
  assert.match(owner, /initialNumToRender=\{CAR_RESULT_INITIAL_IMAGE_COUNT\}/);
  assert.match(owner, /maxToRenderPerBatch=\{3\}/);
  assert.match(owner, /windowSize=\{5\}/);
  assert.doesNotMatch(owner, /scrollEventThrottle=|onScroll=/);
  assert.match(owner, /contentContainerStyle=\{\[r\.body,\{paddingBottom:Math\.max\(insets\.bottom \+ 16,16\)\}\]\}/);
  assert.match(cars, /edges=\{\["top"\]\}/);
  const horizontal = cars.match(/<ScrollView horizontal[^>]*>/)?.[0];
  assert.ok(horizontal);
  for (const contract of [/alwaysBounceHorizontal=\{false\}/, /bounces=\{false\}/, /overScrollMode="never"/]) assert.match(horizontal, contract);
  assert.doesNotMatch(horizontal, /carScrollRef|alwaysBounceVertical/);
  assert.doesNotMatch(cars, /body:\{[^}]*paddingBottom/);
});

test("Cars keeps result content behavior without pagination", () => {
  assert.match(cars, /data=\{listData\}/);
  assert.match(cars, /renderItem=\{\(\{item,index\}\)=>/);
  assert.match(cars, /carResultCountLabel\(filtered\.length\)/);
  assert.doesNotMatch(cars, /Page \{page\}|label="Previous"|label="Next"|pageSize|totalPages/);
});
