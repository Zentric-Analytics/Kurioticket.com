import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/NativeCarPriceAlert.tsx", "utf8");

test("Cars toggle creates automatic tracking without a target-price sheet", () => {
  assert.match(source, /buildAutomaticCarPriceAlertPayload\(plan, baseline\.totalPrice, baseline\.currency\)/);
  assert.doesNotMatch(source, /Target rental total|TextInput|Modal|Create alert/);
  assert.match(source, /matchingAlert\?\.status === "PAUSED"[\s\S]*updatePriceAlertStatus\(matchingAlert\.id, "ACTIVE"\)/);
});

test("Cars toggle confirms server activation and pause before changing state", () => {
  assert.match(source, /saved = \(await travelApi\.createPriceAlert/);
  assert.match(source, /saved = \(await travelApi\.updatePriceAlertStatus\(matchingAlert!\.id, "PAUSED"\)\)\.alert/);
  assert.match(source, /setCurrentMatchingAlert\(saved\);[\s\S]*showFeedback\(next \? "active" : "paused"\)/);
  assert.match(source, /pendingRef\.current/);
  assert.match(source, /accessibilityState=\{\{ checked: tracking, disabled, busy: pending \}\}/);
});

test("Cars toggle preserves sign-in and explicit failure feedback", () => {
  assert.match(source, /if \(next && !await readSession\(\)/);
  assert.match(source, /signInHref\("\/\(tabs\)\/profile"\)/);
  assert.match(source, /Couldn't start price tracking\. Try again\./);
  assert.match(source, /Couldn't pause price tracking\. Try again\./);
});

test("Cars snackbar is animated, safe-area aware, manageable, and temporary", () => {
  assert.match(source, /CAR_PRICE_ALERT_SNACKBAR_DURATION_MS = 3_600/);
  assert.match(source, /Animated\.parallel/);
  assert.match(source, /Math\.max\(insets\.bottom, 12\) \+ 12/);
  assert.match(source, /accessibilityLiveRegion="polite"/);
  assert.match(source, /accessibilityLabel="Manage price alerts"/);
  assert.match(source, /router\.push\("\/price-alerts"\)/);
  assert.match(source, /Price tracking is on/);
  assert.match(source, /Price tracking paused/);
});
