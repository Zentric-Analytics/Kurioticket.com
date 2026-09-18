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
  assert.match(screen, /\{ top: 4, right: 6, bottom: Math\.max\(insets\.bottom, 8\), left: 0 \}/);
  assert.match(list, /showsVerticalScrollIndicator=\{true\}/);
  assert.match(list, /automaticallyAdjustsScrollIndicatorInsets=\{false\}/);
  assert.match(list, /scrollIndicatorInsets=\{carResultsScrollIndicatorInsets\}/);
  assert.doesNotMatch(screen, /Animated[^\n]*(?:scrollbar|scrollIndicator)|customThumb|PanResponder/i);
});

test("Cars measures a representative initial sample without conflating image prefetch", () => {
  assert.match(screen, /const CAR_RESULT_INITIAL_IMAGE_COUNT = 3/);
  assert.match(screen, /\.slice\(0,CAR_RESULT_INITIAL_IMAGE_COUNT\)/);
  assert.match(screen, /const CAR_RESULT_INITIAL_RENDER_COUNT = 8/);
  assert.match(list, /initialNumToRender=\{CAR_RESULT_INITIAL_RENDER_COUNT\}/);
  assert.match(list, /maxToRenderPerBatch=\{6\}/);
  assert.match(list, /windowSize=\{7\}/);
  assert.match(list, /updateCellsBatchingPeriod=\{40\}/);
  assert.doesNotMatch(list, /initialNumToRender=\{(?:listData|filtered|results)\.length\}/);
});

test("Cars keeps native virtualization and naturally-sized heterogeneous cards", () => {
  assert.match(list, /data=\{listData\}/);
  assert.doesNotMatch(list, /getItemLayout|disableVirtualization/);
  assert.doesNotMatch(screen, /getItemLayout=/);
  assert.match(card, /topSection:\{minHeight:156/);
  const cardStyle = card.slice(card.indexOf("card:{"), card.indexOf("},topSection:"));
  assert.doesNotMatch(cardStyle.replace(/shadowOffset:\{[^}]*\}/, ""), /(?:^|,)height:/);
});
