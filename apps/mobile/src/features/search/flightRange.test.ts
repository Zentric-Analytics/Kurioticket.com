import assert from "node:assert/strict";
import test from "node:test";
import { clampNumericRange, moveRangeEdge, positionForRangeValue, rangeStepForSpan, rangeValueForPosition, snapRangeValue } from "./flightRange";

const available = { min: 100, max: 600 };

test("slider positions and values map across measured track widths", () => {
  assert.equal(positionForRangeValue(350, available, 320), 160);
  assert.equal(rangeValueForPosition(160, available, 320, 10), 350);
  for (const width of [320, 360, 375, 390, 412, 430]) {
    assert.equal(positionForRangeValue(600, available, width), width);
  }
});

test("slider math safely handles invalid or zero-width tracks", () => {
  assert.equal(positionForRangeValue(350, available, 0), 0);
  assert.equal(rangeValueForPosition(20, available, 0, 10), available.min);
  assert.equal(rangeValueForPosition(Number.NaN, available, 320, 10), available.min);
});

test("snapping clamps out-of-bounds positions and uses useful dynamic steps", () => {
  assert.equal(snapRangeValue(347, available, 10), 350);
  assert.equal(rangeValueForPosition(-20, available, 320, 10), 100);
  assert.equal(rangeValueForPosition(500, available, 320, 10), 600);
  assert.equal(rangeStepForSpan(0, 100), 2);
  assert.equal(rangeStepForSpan(850_000, 2_400_000), 50_000);
  assert.equal(rangeStepForSpan(5, 5), 1);
});

test("numeric range validation restores finite ordered values inside the extent", () => {
  assert.deepEqual(clampNumericRange(null, available), available);
  assert.deepEqual(clampNumericRange({ min: -50, max: 900 }, available), available);
  assert.deepEqual(clampNumericRange({ min: Number.NaN, max: Number.POSITIVE_INFINITY }, available), available);
  assert.deepEqual(clampNumericRange({ min: 500, max: 200 }, available), { min: 200, max: 200 });
});

test("dual thumbs cannot cross and duration maximum remains anchored", () => {
  assert.deepEqual(moveRangeEdge({ min: 200, max: 500 }, "min", 550, available), { min: 500, max: 500 });
  assert.deepEqual(moveRangeEdge({ min: 200, max: 500 }, "max", 150, available), { min: 200, max: 200 });
  const duration = moveRangeEdge({ min: 100, max: 600 }, "max", 450, available);
  assert.deepEqual({ min: available.min, max: duration.max }, { min: 100, max: 450 });
  assert.deepEqual(moveRangeEdge(duration, "max", 999, available), available);
});
