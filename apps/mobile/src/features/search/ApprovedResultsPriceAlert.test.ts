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

test("Flight Results price alert uses a compact premium row and native switch", () => {
  const bannerStyle = source.slice(source.indexOf("flightAlertToggleCard: {"), source.indexOf("flightAlertCopy: {"));
  assert.match(bannerStyle, /minHeight: 48/);
  assert.match(bannerStyle, /borderRadius: 12/);
  assert.match(bannerStyle, /flexDirection: "row"/);
  assert.match(bannerStyle, /gap: 9/);
  assert.match(flightAlert, /<Bell accessible=\{false\} size=\{17\}/);
  assert.match(source, /flightAlertCopy: \{ flex: 1, minWidth: 0, gap: 1 \}/);
  assert.match(source, /flightAlertSwitchSlot: \{ minWidth: 51, minHeight: 44/);
  assert.match(flightAlert, /<Switch[^>]*accessibilityRole="switch"/);
  assert.doesNotMatch(flightAlert, /Get notified when (?:this fare|fares) changes|>On<|>Off</);
});

test("Flight Results price alert uses a neutral semantic surface and restrained border", () => {
  assert.match(flightAlert, /\{ backgroundColor: theme\.surface, borderColor: theme\.priceAlertBorder \}/);
  assert.doesNotMatch(flightAlert, /backgroundColor: theme\.priceAlertSurface/);
});

test("Flight Results switch uses semantic inactive and active tracks", () => {
  assert.match(flightAlert, /trackColor=\{\{ false: theme\.dark \? "#465269" : "#CBD5E1", true: theme\.switchTrackActive \}\}/);
  assert.match(appTheme, /switchTrackActive:/);
});

test("Flight Results toggle manages alerts in place rather than opening Price Alerts", () => {
  assert.doesNotMatch(flightAlert.slice(0, flightAlert.indexOf("if (flight)")), /push\("\/price-alerts"\)/);
  assert.match(flightAlert, /updatePriceAlertStatus\(matchingAlert\.id, "ACTIVE"\)/);
  assert.match(flightAlert, /updatePriceAlertStatus\(matchingAlert\.id, "PAUSED"\)/);
  assert.match(flightAlert, /createPriceAlert\(flight \? buildFlightPriceAlertPayload/);
  assert.match(flightAlert, /: buildHotelPriceAlertPayload/);
});

test("Flight Results switch exposes real state and prevents duplicate mutations", () => {
  assert.match(flightAlert, /checked: isTracking/);
  assert.match(flightAlert, /const toggleDisabled = pending \|\| loadingAlert \|\| unavailable/);
  assert.match(flightAlert, /disabled=\{toggleDisabled\}/);
  assert.match(flightAlert, /if \(pendingRef\.current \|\| loadingAlert/);
  assert.match(flightAlert, /onValueChange=\{\(next\) => void handleToggle\(next\)\}/);
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
  assert.match(flightAlert, /setCurrentMatchingAlert\(created\.alert\)/);
});

test("Hotel Results keeps first-time activation backend-honest while opening the target modal", () => {
  assert.match(flightAlert, /if \(!matchingAlert\) \{ setTargetError\(""\); setTargetOpen\(true\); return; \}/);
  assert.match(flightAlert, /setCurrentMatchingAlert\(created\.alert\); setTargetOpen\(false\)/);
  assert.match(flightAlert, /<Button label=\{t\("cancel"\)\} outline onPress=\{\(\) => setTargetOpen\(false\)\}/);
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

test("Hotel Results reuses the compact banner with a left Bell and native switch", () => {
  const hotelAlert = flightAlert.slice(flightAlert.indexOf('if (product !== "hotel"'));
  const compactBanner = hotelAlert.slice(0, hotelAlert.indexOf("<Modal"));
  assert.match(hotelAlert, /style=\{\[s0\.flightAlertCompact,/);
  assert.match(hotelAlert, /<Bell accessible=\{false\} size=\{17\} strokeWidth=\{2\}/);
  assert.match(hotelAlert, /s0\.flightAlertCompactTitle/);
  assert.match(hotelAlert, /message\("hotelAlertTitle"\)/);
  assert.match(compactBanner, /<Switch[^>]*accessibilityRole="switch" accessibilityLabel="Track this stay price"/);
  assert.match(compactBanner, /accessibilityState=\{\{ checked: isTracking, disabled: toggleDisabled, busy: pending \|\| loadingAlert \}\}/);
  assert.match(compactBanner, /value=\{isTracking\} onValueChange=\{\(next\) => void handleToggle\(next\)\}/);
  assert.match(compactBanner, /trackColor=\{\{ false: theme\.dark \? "#465269" : "#CBD5E1", true: theme\.switchTrackActive \}\}/);
  assert.doesNotMatch(compactBanner, /<Pressable|flightCopy\.trackAction|flightCopy\.tracking|>On<|>Off<|selected:/);
  assert.doesNotMatch(source, /flightAlertAction:|flightAlertActionPressed:|flightAlertActionText:|flightAlertSwitchTarget:/);
});

test("Hotel owns native switch alignment without changing the Flight slot", () => {
  const hotelAlert = flightAlert.slice(flightAlert.indexOf('if (product !== "hotel"'));
  const compactBanner = hotelAlert.slice(0, hotelAlert.indexOf("<Modal"));
  assert.match(source, /flightAlertSwitchSlot: \{ minWidth: 51, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 \}/);
  assert.match(source, /hotelAlertSwitchSlot: \{ minWidth: 51, minHeight: 44, flexShrink: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 \}/);
  assert.match(compactBanner, /style=\{s0\.hotelAlertSwitchSlot\}/);
  assert.doesNotMatch(compactBanner, /style=\{s0\.flightAlertSwitchSlot\}/);
  assert.match(compactBanner, /style=\{Platform\.OS === "ios" \? s0\.hotelAlertSwitchIos : undefined\}/);
  assert.match(source, /hotelAlertSwitchIos: \{ transform: \[\{ translateY: 8 \}\] \}/);
  assert.doesNotMatch(compactBanner, /position: "absolute"|scaleX|scaleY/);
});

test("Hotel switch exposes ACTIVE state and disables while loading or mutating", () => {
  const hotelAlert = flightAlert.slice(flightAlert.indexOf('if (product !== "hotel"'));
  assert.match(flightAlert, /const isTracking = matchingAlert\?\.status === "ACTIVE"/);
  assert.match(hotelAlert, /const toggleDisabled = pending \|\| loadingAlert \|\| unavailable/);
  assert.match(hotelAlert, /disabled=\{toggleDisabled\}/);
  assert.doesNotMatch(hotelAlert, /hotelTracking|hotelActionLabel|hotelActionDisabled/);
});

test("Price Alert reconciliation selects the canonical matcher for Flight or Hotel", () => {
  assert.match(source, /hotelAlertPresentation, matchingHotelPriceAlert/);
  assert.doesNotMatch(flightAlert, /if \(!flight \|\| !plan\) return/);
  assert.match(flightAlert, /flight \? matchingFlightPriceAlert\(alerts, plan\) : matchingHotelPriceAlert\(alerts, plan\)/);
  assert.match(flightAlert, /reconciliation === reconciliationRef\.current/);
});

test("Hotel reconciliation retains same-search truth on transient failures and isolates search identity", () => {
  assert.match(flightAlert, /matchingAlertState && matchingAlertState\.planKey === plan\?\.key \? matchingAlertState\.alert : undefined/);
  assert.match(flightAlert, /setMatchingAlertState\(alert && plan \? \{ planKey: plan\.key, alert \} : undefined\)/);
  assert.doesNotMatch(flightAlert, /if \(!flight\) setMatchingAlert(?:State)?\(undefined\)/);
  assert.match(flightAlert, /error instanceof TravelApiError && error\.status === 401\) setCurrentMatchingAlert\(undefined\)/);
  assert.match(flightAlert, /if \(!await readSession\(\)\.catch\(\(\) => null\)\) \{\s*if \(reconciliation === reconciliationRef\.current\) setCurrentMatchingAlert\(undefined\)/);
  assert.match(flightAlert, /setCurrentMatchingAlert\(flight \? matchingFlightPriceAlert\(alerts, plan\) : matchingHotelPriceAlert\(alerts, plan\)\)/);
  assert.match(flightAlert, /const reconciliation = \+\+reconciliationRef\.current/);
});

test("Hotel pause and resume mutate the existing alert without deletion", () => {
  assert.match(flightAlert, /if \(!matchingAlert\) \{ setTargetError\(""\); setTargetOpen\(true\); return; \}/);
  assert.match(flightAlert, /updatePriceAlertStatus\(matchingAlert\.id, "ACTIVE"\)/);
  assert.match(flightAlert, /updatePriceAlertStatus\(matchingAlert\.id, "PAUSED"\)/);
  assert.doesNotMatch(flightAlert, /deletePriceAlert/);
});

test("duplicate Hotel creation reconciles server truth", () => {
  assert.match(flightAlert, /error\.status === 409\) \{ await reconcile\(\);/);
  assert.doesNotMatch(flightAlert, /error\.status === 409\) \{ if \(flight\)/);
});
