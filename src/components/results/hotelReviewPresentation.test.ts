import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getHotelReviewBand,
  getHotelReviewCount,
} from "./hotelReviewPresentation";

describe("getHotelReviewBand", () => {
  const cases: Array<[unknown, ReturnType<typeof getHotelReviewBand>]> = [
    [10, "exceptional"],
    [9, "exceptional"],
    [8.9, "veryGood"],
    [8, "veryGood"],
    [7.9, "good"],
    [7, "good"],
    [6.9, "pleasant"],
    [6, "pleasant"],
    [5.9, "reviewScore"],
    [0, "reviewScore"],
    [undefined, null],
    [null, null],
    ["", null],
    ["8.5", null],
    [NaN, null],
    [Infinity, null],
    [-1, null],
    [10.1, null],
  ];

  for (const [score, expected] of cases) {
    it(`returns ${String(expected)} for ${String(score)}`, () => {
      assert.equal(getHotelReviewBand(score), expected);
    });
  }
});

describe("getHotelReviewCount", () => {
  const cases: Array<[unknown, ReturnType<typeof getHotelReviewCount>]> = [
    [0, 0],
    [1, 1],
    [125, 125],
    [125.9, 125],
    [undefined, null],
    [null, null],
    ["", null],
    ["125", null],
    [NaN, null],
    [Infinity, null],
    [-1, null],
  ];

  for (const [count, expected] of cases) {
    it(`returns ${String(expected)} for ${String(count)}`, () => {
      assert.equal(getHotelReviewCount(count), expected);
    });
  }
});
