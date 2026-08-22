import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPriceByDate,
  calendarIsoFromTimestamp,
  getDateWindow,
  initialDateWindowStart,
  shiftCalendarDate,
} from "./dateStripModel";

const visibleDates = ["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20"];

test("maps one known fare only to its authoritative date", () => {
  const prices = buildPriceByDate([{ date: "2026-08-19", amount: 65, formatted: "$65", accessibilityLabel: "65 US dollars" }]);
  assert.deepEqual(visibleDates.map((date) => prices[date]?.formatted), [undefined, undefined, "$65", undefined]);
  assert.equal(prices["2026-08-19"]?.accessibilityLabel, "65 US dollars");
});

test("changing the searched date moves its fare by date rather than position", () => {
  const prices = buildPriceByDate([{ date: "2026-08-20", amount: 65, formatted: "$65" }]);
  assert.deepEqual(visibleDates.map((date) => prices[date]?.formatted), [undefined, undefined, undefined, "$65"]);
});

test("moving the visible window cannot move a fare to another date", () => {
  const prices = buildPriceByDate([{ date: "2026-08-19", amount: 65, formatted: "$65" }]);
  assert.deepEqual(["2026-08-18", "2026-08-19", "2026-08-20"].map((date) => prices[date]?.amount), [undefined, 65, undefined]);
});

test("preserves fares for every priced date and their formatted values", () => {
  const prices = buildPriceByDate(visibleDates.map((date, index) => ({ date, amount: 64 + index, formatted: `USD ${64 + index}` })));
  assert.deepEqual(visibleDates.map((date) => prices[date]?.formatted), ["USD 64", "USD 65", "USD 66", "USD 67"]);
});

test("preserves a partially priced window without filling its gaps", () => {
  const prices = buildPriceByDate([
    { date: "2026-08-17", amount: 64 },
    { date: "2026-08-19", amount: 65 },
    { date: "2026-08-20", amount: 71 },
  ]);
  assert.deepEqual(visibleDates.map((date) => prices[date]?.amount), [64, undefined, 65, 71]);
});

test("uses the lowest real fare for a date and extracts the provider departure date", () => {
  assert.equal(calendarIsoFromTimestamp("2026-08-19T23:30:00-04:00"), "2026-08-19");
  const prices = buildPriceByDate([{ date: "2026-08-19", amount: 90 }, { date: "2026-08-19", amount: 65, formatted: "€60" }]);
  assert.deepEqual(prices["2026-08-19"], { amount: 65, formatted: "€60", accessibilityLabel: undefined });
});

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
