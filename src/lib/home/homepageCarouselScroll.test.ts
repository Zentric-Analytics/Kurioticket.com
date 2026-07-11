import assert from "node:assert/strict";
import test from "node:test";

import {
  getCarouselArrowRenderState,
  getLogicalCarouselScrollState,
  hasCarouselAdvancedForward,
} from "./homepageCarouselScroll";

test("logical carousel state handles LTR start, middle, and end", () => {
  assert.deepEqual(getLogicalCarouselScrollState({ scrollLeft: 0, scrollWidth: 1000, clientWidth: 400, direction: "ltr" }), {
    logicalScrollLeft: 0,
    maxScrollLeft: 600,
    canScrollLeft: false,
    canScrollRight: true,
    canScrollPrevious: false,
    canScrollNext: true,
    isAtStart: true,
    isAtEnd: false,
  });
  assert.equal(getLogicalCarouselScrollState({ scrollLeft: 240, scrollWidth: 1000, clientWidth: 400, direction: "ltr" }).canScrollLeft, true);
  assert.deepEqual(getLogicalCarouselScrollState({ scrollLeft: 600, scrollWidth: 1000, clientWidth: 400, direction: "ltr" }), {
    logicalScrollLeft: 600,
    maxScrollLeft: 600,
    canScrollLeft: true,
    canScrollRight: false,
    canScrollPrevious: true,
    canScrollNext: false,
    isAtStart: false,
    isAtEnd: true,
  });
});

test("logical carousel state ignores tiny fractional LTR offsets", () => {
  const state = getLogicalCarouselScrollState({ scrollLeft: 0.75, scrollWidth: 1000, clientWidth: 400, direction: "ltr" });
  assert.equal(state.canScrollLeft, false);
  assert.equal(state.canScrollRight, true);
});

test("logical carousel state normalizes RTL start and movement", () => {
  const rtlStart = getLogicalCarouselScrollState({ scrollLeft: 600, scrollWidth: 1000, clientWidth: 400, direction: "rtl" });
  assert.equal(rtlStart.canScrollLeft, false);
  assert.equal(rtlStart.canScrollRight, true);

  const rtlMovedPositive = getLogicalCarouselScrollState({ scrollLeft: 420, scrollWidth: 1000, clientWidth: 400, direction: "rtl" });
  assert.equal(rtlMovedPositive.canScrollLeft, true);
  assert.equal(rtlMovedPositive.canScrollRight, true);

  const rtlMovedNegative = getLogicalCarouselScrollState({ scrollLeft: -180, scrollWidth: 1000, clientWidth: 400, direction: "rtl" });
  assert.equal(rtlMovedNegative.canScrollLeft, true);
  assert.equal(rtlMovedNegative.canScrollRight, true);
});

test("logical carousel state handles no-overflow rail", () => {
  assert.deepEqual(getLogicalCarouselScrollState({ scrollLeft: 0, scrollWidth: 360, clientWidth: 400, direction: "ltr" }), {
    logicalScrollLeft: 0,
    maxScrollLeft: 0,
    canScrollLeft: false,
    canScrollRight: false,
    canScrollPrevious: false,
    canScrollNext: false,
    isAtStart: true,
    isAtEnd: true,
  });
});

test("previous arrow stays hidden until a successful next-arrow advance", () => {
  const restoredLtr = getLogicalCarouselScrollState({
    scrollLeft: 240,
    scrollWidth: 1000,
    clientWidth: 400,
    direction: "ltr",
  });
  assert.equal(getCarouselArrowRenderState(restoredLtr, false).shouldRenderPreviousArrow, false);
  assert.equal(getCarouselArrowRenderState(restoredLtr, true).shouldRenderPreviousArrow, true);

  const restoredRtl = getLogicalCarouselScrollState({
    scrollLeft: 420,
    scrollWidth: 1000,
    clientWidth: 400,
    direction: "rtl",
  });
  assert.equal(getCarouselArrowRenderState(restoredRtl, false).shouldRenderPreviousArrow, false);
});

test("next-arrow gate is set only after confirmed forward movement", () => {
  const start = getLogicalCarouselScrollState({
    scrollLeft: 0,
    scrollWidth: 1000,
    clientWidth: 400,
    direction: "ltr",
  });
  const moved = getLogicalCarouselScrollState({
    scrollLeft: 320,
    scrollWidth: 1000,
    clientWidth: 400,
    direction: "ltr",
  });
  const unchanged = getLogicalCarouselScrollState({
    scrollLeft: 0,
    scrollWidth: 1000,
    clientWidth: 400,
    direction: "ltr",
  });

  assert.equal(hasCarouselAdvancedForward(start, moved), true);
  assert.equal(hasCarouselAdvancedForward(start, unchanged), false);
  assert.equal(getCarouselArrowRenderState(moved, hasCarouselAdvancedForward(start, moved)).shouldRenderPreviousArrow, true);
});

test("returning to first card and no-overflow rails hide previous arrow", () => {
  const atStart = getLogicalCarouselScrollState({
    scrollLeft: 0,
    scrollWidth: 1000,
    clientWidth: 400,
    direction: "ltr",
  });
  assert.equal(getCarouselArrowRenderState(atStart, true).shouldRenderPreviousArrow, false);

  const noOverflow = getLogicalCarouselScrollState({
    scrollLeft: 0,
    scrollWidth: 360,
    clientWidth: 400,
    direction: "ltr",
  });
  const arrows = getCarouselArrowRenderState(noOverflow, true);
  assert.equal(arrows.shouldRenderPreviousArrow, false);
  assert.equal(arrows.canScrollToNext, false);
});
