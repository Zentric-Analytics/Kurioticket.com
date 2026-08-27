import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPriceByDate,
  calendarIsoFromTimestamp,
  deriveNearbyDateSuggestion,
  getDateWindow,
  initialDateWindowStart,
  shiftCalendarDate,
  rememberVerifiedDateFares,
  verifiedDateFareContextKey,
} from "./dateStripModel";

const visibleDates = ["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20"];

test("maps one known fare only to its authoritative date", () => {
  const prices = buildPriceByDate([{ date: "2026-08-19", amount: 65, formatted: "$65", accessibilityLabel: "65 US dollars" }]);
  assert.deepEqual(visibleDates.map((date) => prices[date]?.formatted), [undefined, undefined, "$65", undefined]);
  assert.equal(prices["2026-08-19"]?.accessibilityLabel, "65 US dollars");
});

const nearbyWindow = ["2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13"];
const prices = (...entries: [string, number][]) => buildPriceByDate(entries.map(([date, amount]) => ({ date, amount })));

test("verified fares leave unsearched nearby dates missing", () => {
  const known = prices(["2026-08-11", 500], ["2026-08-12", 450]);
  assert.equal(known["2026-08-10"], undefined);
  assert.equal(known["2026-08-13"], undefined);
});

test("suggests a lower verified nearby fare with exact savings", () => {
  assert.deepEqual(deriveNearbyDateSuggestion("2026-08-11", nearbyWindow, prices(["2026-08-11", 500], ["2026-08-12", 450])), {
    date: "2026-08-12", price: { amount: 450, formatted: undefined, accessibilityLabel: undefined }, savings: 50,
  });
});

test("does not suggest higher, equal, or a sole known fare", () => {
  assert.equal(deriveNearbyDateSuggestion("2026-08-11", nearbyWindow, prices(["2026-08-11", 450], ["2026-08-12", 500])), null);
  assert.equal(deriveNearbyDateSuggestion("2026-08-11", nearbyWindow, prices(["2026-08-11", 450], ["2026-08-12", 450])), null);
  assert.equal(deriveNearbyDateSuggestion("2026-08-11", nearbyWindow, prices(["2026-08-11", 450])), null);
});

test("chooses the lowest verified fare, then nearest date, then earlier date", () => {
  assert.equal(deriveNearbyDateSuggestion("2026-08-11", nearbyWindow, prices(["2026-08-11", 500], ["2026-08-09", 430], ["2026-08-10", 440], ["2026-08-12", 420]))?.date, "2026-08-12");
  assert.equal(deriveNearbyDateSuggestion("2026-08-11", nearbyWindow, prices(["2026-08-11", 500], ["2026-08-09", 420], ["2026-08-12", 420]))?.date, "2026-08-12");
  assert.equal(deriveNearbyDateSuggestion("2026-08-11", nearbyWindow, prices(["2026-08-11", 500], ["2026-08-10", 420], ["2026-08-12", 420]))?.date, "2026-08-10");
});

test("ignores a cheaper verified date outside the visible window", () => {
  assert.equal(deriveNearbyDateSuggestion("2026-08-11", nearbyWindow, prices(["2026-08-11", 500], ["2026-08-20", 100])), null);
});

test("session memory spans departure dates but changes comparable context", () => {
  const base = { origin: "LOS", destination: "LHR", tripType: "round-trip", departureDate: "2026-08-11", returnDate: "2026-08-20", adults: 1, children: 0, infants: 0, travelers: 1, cabinClass: "economy" };
  const context = verifiedDateFareContextKey(base, "NGN");
  let memory = rememberVerifiedDateFares(undefined, context, [{ date: "2026-08-11", amount: 500 }]);
  const nextDateContext = verifiedDateFareContextKey({ ...base, departureDate: "2026-08-12" }, "NGN");
  assert.equal(nextDateContext, context);
  memory = rememberVerifiedDateFares(memory, nextDateContext, [{ date: "2026-08-12", amount: 450 }]);
  assert.deepEqual(Object.keys(memory.priceByDate).sort(), ["2026-08-11", "2026-08-12"]);
  for (const changed of [
    { ...base, origin: "ABV" }, { ...base, destination: "CDG" }, { ...base, returnDate: "2026-08-21" },
    { ...base, adults: 2, travelers: 2 }, { ...base, children: 1, travelers: 2 }, { ...base, infants: 1, travelers: 2 },
    { ...base, cabinClass: "business" },
  ]) assert.notEqual(verifiedDateFareContextKey(changed, "NGN"), context);
  assert.notEqual(verifiedDateFareContextKey(base, "USD"), context);
  const reset = rememberVerifiedDateFares(memory, verifiedDateFareContextKey({ ...base, origin: "ABV" }, "NGN"), [{ date: "2026-08-12", amount: 300 }]);
  assert.equal(reset.priceByDate["2026-08-11"], undefined);
});

test("a stale authoritative departure date is not eligible for the selected date", () => {
  const selectedDate = "2026-08-12";
  const resultDate = calendarIsoFromTimestamp("2026-08-11T09:00:00Z");
  const candidates = resultDate === selectedDate ? [{ date: resultDate, amount: 450 }] : [];
  assert.deepEqual(buildPriceByDate(candidates), {});
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
