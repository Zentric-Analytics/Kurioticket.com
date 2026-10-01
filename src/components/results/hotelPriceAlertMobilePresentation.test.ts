import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const control = readFileSync(
  new URL("./HotelPriceAlertControl.tsx", import.meta.url),
  "utf8",
);
const webStatusRoute = readFileSync(
  new URL("../../app/api/price-alerts/[id]/route.ts", import.meta.url),
  "utf8",
);

test("mobile web hotel tracking opens its target editor for the selected property", () => {
  assert.match(control, /role="switch"/);
  assert.match(control, /aria-checked=\{Boolean\(isTracking\)\}/);
  assert.match(control, /travel\.account\.hotelAlert\.title/);
  assert.match(control, /handleToggle\(!isTracking, "mobile"\)/);
  assert.match(control, /setMobileOpen\(true\)/);
  assert.match(control, /createPortal/);
  assert.match(control, /role="dialog"/);
  assert.match(control, /buildHotelPriceAlertPayload\(/);
  assert.match(control, /hotel\.id/);
  assert.match(control, /hotel\.name/);
  assert.match(control, /type="range"/);
  assert.match(control, /sm:hidden/);
  assert.match(control, /hidden rounded-2xl[^"]*sm:block/);
});

test("mobile web hotel tracking reconciles, pauses, and reactivates the selected property's alert", () => {
  assert.match(control, /fetch\("\/api\/price-alerts", \{/);
  assert.match(control, /matchingHotelPriceAlert\(alerts, search, hotel\.id\)/);
  assert.match(control, /matchingAlert\?\.status === "ACTIVE"/);
  assert.match(control, /alert\.status === "PAUSED"/);
  assert.match(control, /method: "PATCH"/);
  assert.match(control, /body: JSON\.stringify\(\{ status: nextStatus \}\)/);
  assert.match(control, /updateStatus\(matchingAlert, "PAUSED"\)/);
  assert.match(control, /updateStatus\(samePausedTarget, "ACTIVE"\)/);
  assert.match(control, /callbackUrl/);
});

test("web price-alert status route uses canonical web authentication and shared service rules", () => {
  assert.match(webStatusRoute, /requireWebApiSession\(\)/);
  assert.match(webStatusRoute, /z\.enum\(\["ACTIVE", "PAUSED"\]\)/);
  assert.match(webStatusRoute, /updateUserPriceAlertStatus/);
  assert.match(webStatusRoute, /userId: session\.user\.id/);
  assert.match(webStatusRoute, /PriceAlertNotFoundError/);
  assert.match(webStatusRoute, /InvalidPriceAlertTransitionError/);
  assert.match(webStatusRoute, /status: 401/);
  assert.match(webStatusRoute, /status: 404/);
  assert.match(webStatusRoute, /status: 409/);
});
