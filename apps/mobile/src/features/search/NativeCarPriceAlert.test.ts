import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/NativeCarPriceAlert.tsx", "utf8");
const themeSource = readFileSync("src/theme/AppTheme.tsx", "utf8");

test("Cars toggle creates automatic tracking without a target-price sheet", () => {
  assert.match(source, /buildAutomaticCarPriceAlertPayload\(plan, baseline\.totalPrice, baseline\.currency, scope\)/);
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

test("Cars toggle has no visible submission loading UI", () => {
  assert.doesNotMatch(source, /ActivityIndicator|loadingSlot/);
  assert.match(source, /pendingRef\.current/);
  assert.match(source, /optimisticTracking/);
});

test("native car rate details restores a separate tinted 54px offer-tracking bar", () => {
  const picker = readFileSync("src/features/search/NativeCarResultOfferPicker.tsx", "utf8");
  assert.match(source, /return <View style=\{\[styles\.control, \{ backgroundColor: theme\.priceAlertSurface, borderColor: theme\.priceAlertBorder \}]\}>/);
  assert.match(picker, /<NativeCarPriceAlert/);
  assert.match(picker, /Booking provider ·/);
  assert.match(source, /<Bell accessible=\{false\} size=\{16\} strokeWidth=\{2\}/);
  assert.match(source, />Track car prices<\/Text>/);
  assert.doesNotMatch(source, /Track rental car prices/);
  assert.match(source, /control: \{ minWidth: 0, minHeight: 54, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderRadius: 12 \}/);
  assert.match(source, /title: \{ minWidth: 0, flex: 1, fontSize: 13, lineHeight: 18/);
  assert.match(source, /iconBadge: \{ width: 32, height: 32/);
  assert.match(themeSource, /priceAlertSurface: "#EDF6FF"/);
  assert.match(themeSource, /priceAlertBorder: "#C8DFF7"/);
  assert.match(source, /switchSlot: \{ width: 44, height: 44/);
  assert.doesNotMatch(source, /<Switch\b/);
});

test("native Cars compact switch uses a 44-by-24 track, 18px thumb and full 44px target", () => {
  assert.match(source, /<Pressable accessibilityRole="switch" accessibilityLabel=\{\x60Track car prices for \$\{scope\.providerName\} offer\x60\}/);
  assert.match(source, /accessibilityState=\{\{ checked: tracking, disabled, busy: pending \}\} disabled=\{disabled\} onPress=\{\(\) => void toggle\(!tracking\)\}/);
  assert.match(source, /switchTouchTarget: \{ width: 44, height: 44, alignItems: "center", justifyContent: "center" \}/);
  assert.match(source, /switchTrack: \{ width: 44, height: 24, borderRadius: 12, borderWidth: 1/);
  assert.match(source, /switchThumb: \{ position: "absolute", top: 3, width: 18, height: 18, borderRadius: 9/);
  assert.match(source, /pointerEvents="none"/);
  assert.equal((source.match(/accessibilityRole="switch"/g) ?? []).length, 1);
  const trackWidth = 44, thumbWidth = 18, endInset = 3;
  assert.equal(trackWidth - thumbWidth - 2 * endInset, 20);
  assert.match(source, /outputRange: \[0, I18nManager\.isRTL \? -20 : 20\]/);
  assert.match(source, /I18nManager\.isRTL && !I18nManager\.doLeftAndRightSwapInRTL \? styles\.switchThumbRtl : styles\.switchThumbLtr/);
  assert.match(source, /Animated\.timing\(switchAnimation/);
  assert.match(source, /useNativeDriver: true/);
});

test("RTL thumb anchors exactly once with or without automatic React Native left/right swapping", () => {
  assert.match(source, /I18nManager\.isRTL && !I18nManager\.doLeftAndRightSwapInRTL \? styles\.switchThumbRtl : styles\.switchThumbLtr/);
  assert.match(source, /switchThumbLtr: \{ left: 3 \}/);
  assert.match(source, /switchThumbRtl: \{ right: 3 \}/);
  assert.match(source, /outputRange: \[0, I18nManager\.isRTL \? -20 : 20\]/);
  for (const isRTL of [false, true]) {
    for (const autoSwap of [false, true]) {
      const declared = isRTL && !autoSwap ? "right" : "left";
      const physical = isRTL && autoSwap ? (declared === "left" ? "right" : "left") : declared;
      assert.equal(physical, isRTL ? "right" : "left", "the off thumb must start at the locale's logical start edge");
      const physicalOff = physical === "left" ? 3 : 44 - 3 - 18;
      const physicalOn = physicalOff + (isRTL ? -20 : 20);
      assert.equal(physicalOn, physical === "left" ? 23 : 3, "the on thumb must finish within the opposite end inset");
    }
  }
});

test("Cars result count remains independent of tracking when rate details opens", () => {
  const results = readFileSync("src/features/search/ApprovedCarResultsScreen.tsx", "utf8");
  const picker = readFileSync("src/features/search/NativeCarResultOfferPicker.tsx", "utf8");
  assert.match(results, /carResultCountLabel\(filtered\.length\)/);
  assert.doesNotMatch(results, /<NativeCarPriceAlert/);
  assert.match(picker, /sellerRow: \{ marginTop: 6, minWidth: 0, alignItems: "stretch", gap: 5 \}/);
  assert.match(picker, /seller: \{ minWidth: 0/);
  assert.match(source, /numberOfLines=\{2\}/);
  assert.match(source, /switchTouchTarget: \{ width: 44, height: 44/);
});

test("Cars toggle preserves sign-in and explicit failure feedback", () => {
  assert.match(source, /if \(next && !await readSession\(\)/);
  assert.match(source, /signInHref\("\/\(tabs\)\/profile"\)/);
  assert.match(source, /Couldn’t turn on price tracking/);
  assert.match(source, /Couldn’t turn off price tracking/);
  assert.match(source, /There was a problem starting price tracking/);
  assert.match(source, /There was a problem turning off price tracking/);
  assert.match(source, /text: "Try again"/);
});

test("Cars snackbar is animated, safe-area aware, manageable, and temporary", () => {
  assert.match(source, /CAR_PRICE_ALERT_SNACKBAR_DURATION_MS = 3_600/);
  assert.match(source, /Animated\.parallel/);
  assert.match(source, /Math\.max\(insets\.bottom, 12\) \+ 12/);
  assert.match(source, /accessibilityLiveRegion="polite"/);
  assert.match(source, /accessibilityLabel="Manage price alerts"/);
  assert.match(source, /router\.push\("\/price-alerts"\)/);
  assert.match(source, /Price tracking is on/);
  assert.match(source, /Price tracking is off/);
  assert.match(source, /You’ll no longer receive price-drop alerts for this rental\./);
  assert.match(source, /CircleCheck accessible=\{false\}/);
  assert.match(source, /We'll notify you if the price drops\./);
  assert.doesNotMatch(source, /minHeight: 78/);
  assert.match(source, /Animated\.timing\(opacity, \{ toValue: 0/);
  assert.match(source, /if \(finished\) onDismiss\(feedback\)/);
  assert.match(source, /clearTimeout\(dismissTimer\)/);
  assert.match(source, /translateY\.stopAnimation\(\); opacity\.stopAnimation\(\)/);
});

test("Cars snackbar shares the price-alert palette in light and dark themes", () => {
  assert.match(source, /styles\.snackbar, \{ backgroundColor: theme\.priceAlertSurface, borderColor: theme\.priceAlertBorder \}/);
  assert.match(source, /CircleCheck[^\n]*color=\{theme\.priceAlertAccent\}/);
  assert.match(source, /styles\.manageText, \{ color: theme\.priceAlertAccent \}/);
  assert.doesNotMatch(source, /styles\.snackbar, \{ backgroundColor: theme\.surface, borderColor: theme\.border \}/);
  assert.match(themeSource, /priceAlertSurface: "#EDF6FF",[\s\S]*priceAlertBorder: "#C8DFF7",[\s\S]*priceAlertAccent: "#1769AA"/);
  assert.match(themeSource, /priceAlertSurface: "#122A43",[\s\S]*priceAlertBorder: "#294D70",[\s\S]*priceAlertAccent: "#75BFFF"/);
});
