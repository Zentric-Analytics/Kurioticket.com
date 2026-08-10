import assert from "node:assert/strict";
import test from "node:test";
import { featureControlKeys, featureControlRegistry, isFeatureControlKey } from "./registry";

test("Phase 1 registry contains exactly six unique, safe controls", () => {
  assert.equal(featureControlKeys.length, 6);
  assert.equal(new Set(featureControlKeys).size, 6);
  assert.deepEqual(featureControlKeys, ["FLIGHT_SEARCH_ENABLED", "HOTEL_SEARCH_ENABLED", "CAR_SEARCH_ENABLED", "DEALS_ENABLED", "PRICE_ALERTS_ENABLED", "PRICE_ALERT_PROCESSING_ENABLED"]);
  for (const key of featureControlKeys) {
    const control = featureControlRegistry[key];
    assert.equal(control.defaultStaging, true);
    assert.equal(control.defaultProduction, true);
    assert.ok(["Travel Search", "Travel Automation"].includes(control.category));
    assert.ok(["Critical", "High", "Medium"].includes(control.risk));
  }
  assert.equal(isFeatureControlKey("EXPLORE_V2_ENABLED"), false);
  assert.equal(isFeatureControlKey("anything"), false);
});
