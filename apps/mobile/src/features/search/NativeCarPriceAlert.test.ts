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

test("Cars toggle reserves independent loading and native switch slots", () => {
  assert.match(source, /<View style=\{styles\.loadingSlot\}>\{pending \? <ActivityIndicator accessible=\{false\}/);
  assert.match(source, /<View style=\{styles\.switchSlot\}><Switch accessibilityRole="switch"/);
  assert.match(source, /loadingSlot: \{ width: 20,/);
  assert.match(source, /switchSlot: \{ width: 51,/);
  assert.doesNotMatch(source, /\{pending \? <ActivityIndicator[^}]+\/> : null\}<Switch/);
});

test("Cars toggle keeps its responsive geometry and balanced trailing inset", () => {
  assert.match(source, /control: \{ width: "100%", minHeight: 52, borderRadius: 12, borderWidth: 1, paddingLeft: 12, paddingRight: 14, paddingVertical: 4, flexDirection: "row", alignItems: "center"/);
  assert.match(source, /title: \{ flex: 1, flexShrink: 1,/);
  assert.match(source, /switchControls: \{ minHeight: 44, flexShrink: 0, flexDirection: "row", alignItems: "center", gap: 6 \}/);
  assert.match(source, /loadingSlot: \{ width: 20, minHeight: 44, alignItems: "center", justifyContent: "center" \}/);
  assert.match(source, /switchSlot: \{ width: 51, minHeight: 44, alignItems: "flex-end", justifyContent: "center" \}/);

  const fixedHorizontalSpace = 12 + 14 + 17 + 8 + 8 + 20 + 6 + 51;
  for (const deviceWidth of [320, 375, 390, 414, 480]) {
    assert.ok(deviceWidth - fixedHorizontalSpace > 0, `title retains flexible space at ${deviceWidth}px`);
  }
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
  assert.match(source, /CircleCheck accessible=\{false\}/);
  assert.match(source, /We'll notify you if the price drops\./);
  assert.doesNotMatch(source, /minHeight: 78/);
  assert.match(source, /Animated\.timing\(opacity, \{ toValue: 0/);
  assert.match(source, /if \(finished\) onDismiss\(feedback\)/);
  assert.match(source, /clearTimeout\(dismissTimer\)/);
  assert.match(source, /translateY\.stopAnimation\(\); opacity\.stopAnimation\(\)/);
});
