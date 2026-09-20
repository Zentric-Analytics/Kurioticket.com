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

test("mobile web Hotel price tracking uses a compact real switch with web-native target setup", () => {
  assert.match(control, /role="switch"/);
  assert.match(control, /aria-checked=\{Boolean\(isTracking\)\}/);
  assert.match(control, /travel\.account\.hotelAlert\.title/);
  assert.match(control, /handleMobileToggle\(!isTracking\)/);
  assert.match(control, /setMobileOpen\(true\)/);
  assert.match(control, /createPortal/);
  assert.match(control, /role="dialog"/);
  assert.match(control, /buildHotelPriceAlertPayload\(search, value, currency\)/);
  assert.match(control, /inputMode="decimal"/);
  assert.match(control, /sm:hidden/);
  assert.match(control, /hidden rounded-2xl[^"]*sm:block/);
});

test("mobile web Hotel price tracking reconciles, pauses, and can reactivate the matching search", () => {
  assert.match(control, /fetch\("\/api\/price-alerts", \{ cache: "no-store"/);
  assert.match(control, /matchesHotelSearch/);
  assert.match(control, /alert\.status === "ACTIVE"/);
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
