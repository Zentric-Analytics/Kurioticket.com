import assert from "node:assert/strict";
import test from "node:test";

import { horizontalRailGestureAxis } from "./useHorizontalRailAxisLock";

test("horizontal rail axis lock waits for a small intent threshold", () => {
  assert.equal(horizontalRailGestureAxis(2, 1), "pending");
  assert.equal(horizontalRailGestureAxis(5, 5), "pending");
});

test("horizontal-dominant gestures lock to the rail", () => {
  assert.equal(horizontalRailGestureAxis(12, 3), "horizontal");
  assert.equal(horizontalRailGestureAxis(-14, 4), "horizontal");
});

test("vertical-dominant gestures remain page panning", () => {
  assert.equal(horizontalRailGestureAxis(3, 12), "vertical");
  assert.equal(horizontalRailGestureAxis(4, -14), "vertical");
  assert.equal(horizontalRailGestureAxis(8, 8), "vertical");
});
