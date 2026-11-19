import assert from "node:assert/strict";
import test from "node:test";
import { clampNumericRange, lockedRangeEdgeForDrag, moveRangeEdge, positionForRangeValue, priceRangeStep, rangeEdgeForDrag, rangeStepForSpan, rangeValueForGesture, rangeValueForPosition, snapRangeValue, THUMB_CENTER_INSET, THUMB_HIT_SIZE, usableRangeTrackWidth } from "./flightRange";

const available = { min: 100, max: 600 };

test("slider positions and values map across measured track widths", () => {
  assert.equal(positionForRangeValue(350, available, 320), 160);
  assert.equal(rangeValueForPosition(160, available, 320, 10), 350);
  for (const width of [320, 360, 375, 390, 412, 430]) {
    assert.equal(positionForRangeValue(100, available, width), THUMB_CENTER_INSET);
    assert.equal(positionForRangeValue(600, available, width), width - THUMB_CENTER_INSET);
    assert.equal(positionForRangeValue(100, available, width) - THUMB_CENTER_INSET, 0);
    assert.equal(positionForRangeValue(600, available, width) + THUMB_CENTER_INSET, width);
    assert.equal(usableRangeTrackWidth(width), width - THUMB_HIT_SIZE);
  }
});

test("physical endpoints return exact awkward extents across common track widths", () => {
  const awkward = { min: 103, max: 577 };
  for (const width of [320, 360, 375, 390, 412, 430]) {
    assert.equal(rangeValueForPosition(THUMB_CENTER_INSET, awkward, width, 10), 103);
    assert.equal(rangeValueForPosition(THUMB_CENTER_INSET - 1, awkward, width, 10), 103);
    assert.equal(rangeValueForPosition(width - THUMB_CENTER_INSET, awkward, width, 10), 577);
    assert.equal(rangeValueForPosition(width - THUMB_CENTER_INSET + 1, awkward, width, 10), 577);
    assert.equal(rangeValueForPosition(width / 2, awkward, width, 10), 343);
  }
});

test("a full-track grant and its dx continuously resolve price and duration values at phone widths", () => {
  for (const width of [320, 360, 375, 390, 412, 430]) {
    for (const [range, step] of [[{ min: 100, max: 600 }, 10], [{ min: 60, max: 600 }, 5]] as const) {
      const left = THUMB_CENTER_INSET;
      const right = width - THUMB_CENTER_INSET;
      const middle = width / 2;
      assert.equal(rangeValueForGesture(left, 0, range, width, step), range.min);
      assert.equal(rangeValueForGesture(right, 0, range, width, step), range.max);
      assert.equal(rangeValueForGesture(left - 100, 0, range, width, step), range.min);
      assert.equal(rangeValueForGesture(right + 100, 0, range, width, step), range.max);
      assert.equal(rangeValueForGesture(middle, 0, range, width, step), snapRangeValue((range.min + range.max) / 2, range, step));
      assert.ok(rangeValueForGesture(middle, 40, range, width, step) > rangeValueForGesture(middle, 0, range, width, step));
      assert.ok(rangeValueForGesture(middle, -40, range, width, step) < rangeValueForGesture(middle, 0, range, width, step));
      assert.equal(rangeValueForGesture(middle, width, range, width, step), range.max);
      assert.equal(rangeValueForGesture(middle, -width, range, width, step), range.min);
    }
  }
});

test("the physical stagnant-thumb regression updates from grant position and subsequent dx", () => {
  const duration = { min: 60, max: 600 };
  const grantX = THUMB_CENTER_INSET + usableRangeTrackWidth(360) * 0.75;
  const granted = rangeValueForGesture(grantX, 0, duration, 360, 5);
  const moved = rangeValueForGesture(grantX, 30, duration, 360, 5);
  assert.notEqual(granted, 75);
  assert.ok(moved > granted);
});

test("slider math safely handles invalid or zero-width tracks", () => {
  assert.equal(positionForRangeValue(350, available, 0), THUMB_CENTER_INSET);
  assert.equal(rangeValueForPosition(20, available, 0, 10), available.min);
  assert.equal(rangeValueForPosition(Number.NaN, available, 320, 10), available.min);
  assert.equal(rangeValueForGesture(Number.NaN, 10, available, 320, 10), available.min);
  assert.equal(rangeValueForGesture(160, Number.NaN, available, Number.NaN, 10), available.min);
});

test("snapping clamps out-of-bounds positions and uses useful dynamic steps", () => {
  assert.equal(snapRangeValue(347, available, 10), 350);
  assert.equal(rangeValueForPosition(-20, available, 320, 10), 100);
  assert.equal(rangeValueForPosition(500, available, 320, 10), 600);
  assert.equal(rangeStepForSpan(0, 100), 2);
  assert.equal(rangeStepForSpan(850_000, 2_400_000), 50_000);
  assert.equal(rangeStepForSpan(5, 5), 1);
  assert.equal(priceRangeStep(100, 105), 1);
  assert.equal(priceRangeStep(100, 100.5), 1);
  assert.equal(priceRangeStep(0, 100), 2);
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

test("overlapping thumbs separate according to drag direction", () => {
  const equal = { min: 350, max: 350 };
  assert.equal(rangeEdgeForDrag(equal, "max", -1), "min");
  assert.equal(rangeEdgeForDrag(equal, "min", 1), "max");
  assert.equal(rangeEdgeForDrag(equal, "min", 0), "min");
  assert.equal(rangeEdgeForDrag({ min: 300, max: 350 }, "max", -1), "max");
});

test("an overlapping multi-frame gesture locks one edge until lifecycle reset", () => {
  let locked: "min" | "max" | null = null;
  for (const dx of [-3, -8, -20]) {
    locked = lockedRangeEdgeForDrag(locked, true, "max", dx);
    assert.equal(locked, "min");
  }
  // Release/termination reset is represented by clearing the gesture lock.
  locked = null;
  assert.equal(lockedRangeEdgeForDrag(locked, true, "min", 3), "max");
  assert.equal(lockedRangeEdgeForDrag("max", true, "min", 20), "max");
});

test("exact endpoints restore full ranges and preserve duration five-minute stepping", () => {
  const awkward = { min: 103, max: 577 };
  const narrowed = { min: 203, max: 573 };
  const restoredMin = moveRangeEdge(narrowed, "min", rangeValueForPosition(THUMB_CENTER_INSET, awkward, 375, 10), awkward);
  const restored = moveRangeEdge(restoredMin, "max", rangeValueForPosition(375 - THUMB_CENTER_INSET, awkward, 375, 10), awkward);
  assert.deepEqual(restored, awkward);
  assert.equal(snapRangeValue(438, available, 5), 440);
  assert.deepEqual(moveRangeEdge({ min: 100, max: 440 }, "max", rangeValueForPosition(390 - THUMB_CENTER_INSET, available, 390, 5), available), available);
});
