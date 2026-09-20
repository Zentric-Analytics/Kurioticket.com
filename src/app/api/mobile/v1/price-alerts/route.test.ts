import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync("src/app/api/mobile/v1/price-alerts/route.ts", "utf8");
const validation = readFileSync("src/lib/validation.ts", "utf8");
const service = readFileSync("src/services/priceTrackingService.ts", "utf8");
const nativeCarAlert = readFileSync("apps/mobile/src/features/search/NativeCarPriceAlert.tsx", "utf8");
const carQuery = { pickupLocation: "Everett", dropoffLocation: "Everett", pickupDate: "2030-01-01", pickupTime: "10:00", dropoffDate: "2030-01-03", dropoffTime: "10:00", driverAge: "18-70" };

test("mobile price-alert creation accepts Cars through the shared validated service path", () => {
  assert.match(route, /\["FLIGHT", "HOTEL", "CAR"\]\.includes/);
  assert.match(route, /priceAlertSchema\.safeParse\(payload\)/);
  assert.match(route, /createPriceAlert\(\{ userId: session\.user\.id, \.\.\.parsed\.data \}\)/);
  assert.match(validation, /const carPriceAlertSchema = z\.object/);
  assert.match(validation, /priceAlertSchema = z\.discriminatedUnion\("type", \[[\s\S]*carPriceAlertSchema/);
  assert.match(service, /type: "FLIGHT" \| "HOTEL" \| "CAR"/);
});

test("Cars API accepts automatic baseline creation without weakening target creation", async () => {
  const { priceAlertSchema } = await import("@/lib/validation");
  const common = { type: "CAR" as const, origin: "Everett", destination: "Everett", currency: "USD", query: carQuery };
  const automatic = priceAlertSchema.safeParse({ ...common, mode: "AUTOMATIC", baselinePrice: 486 });
  assert.equal(automatic.success, true);
  if (automatic.success) { assert.equal(automatic.data.mode, "AUTOMATIC"); assert.equal(automatic.data.targetPrice, undefined); }
  assert.equal(priceAlertSchema.safeParse({ ...common, mode: "AUTOMATIC" }).success, false);
  assert.equal(priceAlertSchema.safeParse({ ...common, mode: "TARGET", targetPrice: 450 }).success, true);
  assert.equal(priceAlertSchema.safeParse({ ...common, mode: "TARGET" }).success, false);
});

test("native Cars price-alert success path creates automatic tracking and can pause or reactivate", () => {
  assert.match(nativeCarAlert, /travelApi\.createPriceAlert\(buildAutomaticCarPriceAlertPayload\(plan, baseline\.totalPrice, baseline\.currency\)\)/);
  assert.match(nativeCarAlert, /setCurrentMatchingAlert\(saved\);[\s\S]*showFeedback\(next \? "active" : "paused"\)/);
  assert.match(nativeCarAlert, /travelApi\.updatePriceAlertStatus\(matchingAlert!\.id, "PAUSED"\)/);
  assert.match(nativeCarAlert, /travelApi\.updatePriceAlertStatus\(matchingAlert\.id, "ACTIVE"\)/);
});
