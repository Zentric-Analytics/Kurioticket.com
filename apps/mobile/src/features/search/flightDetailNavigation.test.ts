import assert from "node:assert/strict";
import test from "node:test";
import type { FlightResult } from "../../api/travelApi";
import type { DisplayCurrencyResolution, DisplayPrice } from "../currency/displayCurrency";
import { canReuseFlightDetailFare } from "./flightDetailCurrency";
import { buildFlightDetailParams } from "./flightDetailNavigation";

const result = {
  id: "offer-65",
  price: 65,
  currency: "USD",
  airlineLogo: "https://cdn.example/carriers/airline.svg",
} as FlightResult;
const ngnFare: DisplayPrice = {
  amount: 100_000,
  currency: "NGN",
  formatted: "NGN 100,000",
  providerAmount: 65,
  providerCurrency: "USD",
  converted: true,
};
const ngnContext: DisplayCurrencyResolution = {
  preferredCurrency: null,
  detectedCountryCode: "NG",
  localeCountryCode: "US",
  resolvedCurrency: "NGN",
};

test("fresh NGN handoff fields win over stale inherited USD snapshots", () => {
  const params = buildFlightDetailParams({
    searchParams: {
      departureDate: "2026-09-01",
      travelers: "1",
      result: JSON.stringify({ ...result, id: "stale" }),
      displayFare: JSON.stringify({ ...ngnFare, amount: 65, currency: "USD", formatted: "$65" }),
      displayCurrencyContext: JSON.stringify({ ...ngnContext, resolvedCurrency: "USD" }),
    },
    result,
    fare: ngnFare,
    displayCurrencyContext: ngnContext,
  });

  const handedOffResult = JSON.parse(params.result) as FlightResult;
  const handedOffFare = JSON.parse(params.displayFare!) as DisplayPrice;
  const handedOffContext = JSON.parse(params.displayCurrencyContext!) as DisplayCurrencyResolution;
  assert.equal(handedOffResult.id, "offer-65");
  assert.equal(handedOffResult.airlineLogo, "https://cdn.example/carriers/airline.svg");
  assert.equal(handedOffFare.currency, "NGN");
  assert.equal(handedOffFare.providerAmount, 65);
  assert.equal(handedOffFare.formatted, "NGN 100,000");
  assert.equal(handedOffContext.resolvedCurrency, "NGN");
  assert.equal(canReuseFlightDetailFare({
    passedFare: handedOffFare,
    providerAmount: handedOffResult.price,
    providerCurrency: handedOffResult.currency,
    preferredCurrency: null,
  }), true);
  assert.deepEqual(
    Object.keys(params).sort(),
    ["departureDate", "displayCurrencyContext", "displayFare", "result", "travelers"].sort(),
  );
});
