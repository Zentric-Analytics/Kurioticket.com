import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const alert = readFileSync("src/features/search/HotelPriceAlert.tsx", "utf8");
const details = readFileSync("src/features/search/HotelDetailsScreen.tsx", "utf8");

test("Flight Results keeps one compact accessible Track Price switch", () => {
  assert.equal(source.match(/<FlightPriceAlert /g)?.length, 1);
  assert.match(alert, /accessibilityRole="switch"[\s\S]*accessibilityLabel=\{alertTitle\}/);
  assert.match(alert, /flightCompact: \{ minHeight: 52/);
  assert.match(alert, /flight \? "Track this flight price"/);
});

test("Flight keeps its disabled row without an eligible fare while active alerts remain pausable", () => {
  assert.match(alert, /if \(!flight && currentTotal === null\) return null/);
  assert.match(alert, /\(currentTotal === null && !isTracking\)/);
});

test("Flight OFF to ON opens the Hotel-style target sheet without creating an alert", () => {
  const toggle = alert.slice(alert.indexOf("const handleToggle"), alert.indexOf("const createAlert"));
  assert.match(toggle, /await openSheet\(\)/);
  assert.doesNotMatch(toggle, /createPriceAlert|buildAutomaticFlightPriceAlertPayload/);
  assert.match(alert, /<Modal[\s\S]*visible=\{sheetOpen\}/);
  assert.match(alert, /<FlightRangeSlider[\s\S]*singleMaximum/);
  assert.match(alert, /buildFlightPriceAlertPayload\(plan, alertTarget, alertCurrency\)/);
});

test("Flight pause, paused-target save, duplicates and sign-in remain authoritative", () => {
  assert.match(alert, /updatePriceAlertStatus\(matchingAlert.id, "PAUSED"\)/);
  assert.match(alert, /pauseActiveFlightPriceAlerts/);
  assert.match(alert, /catch \(cause\)[\s\S]*await reconcile\(\)/);
  assert.match(alert, /updatePriceAlertStatus\(samePausedTarget.id, "ACTIVE"\)/);
  assert.match(alert, /cause.status === 409[\s\S]*flightPriceAlertMatchesPlan/);
  assert.match(alert, /readSession\(\)[\s\S]*requireSignIn\(\)/);
  assert.match(alert, /planRef.current.key !== planKey/);
});

test("Flight reserves loading space and exposes feedback only after authoritative mutations", () => {
  assert.match(alert, /flightLoadingSlot: \{ width: 20, minHeight: 44/);
  assert.match(source, /<PriceTrackingSnackbar[\s\S]*flightPriceAlertFeedback/);
  assert.match(alert, /setCurrentMatchingAlert\(saved.alert\);[\s\S]*onFeedback\?\.\("active"\)/);
  assert.match(alert, /setCurrentMatchingAlert\(paused\);[\s\S]*onFeedback\?\.\("paused"\)/);
});

test("Hotel retains its target slider, validation, saved-target matching and modal accessibility", () => {
  assert.match(alert, /matchingHotelPriceAlert\(alerts, search, hotelId\)/);
  assert.match(alert, /buildHotelPriceAlertPayload\(plan, alertTarget, alertCurrency, hotel\)/);
  assert.match(alert, /readyToCreate/);
  assert.match(alert, /accessibilityViewIsModal/);
  assert.doesNotMatch(alert, /TextInput|keyboardType|autoFocus/);
});

test("Hotel tracking card matches mobile web white colour, alignment and full filter list", () => {
  const web = readFileSync("../../src/components/results/HotelPriceAlertControl.tsx", "utf8");
  assert.match(web, /min-h-\[58px\]/);
  assert.match(web, /border-\[#D8E1EC\] bg-white/);
  assert.match(alert, /hotelWebCompact: \{ minHeight: 58/);
  assert.match(alert, /hotelBellTile: \{ width: 36, height: 36/);
  assert.match(alert, /backgroundColor: theme.dark \? theme.surface : "#FFFFFF"/);
  assert.match(alert, /borderColor: theme.dark \? theme.border : "#D8E1EC"/);
  assert.match(alert, /hotelWebSubtitle/);
  assert.match(alert, /hotelWebSwitchTrack: \{ width: 42, height: 24/);
  assert.match(alert, /onPress=\{\(\) => void handleToggle\(!isTracking\)\}/);
  assert.match(source, /<HotelResultsShortcut label=\{hotelRoomTypesShortcutLabel\}/);
  assert.doesNotMatch(source, /<HotelPriceAlert\b/);
  assert.equal(details.match(/<HotelPriceAlert\b/g)?.length, 1);
  assert.match(details, /activeHotelTab === "details" && hotelAlertPlan && showHotelPriceAlert/);
  assert.ok(details.indexOf("<HotelStayEditor") < details.indexOf("<HotelPriceAlert"));
  assert.ok(details.indexOf("<HotelPriceAlert") < details.indexOf("<NativeHotelBookingDetails"));
  assert.match(details, /hotel=\{result\}[\s\S]*hotelResults=\{\[result\]\}/);
  assert.match(details, /available=\{availability.priceAlerts\}/);
});
