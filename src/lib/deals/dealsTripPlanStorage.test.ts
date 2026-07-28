import assert from "node:assert/strict";
import test from "node:test";
import { createDealsTripPlan, DEALS_TRIP_PLAN_TTL_MS, updateDealsTripPlan } from "./dealsTripPlan";
import { DEALS_TRIP_PLAN_STORAGE_KEY, parseDealsTripPlan, readDealsTripPlan, removeDealsTripPlan, serializeDealsTripPlan, writeDealsTripPlan } from "./dealsTripPlanStorage";

const makePlan = () => updateDealsTripPlan(createDealsTripPlan({ mode: "flight-car", searchFingerprint: "safe", resultsPath: "/deals/results?q=x", carsResultsPath: "/cars/results?q=x" }, 100), { flight: { id: " f ", provider: " P ", airline: " A ", origin: "LOS", destination: "LAX", departure: "d", arrival: "a", duration: "1h", sourcePrice: 1, sourceCurrency: "USD", resultReceivedAt: 100 } }, 101);
const memoryStorage = (initial?: string) => { let value = initial ?? null; return { getItem: () => value, setItem: (_key: string, next: string) => { value = next; }, removeItem: () => { value = null; }, value: () => value }; };

test("canonical serialization drops all unknown and forbidden data", () => {
  const plan = { ...makePlan(), unknown: "drop", payment: { token: "secret" }, flight: { ...makePlan().flight!, bookingUrl: "https://evil.test", partnerRedirectUrl: "http://evil.test", html: "<b>x</b>" }, opened: { flight: 101, mystery: 102 } };
  const canonical = parseDealsTripPlan(JSON.stringify(plan));
  assert.ok(canonical); assert.equal(canonical.flight?.id, "f"); assert.deepEqual(canonical.opened, { flight: 101 });
  const raw = serializeDealsTripPlan(plan);
  for (const forbidden of ["bookingUrl", "partnerRedirectUrl", "http://", "https://", "payment", "token", "unknown", "html", "mystery"]) assert.doesNotMatch(raw, new RegExp(forbidden, "i"));
});

test("parser rejects malformed schemas and invalid timestamp relationships", () => {
  for (const raw of [null, "{", "null", "[]", "1", "\"x\"", "{}", '{"version":2}']) assert.equal(parseDealsTripPlan(raw), null);
  const base = makePlan();
  for (const changed of [{ ...base, updatedAt: 99 }, { ...base, expiresAt: 100 }, { ...base, expiresAt: 100 + DEALS_TRIP_PLAN_TTL_MS + 1 }, { ...base, flight: { ...base.flight!, resultReceivedAt: -1 } }, { ...base, opened: { flight: 99 } }]) assert.equal(parseDealsTripPlan(JSON.stringify(changed)), null);
  assert.equal(parseDealsTripPlan(JSON.stringify({ ...base, flight: { ...base.flight!, airline: " " } })), null);
});

test("structured reads distinguish missing, valid, mismatch, expired and invalid", () => {
  assert.deepEqual(readDealsTripPlan(undefined, 101, memoryStorage()), { status: "missing" });
  const raw = serializeDealsTripPlan(makePlan());
  assert.equal(readDealsTripPlan("safe", 101, memoryStorage(raw)).status, "valid");
  assert.equal(readDealsTripPlan("other", 101, memoryStorage(raw)).status, "fingerprint_mismatch");
  const expired = readDealsTripPlan(undefined, 100 + DEALS_TRIP_PLAN_TTL_MS, memoryStorage(raw));
  assert.equal(expired.status, "expired"); if (expired.status === "expired") assert.equal(expired.plan.resultsPath, "/deals/results?q=x");
  assert.equal(readDealsTripPlan(undefined, 101, memoryStorage("{" )).status, "invalid");
  assert.equal(readDealsTripPlan(undefined, 101, null).status, "storage_unavailable");
});

test("storage failures are explicit and a later retry can succeed", () => {
  const throwing = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("quota"); }, removeItem: () => { throw new Error("blocked"); } };
  assert.equal(readDealsTripPlan(undefined, 101, throwing).status, "storage_unavailable");
  assert.equal(writeDealsTripPlan(makePlan(), throwing), false); assert.equal(removeDealsTripPlan(throwing), false);
  const storage = memoryStorage(); assert.equal(writeDealsTripPlan(makePlan(), storage), true); assert.ok(storage.value()); assert.equal(removeDealsTripPlan(storage), true); assert.equal(storage.value(), null);
  assert.equal(DEALS_TRIP_PLAN_STORAGE_KEY, "kurioticket_deals_trip_plan_v1");
});
