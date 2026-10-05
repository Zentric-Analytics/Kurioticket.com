import assert from "node:assert/strict";
import test from "node:test";

import {
  FLIGHT_STICKY_POPULAR_FILTER_MIN_RESULTS_BELOW,
  FLIGHT_STICKY_POPULAR_FILTER_MIN_WIDTH,
  FLIGHT_STICKY_POPULAR_FILTER_TOP,
  FLIGHT_STICKY_POPULAR_FILTER_TRIGGER_BOTTOM,
  shouldShowFlightStickyPopularFilters,
} from "./stickyPopularFilter";

test("Flight Popular filters stay hidden below the desktop sidebar breakpoint", () => {
  assert.equal(
    shouldShowFlightStickyPopularFilters({
      viewportWidth: FLIGHT_STICKY_POPULAR_FILTER_MIN_WIDTH - 1,
      fullFilterBottom: FLIGHT_STICKY_POPULAR_FILTER_TRIGGER_BOTTOM,
      resultsBottom:
        FLIGHT_STICKY_POPULAR_FILTER_TOP +
        FLIGHT_STICKY_POPULAR_FILTER_MIN_RESULTS_BELOW +
        500,
    }),
    false,
  );
});

test("Flight Popular filters wait until the full filter scrolls to the handoff threshold", () => {
  assert.equal(
    shouldShowFlightStickyPopularFilters({
      viewportWidth: FLIGHT_STICKY_POPULAR_FILTER_MIN_WIDTH,
      fullFilterBottom: FLIGHT_STICKY_POPULAR_FILTER_TRIGGER_BOTTOM + 1,
      resultsBottom:
        FLIGHT_STICKY_POPULAR_FILTER_TOP +
        FLIGHT_STICKY_POPULAR_FILTER_MIN_RESULTS_BELOW +
        500,
    }),
    false,
  );
});

test("tall full Flight filters cannot permanently suppress Popular filters", () => {
  const fullFilterBottom = FLIGHT_STICKY_POPULAR_FILTER_TRIGGER_BOTTOM;
  const resultsBottom =
    FLIGHT_STICKY_POPULAR_FILTER_TOP +
    FLIGHT_STICKY_POPULAR_FILTER_MIN_RESULTS_BELOW +
    300;

  assert.ok(resultsBottom - fullFilterBottom < FLIGHT_STICKY_POPULAR_FILTER_MIN_RESULTS_BELOW);
  assert.equal(
    shouldShowFlightStickyPopularFilters({
      viewportWidth: 1366,
      fullFilterBottom,
      resultsBottom,
    }),
    true,
  );
});

test("Flight Popular filters disappear naturally near the end of results", () => {
  assert.equal(
    shouldShowFlightStickyPopularFilters({
      viewportWidth: 1366,
      fullFilterBottom: 120,
      resultsBottom:
        FLIGHT_STICKY_POPULAR_FILTER_TOP +
        FLIGHT_STICKY_POPULAR_FILTER_MIN_RESULTS_BELOW -
        1,
    }),
    false,
  );
});

test("Flight Popular filters show at the exact valid geometry boundary", () => {
  assert.equal(
    shouldShowFlightStickyPopularFilters({
      viewportWidth: FLIGHT_STICKY_POPULAR_FILTER_MIN_WIDTH,
      fullFilterBottom: FLIGHT_STICKY_POPULAR_FILTER_TRIGGER_BOTTOM,
      resultsBottom:
        FLIGHT_STICKY_POPULAR_FILTER_TOP +
        FLIGHT_STICKY_POPULAR_FILTER_MIN_RESULTS_BELOW,
    }),
    true,
  );
});

test("invalid layout measurements fail closed", () => {
  assert.equal(
    shouldShowFlightStickyPopularFilters({
      viewportWidth: Number.NaN,
      fullFilterBottom: 100,
      resultsBottom: 1000,
    }),
    false,
  );
  assert.equal(
    shouldShowFlightStickyPopularFilters({
      viewportWidth: 1366,
      fullFilterBottom: Number.POSITIVE_INFINITY,
      resultsBottom: 1000,
    }),
    false,
  );
});
