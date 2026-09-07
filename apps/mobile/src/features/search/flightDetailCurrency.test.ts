import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

test("keeps a valid NGN display snapshot when its provider identity still matches", () => {
  assert.equal(canReuseFlightDetailFare({ passedFare: passedNgnFare, providerAmount: 67, providerCurrency: "USD", preferredCurrency: null }), true);
  assert.equal(passedNgnFare.formatted, "NGN 92,720");
});

test("automatic Nigeria detection resolves NGN", () => {
  assert.equal(resolveDisplayCurrencyContext({ preferredCurrency: null, ipCountryCode: "NG", locale: "en-US" }).resolvedCurrency, "NGN");
});

test("a new explicit EUR preference invalidates a passed NGN fare and converts correctly", () => {
  assert.equal(canReuseFlightDetailFare({ passedFare: passedNgnFare, providerAmount: 67, providerCurrency: "USD", preferredCurrency: "EUR" }), false);
  const fare = createFlightDetailFare(67, "USD", "EUR", rates);
  assert.equal(fare?.currency, "EUR");
  assert.equal(fare?.amount, 60.300000000000004);
});

test("a new explicit USD preference replaces the passed NGN fare", () => {
  assert.equal(canReuseFlightDetailFare({ passedFare: passedNgnFare, providerAmount: 67, providerCurrency: "USD", preferredCurrency: "USD" }), false);
  assert.deepEqual(createFlightDetailFare(67, "USD", "USD", {}), {
    amount: 67,
    currency: "USD",
    formatted: "$67",
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
  assert.equal(canReuseFlightDetailFare({ passedFare: passedNgnFare, providerAmount: 68, providerCurrency: "USD", preferredCurrency: null }), false);
  assert.equal(canReuseFlightDetailFare({ passedFare: passedNgnFare, providerAmount: 67, providerCurrency: "EUR", preferredCurrency: null }), false);
});

test("fare reuse decisions explain every rejection", () => {
  const input = { providerAmount: 67, providerCurrency: "USD", preferredCurrency: null };
  assert.equal(flightDetailFareReuseDecision({ ...input, passedFare: null }), "missing fare");
  assert.equal(flightDetailFareReuseDecision({ ...input, passedFare: { ...passedNgnFare, providerAmount: 68 } }), "provider amount mismatch");
  assert.equal(flightDetailFareReuseDecision({ ...input, passedFare: { ...passedNgnFare, providerCurrency: "EUR" } }), "provider currency mismatch");
  assert.equal(flightDetailFareReuseDecision({ ...input, passedFare: passedNgnFare, preferredCurrency: "EUR" }), "explicit preference mismatch");
  assert.equal(flightDetailFareReuseDecision({ ...input, passedFare: passedNgnFare }), "valid");
});

test("authoritative Flight Details converts every fare card, deal, and sticky total through one display context", () => {
  const detailScreen = readFileSync(resolve("src/features/search/NativeFlightDetails.tsx"), "utf8");
  assert.match(detailScreen, /const displayPriceFor = useCallback/);
  assert.match(detailScreen, /displayPriceFor\(choice\.offer\.price, choice\.offer\.currency\)/);
  assert.match(detailScreen, /displayPriceFor\(deal\.price, deal\.currency\)/);
  assert.match(detailScreen, /fare\?\.formatted \?\? "—"/);
  assert.doesNotMatch(detailScreen, /choice\.offer\.price\.toFixed|deal\.price\.toFixed/);
});

test("Results uses the authoritative ID-only navigation contract", () => {
  const resultsScreen = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
  assert.match(resultsScreen, /params: buildFlightDetailParams\(\{ searchParams: params, result \}\)/);
  assert.doesNotMatch(resultsScreen, /buildFlightDetailParams\(\{ searchParams: params, result, fare, displayCurrencyContext \}\)/);
});
