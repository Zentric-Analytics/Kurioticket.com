import assert from "node:assert/strict";
import test from "node:test";
import { buildCarPriceAlertPayload, canonicalCarPriceAlertQuerySchema, carPriceAlertDuplicateKey } from "./carPriceAlerts";

const search = { pickupLocation: " Paris ", dropoffLocation: "", pickupDate: "2030-01-01", pickupTime: "10:00", dropoffDate: "2030-01-03", dropoffTime: "10:00", driverAge: "18-70", hostile: true };
test("canonicalizes a complete car alert and strips extra fields", () => { const payload = buildCarPriceAlertPayload(search, 125.5, " usd "); assert.deepEqual(payload.query, { pickupLocation: "Paris", dropoffLocation: "Paris", pickupDate: "2030-01-01", pickupTime: "10:00", dropoffDate: "2030-01-03", dropoffTime: "10:00", driverAge: "18-70" }); assert.equal(payload.currency, "USD"); });
test("rejects invalid chronology and driver ages", () => { assert.equal(canonicalCarPriceAlertQuerySchema.safeParse({ ...search, dropoffDate: "2029-01-01" }).success, false); assert.equal(canonicalCarPriceAlertQuerySchema.safeParse({ ...search, driverAge: "17" }).success, false); });
test("duplicate identity includes the complete search, currency and target", () => { const payload = buildCarPriceAlertPayload(search, 125.5, "USD"); const key = carPriceAlertDuplicateKey(payload); assert.ok(key); assert.notEqual(carPriceAlertDuplicateKey({ ...payload, query: { ...payload.query, dropoffTime: "11:00" } }), key); assert.notEqual(carPriceAlertDuplicateKey({ ...payload, targetPrice: 126 }), key); });
