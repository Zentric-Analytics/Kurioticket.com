import assert from "node:assert/strict";
import test from "node:test";
import type { DealsFlightItineraryV2 } from "./dealsTripPlanV2";
import {
  deriveDealsOutboundDisplayPricesV2,
  getComparableDealsOutboundPriceV2,
} from "./dealsOutboundDisplayPriceV2";

const choice = (
  key: string,
  amount?: number,
  currency?: string,
): DealsFlightItineraryV2 => ({
  itineraryKey: key,
  direction: "outbound",
  originAirport: "LOS",
  destinationAirport: "LHR",
  departureTime: "2027-02-01T08:30:00+01:00",
  arrivalTime: "2027-02-01T18:30:00-05:00",
  duration: "10h",
  durationMinutes: 600,
  stops: 0,
  layovers: [],
  segments: [],
  ...(amount === undefined
    ? {}
    : { indicativeFromPrice: amount, indicativeCurrency: currency }),
});

test("derives converted display estimates while preserving provider context", () => {
  const prices = deriveDealsOutboundDisplayPricesV2({
    choices: [choice("flight", 1_000, "USD")],
    displayCurrency: "NGN",
    rates: { USD: 1, NGN: 1_600 },
    isFallbackRate: false,
  });
  const price = prices.get("flight")!;
  assert.equal(price.amount, 1_600_000);
  assert.equal(price.currency, "NGN");
  assert.equal(price.sourceCurrency, "USD");
  assert.match(price.providerFormatted, /1,000/);
  assert.equal(price.isConvertedEstimate, true);
  assert.match(price.ariaLabel, /converted from/i);
});

test("normalizes different sources for comparable cheapest sorting", () => {
  const prices = deriveDealsOutboundDisplayPricesV2({
    choices: [
      choice("usd", 100, "USD"),
      choice("eur", 90, "EUR"),
      choice("missing"),
    ],
    displayCurrency: "NGN",
    rates: { USD: 1, EUR: 0.5, NGN: 1_000 },
    isFallbackRate: false,
  });
  assert.equal(
    getComparableDealsOutboundPriceV2(prices.get("usd"), "NGN"),
    100_000,
  );
  assert.equal(
    getComparableDealsOutboundPriceV2(prices.get("eur"), "NGN"),
    180_000,
  );
  assert.equal(
    getComparableDealsOutboundPriceV2(prices.get("missing"), "NGN"),
    undefined,
  );
});

test("does not expose a failed cross-currency conversion as comparable", () => {
  const price = deriveDealsOutboundDisplayPricesV2({
    choices: [choice("eur", 1, "EUR")],
    displayCurrency: "NGN",
    rates: { USD: 1, NGN: 1_000 },
    isFallbackRate: false,
  }).get("eur");
  assert.equal(price?.currency, "EUR");
  assert.equal(price?.providerFormatted, price?.formatted);
  assert.equal(getComparableDealsOutboundPriceV2(price, "NGN"), undefined);
});
