import assert from "node:assert/strict";
import test from "node:test";
import {
  beginCarBackToTopReturn,
  CAR_BACK_TO_TOP_SCROLL_THRESHOLD,
  INITIAL_CAR_BACK_TO_TOP_SCROLL_STATE,
  updateCarBackToTopScroll,
} from "./carResultsBackToTopState";

test("native Cars Back to top appears while scrolling down, not only on the way back up", () => {
  let state = INITIAL_CAR_BACK_TO_TOP_SCROLL_STATE;
  state = updateCarBackToTopScroll(state, 300);
  assert.equal(state.visible, false);
  state = updateCarBackToTopScroll(state, CAR_BACK_TO_TOP_SCROLL_THRESHOLD);
  assert.equal(state.visible, false);
  state = updateCarBackToTopScroll(state, CAR_BACK_TO_TOP_SCROLL_THRESHOLD + 1);
  assert.equal(state.visible, true);
  state = updateCarBackToTopScroll(state, 1200);
  assert.equal(state.visible, true);
  state = updateCarBackToTopScroll(state, 750);
  assert.equal(state.visible, true, "the button stays visible while scrolling upward");
  state = updateCarBackToTopScroll(state, 50);
  assert.equal(state.visible, false, "the button disappears near the top");
});

test("requesting top while already at offset zero never arms a stale scroll guard", () => {
  let state = beginCarBackToTopReturn(INITIAL_CAR_BACK_TO_TOP_SCROLL_STATE);
  assert.equal(state.returning, false);
  assert.equal(state.visible, false);
  // Some native platforms emit no scroll event when asked to return to zero.
  // A subsequent genuine downward scroll must still reveal the control.
  state = updateCarBackToTopScroll(state, 800);
  assert.equal(state.visible, true);
  assert.equal(state.returning, false);
});

test("animated Back to top stays hidden through decreasing offsets and resets at zero", () => {
  let state = updateCarBackToTopScroll(INITIAL_CAR_BACK_TO_TOP_SCROLL_STATE, 1200);
  assert.equal(state.visible, true);
  state = beginCarBackToTopReturn(state);
  assert.equal(state.visible, false);
  assert.equal(state.returning, true);
  for (const offset of [1000, 650, 210, 0]) {
    state = updateCarBackToTopScroll(state, offset);
    assert.equal(state.visible, false, "animated scrolling must not flash the button");
  }
  assert.equal(state.returning, false, "return guard clears on reaching top");
  state = updateCarBackToTopScroll(state, 650);
  assert.equal(state.visible, true, "a new downward scroll must reveal the button");
});

test("interrupted animated return cannot suppress a new downward scroll", () => {
  let state = updateCarBackToTopScroll(INITIAL_CAR_BACK_TO_TOP_SCROLL_STATE, 1200);
  state = beginCarBackToTopReturn(state);
  state = updateCarBackToTopScroll(state, 700);
  assert.equal(state.returning, true);
  state = updateCarBackToTopScroll(state, 725);
  assert.equal(state.returning, false, "reverse movement cancels stale returning state");
  assert.equal(state.visible, true, "descending above threshold shows the button immediately");
});

test("a stale return guard at zero cannot hide downward-scroll affordance", () => {
  const stale = {offset: 0, returning: true, visible: false};
  const state = updateCarBackToTopScroll(stale, 700);
  assert.equal(state.returning, false);
  assert.equal(state.visible, true);
});

test("invalid and negative event offsets never create spurious visibility", () => {
  const initial = INITIAL_CAR_BACK_TO_TOP_SCROLL_STATE;
  assert.deepEqual(updateCarBackToTopScroll(initial, Number.NaN), initial);
  assert.deepEqual(updateCarBackToTopScroll(initial, -200), initial);
  assert.equal(updateCarBackToTopScroll(initial, Number.POSITIVE_INFINITY).visible, false);
});
