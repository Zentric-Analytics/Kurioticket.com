import assert from "node:assert/strict";
import test from "node:test";

import { formatDisplayPrice, formatFlightResultCurrency } from "./formatCurrency";
import type { ExchangeRates } from "./exchangeRates";

const rates: ExchangeRates = {
  USD: 1,
  EUR: 0.8,
  NGN: 1500,
};

test("formatDisplayPrice preserves existing convertUsdEstimate behavior", () => {
  const price = formatDisplayPrice({
    amount: 10,
    sourceCurrency: "USD",
    displayCurrency: "NGN",
    convertUsdEstimate: true,
    rates,
    isFallbackRate: false,
  });

  assert.equal(price.formatted, "NGN 15,000.00");
  assert.equal(price.currency, "NGN");
  assert.equal(price.isConvertedEstimate, true);
});

test("formatDisplayPrice converts non-USD sources only when explicitly requested", () => {
  const unchanged = formatDisplayPrice({
    amount: 8,
    sourceCurrency: "EUR",
    displayCurrency: "NGN",
    convertUsdEstimate: true,
    rates,
    isFallbackRate: false,
  });
  const converted = formatDisplayPrice({
    amount: 8,
    sourceCurrency: "EUR",
    displayCurrency: "NGN",
    convertSourceEstimate: true,
    rates,
    isFallbackRate: false,
  });

  assert.equal(unchanged.currency, "EUR");
  assert.equal(unchanged.isConvertedEstimate, false);
  assert.equal(converted.formatted, "NGN 15,000.00");
  assert.equal(converted.currency, "NGN");
  assert.equal(converted.isConvertedEstimate, true);
});

test("formatDisplayPrice retains provider amount and currency when conversion fails", () => {
  const price = formatDisplayPrice({
    amount: 8,
    sourceCurrency: "EUR",
    displayCurrency: "GBP",
    convertSourceEstimate: true,
    rates,
    isFallbackRate: false,
  });

  assert.equal(price.currency, "EUR");
  assert.equal(price.formatted, "€8.00");
  assert.equal(price.providerFormatted, "€8.00");
  assert.equal(price.isConvertedEstimate, false);
});

test("formatDisplayPrice exposes truthful converted title and aria-label metadata", () => {
  const price = formatDisplayPrice({
    amount: 8,
    sourceCurrency: "EUR",
    displayCurrency: "NGN",
    convertSourceEstimate: true,
    rates,
    isFallbackRate: false,
  });

  assert.match(price.title ?? "", /Converted display estimate/);
  assert.match(price.title ?? "", /Provider price: €8.00/);
  assert.match(price.ariaLabel, /Display estimate converted from €8.00/);
  assert.equal(price.providerFormatted, "€8.00");
});

test("formatDisplayPrice does not describe same-currency formatting as converted", () => {
  const price = formatDisplayPrice({
    amount: 8,
    sourceCurrency: "EUR",
    displayCurrency: "EUR",
    convertSourceEstimate: true,
    rates,
    isFallbackRate: false,
  });

  assert.equal(price.formatted, "€8.00");
  assert.equal(price.isConvertedEstimate, false);
  assert.equal(price.title, undefined);
});

test("formatDisplayPrice reflects fallback-rate state in explanatory metadata", () => {
  const price = formatDisplayPrice({
    amount: 10,
    sourceCurrency: "USD",
    displayCurrency: "NGN",
    convertUsdEstimate: true,
    rates,
    isFallbackRate: true,
  });

  assert.equal(price.isFallbackRate, true);
  assert.match(price.title ?? "", /Emergency fallback rates/);
  assert.match(price.supportingText ?? "", /Emergency fallback rates/);
});

test("Flight Results uses the native canonical symbols", () => {
  assert.match(formatFlightResultCurrency(10, "NGN", { maximumFractionDigits: 0 }), /^₦\s?10$/);
  for (const currency of ["USD", "CAD", "AUD"]) {
    assert.match(formatFlightResultCurrency(10, currency, { maximumFractionDigits: 0 }), /^\$\s?10$/);
  }
  assert.match(formatFlightResultCurrency(10, "GBP", { maximumFractionDigits: 0 }), /^£\s?10$/);
  assert.match(formatFlightResultCurrency(10, "EUR", { maximumFractionDigits: 0 }), /^€\s?10$/);
});

test("Flight Results preserves provider truth while converting EUR and GBP to NGN", () => {
  const withGbp = { ...rates, GBP: 0.5 };
  for (const [sourceCurrency, amount] of [["EUR", 8], ["GBP", 5]] as const) {
    const price = formatDisplayPrice({ amount, sourceCurrency, displayCurrency: "NGN", convertSourceEstimate: true, useFlightResultSymbols: true, rates: withGbp, isFallbackRate: true });
    assert.equal(price.currency, "NGN");
    assert.match(price.formatted, /^₦/);
    assert.equal(price.sourceCurrency, sourceCurrency);
    assert.equal(price.isConvertedEstimate, true);
    assert.equal(price.isFallbackRate, true);
    assert.match(price.ariaLabel, /Display estimate converted from/);
  }
});
