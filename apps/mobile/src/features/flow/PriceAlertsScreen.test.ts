import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/flow/AccountDataScreens.tsx", "utf8");
const illustration = readFileSync("src/features/flow/PriceAlertIllustration.tsx", "utf8");
const mutateStatus = screen.slice(screen.indexOf("const mutateStatus"), screen.indexOf("const deleteAlert"));
const deleteAlert = screen.slice(screen.indexOf("const deleteAlert"), screen.indexOf("const confirmDelete"));

test("available zero-alert landing uses price-tracking artwork and exact onboarding copy", () => {
  assert.match(screen, /testID="price-alert-illustration"/);
  assert.match(screen, /PriceAlertIllustration/);
  assert.match(illustration, /viewBox="0 0 220 198"/);
  assert.match(illustration, /accessibilityElementsHidden/);
  assert.match(illustration, /importantForAccessibility="no-hide-descendants"/);
  assert.match(screen, /"Track prices for your trip"/);
  assert.match(screen, /"Create a price alert from a flight search and we’ll help you keep an eye on fare changes\."/);
  assert.match(screen, /accessibilityLabel="Search flights"/);
  assert.match(screen, />Search flights<\/Text>/);
});

test("available zero-alert CTA dismisses to the existing tab root", () => {
  assert.match(screen, /accessibilityLabel="Search flights" onPress=\{\(\) => router\.dismissTo\("\/\(tabs\)"\)\}/);
  assert.doesNotMatch(screen, /router\.push\("\/\(tabs\)"\)/);
});

test("unavailable zero-alert landing has exact copy and no creation CTA branch", () => {
  assert.match(screen, /"Price alerts are temporarily unavailable"/);
  assert.match(screen, /"New price alerts can’t be created right now\. Please try again later\."/);
  assert.match(screen, /\{availability\.priceAlerts \? <Pressable accessibilityRole="button" accessibilityLabel="Search flights"[\s\S]*?<\/Pressable> : null\}/);
});

test("availability warning remains exclusive to populated alerts", () => {
  assert.match(screen, /!availability\.priceAlerts && alerts\.length \? <View style=\{styles\.feedback\}>/);
  assert.match(screen, /New and reactivated price alerts are temporarily unavailable\. Existing alerts remain available to pause or delete\./);
});

test("loading and initial errors cannot masquerade as an empty landing", () => {
  assert.match(screen, /loading && !alerts\.length \? <State loading/);
  assert.match(screen, /const initialError = Boolean\(error && !alerts\.length\)/);
  assert.match(screen, /\(!loading \|\| alerts\.length\) && !initialError \? <ScrollView/);
});

test("populated alert cards and mutation behavior remain present", () => {
  assert.match(screen, /alerts\.length \? alerts\.map/);
  assert.match(screen, /Target \{alert\.currency\} \{alert\.targetPrice\}/);
  assert.match(screen, /Last seen \{alert\.currency\} \{alert\.lastSeenPrice\}/);
  assert.match(screen, /Last checked/);
  assert.match(screen, /mutateStatus\(alert, "PAUSED"\)/);
  assert.match(screen, /mutateStatus\(alert, "ACTIVE"\)/);
  assert.match(screen, /confirmDelete\(alert\)/);
  assert.match(screen, /setAlerts\(\(value\) => value\.map/);
  assert.match(screen, /setAlerts\(\(value\) => value\.filter/);
  assert.match(screen, /revision\.current \+= 1/);
  assert.match(screen, /statusLabel\(alert\.status\)/);
});

test("alert mutations clear stale errors before their optimistic updates", () => {
  assert.match(mutateStatus, /if \(pending\[alert\.id\]\) return; setError\(""\);[\s\S]*?setAlerts\(\(value\) => value\.map/);
  assert.match(deleteAlert, /if \(pending\[alert\.id\]\) return; setError\(""\);[\s\S]*?setAlerts\(\(value\) => value\.filter/);
});

test("alert mutation failures restore state and report the new error", () => {
  assert.match(mutateStatus, /catch \(e\) \{ if \(mounted\.current\) \{ setAlerts\(\(value\) => value\.map\(\(item\) => item\.id === alert\.id \? alert : item\)\); setError\(e instanceof TravelApiError \? e\.message : "Unable to update alert\."\);/);
  assert.match(deleteAlert, /catch \(e\) \{ if \(mounted\.current\) \{ setAlerts\(\(value\) => value\.some\(\(\{ id \}\) => id === alert\.id\) \? value : \[alert, \.\.\.value\]\); setError\(e instanceof TravelApiError \? e\.message : "Unable to delete alert\."\);/);
});

test("successful final deletion can reveal the zero-alert landing without a stale error", () => {
  assert.ok(deleteAlert.indexOf('setError("")') < deleteAlert.indexOf("value.filter"));
  assert.doesNotMatch(deleteAlert, /try \{ await travelApi\.deletePriceAlert\(alert\.id\); setError/);
  assert.match(screen, /const initialError = Boolean\(error && !alerts\.length\)/);
  assert.match(screen, /alerts\.length \? alerts\.map[\s\S]*?Track prices for your trip/);
});

test("loading, authentication, and retry contracts remain present", () => {
  assert.match(screen, /travelApi\.priceAlerts\(\)/);
  assert.match(screen, /router\.replace\(signInHref\("\/price-alerts"\)\)/);
  assert.match(screen, /started === revision\.current/);
  assert.match(screen, />Try again<\/Text>/);
});

test("empty landing follows Saved and Recent responsive measurements", () => {
  assert.match(screen, /useWindowDimensions\(\)/);
  assert.match(screen, /windowHeight < 760/);
  assert.match(screen, /illustrationGap: \{ height: 66 \}/);
  assert.match(screen, /illustrationGapShort: \{ height: 55 \}/);
  assert.match(screen, /fontSize: 23, lineHeight: 30/);
  assert.match(screen, /fontSize: 15, lineHeight: 22/);
  assert.match(screen, /width: 208, minHeight: 50, marginTop: 31/);
  assert.match(screen, /emptyContent: \{ flexGrow: 1/);
});
