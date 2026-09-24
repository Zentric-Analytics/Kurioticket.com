import assert from "node:assert/strict";
import test from "node:test";

import {
  beginCarLocationPointerIntent,
  isIntentionalCarLocationTap,
  updateCarLocationPointerIntent,
} from "./carLocationPointerIntent";

test("a stationary pointer is an intentional location-row tap", () => {
  const session = beginCarLocationPointerIntent(4, 20, 30);
  assert.equal(isIntentionalCarLocationTap(session, 4), true);
});

test("a location-row pan is not an intentional tap", () => {
  const started = beginCarLocationPointerIntent(4, 20, 30);
  const moved = updateCarLocationPointerIntent(started, 4, 20, 48);
  assert.equal(isIntentionalCarLocationTap(moved, 4), false);
});

test("small finger jitter remains a tap but a different pointer cannot commit", () => {
  const started = beginCarLocationPointerIntent(7, 20, 30);
  const jittered = updateCarLocationPointerIntent(started, 7, 24, 34);
  assert.equal(isIntentionalCarLocationTap(jittered, 7), true);
  assert.equal(isIntentionalCarLocationTap(jittered, 8), false);
});
