import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/search/ApprovedCarResultsScreen.tsx", "utf8");
const backToTopState = readFileSync("src/features/search/carResultsBackToTopState.ts", "utf8");
const card = readFileSync("src/features/search/CarResultCard.tsx", "utf8");
const listStart = screen.indexOf("<FlatList ref={carScrollRef}");
const listEnd = screen.indexOf("contentContainerStyle=", listStart);
const list = screen.slice(listStart, screen.indexOf("/>", listEnd) + 2);

test("Cars owns a modest safe-area-aware native iOS scroll indicator", () => {
  assert.ok(listStart >= 0);
  assert.match(screen, /const carResultsScrollIndicatorInsets = Platform\.OS === "ios"/);
  assert.match(screen, /\{ top: 4, right: 3, bottom: Math\.max\(insets\.bottom, 8\), left: 0 \}/);
  assert.match(list, /showsVerticalScrollIndicator=\{true\}/);
  assert.match(list, /automaticallyAdjustsScrollIndicatorInsets=\{false\}/);
  assert.match(list, /scrollIndicatorInsets=\{carResultsScrollIndicatorInsets\}/);
  assert.doesNotMatch(screen, /Animated[^\n]*(?:scrollbar|scrollIndicator)|customThumb|PanResponder|thumbHeight/i);
});

test("Cars resolves its full logical content extent independently of image prefetch", () => {
  assert.match(screen, /const CAR_RESULT_INITIAL_IMAGE_COUNT = 3/);
  assert.match(screen, /\.slice\(0,CAR_RESULT_INITIAL_IMAGE_COUNT\)/);
  assert.match(list, /initialNumToRender=\{Math\.max\(results\.length,1\)\}/);
  assert.match(list, /maxToRenderPerBatch=\{Math\.max\(results\.length,CAR_RESULT_RENDER_BATCH_SIZE\)\}/);
  assert.match(list, /windowSize=\{CAR_RESULT_WINDOW_SIZE\}/);
  assert.match(list, /updateCellsBatchingPeriod=\{CAR_RESULT_BATCHING_PERIOD_MS\}/);
  assert.match(list, /removeClippedSubviews=\{Platform\.OS === "android"\}/);
  assert.doesNotMatch(list, /disableVirtualization/);
});

test("Cars gives the native indicator stable naturally-sized card geometry", () => {
  assert.match(list, /data=\{listData\}/);
  assert.doesNotMatch(list, /getItemLayout/);
  assert.doesNotMatch(screen, /getItemLayout=/);
  assert.doesNotMatch(list, /ListFooterComponent/);
  assert.match(card, /topSection:\{minHeight:156/);
  const cardStyle = card.slice(card.indexOf("card:{"), card.indexOf("},topSection:"));
  assert.doesNotMatch(cardStyle.replace(/shadowOffset:\{[^}]*\}/, ""), /(?:^|,)height:/);
});

test("Cars keeps stable cross-platform boundary behavior", () => {
  assert.match(list, /alwaysBounceVertical=\{false\}/);
  assert.match(list, /bounces=\{false\}/);
  assert.match(list, /overScrollMode="never"/);
  assert.match(list, /onScroll=\{handleCarScroll\} scrollEventThrottle=\{16\}/);
  assert.match(list, /onScrollBeginDrag=\{\(event\)=>\{carBackToTopReturningRef\.current=false;handleCarScroll\(event\);\}\}/);
  assert.match(backToTopState, /const CAR_BACK_TO_TOP_SCROLL_THRESHOLD = 500/);
  assert.match(list, /onMomentumScrollEnd=\{handleCarScroll\}/);
  assert.match(list, /onScrollToTop=\{handleCarScroll\}/);
  assert.doesNotMatch(list, /getItemLayout|ListFooterComponent/);
});
