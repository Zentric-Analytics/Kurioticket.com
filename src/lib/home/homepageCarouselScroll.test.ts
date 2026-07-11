import assert from "node:assert/strict";
import test from "node:test";

import { getLogicalCarouselScrollState } from "./homepageCarouselScroll";

test("logical carousel state handles LTR start, middle, and end", () => {
  assert.deepEqual(getLogicalCarouselScrollState({ scrollLeft: 0, scrollWidth: 1000, clientWidth: 400, direction: "ltr" }), {
    logicalScrollLeft: 0,
    maxScrollLeft: 600,
    canScrollLeft: false,
    canScrollRight: true,
  });
  assert.equal(getLogicalCarouselScrollState({ scrollLeft: 240, scrollWidth: 1000, clientWidth: 400, direction: "ltr" }).canScrollLeft, true);
  assert.deepEqual(getLogicalCarouselScrollState({ scrollLeft: 600, scrollWidth: 1000, clientWidth: 400, direction: "ltr" }), {
    logicalScrollLeft: 600,
    maxScrollLeft: 600,
    canScrollLeft: true,
    canScrollRight: false,
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
  });
});
