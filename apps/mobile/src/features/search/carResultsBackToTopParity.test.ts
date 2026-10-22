import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const cars = readFileSync("src/features/search/ApprovedCarResultsScreen.tsx", "utf8").replace(/\r\n/g, "\n");

test("native Cars no longer renders a floating back-to-top button", () => {
  for (const oldControl of [
    /accessibilityLabel="Back to top"/,
    /<ArrowUp/,
    /carBackToTopVisible/,
    /carBackToTopProgress/,
    /carBackToTopReducedMotion/,
    /carBackToTopOffsetRef/,
    /carBackToTopTouch:/,
    /<Animated.View pointerEvents=/,
    /updateCarBackToTopScroll/,
    /beginCarBackToTopReturn/,
  ]) assert.doesNotMatch(cars, oldControl);
});

test("Cars keeps filter and sort initiated scroll reset without the floating control", () => {
  assert.match(cars, /carScrollRef=useRef<FlatList<CarResult>>\(null\)/);
  assert.match(cars, /const scrollCarResultsToTop=useCallback\(\(\)=>\{/);
  assert.match(cars, /carScrollRef\.current\?\.scrollToOffset\(\{offset:0,animated:true\}\)/);
  assert.match(cars, /startCarResultsTransition=\(\)=>\{[^}]*scrollCarResultsToTop\(\)/);
  assert.match(cars, /onApplySort=[^\n]*startCarResultsTransition\(\)/);
  assert.doesNotMatch(cars, /onPress=\{scrollCarResultsToTop\}/);
});

test("native Cars retains its stable virtualized FlatList scrolling", () => {
  const start = cars.indexOf("<FlatList ref={carScrollRef}");
  const contentStyleStart = cars.indexOf("contentContainerStyle=", start);
  const owner = cars.slice(start, cars.indexOf("/>", contentStyleStart) + 2);
  assert.ok(start >= 0 && contentStyleStart > start);
  for (const contract of [/alwaysBounceVertical=\{false\}/, /bounces=\{false\}/, /overScrollMode="never"/]) assert.match(owner, contract);
  assert.match(owner, /initialNumToRender=\{Math\.max\(results\.length,1\)\}/);
  assert.match(owner, /maxToRenderPerBatch=\{Math\.max\(results\.length,CAR_RESULT_RENDER_BATCH_SIZE\)\}/);
  assert.match(owner, /windowSize=\{CAR_RESULT_WINDOW_SIZE\}/);
  assert.match(owner, /contentContainerStyle=\{\[r\.body,\{paddingBottom:Math\.max\(insets\.bottom \+ 64,64\)\}\]\}/);
  assert.match(cars, /edges=\{\["top"\]\}/);
  assert.doesNotMatch(owner, /onScroll=\{handleCarScroll\}|onScrollToTop=\{handleCarScroll\}/);
  const horizontal = cars.match(/<ScrollView horizontal[^>]*>/)?.[0];
  assert.ok(horizontal);
  for (const contract of [/alwaysBounceHorizontal=\{false\}/, /bounces=\{false\}/, /overScrollMode="never"/]) assert.match(horizontal, contract);
  assert.doesNotMatch(horizontal, /carScrollRef|alwaysBounceVertical/);
});

test("cars retains result count and continuous listing", () => {
  assert.match(cars, /data=\{listData\}/);
  assert.match(cars, /renderItem=\{\(\{item,index\}\)=>/);
  assert.match(cars, /carResultCountLabel\(filtered\.length\)/);
  assert.doesNotMatch(cars, /Page \{page\}|label="Previous"|label="Next"|pageSize|totalPages/);
});
