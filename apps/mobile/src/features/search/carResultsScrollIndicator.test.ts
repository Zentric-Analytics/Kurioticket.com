import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/search/ApprovedCarResultsScreen.tsx", "utf8");
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
  assert.match(list, /disableVirtualization/);
  assert.match(list, /removeClippedSubviews=\{false\}/);
  assert.doesNotMatch(list, /initialNumToRender|maxToRenderPerBatch|windowSize|updateCellsBatchingPeriod/);
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

test("Cars leaves iOS boundary compression to the native scroll view", () => {
  assert.match(list, /alwaysBounceVertical=\{false\}/);
  assert.match(list, /bounces=\{Platform\.OS === "ios"\}/);
  assert.match(list, /overScrollMode="never"/);
  assert.doesNotMatch(list, /onScroll=|scrollEventThrottle=/);
});
