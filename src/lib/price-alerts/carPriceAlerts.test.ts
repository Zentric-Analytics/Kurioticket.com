import assert from "node:assert/strict";
import test from "node:test";
import { buildAutomaticCarPriceAlertPayload, buildCarPriceAlertPayload, canonicalCarPriceAlertQuerySchema, carPriceAlertDuplicateKey, matchingAutomaticCarPriceAlert } from "./carPriceAlerts";

const search = { pickupLocation: " Paris ", dropoffLocation: "", pickupDate: "2030-01-01", pickupTime: "10:00", dropoffDate: "2030-01-03", dropoffTime: "10:00", driverAge: "18-70", hostile: true };
test("canonicalizes a complete car alert and strips extra fields", () => { const payload = buildCarPriceAlertPayload(search, 125.5, " usd "); assert.deepEqual(payload.query, { pickupLocation: "Paris", dropoffLocation: "Paris", pickupDate: "2030-01-01", pickupTime: "10:00", dropoffDate: "2030-01-03", dropoffTime: "10:00", driverAge: "18-70" }); assert.equal(payload.currency, "USD"); });
test("rejects invalid chronology and driver ages", () => { assert.equal(canonicalCarPriceAlertQuerySchema.safeParse({ ...search, dropoffDate: "2029-01-01" }).success, false); assert.equal(canonicalCarPriceAlertQuerySchema.safeParse({ ...search, driverAge: "17" }).success, false); });
test("duplicate identity includes the complete search, currency and target", () => { const payload = buildCarPriceAlertPayload(search, 125.5, "USD"); const key = carPriceAlertDuplicateKey(payload); assert.ok(key); assert.notEqual(carPriceAlertDuplicateKey({ ...payload, query: { ...payload.query, dropoffTime: "11:00" } }), key); assert.notEqual(carPriceAlertDuplicateKey({ ...payload, targetPrice: 126 }), key); });
test("automatic Cars alerts retain total-price baselines and canonical matching", () => {
  const payload = buildAutomaticCarPriceAlertPayload(search, 365, "usd");
  assert.equal(payload.mode, "AUTOMATIC");
  assert.equal(payload.baselinePrice, 365);
  assert.equal(payload.targetPrice, undefined);
  const paused = { id: "paused", ...payload, status: "PAUSED" };
  const active = { id: "active", ...payload, status: "ACTIVE" };
  assert.equal(matchingAutomaticCarPriceAlert([paused, active], search)?.id, "active");
  assert.equal(matchingAutomaticCarPriceAlert([{ ...active, mode: "TARGET" }], search), undefined);
});

test("offer-specific automatic alerts retain the chosen car, seller and rate identity", () => {
  const offer = { resultId: "kayak-sandbox:vehicle-1", offerId: "quote-a", providerName: "QEEQ.COM" };
  const otherOffer = { ...offer, offerId: "quote-b" };
  const scoped = buildAutomaticCarPriceAlertPayload(search, 222, "USD", offer);
  const searchWide = buildAutomaticCarPriceAlertPayload(search, 222, "USD");
  assert.deepEqual(scoped.query.offer, offer);
  assert.deepEqual(canonicalCarPriceAlertQuerySchema.parse(scoped.query).offer, offer);
  assert.notEqual(carPriceAlertDuplicateKey(scoped), carPriceAlertDuplicateKey(searchWide));
  assert.notEqual(carPriceAlertDuplicateKey(scoped), carPriceAlertDuplicateKey(buildAutomaticCarPriceAlertPayload(search, 222, "USD", otherOffer)));
  const current = { id: "scoped", ...scoped, status: "ACTIVE" };
  const older = { id: "legacy", ...searchWide, status: "ACTIVE" };
  assert.equal(matchingAutomaticCarPriceAlert([older, current], search, offer)?.id, "scoped");
  assert.equal(matchingAutomaticCarPriceAlert([older, current], search)?.id, "legacy");
  assert.equal(matchingAutomaticCarPriceAlert([older, current], search, otherOffer), undefined);
  assert.equal(matchingAutomaticCarPriceAlert([current], search, { ...offer, providerName: "Another Seller" }), undefined);
});

test("invalid offer identities are rejected rather than silently becoming search-wide", () => {
  const invalid = buildAutomaticCarPriceAlertPayload(search, 222, "USD");
  assert.equal(canonicalCarPriceAlertQuerySchema.safeParse({ ...invalid.query, offer: { resultId: "", offerId: "a", providerName: "Seller" } }).success, false);
  assert.equal(canonicalCarPriceAlertQuerySchema.safeParse({ ...invalid.query, offer: { resultId: "car", offerId: "a" } }).success, false);
});
