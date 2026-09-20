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

test("mobile web Hotel price tracking uses a compact switch and retains target setup", () => {
  assert.match(control, /role="switch"/);
  assert.match(control, /aria-checked=\{tracking\}/);
  assert.match(control, /travel\.account\.hotelAlert\.title/);
  assert.match(control, /setOpen\(true\)/);
  assert.match(control, /buildHotelPriceAlertPayload\(search, value, currency\)/);
  assert.match(control, /inputMode="decimal"/);
  assert.match(control, /sm:hidden/);
  assert.match(control, /hidden items-center justify-between gap-3 sm:flex/);
});

test("mobile web Hotel price tracking reconciles, pauses, and resumes the matching search", () => {
  assert.match(control, /fetch\("\/api\/price-alerts", \{/);
  assert.match(control, /chooseMatchingAlert/);
  assert.match(control, /alert\.status === "ACTIVE"/);
  assert.match(control, /alert\.status === "PAUSED"/);
  assert.match(control, /method: "PATCH"/);
  assert.match(control, /status: nextStatus/);
  assert.match(control, /updateAlertStatus\(matchingAlert, "ACTIVE"\)/);
  assert.match(control, /updateAlertStatus\(matchingAlert, "PAUSED"\)/);
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
