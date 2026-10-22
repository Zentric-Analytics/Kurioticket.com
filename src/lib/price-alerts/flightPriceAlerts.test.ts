import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCanonicalFlightPriceAlertQuery,
  buildAutomaticFlightPriceAlertPayload,
  buildFlightPriceAlertPayload,
  flightPriceAlertDuplicateKey,
  flightAlertDesiredPrice,
  flightAlertDropPercentForTarget,
  MAX_PRICE_ALERT_TARGET,
  matchingAutomaticFlightPriceAlert,
  matchingFlightPriceAlertForControl,
  matchingTargetFlightPriceAlert,
  roundFlightAlertCurrencyAmount,
  selectAutomaticFlightBaseline,
} from "./flightPriceAlerts";

const query = {
  tripType: "round-trip",
  origin: "jfk",
  destination: "lhr",
  departureDate: "2026-08-10",
  returnDate: "2026-08-20",
  adults: 2,
  children: 1,
  infants: 0,
  travelers: 3,
  cabinClass: "economy",
  currency: "usd",
  arbitrary: "excluded",
};

test("canonical flight price alert query normalizes and excludes unsupported fields", () => {
  const parsed = buildCanonicalFlightPriceAlertQuery(query);
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.deepEqual(parsed.data, {
    tripType: "round-trip",
    origin: "JFK",
    destination: "LHR",
    departureDate: "2026-08-10",
    returnDate: "2026-08-20",
    adults: 2,
    children: 1,
    infants: 0,
    travelers: 3,
    cabinClass: "economy",
    currency: "USD",
  });
});

test("one-way canonical query omits return date", () => {
  const parsed = buildCanonicalFlightPriceAlertQuery({ ...query, tripType: "one-way", returnDate: undefined });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal("returnDate" in parsed.data, false);
});

test("premium economy is canonical and participates in duplicate identity", () => {
  const premium = { ...query, cabinClass: "premium-economy" };
  const parsed = buildCanonicalFlightPriceAlertQuery(premium);
  assert.equal(parsed.success, true);
  const economyKey = flightPriceAlertDuplicateKey({ origin: "JFK", destination: "LHR", targetPrice: 499, currency: "USD", query });
  const premiumKey = flightPriceAlertDuplicateKey({ origin: "JFK", destination: "LHR", targetPrice: 499, currency: "USD", query: premium });
  assert.notEqual(economyKey, premiumKey);
});

test("canonical flight price alert query rejects invalid shapes", () => {
  assert.equal(buildCanonicalFlightPriceAlertQuery({ ...query, tripType: "multi-city" }).success, false);
  assert.equal(buildCanonicalFlightPriceAlertQuery({ ...query, tripType: "round-trip", returnDate: undefined }).success, false);
  assert.equal(buildCanonicalFlightPriceAlertQuery({ ...query, returnDate: "2026-08-01" }).success, false);
  assert.equal(buildCanonicalFlightPriceAlertQuery({ ...query, cabinClass: "premium" }).success, false);
  assert.equal(buildCanonicalFlightPriceAlertQuery({ ...query, adults: 0, travelers: 1 }).success, false);
  assert.equal(buildCanonicalFlightPriceAlertQuery({ ...query, currency: "ZZZ" }).success, false);
});

test("flight price alert payload validates target and route currency", () => {
  const payload = buildFlightPriceAlertPayload({ origin: "JFK", destination: "LHR", targetPrice: 499.99, currency: "USD", query });
  assert.equal(payload.type, "FLIGHT");
  assert.equal(payload.currency, "USD");
  assert.equal(payload.query.currency, "USD");
  assert.throws(() => buildFlightPriceAlertPayload({ origin: "JFK", destination: "LHR", targetPrice: 0, currency: "USD", query }));
  assert.throws(() => buildFlightPriceAlertPayload({ origin: "JFK", destination: "LHR", targetPrice: -1, currency: "USD", query }));
  assert.throws(() => buildFlightPriceAlertPayload({ origin: "JFK", destination: "LHR", targetPrice: 1.234, currency: "USD", query }));
  assert.throws(() => buildFlightPriceAlertPayload({ origin: "JFK", destination: "LHR", targetPrice: MAX_PRICE_ALERT_TARGET + 1, currency: "USD", query }));
  assert.throws(() => buildFlightPriceAlertPayload({ origin: "JFK", destination: "LHR", targetPrice: 499, currency: "EUR", query }));
});

