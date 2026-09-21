import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./CarPriceAlertControl.tsx", import.meta.url), "utf8");

test("Cars Results uses server-authoritative automatic price tracking", () => {
  assert.match(source, /buildAutomaticCarPriceAlertPayload\(search, baseline\.totalPrice, baseline\.currency\)/);
  assert.match(source, /matchingAutomaticCarPriceAlert/);
  assert.match(source, /method: "PATCH"/);
  assert.match(source, /response\.status === 409/);
  assert.match(source, /response\.status === 401/);
  assert.match(source, /role="switch"/);
  assert.match(source, /aria-checked=\{tracking\}/);
  assert.doesNotMatch(source, /buildCarPriceAlertPayload|Target rental total|inputMode="decimal"/);
});

test("pending geometry and transient feedback remain stable and accessible", () => {
  assert.match(source, /w-5 justify-center/);
  assert.match(source, /w-\[51px\] justify-end/);
  assert.match(source, /CAR_PRICE_ALERT_SNACKBAR_DURATION_MS = 3_600/);
  assert.match(source, /window\.clearTimeout\(leave\)/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /href="\/price-alerts"/);
});

test("mobile Cars price tracking fills its content gutter without compromising narrow layouts", () => {
  assert.match(source, /data-cars-price-alert/);
  assert.match(source, /w-full min-w-0 max-w-full/);
  assert.match(source, /lg:w-auto/);
  assert.match(source, /min-h-\[52px\] min-w-0 items-center/);
  assert.match(source, /min-w-0 flex-1 \[overflow-wrap:anywhere\]/);
  assert.match(source, /h-8 w-8 shrink-0/);
  assert.match(source, /h-11 shrink-0 items-center/);
});
