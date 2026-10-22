import assert from "node:assert/strict";
import test from "node:test";
import {
  compareFlightPrices,
  getComparableFlightPrice,
  getComparableFlightPriceBounds,
  getLowestComparableFlightFare,
} from "./flightResultPrices";

const rates = { USD: 1, EUR: 0.8, GBP: 0.5, NGN: 1_000 };
const flight = (price: number, currency: string) => ({ price, currency });

test("normalizes supported provider currencies into the selected display currency", () => {
  assert.deepEqual(getComparableFlightPrice(flight(600, "USD"), "NGN", rates), { amount: 600_000, currency: "NGN" });
  assert.deepEqual(getComparableFlightPrice(flight(550, "EUR"), "NGN", rates), { amount: 687_500, currency: "NGN" });
  assert.deepEqual(getComparableFlightPrice(flight(300, "GBP"), "NGN", rates), { amount: 600_000, currency: "NGN" });
  assert.deepEqual(getComparableFlightPrice(flight(700_000, "NGN"), "NGN", rates), { amount: 700_000, currency: "NGN" });
});

test("cheapest comparison and filter bounds share normalized prices", () => {
  const flights = [flight(550, "EUR"), flight(600, "USD"), flight(700_000, "NGN")];
  assert.deepEqual([...flights].sort((a, b) => compareFlightPrices(a, b, "NGN", rates)), [flights[1], flights[0], flights[2]]);
  assert.deepEqual(getComparableFlightPriceBounds(flights, "NGN", rates), { min: 600_000, max: 700_000 });
});

test("missing rates are never treated as directly comparable raw amounts", () => {
  assert.equal(getComparableFlightPrice(flight(1, "XYZ"), "NGN", rates), null);
  assert.equal(compareFlightPrices(flight(600, "USD"), flight(1, "XYZ"), "NGN", rates), -1);
  assert.equal(compareFlightPrices(flight(1, "XYZ"), flight(2, "ABC"), "NGN", rates), 0);
});


test("selects the true lowest nearby fare after currency normalization", () => {
  const fares = [flight(100, "EUR"), flight(110, "USD")];
  assert.equal(getLowestComparableFlightFare(fares, "USD", rates), fares[1]);
});

test("ignores nearby fares that cannot be normalized instead of comparing raw amounts", () => {
  const fares = [flight(1, "XYZ"), flight(110, "USD")];
  assert.equal(getLowestComparableFlightFare(fares, "USD", rates), fares[1]);
});
