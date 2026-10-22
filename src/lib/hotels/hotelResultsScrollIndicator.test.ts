import assert from "node:assert/strict";
import test from "node:test";

import { calculateHotelResultsScrollIndicatorGeometry } from "./hotelResultsScrollIndicator";

const region = {
  scrollStart: 420,
  scrollEnd: 4620,
  trackHeight: 340,
};

test("positions the Hotel indicator at the exact top, middle, and bottom of the results region", () => {
  const top = calculateHotelResultsScrollIndicatorGeometry({
    ...region,
    scrollTop: region.scrollStart,
  });
  const middle = calculateHotelResultsScrollIndicatorGeometry({
    ...region,
    scrollTop: (region.scrollStart + region.scrollEnd) / 2,
  });
  const bottom = calculateHotelResultsScrollIndicatorGeometry({
    ...region,
    scrollTop: region.scrollEnd,
  });

  assert.equal(top.thumbOffset, 0);
  assert.equal(middle.thumbOffset, (region.trackHeight - middle.thumbHeight) / 2);
  assert.equal(bottom.thumbOffset, region.trackHeight - bottom.thumbHeight);
});

test("does not advance the Hotel indicator before the Track stay price region begins", () => {
  const beforeStart = calculateHotelResultsScrollIndicatorGeometry({
    ...region,
    scrollTop: 0,
  });
  const atStart = calculateHotelResultsScrollIndicatorGeometry({
    ...region,
    scrollTop: region.scrollStart,
  });

  assert.equal(beforeStart.thumbOffset, 0);
  assert.equal(beforeStart.scrollProgress, 0);
  assert.deepEqual(beforeStart, atStart);
});

test("uses a proportional Hotel results thumb without the old fixed cap", () => {
  const geometry = calculateHotelResultsScrollIndicatorGeometry({
    ...region,
    scrollTop: region.scrollStart,
  });
  const expected =
    region.trackHeight *
    (region.trackHeight /
      (region.trackHeight + (region.scrollEnd - region.scrollStart)));

  assert.ok(geometry.thumbHeight >= 24);
  assert.ok(geometry.thumbHeight < 56);
  assert.equal(geometry.thumbHeight, Math.max(24, expected));
});

test("returns finite non-negative geometry for invalid and clamped inputs", () => {
  const notScrollable = calculateHotelResultsScrollIndicatorGeometry({
    scrollTop: Number.NaN,
    scrollStart: 600,
    scrollEnd: 600,
    trackHeight: 340,
  });
  const clamped = calculateHotelResultsScrollIndicatorGeometry({
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
  assert.equal(clamped.thumbOffset, region.trackHeight - clamped.thumbHeight);
  assert.ok(Number.isFinite(clamped.thumbHeight));
  assert.ok(Number.isFinite(clamped.thumbOffset));
});
