import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { beginAvailabilityRefresh, canCreateOrReactivatePriceAlert, finishAvailabilityRefresh, initialAvailabilityLifecycleState, isMobileProductAvailable, loadFeatureAvailability, normalizeFeatureAvailability, resetFeatureAvailabilityCacheForTests, safeFeatureAvailability } from "./featureAvailabilityModel";

const disabled = { flightSearch: false, hotelSearch: false, carSearch: false, deals: false, priceAlerts: false };
test("fetches and caches typed client-safe availability", async () => { resetFeatureAvailabilityCacheForTests(); let calls = 0; const fetcher = async () => { calls += 1; return disabled; }; assert.deepEqual((await loadFeatureAvailability(fetcher, 1)).availability, disabled); assert.deepEqual((await loadFeatureAvailability(fetcher, 2)).availability, disabled); assert.equal(calls, 1); });
test("temporary API failure safely leaves established products available", async () => { resetFeatureAvailabilityCacheForTests(); const result = await loadFeatureAvailability(async () => { throw new Error("offline"); }); assert.deepEqual(result.availability, safeFeatureAvailability); assert.equal(result.source, "safe-default"); });
test("each travel product has an independent disabled state", () => { for (const product of ["flight", "hotel", "car", "deals"] as const) assert.equal(isMobileProductAvailable(disabled, product), false); });
test("disabled Price Alerts prevents creation/reactivation without affecting preserved records", () => { assert.equal(canCreateOrReactivatePriceAlert(disabled), false); const preserved = [{ id: "existing", status: "PAUSED" }]; assert.equal(preserved.length, 1); });
test("public shape drops processing controls and never contains environment state", () => { assert.deepEqual(normalizeFeatureAvailability({ ...safeFeatureAvailability, priceAlertProcessing: false }), safeFeatureAvailability); assert.equal("priceAlertProcessing" in safeFeatureAvailability, false); assert.equal("environment" in safeFeatureAvailability, false); });

test("cold initialization and cached initialization have explicit lifecycle states", () => {
  assert.deepEqual(initialAvailabilityLifecycleState(undefined), { availability: safeFeatureAvailability, initializing: true, refreshing: false });
  assert.deepEqual(initialAvailabilityLifecycleState(disabled), { availability: disabled, initializing: false, refreshing: false });
});

test("background refresh preserves the resolved value and is non-destructive", () => {
  const ready = initialAvailabilityLifecycleState(disabled);
  assert.deepEqual(beginAvailabilityRefresh(ready), { availability: disabled, initializing: false, refreshing: true });
  assert.deepEqual(finishAvailabilityRefresh(beginAvailabilityRefresh(ready), safeFeatureAvailability), { availability: safeFeatureAvailability, initializing: false, refreshing: false });
});

test("provider deduplicates refreshes and publishes loading only for initialization", () => {
  const source = readFileSync("src/features/availability/FeatureAvailability.tsx", "utf8");
  assert.match(source, /if \(inFlight\.current\) return inFlight\.current/);
  assert.match(source, /loading: lifecycle\.initializing/);
  assert.match(source, /state === "active" && previous !== "active"/);
  assert.match(source, /loadFeatureAvailability\(travelApi\.featureAvailability, Date\.now\(\), background\)/);
});
