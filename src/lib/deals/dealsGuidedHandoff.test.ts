import assert from "node:assert/strict";
import test from "node:test";
import { attemptGuidedHandoffActivation, getDealsGuidedEstimatedTotal, getDealsGuidedOpenedCount, getDealsGuidedProducts, prepareDealsGuidedActivation, validateDealsGuidedHandoffPlan } from "./dealsGuidedHandoff";
import { createDealsTripPlan, type DealsTripPlan } from "./dealsTripPlan";
import { parseDealsSearchParams, type DealsPackageMode } from "./dealsSearchParams";

const now = 100_000;
function plan(mode: DealsPackageMode): DealsTripPlan {
  const base = createDealsTripPlan({ mode, searchFingerprint: "fp", resultsPath: "/deals/results" }, now);
  const common = { provider: "Safe", sourcePrice: 100, sourceCurrency: "USD", resultReceivedAt: now };
  return { ...base, updatedAt: now, hotel: { ...common, id: "h", name: "Hotel", location: "Paris", checkIn: "2027-01-01", checkOut: "2027-01-03", detailsPath: "/hotels/details/h" }, flight: { ...common, id: "f", airline: "Air", origin: "JFK", destination: "CDG", departure: "2027-01-01T10:00", arrival: "2027-01-01T20:00", duration: "7h" }, car: { ...common, id: "c", rentalCompany: "Cars", modelName: "Model", categoryLabel: "compact", pickupLocation: "Paris", returnLocation: "Paris", pickupDate: "2027-01-01", pickupTime: "10:00", dropoffDate: "2027-01-03", dropoffTime: "10:00", detailsPath: "/cars/details/c?pickupLocation=Paris&dropoffLocation=Paris&pickupDate=2027-01-01&pickupTime=10%3A00&dropoffDate=2027-01-03&dropoffTime=10%3A00&driverAge=30" } };
}
const expected: Record<DealsPackageMode, string[]> = { "hotel-flight": ["hotel", "flight"], "hotel-car": ["hotel", "car"], "flight-car": ["flight", "car"], "hotel-flight-car": ["hotel", "flight", "car"] };
for (const mode of Object.keys(expected) as DealsPackageMode[]) test(`${mode} uses review order and omits excluded selections`, () => assert.deepEqual(getDealsGuidedProducts(plan(mode)), expected[mode]));
test("validation ignores excluded stale selection and opened timestamp", () => { const value = plan("hotel-flight"); value.car!.resultReceivedAt = 0; value.opened.car = now; const search = { ...parseDealsSearchParams({}), mode: value.mode }; assert.equal(validateDealsGuidedHandoffPlan(value, search, "fp", now + 1).ok, true); assert.equal(getDealsGuidedOpenedCount(value), 0); });
test("validation blocks mismatch, missing, and included expiry", () => { const value = plan("hotel-flight"); const search = { ...parseDealsSearchParams({}), mode: value.mode }; assert.equal(validateDealsGuidedHandoffPlan(value, search, "wrong", now).ok, false); const missing = { ...value, hotel: undefined }; assert.equal(validateDealsGuidedHandoffPlan(missing, search, "fp", now).ok, false); const stale = { ...value, hotel: { ...value.hotel!, resultReceivedAt: 0 } }; assert.equal(validateDealsGuidedHandoffPlan(stale, search, "fp", now + 1_500_000).ok, false); });
test("activation derives safe actions, blocks changed IDs, and preserves TTL and selections", () => { const value = plan("hotel-flight"); const search = { ...parseDealsSearchParams({}), mode: value.mode }; const flight = prepareDealsGuidedActivation(value, value, "flight", search, "fp", now + 1, "en"); assert.equal(flight.ok, true); if (!flight.ok) return; assert.equal(flight.href, "/redirect?id=f&type=flight"); assert.equal(flight.plan.expiresAt, value.expiresAt); assert.equal(flight.plan.flight!.resultReceivedAt, now); assert.equal(flight.plan.opened.flight, now + 1); assert.equal(value.opened.flight, undefined); const changed = { ...value, flight: { ...value.flight!, id: "other" } }; assert.deepEqual(prepareDealsGuidedActivation(changed, value, "flight", search, "fp", now + 1, "en"), { ok: false, reason: "selection-changed" }); });
test("included-only total ignores excluded missing rate", () => { const value = plan("hotel-flight"); value.car!.sourceCurrency = "XXX"; assert.equal(getDealsGuidedEstimatedTotal(value, "USD", { USD: 1 }), 200); value.hotel!.sourceCurrency = "XXX"; assert.equal(getDealsGuidedEstimatedTotal(value, "USD", { USD: 1 }), null); });

