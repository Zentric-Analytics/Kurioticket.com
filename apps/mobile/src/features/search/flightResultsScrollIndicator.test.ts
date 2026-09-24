import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const listStart = screen.indexOf("<Animated.SectionList");
const listEnd = screen.indexOf("windowSize=", listStart);
const list = screen.slice(listStart, screen.indexOf("/>", listEnd) + 2);

test("Flight Results uses the native iOS scroll indicator with safe-area-aware insets", () => {
  assert.ok(listStart >= 0);
  assert.match(screen, /const flightResultsScrollIndicatorInsets = Platform\.OS === "ios"/);
  assert.match(screen, /\{ top: 4, right: 3, bottom: Math\.max\(insets\.bottom, 8\), left: 0 \}/);
  assert.match(list, /showsVerticalScrollIndicator=\{true\}/);
  assert.match(list, /automaticallyAdjustsScrollIndicatorInsets=\{false\}/);
  assert.match(list, /scrollIndicatorInsets=\{flightResultsScrollIndicatorInsets\}/);
  assert.doesNotMatch(screen, /Animated[^\n]*(?:scrollbar|scrollIndicator)|customThumb|PanResponder|thumbHeight/i);
});

test("Flight Results settles a representative virtualized window before traversal", () => {
  assert.match(screen, /const FLIGHT_RESULT_INITIAL_RENDER_COUNT = 10/);
  assert.match(screen, /const FLIGHT_RESULT_RENDER_BATCH_SIZE = 10/);
  assert.match(screen, /const FLIGHT_RESULT_WINDOW_SIZE = 21/);
  assert.match(screen, /const FLIGHT_RESULT_BATCHING_PERIOD_MS = 16/);
  assert.match(list, /initialNumToRender=\{FLIGHT_RESULT_INITIAL_RENDER_COUNT\}/);
  assert.match(list, /maxToRenderPerBatch=\{FLIGHT_RESULT_RENDER_BATCH_SIZE\}/);
  assert.match(list, /windowSize=\{FLIGHT_RESULT_WINDOW_SIZE\}/);
  assert.match(list, /updateCellsBatchingPeriod=\{FLIGHT_RESULT_BATCHING_PERIOD_MS\}/);
  assert.doesNotMatch(list, /initialNumToRender=\{(?:sorted|results)\.length\}/);
  assert.doesNotMatch(list, /maxToRenderPerBatch=\{(?:sorted|results)\.length\}/);
});

test("Flight Results keeps virtualization rather than replacing the native scrollbar", () => {
  assert.doesNotMatch(list, /disableVirtualization|getItemLayout/);
  assert.doesNotMatch(screen, /getItemLayout=/);
});
