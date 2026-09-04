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

test("Flight Results price alert uses a polished full-width panel and a 44-point switch target", () => {
  const bannerStyle = source.slice(source.indexOf("flightAlertCompact: {"), source.indexOf("flightAlertCopy: {"));
  assert.match(bannerStyle, /width: "100%"/);
  assert.match(bannerStyle, /minHeight: 62/);
  assert.match(bannerStyle, /borderRadius: 13/);
  assert.match(bannerStyle, /flexDirection: "row"/);
  assert.match(bannerStyle, /gap: 9/);
  assert.match(source, /flightAlertIcon: \{ width: 36, height: 36, borderRadius: 18/);
  assert.match(source, /flightAlertCopy: \{ flex: 1, minWidth: 0, gap: 1 \}/);
  assert.match(source, /flightAlertSwitchTarget: \{ width: 44, height: 44/);
  assert.match(source, /flightAlertSwitchVisual: \{ transform: \[\{ scaleX: 0\.78 \}, \{ scaleY: 0\.78 \}\] \}/);
  assert.match(flightAlert, /Get notified when fares change<\/Text>/);
});

test("Flight Results price alert uses a neutral semantic surface and restrained border", () => {
  assert.match(flightAlert, /\{ backgroundColor: theme\.surface, borderColor: theme\.priceAlertBorder \}/);
  assert.doesNotMatch(flightAlert, /backgroundColor: theme\.priceAlertSurface/);
});

test("Flight Results switch uses the shared, visible light-mode inactive track", () => {
  assert.match(flightAlert, /const inactiveSwitchTrackColor = theme\.dark \? theme\.switchTrack : ui\.border;/);
  assert.match(flightAlert, /trackColor=\{\{ false: inactiveSwitchTrackColor, true: theme\.switchTrackActive \}\}/);
  assert.match(flightAlert, /ios_backgroundColor=\{inactiveSwitchTrackColor\}/);
  assert.match(flightAlert, /thumbColor=\{theme\.surface\}/);
  assert.match(appTheme, /switchTrack: "#FFFFFF"/);
});

test("Flight Results toggle manages alerts in place rather than opening Price Alerts", () => {
  assert.doesNotMatch(flightAlert.slice(0, flightAlert.indexOf("if (flight)")), /push\("\/price-alerts"\)/);
  assert.match(flightAlert, /updatePriceAlertStatus\(matchingAlert\.id, "ACTIVE"\)/);
  assert.match(flightAlert, /updatePriceAlertStatus\(matchingAlert\.id, "PAUSED"\)/);
  assert.match(flightAlert, /createPriceAlert\(flight \? buildFlightPriceAlertPayload/);
  assert.match(flightAlert, /: buildHotelPriceAlertPayload/);
});

test("Flight Results switch exposes real state and prevents duplicate pending taps", () => {
  assert.match(flightAlert, /value=\{isTracking\}/);
  assert.match(flightAlert, /checked: isTracking/);
  assert.match(flightAlert, /disabled=\{pending \|\| loadingAlert \|\| unavailable\}/);
  assert.match(flightAlert, /if \(pendingRef\.current \|\| loadingAlert/);
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

test("Hotel Results reuses the Flight banner with a bounded icon action", () => {
  const hotelAlert = flightAlert.slice(flightAlert.indexOf('if (product !== "hotel"'));
  const actionStyle = source.slice(source.indexOf("hotelAlertAction: {"), source.indexOf("hotelAlertActionPressed: {"));
  assert.match(hotelAlert, /style=\{\[s0\.flightAlert,/);
  assert.match(hotelAlert, /style=\{s0\.flightAlertCopy\}/);
  assert.match(hotelAlert, /s0\.flightAlertTitle/);
  assert.match(hotelAlert, /s0\.flightAlertSubtitle/);
  assert.match(hotelAlert, /style=\{s0\.flightAlertSwitchTarget\}/);
  assert.match(hotelAlert, /accessibilityRole="button"/);
  assert.match(hotelAlert, /<Bell accessible=\{false\}/);
  assert.match(actionStyle, /width: 44/);
  assert.match(actionStyle, /height: 44/);
  assert.doesNotMatch(hotelAlert, />\{message\("createAlert"\)\}<\/Text>/);
  assert.match(hotelAlert, /setTargetOpen\(true\)/);
  assert.doesNotMatch(hotelAlert, /updatePriceAlertStatus|<Switch/);
});

test("Hotel Results compact saved state prevents duplicate creation", () => {
  const hotelAlert = flightAlert.slice(flightAlert.indexOf('if (product !== "hotel"'));
  assert.match(hotelAlert, /matchingAlert \? "Hotel price alert saved" : "Create hotel price alert"/);
  assert.match(hotelAlert, /disabled: pending \|\| unavailable \|\| Boolean\(matchingAlert\)/);
  assert.match(hotelAlert, /disabled=\{pending \|\| unavailable \|\| Boolean\(matchingAlert\)\}/);
  assert.doesNotMatch(hotelAlert, />Saved<|\{matchingAlert \? "Saved"/);
});
