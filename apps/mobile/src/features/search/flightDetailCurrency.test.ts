import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveDisplayCurrencyContext, type DisplayPrice } from "../currency/displayCurrency";
import {
  canReuseFlightDetailFare,
  createFlightDetailFare,
  flightDetailFareReuseDecision,
} from "./flightDetailCurrency";

const passedNgnFare: DisplayPrice = {
  amount: 92_720,
  currency: "NGN",
  formatted: "NGN 92,720",
  accessibilityLabel: "92,720 Nigerian nairas",
  providerAmount: 67,
  providerCurrency: "USD",
  converted: true,
};
const rates = { USD: 1, NGN: 1383.8806, EUR: 0.9 };

test("keeps the Results NGN snapshot when Details location fails with en-US locale", () => {
  // Automatic location is deliberately absent. A new automatic resolution would be USD.
  const freshResolution = resolveDisplayCurrencyContext({
    preferredCurrency: null,
    ipCountryCode: null,
    locale: "en-US",
  });
  assert.equal(freshResolution.resolvedCurrency, "USD");
  assert.equal(canReuseFlightDetailFare({
    passedFare: passedNgnFare,
    providerAmount: 67,
    providerCurrency: "USD",
    preferredCurrency: null,
  }), true);
  assert.equal(passedNgnFare.formatted, "NGN 92,720");
  assert.notEqual(passedNgnFare.formatted, "$67");
});

test("keeps the Results NGN snapshot when automatic Nigeria detection still succeeds", () => {
  assert.equal(resolveDisplayCurrencyContext({
    preferredCurrency: null,
    ipCountryCode: "NG",
    locale: "en-US",
  }).resolvedCurrency, "NGN");
  assert.equal(canReuseFlightDetailFare({
    passedFare: passedNgnFare, providerAmount: 67, providerCurrency: "USD", preferredCurrency: null,
  }), true);
});

test("a new explicit EUR preference replaces the passed NGN fare", () => {
  assert.equal(canReuseFlightDetailFare({
    passedFare: passedNgnFare, providerAmount: 67, providerCurrency: "USD", preferredCurrency: "EUR",
  }), false);
  const fare = createFlightDetailFare(67, "USD", "EUR", rates);
  assert.equal(fare?.currency, "EUR");
  assert.equal(fare?.amount, 60.300000000000004);
});

test("a new explicit USD preference replaces the passed NGN fare", () => {
  assert.equal(canReuseFlightDetailFare({
    passedFare: passedNgnFare, providerAmount: 67, providerCurrency: "USD", preferredCurrency: "USD",
  }), false);
  assert.deepEqual(createFlightDetailFare(67, "USD", "USD", {}), {
    amount: 67,
    currency: "USD",
    formatted: "US$67",
    accessibilityLabel: "67 US dollars",
    providerAmount: 67,
    providerCurrency: "USD",
    converted: false,
  });
});

test("missing EUR rates produce a placeholder decision, never provider USD", () => {
  assert.equal(createFlightDetailFare(67, "USD", "EUR", { USD: 1 }), null);
});

test("provider identity must match before a passed fare can be reused", () => {
  assert.equal(canReuseFlightDetailFare({
    passedFare: passedNgnFare, providerAmount: 68, providerCurrency: "USD", preferredCurrency: null,
  }), false);
  assert.equal(canReuseFlightDetailFare({
    passedFare: passedNgnFare, providerAmount: 67, providerCurrency: "EUR", preferredCurrency: null,
  }), false);
});

test("fare reuse decisions explain every rejection", () => {
  const input = { providerAmount: 67, providerCurrency: "USD", preferredCurrency: null };
  assert.equal(flightDetailFareReuseDecision({ ...input, passedFare: null }), "missing fare");
  assert.equal(flightDetailFareReuseDecision({ ...input, passedFare: { ...passedNgnFare, providerAmount: 68 } }), "provider amount mismatch");
  assert.equal(flightDetailFareReuseDecision({ ...input, passedFare: { ...passedNgnFare, providerCurrency: "EUR" } }), "provider currency mismatch");
  assert.equal(flightDetailFareReuseDecision({ ...input, passedFare: passedNgnFare, preferredCurrency: "EUR" }), "explicit preference mismatch");
  assert.equal(flightDetailFareReuseDecision({ ...input, passedFare: passedNgnFare }), "valid");
});

test("direct Saved-flight entry resolves Nigeria and explicit EUR normally", () => {
  const automatic = resolveDisplayCurrencyContext({
    preferredCurrency: null, ipCountryCode: "NG", locale: "en-US",
  });
  const explicit = resolveDisplayCurrencyContext({
    preferredCurrency: "EUR", ipCountryCode: "NG", locale: "en-US",
  });
  assert.equal(createFlightDetailFare(67, "USD", automatic.resolvedCurrency, rates)?.currency, "NGN");
  assert.equal(createFlightDetailFare(67, "USD", explicit.resolvedCurrency, rates)?.currency, "EUR");
});

test("both booking areas use the one shared formatted fare", () => {
  const detailScreen = readFileSync(new URL("./ApprovedDetailScreen.tsx", import.meta.url).pathname, "utf8");
  const flightDetail = detailScreen.slice(
    detailScreen.indexOf("function FlightDetail"),
    detailScreen.indexOf("function HotelDetail"),
  );
  assert.equal(flightDetail.match(/\{formattedFare\}/g)?.length, 2);
  assert.doesNotMatch(flightDetail, /money\(result\.currency, result\.price\)/);
});

test("Results uses the collision-safe navigation contract", () => {
  const resultsScreen = readFileSync(new URL("./ApprovedResultsScreen.tsx", import.meta.url).pathname, "utf8");
  assert.match(resultsScreen, /params: buildFlightDetailParams\(\{ searchParams: params, result, fare, displayCurrencyContext \}\)/);
});
