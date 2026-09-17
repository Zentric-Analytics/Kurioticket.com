import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync("src/app/api/mobile/v1/price-alerts/route.ts", "utf8");
const validation = readFileSync("src/lib/validation.ts", "utf8");
const service = readFileSync("src/services/priceTrackingService.ts", "utf8");
const nativeCarAlert = readFileSync("apps/mobile/src/features/search/NativeCarPriceAlert.tsx", "utf8");

test("mobile price-alert creation accepts Cars through the shared validated service path", () => {
  assert.match(route, /\["FLIGHT", "HOTEL", "CAR"\]\.includes/);
  assert.match(route, /priceAlertSchema\.safeParse\(payload\)/);
  assert.match(route, /createPriceAlert\(\{ userId: session\.user\.id, \.\.\.parsed\.data \}\)/);
  assert.match(validation, /const carPriceAlertSchema = z\.object/);
  assert.match(validation, /priceAlertSchema = z\.discriminatedUnion\("type", \[[\s\S]*carPriceAlertSchema/);
  assert.match(service, /type: "FLIGHT" \| "HOTEL" \| "CAR"/);
});

test("native Cars price-alert success path persists the returned alert and closes the target sheet", () => {
  assert.match(nativeCarAlert, /travelApi\.createPriceAlert\(buildCarPriceAlertPayload\(plan, target, currency\)\)/);
  assert.match(nativeCarAlert, /setCurrentMatchingAlert\(saved\.alert\);[\s\S]*closeTargetSheet\(\);/);
  assert.match(nativeCarAlert, /travelApi\.updatePriceAlertStatus\(matchingAlert\.id, "PAUSED"\)/);
  assert.match(nativeCarAlert, /travelApi\.updatePriceAlertStatus\(samePausedTarget\.id, "ACTIVE"\)/);
});
