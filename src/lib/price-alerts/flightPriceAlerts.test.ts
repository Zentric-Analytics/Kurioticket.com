import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCanonicalFlightPriceAlertQuery,
  buildFlightPriceAlertPayload,
  flightPriceAlertDuplicateKey,
  MAX_PRICE_ALERT_TARGET,
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
