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
  state = updateCarBackToTopScroll(state, 160);
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

test("native Cars reveal is calibrated to the mobile-web result-card depth", () => {
  // The web scroll threshold is document-based (600), but native scrolls only
  // the FlatList below its persistent search and filter controls.
  assert.equal(CAR_BACK_TO_TOP_SCROLL_THRESHOLD, 320);
  let state = updateCarBackToTopScroll(INITIAL_CAR_BACK_TO_TOP_SCROLL_STATE, 319);
  assert.equal(state.visible, false);
  state = updateCarBackToTopScroll(state, 320);
  assert.equal(state.visible, false);
  state = updateCarBackToTopScroll(state, 321);
  assert.equal(state.visible, true);
  state = updateCarBackToTopScroll(state, 320);
  assert.equal(state.visible, false, "the same boundary hides the button when returning upward");
});

test("visibility has one offset threshold regardless of the first visible result", () => {
  let state = INITIAL_CAR_BACK_TO_TOP_SCROLL_STATE;
  // A large first card may still be partially visible at these offsets;
  // neither card geometry nor viewability should override the scroll offset.
  for (const offset of [100, 320, 360, 500, 450, 325, 321, 320, 319, 380]) {
    state = updateCarBackToTopScroll(state, offset);
    assert.equal(state.visible, offset > CAR_BACK_TO_TOP_SCROLL_THRESHOLD, `offset ${offset}`);
  }
});

test("repeated downward and upward swipes do not leave visibility latched", () => {
  let state = INITIAL_CAR_BACK_TO_TOP_SCROLL_STATE;
  for (const offset of [0, 450, 75, 900, 330, 300, 750, 0, 321, 120, 320, 1000]) {
    state = updateCarBackToTopScroll(state, offset);
    assert.equal(state.visible, offset > CAR_BACK_TO_TOP_SCROLL_THRESHOLD, `offset ${offset}`);
    assert.equal(state.returning, false);
  }
});

test("interrupted animated return can settle above threshold and appear normally", () => {
  let state = updateCarBackToTopScroll(INITIAL_CAR_BACK_TO_TOP_SCROLL_STATE, 1400);
  state = beginCarBackToTopReturn(state);
  assert.equal(state.visible, false);
  state = updateCarBackToTopScroll(state, 1000);
  assert.equal(state.returning, true);
  state = updateCarBackToTopScroll(state, 1001 + 5);
  assert.equal(state.returning, false);
  assert.equal(state.visible, true);
  state = updateCarBackToTopScroll(state, 220);
  assert.equal(state.visible, false);
});
