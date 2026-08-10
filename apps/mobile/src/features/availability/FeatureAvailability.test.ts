import assert from "node:assert/strict";
import test from "node:test";
import { canCreateOrReactivatePriceAlert, isMobileProductAvailable, loadFeatureAvailability, normalizeFeatureAvailability, resetFeatureAvailabilityCacheForTests, safeFeatureAvailability } from "./featureAvailabilityModel";

const disabled = { flightSearch: false, hotelSearch: false, carSearch: false, deals: false, priceAlerts: false };
test("fetches and caches typed client-safe availability", async () => { resetFeatureAvailabilityCacheForTests(); let calls = 0; const fetcher = async () => { calls += 1; return disabled; }; assert.deepEqual((await loadFeatureAvailability(fetcher, 1)).availability, disabled); assert.deepEqual((await loadFeatureAvailability(fetcher, 2)).availability, disabled); assert.equal(calls, 1); });
test("temporary API failure safely leaves established products available", async () => { resetFeatureAvailabilityCacheForTests(); const result = await loadFeatureAvailability(async () => { throw new Error("offline"); }); assert.deepEqual(result.availability, safeFeatureAvailability); assert.equal(result.source, "safe-default"); });
test("each travel product has an independent disabled state", () => { for (const product of ["flight", "hotel", "car", "deals"] as const) assert.equal(isMobileProductAvailable(disabled, product), false); });
test("disabled Price Alerts prevents creation/reactivation without affecting preserved records", () => { assert.equal(canCreateOrReactivatePriceAlert(disabled), false); const preserved = [{ id: "existing", status: "PAUSED" }]; assert.equal(preserved.length, 1); });
test("public shape drops processing controls and never contains environment state", () => { assert.deepEqual(normalizeFeatureAvailability({ ...safeFeatureAvailability, priceAlertProcessing: false }), safeFeatureAvailability); assert.equal("priceAlertProcessing" in safeFeatureAvailability, false); assert.equal("environment" in safeFeatureAvailability, false); });
