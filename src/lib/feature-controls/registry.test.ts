import assert from "node:assert/strict";
import test from "node:test";
import { featureControlKeys, featureControlRegistry, isFeatureControlKey } from "./registry";

test("Phase 1 registry contains the six existing controls and one default-OFF sandbox control", () => {
  assert.equal(featureControlKeys.length, 7);
  assert.equal(new Set(featureControlKeys).size, 7);
  assert.deepEqual(featureControlKeys, ["ALLOW_SANDBOX_RESULTS_IN_PRODUCTION", "FLIGHT_SEARCH_ENABLED", "HOTEL_SEARCH_ENABLED", "CAR_SEARCH_ENABLED", "DEALS_ENABLED", "PRICE_ALERTS_ENABLED", "PRICE_ALERT_PROCESSING_ENABLED"]);
  for (const key of featureControlKeys) {
    const control = featureControlRegistry[key];
    assert.equal(control.defaultStaging, key !== "ALLOW_SANDBOX_RESULTS_IN_PRODUCTION");
    assert.equal(control.defaultProduction, key !== "ALLOW_SANDBOX_RESULTS_IN_PRODUCTION");
    assert.ok(["Travel Search", "Travel Automation", "Provider Management"].includes(control.category));
    assert.ok(["Critical", "High", "Medium"].includes(control.risk));
  }
  assert.equal(isFeatureControlKey("EXPLORE_V2_ENABLED"), false);
  assert.equal(isFeatureControlKey("anything"), false);
});
