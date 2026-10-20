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
  assert.match(list, /showsVerticalScrollIndicator=\{false\}/);
  assert.doesNotMatch(list, /scrollIndicatorInsets=/);
  assert.match(screen, /flightResultsViewportHeightRef = useRef\(0\)/);
  assert.match(screen, /flightResultsContentHeightRef = useRef\(0\)/);
  assert.match(screen, /flightResultsScrollOffsetRef = useRef\(0\)/);
  assert.match(screen, /flightResultsScrollThumbRef = useRef<View>\(null\)/);
});

test("Flight Results custom indicator length never depends on virtualized content measurement", () => {
  const updater = screen.slice(
    screen.indexOf("const updateFlightResultsScrollThumb"),
    screen.indexOf("const showFlightResultsScrollIndicator"),
  );
  assert.match(updater, /const thumbHeight = Math\.min\(FLIGHT_RESULTS_SCROLL_THUMB_HEIGHT, trackHeight\)/);
  assert.match(updater, /const maxScroll = Math\.max\(0, contentHeight - viewportHeight\)/);
  assert.match(updater, /scrollOffset \/ maxScroll/);
  assert.match(updater, /setNativeProps\(\{[\s\S]*height: thumbHeight,[\s\S]*translateY/);
  assert.doesNotMatch(updater, /set[A-Z][A-Za-z]*\(/);
  assert.doesNotMatch(screen, /const \[flightResults(?:ViewportHeight|ContentHeight|ScrollIndicatorVisible)/);
});

test("Flight Results custom indicator stays safe-area-aware and fades after scrolling", () => {
  assert.match(screen, /flightResultsScrollIndicatorBottomInset = Math\.max\(insets\.bottom, FLIGHT_RESULTS_SCROLL_INDICATOR_EDGE_INSET\)/);
  assert.match(screen, /FLIGHT_RESULTS_SCROLL_INDICATOR_IDLE_MS = 650/);
  assert.match(list, /onScrollBeginDrag=\{showFlightResultsScrollIndicator\}/);
  assert.match(list, /onScrollEndDrag=\{hideFlightResultsScrollIndicator\}/);
  assert.match(list, /onMomentumScrollBegin=\{showFlightResultsScrollIndicator\}/);
  assert.match(list, /onMomentumScrollEnd=\{hideFlightResultsScrollIndicator\}/);
  assert.match(screen, /opacity: scrollable \? 0\.55 : 0/);
  assert.match(screen, /setNativeProps\(\{ style: \{ opacity: 0 \} \}\)/);
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

test("Flight Results keeps virtualization and no scroll-driven React state updates", () => {
  assert.doesNotMatch(list, /disableVirtualization|getItemLayout/);
  assert.doesNotMatch(screen, /getItemLayout=/);
  assert.doesNotMatch(list, /set[A-Z][A-Za-z]*\(/);
});
