import assert from "node:assert/strict";
import test from "node:test";
import {
  getDateWindow,
  initialDateWindowStart,
  shiftCalendarDate,
} from "./dateStripModel";

test("centers the date window on the actual selected date", () => {
  const selected = "2026-08-11";
  const window = getDateWindow(initialDateWindowStart(selected));

  assert.deepEqual(window, [
    "2026-08-09",
    "2026-08-10",
    selected,
    "2026-08-12",
    "2026-08-13",
  ]);
  assert.equal(window.find((iso) => iso === selected), selected);
});

test("moves the visible window without changing the selected date", () => {
  const selected = "2026-08-11";
  const start = initialDateWindowStart(selected);

  assert.equal(shiftCalendarDate(start, 1), "2026-08-10");
  assert.equal(shiftCalendarDate(start, -1), "2026-08-08");
  assert.equal(selected, "2026-08-11");
});

test("calculates dates across month and year boundaries", () => {
  assert.equal(shiftCalendarDate("2026-08-31", 1), "2026-09-01");
  assert.equal(shiftCalendarDate("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftCalendarDate("2027-01-01", -1), "2026-12-31");
});