test("activation adapter rereads, writes once, and exposes the current safe href only after persistence", () => {
  const rendered = plan("hotel-flight"), current = structuredClone(rendered);
  const search = { ...parseDealsSearchParams({}), mode: current.mode };
  const reads: unknown[] = [], writes: DealsTripPlan[] = [];
  const result = attemptGuidedHandoffActivation({ renderedPlan: rendered, product: "flight", search, fingerprint: "fp", now: now + 1, locale: "en",
    read: (fingerprint, at) => { reads.push([fingerprint, at]); return { status: "valid", plan: current }; },
    write: value => { writes.push(value); return true; } });
  assert.equal(result.ok, true); assert.deepEqual(reads, [["fp", now + 1]]); assert.equal(writes.length, 1);
  if (!result.ok) return;
  assert.equal(result.href, "/redirect?id=f&type=flight"); assert.equal(result.plan.expiresAt, rendered.expiresAt);
  assert.deepEqual([result.plan.hotel!.resultReceivedAt, result.plan.flight!.resultReceivedAt, result.plan.car!.resultReceivedAt], [now, now, now]);
  assert.deepEqual(result.plan.opened, { flight: now + 1 }); assert.deepEqual(rendered.opened, {});
});

test("failed staged write returns no opened visible plan and cannot mutate storage or call legacy persistence", () => {
  const rendered = plan("hotel-flight"), stored = structuredClone(rendered);
  const search = { ...parseDealsSearchParams({}), mode: rendered.mode }; const legacyWrites = 0; let writes = 0;
  const result = attemptGuidedHandoffActivation({ renderedPlan: rendered, product: "hotel", search, fingerprint: "fp", now: now + 1, locale: "en",
    read: () => ({ status: "valid", plan: stored }), write: () => { writes++; return false; } });
  assert.equal(result.ok, false); if (result.ok) return;
  assert.deepEqual(result.failure, { kind: "storage-unavailable", product: "hotel" }); assert.equal(result.currentPlan, undefined);
  assert.equal(writes, 1); assert.equal(legacyWrites, 0); assert.deepEqual(stored.opened, {}); assert.deepEqual(rendered.opened, {});
});

test("activation adapter truthfully blocks read, validation, cross-tab, expiry, and action failures", () => {
  const rendered = plan("hotel-flight"), search = { ...parseDealsSearchParams({}), mode: rendered.mode };
  const attempt = (readPlan: Parameters<typeof attemptGuidedHandoffActivation>[0]["read"], at = now + 1, shown = rendered, product: "flight" | "hotel" = "flight") => attemptGuidedHandoffActivation({ renderedPlan: shown, product, search, fingerprint: "fp", now: at, locale: "en", read: readPlan, write: () => { throw new Error("write must not run"); } });
  for (const [status, kind] of [["missing", "plan-missing"], ["invalid", "plan-invalid"], ["fingerprint_mismatch", "fingerprint-mismatch"], ["storage_unavailable", "storage-unavailable"]] as const) {
    const result = attempt(() => ({ status })); assert.equal(result.ok, false); if (!result.ok) assert.equal(result.failure.kind, kind);
  }
  const expired = attempt(() => ({ status: "expired", plan: rendered })); assert.equal(expired.ok, false); if (!expired.ok) assert.equal(expired.failure.kind, "plan-expired");
  const staleProduct = { ...rendered, flight: { ...rendered.flight!, resultReceivedAt: 0 } }; const productExpired = attempt(() => ({ status: "valid", plan: staleProduct }), 1_500_000); assert.equal(productExpired.ok, false); if (!productExpired.ok) assert.equal(productExpired.failure.kind, "product-expired");
  const incomplete = { ...rendered, hotel: undefined }; const incompleteResult = attempt(() => ({ status: "valid", plan: incomplete })); assert.equal(incompleteResult.ok, false); if (!incompleteResult.ok) assert.equal(incompleteResult.failure.kind, "incomplete");
  const changed = { ...rendered, flight: { ...rendered.flight!, id: "changed" } }; const changedResult = attempt(() => ({ status: "valid", plan: changed })); assert.equal(changedResult.ok, false); if (!changedResult.ok) assert.equal(changedResult.failure.kind, "selection-changed");
  const hrefChangedRendered = { ...rendered, hotel: { ...rendered.hotel!, detailsPath: undefined } }; const hrefChanged = attempt(() => ({ status: "valid", plan: rendered }), now + 1, hrefChangedRendered, "hotel"); assert.equal(hrefChanged.ok, false); if (!hrefChanged.ok) assert.equal(hrefChanged.failure.kind, "selection-changed");
  const noAction = { ...rendered, hotel: { ...rendered.hotel!, detailsPath: undefined } }; const unavailable = attempt(() => ({ status: "valid", plan: noAction }), now + 1, noAction, "hotel"); assert.equal(unavailable.ok, false); if (!unavailable.ok) assert.equal(unavailable.failure.kind, "action-unavailable");
  const modeChanged = { ...rendered, mode: "hotel-car" as const }; const modeResult = attempt(() => ({ status: "valid", plan: modeChanged })); assert.equal(modeResult.ok, false); if (!modeResult.ok) assert.equal(modeResult.failure.kind, "mode-mismatch");
});