test("duplicate key includes target price and canonical search fields", () => {
  const first = flightPriceAlertDuplicateKey({ origin: "JFK", destination: "LHR", targetPrice: "499.00", currency: "USD", query });
  const same = flightPriceAlertDuplicateKey({ origin: "JFK", destination: "LHR", targetPrice: "499", currency: "USD", query });
  const differentTarget = flightPriceAlertDuplicateKey({ origin: "JFK", destination: "LHR", targetPrice: "500.00", currency: "USD", query });
  const differentRoute = flightPriceAlertDuplicateKey({ origin: "JFK", destination: "CDG", targetPrice: "499.00", currency: "USD", query: { ...query, destination: "CDG" } });
  assert.equal(first, same);
  assert.notEqual(first, differentTarget);
  assert.notEqual(first, differentRoute);
});

test("automatic payload persists a positive provider-currency baseline", () => {
  const payload = buildAutomaticFlightPriceAlertPayload({ origin: "JFK", destination: "LHR", baselinePrice: 612.5, currency: "EUR", query });
  assert.equal(payload.mode, "AUTOMATIC");
  assert.equal(payload.baselinePrice, 612.5);
  assert.equal(payload.currency, "EUR");
  assert.equal(payload.query.currency, "EUR");
  assert.equal("targetPrice" in payload, false);
  assert.throws(() => buildAutomaticFlightPriceAlertPayload({ origin: "JFK", destination: "LHR", baselinePrice: 0, currency: "EUR", query }));
});

test("automatic duplicate identity is canonical and separate from target alerts", () => {
  const automatic = flightPriceAlertDuplicateKey({ origin: "JFK", destination: "LHR", targetPrice: null, mode: "AUTOMATIC", currency: "USD", query });
  const same = flightPriceAlertDuplicateKey({ origin: "JFK", destination: "LHR", targetPrice: null, mode: "AUTOMATIC", currency: "USD", query: { ...query, arbitrary: "changed" } });
  const target = flightPriceAlertDuplicateKey({ origin: "JFK", destination: "LHR", targetPrice: 499, mode: "TARGET", currency: "USD", query });
  assert.equal(automatic, same);
  assert.notEqual(automatic, target);
});

test("automatic switch matching ignores target alerts and display-currency changes", () => {
  const automatic = { type: "FLIGHT", mode: "AUTOMATIC" as const, status: "PAUSED", query: { ...query, currency: "EUR" } };
  const target = { type: "FLIGHT", mode: "TARGET" as const, status: "ACTIVE", query };
  assert.equal(matchingAutomaticFlightPriceAlert([target, automatic], query), automatic);
});

test("baseline selection uses live provider inventory and never compares unlike currencies", () => {
  const fares = [
    { price: 100, currency: "EUR", provider: "Duffel" },
    { price: 120, currency: "USD", provider: "Duffel" },
    { price: 90, currency: "USD", provider: "Duffel" },
    { price: 1, currency: "USD", provider: "KAYAK sandbox" },
  ];
  assert.equal(selectAutomaticFlightBaseline(fares, "USD")?.price, 90);
  assert.equal(selectAutomaticFlightBaseline(fares, "NGN")?.currency, "EUR");
});

test("flight target math applies bounded percentages and currency fraction digits", () => {
  assert.equal(flightAlertDesiredPrice(350, 10, "USD"), 315);
  assert.equal(flightAlertDesiredPrice(999, 10, "JPY"), 899);
  assert.equal(roundFlightAlertCurrencyAmount(12.345, "USD"), 12.35);
  assert.equal(roundFlightAlertCurrencyAmount(12.5, "JPY"), 13);
  assert.equal(flightAlertDesiredPrice(100, 0, "USD"), 99);
  assert.equal(flightAlertDesiredPrice(100, 80, "USD"), 50);
  assert.equal(flightAlertDropPercentForTarget(350, 315), 10);
});

test("target matching uses the complete search identity and deterministically preserves legacy automatic alerts", () => {
  const pausedTarget = { id: "target-paused", type: "FLIGHT", mode: "TARGET" as const, status: "PAUSED", query };
  const activeTarget = { ...pausedTarget, id: "target-active", status: "ACTIVE" };
  const activeAutomatic = { ...pausedTarget, id: "automatic-active", mode: "AUTOMATIC" as const, status: "ACTIVE" };
  assert.equal(matchingTargetFlightPriceAlert([pausedTarget, activeTarget], query)?.id, "target-active");
  assert.equal(matchingFlightPriceAlertForControl([activeAutomatic, activeTarget], query)?.id, "target-active");
  assert.equal(matchingFlightPriceAlertForControl([pausedTarget, activeAutomatic], query)?.id, "automatic-active");
  assert.equal(matchingTargetFlightPriceAlert([pausedTarget], { ...query, adults: 1, travelers: 2 }), undefined);
  assert.equal(matchingTargetFlightPriceAlert([pausedTarget], { ...query, cabinClass: "business" }), undefined);
  assert.equal(matchingTargetFlightPriceAlert([pausedTarget], { ...query, departureDate: "2026-08-11" }), undefined);
});
