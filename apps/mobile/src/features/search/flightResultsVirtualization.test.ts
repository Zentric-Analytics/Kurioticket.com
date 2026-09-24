import assert from "node:assert/strict";
import test from "node:test";
import {
  FLIGHT_RESULT_SCROLL_EXTENT_WARMUP_CAP,
  flightResultInitialRenderCount,
  flightResultRenderBatchSize,
} from "./flightResultsVirtualization";

test("ordinary native Flight Results inventories warm the full initial extent including the intro row", () => {
  assert.equal(flightResultInitialRenderCount(0), 10);
  assert.equal(flightResultInitialRenderCount(9), 10);
  assert.equal(flightResultInitialRenderCount(10), 11);
  assert.equal(flightResultInitialRenderCount(25), 26);
});

test("large native Flight Results inventories keep a hard virtualization warm-up cap", () => {
  assert.equal(FLIGHT_RESULT_SCROLL_EXTENT_WARMUP_CAP, 30);
  assert.equal(flightResultInitialRenderCount(50), 30);
  assert.equal(flightResultInitialRenderCount(100), 30);
  assert.equal(flightResultInitialRenderCount(200), 30);
  assert.equal(flightResultRenderBatchSize(200), 30);
});

test("invalid or negative counts stay bounded", () => {
  assert.equal(flightResultInitialRenderCount(-5), 10);
  assert.equal(flightResultInitialRenderCount(Number.NaN), 10);
  assert.equal(flightResultRenderBatchSize(0), 10);
});
