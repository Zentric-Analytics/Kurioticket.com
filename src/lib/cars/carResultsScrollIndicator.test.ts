import assert from "node:assert/strict";
import test from "node:test";

import { calculateCarResultsScrollIndicatorGeometry } from "./carResultsScrollIndicator";

const region = {
  scrollStart: 420,
  scrollEnd: 4620,
  trackHeight: 340,
};

test("positions the Cars indicator at the exact top, middle, and bottom of the results region", () => {
  const top = calculateCarResultsScrollIndicatorGeometry({
    ...region,
    scrollTop: region.scrollStart,
  });
  const middle = calculateCarResultsScrollIndicatorGeometry({
    ...region,
    scrollTop: (region.scrollStart + region.scrollEnd) / 2,
  });
  const bottom = calculateCarResultsScrollIndicatorGeometry({
    ...region,
    scrollTop: region.scrollEnd,
  });

  assert.equal(top.thumbOffset, 0);
  assert.equal(middle.thumbOffset, (region.trackHeight - middle.thumbHeight) / 2);
  assert.equal(bottom.thumbOffset, region.trackHeight - bottom.thumbHeight);
});

test("does not advance the Cars indicator before the Track prices region begins", () => {
  const beforeStart = calculateCarResultsScrollIndicatorGeometry({
    ...region,
    scrollTop: 0,
  });
  const atStart = calculateCarResultsScrollIndicatorGeometry({
    ...region,
    scrollTop: region.scrollStart,
  });

  assert.equal(beforeStart.thumbOffset, 0);
  assert.equal(beforeStart.scrollProgress, 0);
  assert.deepEqual(beforeStart, atStart);
});

test("keeps thumb length stable when only scroll position changes", () => {
  const heights = [0, 420, 1470, 2520, 3570, 4620].map((scrollTop) =>
    calculateCarResultsScrollIndicatorGeometry({ ...region, scrollTop }).thumbHeight,
  );
  assert.equal(new Set(heights).size, 1);
});

test("uses the proportional results-region thumb instead of the old 56px cap", () => {
  const geometry = calculateCarResultsScrollIndicatorGeometry({
    ...region,
    scrollTop: region.scrollStart,
  });
  const expected = region.trackHeight * (region.trackHeight / (region.trackHeight + (region.scrollEnd - region.scrollStart)));

  assert.ok(geometry.thumbHeight >= 24);
  assert.ok(geometry.thumbHeight < 56);
  assert.equal(geometry.thumbHeight, Math.max(24, expected));
});

test("returns finite, non-negative geometry for invalid and clamped inputs", () => {
  const notScrollable = calculateCarResultsScrollIndicatorGeometry({
    scrollTop: Number.NaN,
    scrollStart: 600,
    scrollEnd: 600,
    trackHeight: 340,
  });
  const clamped = calculateCarResultsScrollIndicatorGeometry({
    scrollTop: Number.POSITIVE_INFINITY,
    ...region,
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
