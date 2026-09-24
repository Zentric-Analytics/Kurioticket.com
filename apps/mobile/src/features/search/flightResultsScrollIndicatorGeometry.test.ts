import assert from "node:assert/strict";
import test from "node:test";
import {
  FLIGHT_RESULTS_SCROLL_THUMB_MAX_HEIGHT,
  FLIGHT_RESULTS_SCROLL_THUMB_MIN_HEIGHT,
  flightResultsScrollIndicatorGeometry,
} from "./flightResultsScrollIndicator";

test("Flight Results custom thumb is capped shorter than the available track", () => {
  const geometry = flightResultsScrollIndicatorGeometry({
    viewportHeight: 780,
    contentHeight: 3600,
    bottomInset: 34,
  });

  assert.equal(geometry.visible, true);
  assert.equal(geometry.thumbHeight, FLIGHT_RESULTS_SCROLL_THUMB_MAX_HEIGHT);
  assert.ok(geometry.thumbHeight < geometry.trackHeight);
  assert.ok(geometry.thumbTravel > 0);
});

test("Flight Results custom thumb keeps a usable minimum height for very long inventories", () => {
  const geometry = flightResultsScrollIndicatorGeometry({
    viewportHeight: 780,
    contentHeight: 50000,
    bottomInset: 34,
  });

  assert.equal(geometry.visible, true);
  assert.equal(geometry.thumbHeight, FLIGHT_RESULTS_SCROLL_THUMB_MIN_HEIGHT);
});

test("Flight Results custom thumb disappears when there is nothing to scroll", () => {
  const geometry = flightResultsScrollIndicatorGeometry({
    viewportHeight: 780,
    contentHeight: 700,
    bottomInset: 34,
  });

  assert.equal(geometry.visible, false);
  assert.equal(geometry.thumbHeight, 0);
  assert.equal(geometry.thumbTravel, 0);
});
