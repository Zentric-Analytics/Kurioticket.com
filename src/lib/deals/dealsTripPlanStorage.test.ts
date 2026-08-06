import assert from "node:assert/strict";
import test from "node:test";
import { createDealsTripPlan, DEALS_TRIP_PLAN_TTL_MS, updateDealsTripPlan } from "./dealsTripPlan";
import { applyDealsPlanReadResult, buildDealsPlanContextKey, DEALS_STAGED_JOURNEY_STORAGE_KEY, DEALS_TRIP_PLAN_STORAGE_KEY, getVisibleDealsPlan, parseDealsTripPlan, classifyDealsStagedJourneySnapshot, readDealsStagedJourneyPlan, readDealsTripPlan, removeDealsStagedJourneyPlan, removeDealsTripPlan, serializeDealsTripPlan, unresolvedDealsPlanState, writeDealsStagedJourneyPlan, writeDealsTripPlan } from "./dealsTripPlanStorage";

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

test("staged and legacy storage reads, writes, removals, and invalidation are isolated", () => {
  const values = new Map<string, string>(); const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  const legacy = makePlan(); const staged = { ...makePlan(), resultsPath: "/deals/results?q=x&journey=staged" };
  assert.equal(writeDealsTripPlan(legacy, storage), true); const legacyRaw = values.get(DEALS_TRIP_PLAN_STORAGE_KEY);
  assert.equal(writeDealsStagedJourneyPlan(staged, storage), true); assert.equal(values.get(DEALS_TRIP_PLAN_STORAGE_KEY), legacyRaw);
  assert.equal(readDealsTripPlan("safe", 101, storage).status, "valid"); assert.equal(readDealsStagedJourneyPlan("safe", 101, storage).status, "valid");
  removeDealsStagedJourneyPlan(storage); assert.equal(readDealsTripPlan("safe", 101, storage).status, "valid");
  writeDealsStagedJourneyPlan(staged, storage); removeDealsTripPlan(storage); assert.equal(readDealsStagedJourneyPlan("safe", 101, storage).status, "valid");
  values.set(DEALS_TRIP_PLAN_STORAGE_KEY, serializeDealsTripPlan(legacy)); assert.equal(readDealsStagedJourneyPlan("wrong", 101, storage).status, "fingerprint_mismatch"); assert.equal(readDealsTripPlan("safe", 101, storage).status, "valid");
  values.set(DEALS_STAGED_JOURNEY_STORAGE_KEY, "{"); assert.equal(readDealsStagedJourneyPlan("safe", 101, storage).status, "invalid"); assert.equal(readDealsTripPlan("safe", 101, storage).status, "valid");
  writeDealsStagedJourneyPlan(staged, storage); assert.equal(readDealsStagedJourneyPlan("safe", 100 + DEALS_TRIP_PLAN_TTL_MS, storage).status, "expired"); assert.equal(readDealsTripPlan("safe", 101, storage).status, "valid");
});

test("resolved plan state installs only a valid current-context read", () => {
  const context = buildDealsPlanContextKey("guided", "safe"); const plan = makePlan();
  const state = applyDealsPlanReadResult(context, context, unresolvedDealsPlanState(), { status: "valid", plan });
  assert.equal(getVisibleDealsPlan(state, context), plan); assert.equal(state.persistence, "saved");
  assert.equal(getVisibleDealsPlan(state, buildDealsPlanContextKey("guided", "other")), null);
  assert.equal(getVisibleDealsPlan(state, buildDealsPlanContextKey("legacy", "safe")), null);
});

test("every non-valid current-context read clears retained state", () => {
  const context = buildDealsPlanContextKey("guided", "safe"); const plan = makePlan();
  const retained = { plan, storedContextKey: context, resolvedContextKey: context, persistence: "saved" as const };
  const results = [{ status: "missing" }, { status: "invalid" }, { status: "expired", plan }, { status: "fingerprint_mismatch", plan }, { status: "storage_unavailable" }] as const;
  for (const result of results) {
    const state = applyDealsPlanReadResult(context, context, retained, result);
    assert.equal(state.plan, null, result.status); assert.equal(state.storedContextKey, null, result.status); assert.equal(state.resolvedContextKey, context, result.status);
    assert.equal(state.persistence, result.status === "storage_unavailable" ? "unavailable" : "idle", result.status);
  }
});

test("A to B to A cannot revive a plan after mismatch or missing storage", () => {
  const a = buildDealsPlanContextKey("guided", "safe"); const b = buildDealsPlanContextKey("guided", "other"); const plan = makePlan();
  for (const result of [{ status: "fingerprint_mismatch", plan }, { status: "missing" }] as const) {
    let state = applyDealsPlanReadResult(a, a, unresolvedDealsPlanState(), { status: "valid", plan });
    assert.equal(getVisibleDealsPlan(state, b), null);
    state = applyDealsPlanReadResult(b, b, state, result); assert.equal(state.plan, null);
    assert.equal(getVisibleDealsPlan(state, a), null);
  }
});

test("a late context A result cannot install after context B is current", () => {
  const a = buildDealsPlanContextKey("guided", "safe"); const b = buildDealsPlanContextKey("guided", "other");
  const state = applyDealsPlanReadResult(b, a, applyDealsPlanReadResult(b, b, unresolvedDealsPlanState(), { status: "missing" }), { status: "valid", plan: makePlan() });
  assert.equal(getVisibleDealsPlan(state, b), null); assert.equal(state.resolvedContextKey, b);
});

test("scope and fingerprint define context while route stage does not", () => {
  const fingerprint = "safe";
  assert.equal(buildDealsPlanContextKey("guided", fingerprint), buildDealsPlanContextKey("guided", fingerprint));
  assert.notEqual(buildDealsPlanContextKey("guided", fingerprint), buildDealsPlanContextKey("guided", "other"));
  assert.notEqual(buildDealsPlanContextKey("guided", fingerprint), buildDealsPlanContextKey("legacy", fingerprint));
});


test("guided mismatch and pure snapshots are non-destructive", () => {
  const raw = serializeDealsTripPlan(makePlan()); const storage = memoryStorage(raw);
  const mismatch = readDealsStagedJourneyPlan("other", 101, storage);
  assert.equal(mismatch.status, "fingerprint_mismatch"); assert.equal(storage.value(), raw);
  assert.equal(classifyDealsStagedJourneySnapshot(raw, "other", 101).status, "fingerprint_mismatch"); assert.equal(storage.value(), raw);
  assert.deepEqual(classifyDealsStagedJourneySnapshot(null, "safe", 101), { status: "missing" });
  assert.deepEqual(classifyDealsStagedJourneySnapshot("{", "safe", 101), { status: "invalid" });
  const legacy = memoryStorage(raw); assert.equal(readDealsTripPlan("other", 101, legacy).status, "fingerprint_mismatch"); assert.equal(legacy.value(), null);
});
