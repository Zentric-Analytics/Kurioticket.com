import assert from "node:assert/strict";
import test from "node:test";

import {
  convertCurrencyAmount,
  fallbackExchangeRatesFromUsd,
  type ExchangeRates,
} from "./exchangeRates";

const testRates: ExchangeRates = {
  USD: 1,
  EUR: 0.8,
  NGN: 1500,
};

test("convertCurrencyAmount converts USD to NGN", () => {
  assert.equal(convertCurrencyAmount(10, "USD", "NGN", testRates), 15000);
});

test("convertCurrencyAmount converts EUR to NGN through USD-based rates", () => {
  assert.equal(convertCurrencyAmount(8, "EUR", "NGN", testRates), 15000);
});

test("convertCurrencyAmount converts NGN to EUR through USD-based rates", () => {
  assert.equal(convertCurrencyAmount(15000, "NGN", "EUR", testRates), 8);
});

test("convertCurrencyAmount returns original amount when source equals target", () => {
  assert.equal(convertCurrencyAmount(123, "USD", "USD", testRates), 123);
});

test("convertCurrencyAmount normalizes lowercase currency codes", () => {
  assert.equal(convertCurrencyAmount(8, "eur", "ngn", testRates), 15000);
});

test("convertCurrencyAmount returns null for missing source rate", () => {
  assert.equal(convertCurrencyAmount(8, "GBP", "NGN", testRates), null);
});

test("convertCurrencyAmount returns null for missing target rate", () => {
  assert.equal(convertCurrencyAmount(8, "EUR", "GBP", testRates), null);
});

test("convertCurrencyAmount returns null for zero or invalid rates", () => {
  assert.equal(convertCurrencyAmount(8, "EUR", "NGN", { ...testRates, EUR: 0 }), null);
  assert.equal(convertCurrencyAmount(8, "EUR", "NGN", { ...testRates, NGN: Number.NaN }), null);
  assert.equal(convertCurrencyAmount(8, "EUR", "NGN", { ...testRates, NGN: -1 }), null);
});

test("convertCurrencyAmount returns null for non-finite amount", () => {
  assert.equal(convertCurrencyAmount(Number.POSITIVE_INFINITY, "USD", "NGN", testRates), null);
});

test("convertCurrencyAmount does not mutate the original rate table", () => {
  const before = structuredClone(fallbackExchangeRatesFromUsd);

  convertCurrencyAmount(8, "EUR", "NGN", fallbackExchangeRatesFromUsd);

  assert.deepEqual(fallbackExchangeRatesFromUsd, before);
});
