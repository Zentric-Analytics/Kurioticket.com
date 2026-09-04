import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source = fs.readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const appTheme = fs.readFileSync("src/theme/AppTheme.tsx", "utf8");
const flightAlert = source.slice(source.indexOf("function PriceAlert"), source.indexOf("export function BottomNav"));

test("Flight Results price alert maps its existing weights to Inter faces", () => {
  assert.match(source, /flightAlertTitle: \{ fontSize: 14, lineHeight: 18, fontWeight: "700", fontFamily: appFonts\.bold \}/);
  assert.match(source, /flightAlertSubtitle: \{ fontSize: 12, lineHeight: 16, fontWeight: "500", fontFamily: appFonts\.medium \}/);
});

test("Flight Results price alert uses a compact full-width row and action chip", () => {
  const bannerStyle = source.slice(source.indexOf("flightAlertCompact: {"), source.indexOf("flightAlertCopy: {"));
  assert.match(bannerStyle, /width: "100%"/);
  assert.match(bannerStyle, /minHeight: 48/);
  assert.match(bannerStyle, /borderRadius: 11/);
  assert.match(bannerStyle, /flexDirection: "row"/);
  assert.match(bannerStyle, /gap: 8/);
  assert.match(flightAlert, /<Bell accessible=\{false\} size=\{17\}/);
  assert.match(source, /flightAlertCopy: \{ flex: 1, minWidth: 0, gap: 1 \}/);
  assert.match(source, /flightAlertAction: \{ minWidth: 92, height: 38/);
  assert.doesNotMatch(flightAlert, /<Switch|Get notified when fares change/);
});

test("Flight Results price alert uses a neutral semantic surface and restrained border", () => {
  assert.match(flightAlert, /\{ backgroundColor: theme\.surface, borderColor: theme\.priceAlertBorder \}/);
  assert.doesNotMatch(flightAlert, /backgroundColor: theme\.priceAlertSurface/);
});

test("Flight Results chip uses semantic inactive and active surfaces", () => {
  assert.match(flightAlert, /backgroundColor: isTracking \? theme\.dark \? "#173568" : "#EEF4FF" : theme\.surface/);
  assert.match(flightAlert, /borderColor: isTracking \? theme\.switchTrackActive : theme\.priceAlertBorder/);
  assert.match(appTheme, /switchTrackActive:/);
});

test("Flight Results toggle manages alerts in place rather than opening Price Alerts", () => {
  assert.doesNotMatch(flightAlert.slice(0, flightAlert.indexOf("if (flight)")), /push\("\/price-alerts"\)/);
  assert.match(flightAlert, /updatePriceAlertStatus\(matchingAlert\.id, "ACTIVE"\)/);
  assert.match(flightAlert, /updatePriceAlertStatus\(matchingAlert\.id, "PAUSED"\)/);
  assert.match(flightAlert, /createPriceAlert\(flight \? buildFlightPriceAlertPayload/);
  assert.match(flightAlert, /: buildHotelPriceAlertPayload/);
});

test("Flight Results action chip exposes real state and prevents duplicate pending taps", () => {
  assert.match(flightAlert, /selected: isTracking/);
  assert.match(flightAlert, /disabled=\{pending \|\| loadingAlert \|\| unavailable\}/);
  assert.match(flightAlert, /if \(pendingRef\.current \|\| loadingAlert/);
  assert.match(flightAlert, /onPress=\{\(\) => void handleToggle\(!isTracking\)\}/);
});

test("guest activation is gated by the canonical session and sign-in flow", () => {
  assert.match(flightAlert, /if \(!await readSession\(\)\.catch\(\(\) => null\)\)/);
  assert.match(flightAlert, /message\("signInRequired"\)/);
  assert.match(flightAlert, /message\("signInAlertBody"\)/);
  assert.match(flightAlert, /router\.push\(signInHref\("\/\(tabs\)\/profile"\)\)/);
});

test("new alerts validate target input through the shared helper before creation", () => {
  assert.match(flightAlert, /parseTargetPrice\(targetDraft\)/);
  assert.match(flightAlert, /visible=\{targetOpen\}/);
  assert.match(flightAlert, /setMatchingAlert\(created\.alert\)/);
});

test("Hotel Results uses create-target alert presentation without a management switch", () => { assert.match(flightAlert, /"Create hotel price alert"/); assert.match(flightAlert, /setTargetOpen\(true\)/); assert.doesNotMatch(flightAlert.slice(flightAlert.indexOf('if (product !== "hotel"')), /<Switch/);
});

test("Hotel alert creation retains canonical payload, validation, duplicate and sign-in handling", () => { assert.match(flightAlert, /buildHotelPriceAlertPayload/); assert.match(flightAlert, /parseTargetPrice\(targetDraft\)/); assert.match(flightAlert, /error.status === 409/); assert.match(flightAlert, /requireSignIn/);
});

test("obsolete large Hotel Results alert styles and create button stay removed", () => {
  const styles = source.slice(source.indexOf("const s0 = StyleSheet.create"));
  assert.doesNotMatch(styles, /\bhotelAlert:/);
  assert.doesNotMatch(styles, /\bhotelAlertCopy:/);
  assert.doesNotMatch(styles, /\bhotelAlertTitle:/);
  assert.doesNotMatch(styles, /\bhotelAlertBody:/);
  assert.doesNotMatch(styles, /\bhotelAlertCreateButton(?:Pressed|Disabled|Text)?:/);
});

test("Hotel Results reuses the compact Flight banner with a left Bell and action pill", () => {
  const hotelAlert = flightAlert.slice(flightAlert.indexOf('if (product !== "hotel"'));
  assert.match(hotelAlert, /style=\{\[s0\.flightAlertCompact,/);
  assert.match(hotelAlert, /<Bell accessible=\{false\} size=\{17\} strokeWidth=\{2\}/);
  assert.match(hotelAlert, /s0\.flightAlertCompactTitle/);
  assert.match(hotelAlert, /message\("hotelAlertTitle"\)/);
  assert.match(hotelAlert, /flightCopy\.trackAction/);
  assert.match(hotelAlert, /s0\.flightAlertAction/);
  const compactBanner = hotelAlert.slice(0, hotelAlert.indexOf("<Modal"));
  assert.doesNotMatch(compactBanner, /hotelAlertBody|flightAlertSubtitle|flightAlertSwitchTarget|hotelAlertAction|<Switch/);
  assert.doesNotMatch(source, /hotelAlertAction:|hotelAlertActionPressed:|flightAlertSwitchTarget:/);
});

test("Hotel compact saved state is selected and prevents duplicate creation", () => {
  const hotelAlert = flightAlert.slice(flightAlert.indexOf('if (product !== "hotel"'));
  assert.match(hotelAlert, /const hotelTracking = Boolean\(matchingAlert\)/);
  assert.match(hotelAlert, /`✓ \$\{flightCopy\.tracking\}`/);
  assert.match(hotelAlert, /selected: hotelTracking/);
  assert.match(hotelAlert, /const hotelActionDisabled = pending \|\| unavailable \|\| hotelTracking/);
  assert.match(hotelAlert, /disabled=\{hotelActionDisabled\}/);
  assert.match(hotelAlert, /busy: pending/);
  assert.doesNotMatch(hotelAlert, /updatePriceAlertStatus|<Switch/);
});
