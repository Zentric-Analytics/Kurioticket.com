import assert from "node:assert/strict";
import test from "node:test";

import { calculateCarResultsScrollIndicatorGeometry } from "./carResultsScrollIndicator";

const page = {
  scrollHeight: 5200,
  viewportHeight: 780,
  trackHeight: 760,
};

test("positions the Cars indicator at the exact top, middle, and bottom", () => {
  const top = calculateCarResultsScrollIndicatorGeometry({ ...page, scrollTop: 0 });
  const middle = calculateCarResultsScrollIndicatorGeometry({
    ...page,
    scrollTop: (page.scrollHeight - page.viewportHeight) / 2,
  });
  const bottom = calculateCarResultsScrollIndicatorGeometry({
    ...page,
    scrollTop: page.scrollHeight - page.viewportHeight,
  });

  assert.equal(top.thumbOffset, 0);
  assert.equal(middle.thumbOffset, (page.trackHeight - middle.thumbHeight) / 2);
  assert.equal(bottom.thumbOffset, page.trackHeight - bottom.thumbHeight);
});

test("keeps thumb length stable when only scroll position changes", () => {
  const heights = [0, 1105, 2210, 3315, 4420].map((scrollTop) =>
    calculateCarResultsScrollIndicatorGeometry({ ...page, scrollTop }).thumbHeight,
  );
  assert.deepEqual(new Set(heights), new Set([56]));
});

test("bounds compact thumbs for long, narrow, and tall result pages", () => {
  const longPage = calculateCarResultsScrollIndicatorGeometry({
    scrollTop: 50_000,
    scrollHeight: 100_000,
    viewportHeight: 568,
    trackHeight: 548,
  });
  const tallViewport = calculateCarResultsScrollIndicatorGeometry({
    scrollTop: 0,
    scrollHeight: 2400,
    viewportHeight: 932,
    trackHeight: 912,
  });

  assert.equal(longPage.thumbHeight, 32);
  assert.equal(tallViewport.thumbHeight, 56);
  assert.ok(longPage.thumbOffset >= 0);
});

test("returns finite, non-negative geometry for invalid and clamped inputs", () => {
  const notScrollable = calculateCarResultsScrollIndicatorGeometry({
    scrollTop: Number.NaN,
    scrollHeight: 600,
    viewportHeight: 700,
    trackHeight: 680,
  });
  const clamped = calculateCarResultsScrollIndicatorGeometry({
    scrollTop: Number.POSITIVE_INFINITY,
    ...page,
  });

  assert.deepEqual(notScrollable, {
    thumbHeight: 0,
    thumbOffset: 0,
    scrollProgress: 0,
    maxScroll: 0,
    isScrollable: false,
  });
  assert.equal(clamped.thumbOffset, 0);
  Object.values(clamped).forEach((value) => {
    if (typeof value === "number") assert.ok(Number.isFinite(value) && value >= 0);
  });
});
