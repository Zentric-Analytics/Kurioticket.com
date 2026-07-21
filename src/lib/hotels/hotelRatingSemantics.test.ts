import assert from "node:assert/strict";
import test from "node:test";

import {
  getHotelComparableReviewScore,
  getHotelReviewBand,
  normalizeHotelClassificationStars,
  normalizeHotelReviewCount,
  normalizeHotelReviewScale,
  normalizeHotelReviewScore,
  normalizeHotelReviewSource,
} from "./hotelRatingSemantics";

test("classification stars require exact finite integers from one through five", () => {
  for (const value of [1, 2, 3, 4, 5] as const) assert.equal(normalizeHotelClassificationStars(value), value);
  for (const value of [4.6, 0, -1, 6, Number.NaN, Infinity, "4"]) assert.equal(normalizeHotelClassificationStars(value), undefined);
});

test("review scales are explicitly five or ten", () => {
  assert.equal(normalizeHotelReviewScale(5), 5);
  assert.equal(normalizeHotelReviewScale(10), 10);
  for (const value of [4, 6, "5", "10"]) assert.equal(normalizeHotelReviewScale(value), undefined);
});

test("review scores must fit their declared scale", () => {
  for (const [score, scale] of [[4.6, 5], [5, 5], [8.6, 10], [10, 10]]) assert.equal(normalizeHotelReviewScore(score, scale), score);
  for (const [score, scale] of [[5.1, 5], [10.1, 10], [4.6, undefined], [-1, 5], [Number.NaN, 5], [Infinity, 10]]) assert.equal(normalizeHotelReviewScore(score, scale), undefined);
});

test("review bands are proportional and retain default ten-point compatibility", () => {
  assert.equal(getHotelReviewBand(4.5, 5), "exceptional");
  assert.equal(getHotelReviewBand(4, 5), "veryGood");
  assert.equal(getHotelReviewBand(3.5, 5), "good");
  assert.equal(getHotelReviewBand(3, 5), "pleasant");
  assert.equal(getHotelReviewBand(9, 10), "exceptional");
  assert.equal(getHotelReviewBand(8, 10), "veryGood");
  assert.equal(getHotelReviewBand(7, 10), "good");
  assert.equal(getHotelReviewBand(6, 10), "pleasant");
  assert.equal(getHotelReviewBand(8), "veryGood");
});

test("comparable review scores use a ten-point scale", () => {
  assert.equal(getHotelComparableReviewScore({ reviewScore: 4.5, reviewScale: 5 }), 9);
  assert.equal(getHotelComparableReviewScore({ reviewScore: 8.5, reviewScale: 10 }), 8.5);
  assert.equal(getHotelComparableReviewScore({ reviewScore: 4.5 }), null);
  assert.equal(getHotelComparableReviewScore({ reviewScore: 11, reviewScale: 10 }), null);
});

test("review sources are normalized without being fabricated", () => {
  assert.equal(normalizeHotelReviewSource("  Google   Maps \n"), "Google Maps");
  assert.equal(normalizeHotelReviewSource("   "), undefined);
  assert.equal(normalizeHotelReviewSource("x".repeat(121)), undefined);
});

test("review counts floor valid values", () => {
  assert.equal(normalizeHotelReviewCount(12.9), 12);
  assert.equal(normalizeHotelReviewCount(-1), undefined);
  assert.equal(normalizeHotelReviewCount(Infinity), undefined);
});
