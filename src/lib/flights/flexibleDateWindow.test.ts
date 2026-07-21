import assert from "node:assert/strict";
import { test } from "node:test";

import { getDateWindowStart } from "./flexibleDateWindow";

test("positions the selected date in the third visible slot when possible", () => {
  assert.equal(
    getDateWindowStart({ selectedIndex: 6, totalDates: 14, visibleCount: 7 }),
    4,
  );
});

test("clamps to the beginning of the date range", () => {
  assert.equal(
    getDateWindowStart({ selectedIndex: 0, totalDates: 14, visibleCount: 7 }),
    0,
  );
  assert.equal(
    getDateWindowStart({ selectedIndex: 1, totalDates: 14, visibleCount: 7 }),
    0,
  );
});

test("clamps to the end of the date range", () => {
  assert.equal(
    getDateWindowStart({ selectedIndex: 13, totalDates: 14, visibleCount: 7 }),
    7,
  );
});

test("returns zero for invalid or empty input", () => {
  assert.equal(
    getDateWindowStart({ selectedIndex: -1, totalDates: 14, visibleCount: 7 }),
    0,
  );
  assert.equal(
    getDateWindowStart({ selectedIndex: 0, totalDates: 0, visibleCount: 7 }),
    0,
  );
});
