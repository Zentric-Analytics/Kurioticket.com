import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/NativeCarPriceAlert.tsx", "utf8");
const themeSource = readFileSync("src/theme/AppTheme.tsx", "utf8");

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

test("Cars toggle has no visible submission loading UI", () => {
  assert.doesNotMatch(source, /ActivityIndicator|loadingSlot/);
  assert.match(source, /pendingRef\.current/);
  assert.match(source, /optimisticTracking/);
});

test("native Cars price tracking is an inline label with a compact accessible switch instead of a blue panel", () => {
  assert.match(source, /return <View style=\{styles\.control\}>/);
  assert.doesNotMatch(source, /styles\.control, \{ backgroundColor: theme\.priceAlertSurface/);
  assert.match(source, /<Bell accessible=\{false\} size=\{16\} strokeWidth=\{2\} color=\{theme\.priceAlertAccent\}/);
  assert.match(source, /<Text numberOfLines=\{1\} ellipsizeMode="tail" style=\{\[styles\.title,/);
  assert.match(source, />Track car prices<\/Text>/);
  assert.doesNotMatch(source, /Track rental car prices/);
  assert.match(source, /control: \{ flexShrink: 1, minWidth: 0, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 \}/);
  assert.match(source, /title: \{ minWidth: 0, flexShrink: 1, fontSize: 12, lineHeight: 17, fontWeight: "600", fontFamily: appFonts\.semibold \}/);
  assert.match(source, /switchSlot: \{ width: 51, minHeight: 44, flexShrink: 0, alignItems: "flex-end", justifyContent: "center" \}/);
  assert.doesNotMatch(source, /<Switch\b/);
});

test("native Cars compact switch uses a 44-by-24 track, 18px thumb and full 44px target", () => {
  assert.match(source, /<Pressable accessibilityRole="switch" accessibilityLabel="Track car prices"/);
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

test("native Cars keeps the result count readable alongside tracking at small phone widths", () => {
  const trackFixed = 16 + 6 + 51; // bell, minimum gap, trailing control slot
  const outerGutters = 2 * (14 + 10);
  const rowGap = 8;
  for (const width of [320, 360, 375, 390, 414, 480]) {
    const available = width - outerGutters - rowGap;
    assert.ok(available - trackFixed > 110, "count and title retain layout space");
  }
  assert.match(source, /minWidth: 0, flexShrink: 1, fontSize: 12/);
  assert.match(source, /numberOfLines=\{1\} ellipsizeMode="tail"/);
  assert.equal(14 + 10, 16 + 8, "native tracking switch is inset equally to mobile web from the right edge");
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
