import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const listStart = screen.indexOf("<Animated.SectionList");
const listEnd = screen.indexOf("windowSize=", listStart);
const list = screen.slice(listStart, screen.indexOf("/>", listEnd) + 2);

test("Flight Results owns one fixed-length indicator instead of the virtualized native thumb", () => {
  assert.ok(listStart >= 0);
  assert.match(screen, /const FLIGHT_RESULTS_SCROLL_THUMB_HEIGHT = 32/);
  assert.match(screen, /testID="flight-results-scroll-indicator"/);
  assert.match(screen, /testID="flight-results-scroll-thumb"/);
  assert.match(screen, /flightResultsScrollThumbHeight = Math\.min\(FLIGHT_RESULTS_SCROLL_THUMB_HEIGHT, flightResultsScrollTrackHeight\)/);
  assert.match(list, /showsVerticalScrollIndicator=\{false\}/);
  assert.match(list, /onContentSizeChange=\{\(_width, height\) => setFlightResultsContentHeight\(height\)\}/);
  assert.match(list, /onLayout=\{\(\{ nativeEvent \}\) => setFlightResultsViewportHeight\(nativeEvent\.layout\.height\)\}/);
  assert.match(list, /onScroll=\{Animated\.event/);
  assert.doesNotMatch(list, /scrollIndicatorInsets=/);
});

test("Flight Results custom indicator stays safe-area-aware and only changes position during scroll", () => {
  assert.match(screen, /flightResultsScrollIndicatorBottomInset = Math\.max\(insets\.bottom, FLIGHT_RESULTS_SCROLL_INDICATOR_EDGE_INSET\)/);
  assert.match(screen, /height: flightResultsScrollThumbHeight/);
  assert.match(screen, /transform: \[\{ translateY: flightResultsScrollThumbTranslateY \}\]/);
  assert.match(screen, /opacity: flightResultsScrollIndicatorVisible \? 0\.55 : 0/);
  assert.match(screen, /FLIGHT_RESULTS_SCROLL_INDICATOR_IDLE_MS = 650/);
  assert.match(screen, /onScrollBeginDrag=\{showFlightResultsScrollIndicator\}/);
  assert.match(screen, /onMomentumScrollEnd=\{hideFlightResultsScrollIndicator\}/);
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

test("Flight Results keeps virtualization while decoupling indicator length from measured rows", () => {
  assert.doesNotMatch(list, /disableVirtualization|getItemLayout/);
  assert.doesNotMatch(screen, /getItemLayout=/);
  assert.doesNotMatch(screen, /flightResultsScrollThumbHeight[\s\S]{0,180}flightResultsContentHeight/);
});
