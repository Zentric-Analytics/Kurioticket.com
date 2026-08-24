import assert from "node:assert/strict";
import test from "node:test";
import { currencyForCountry, displayPrice, formatCurrency, isDisplayPriceCurrent, resolveDisplayCurrency, resolveDisplayCurrencyContext } from "./displayCurrency";

test("fare formatting uses compact symbols while keeping dollar currencies unambiguous", () => {
  assert.equal(formatCurrency(158811, "NGN"), "₦158,811");
  assert.equal(formatCurrency(420, "USD"), "US$420");
  assert.equal(formatCurrency(420, "CAD"), "CA$420");
  assert.equal(formatCurrency(420, "AUD"), "A$420");
  assert.equal(formatCurrency(1240, "GBP"), "£1,240");
  assert.equal(formatCurrency(980, "EUR"), "€980");
});

test("display fares include a spoken currency name without duplicating visual copy", () => {
  const fare = displayPrice(158811, "NGN", "NGN", { NGN: 1 });
  assert.equal(fare.formatted, "₦158,811");
  assert.match(fare.accessibilityLabel, /158,811 Nigerian nairas?/);
});

test("country regions resolve to their ISO display currencies", () => {
  assert.equal(currencyForCountry("NG"), "NGN");
  assert.equal(currencyForCountry("US"), "USD");
  assert.equal(currencyForCountry("GB"), "GBP");
  assert.equal(currencyForCountry("CA"), "CAD");
});

test("an explicit saved currency overrides the country currency", () => {
  assert.equal(resolveDisplayCurrency({ preferredCurrency: "USD", countryCode: "NG" }), "USD");
  assert.equal(resolveDisplayCurrency({ preferredCurrency: "EUR", countryCode: "NG" }), "EUR");
});

test("a passed fare is current only for the resolved display currency", () => {
  const ngnFare = displayPrice(604, "USD", "NGN", { USD: 1, NGN: 1600 });
  assert.equal(isDisplayPriceCurrent(ngnFare, 604, "USD", "NGN"), true);
  assert.equal(isDisplayPriceCurrent(ngnFare, 604, "USD", "EUR"), false);
  assert.equal(isDisplayPriceCurrent(ngnFare, 604, "USD", "USD"), false);

  const rates = { USD: 1, EUR: 0.9, NGN: 1600 };
  assert.equal(displayPrice(604, "USD", "EUR", rates).currency, "EUR");
  assert.equal(displayPrice(965000, "NGN", "USD", rates).currency, "USD");
  assert.equal(isDisplayPriceCurrent(null, 604, "USD", "EUR"), false);
});

test("a passed fare must still describe the authoritative provider fare", () => {
  const fare = displayPrice(604, "USD", "EUR", { USD: 1, EUR: 0.9 });
  assert.equal(isDisplayPriceCurrent(fare, 605, "USD", "EUR"), false);
  assert.equal(isDisplayPriceCurrent(fare, 604, "GBP", "EUR"), false);
});

test("display currency follows preference, IP country, locale, then USD priority", () => {
  const resolve = (preferredCurrency: string | null, ipCountryCode: string | null, locale: string) =>
    resolveDisplayCurrencyContext({ preferredCurrency, ipCountryCode, locale }).resolvedCurrency;

  assert.equal(resolve(null, "NG", "en-US"), "NGN");
  assert.equal(resolve("USD", "NG", "en-US"), "USD");
  assert.equal(resolve(null, null, "en-NG"), "NGN");
  assert.equal(resolve(null, null, "en-US"), "USD");
  assert.equal(resolve(null, "GB", "en-US"), "GBP");
  assert.equal(resolve(null, "CA", "en-US"), "CAD");
});

test("currency resolution diagnostics expose each decision input", () => {
  assert.deepEqual(resolveDisplayCurrencyContext({
    preferredCurrency: null,
    ipCountryCode: "ng",
    locale: "en-US",
  }), {
    preferredCurrency: null,
    detectedCountryCode: "NG",
    localeCountryCode: "US",
    resolvedCurrency: "NGN",
  });
});

test("same-currency provider prices do not convert", () => {
  const fare = displayPrice(965000, "NGN", "NGN", { USD: 1, NGN: 1600 });
  assert.equal(fare.amount, 965000);
  assert.equal(fare.currency, "NGN");
  assert.equal(fare.converted, false);
});

test("provider prices convert through current USD-based rates without mutation", () => {
  const result = { price: 604, currency: "USD" };
  const fare = displayPrice(result.price, result.currency, "NGN", { USD: 1, NGN: 1600 });
  assert.equal(fare.amount, 966400);
  assert.equal(fare.currency, "NGN");
  assert.match(fare.formatted, /₦\s?966,400/);
  assert.deepEqual(result, { price: 604, currency: "USD" });
});

test("a missing rate falls back accurately to the provider currency", () => {
  const fare = displayPrice(604, "USD", "NGN", { USD: 1 });
  assert.equal(fare.amount, 604);
  assert.equal(fare.currency, "USD");
  assert.equal(fare.formatted, "US$604");
  assert.equal(fare.converted, false);
});
