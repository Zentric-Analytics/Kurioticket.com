import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const listStart = screen.indexOf("<Animated.SectionList");
const listEnd = screen.indexOf("windowSize=", listStart);
const list = screen.slice(listStart, screen.indexOf("/>", listEnd) + 2);

test("Flight Results uses a capped decorative scroll thumb instead of the native iOS thumb", () => {
  assert.ok(listStart >= 0);
  assert.match(list, /showsVerticalScrollIndicator=\{false\}/);
  assert.match(list, /onContentSizeChange=\{handleFlightResultsContentSizeChange\}/);
  assert.match(list, /onScroll=\{Animated\.event/);
  assert.match(screen, /flightResultsScrollIndicatorGeometry/);
  assert.match(screen, /pointerEvents="none"/);
  assert.match(screen, /s0\.flightResultsScrollIndicatorTrack/);
  assert.match(screen, /s0\.flightResultsScrollIndicatorThumb/);
  assert.match(screen, /height: geometry\.thumbHeight/);
  assert.match(screen, /translateY/);
  assert.doesNotMatch(screen, /PanResponder/);
});

test("Flight Results settles a representative virtualized window before traversal", () => {
  assert.match(screen, /flightResultInitialRenderCount/);
  assert.match(screen, /flightResultRenderBatchSize/);
  assert.match(screen, /FLIGHT_RESULT_WINDOW_SIZE/);
  assert.match(screen, /FLIGHT_RESULT_BATCHING_PERIOD_MS/);
  assert.match(list, /initialNumToRender=\{flightResultInitialRenderCount\(sorted\.length\)\}/);
  assert.match(list, /maxToRenderPerBatch=\{flightResultRenderBatchSize\(sorted\.length\)\}/);
  assert.match(list, /windowSize=\{FLIGHT_RESULT_WINDOW_SIZE\}/);
  assert.match(list, /updateCellsBatchingPeriod=\{FLIGHT_RESULT_BATCHING_PERIOD_MS\}/);
  assert.doesNotMatch(list, /initialNumToRender=\{(?:sorted|results)\.length\}/);
  assert.doesNotMatch(list, /maxToRenderPerBatch=\{(?:sorted|results)\.length\}/);
});

test("Flight Results keeps virtualization with the decorative scrollbar", () => {
  assert.doesNotMatch(list, /disableVirtualization|getItemLayout/);
  assert.doesNotMatch(screen, /getItemLayout=/);
});
