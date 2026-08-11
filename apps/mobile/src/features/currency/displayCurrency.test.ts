import assert from "node:assert/strict";
import test from "node:test";
import { currencyForCountry, displayPrice, resolveDisplayCurrency, resolveDisplayCurrencyContext } from "./displayCurrency";

test("country regions resolve to their ISO display currencies", () => {
  assert.equal(currencyForCountry("NG"), "NGN");
  assert.equal(currencyForCountry("US"), "USD");
  assert.equal(currencyForCountry("GB"), "GBP");
  assert.equal(currencyForCountry("CA"), "CAD");
});

test("an explicit saved currency overrides the country currency", () => {
  assert.equal(resolveDisplayCurrency({ preferredCurrency: "USD", countryCode: "NG" }), "USD");
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
  assert.equal(fare.formatted, "$604");
  assert.equal(fare.converted, false);
});
