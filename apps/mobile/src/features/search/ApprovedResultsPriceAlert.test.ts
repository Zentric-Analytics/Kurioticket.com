import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const alert = source.slice(source.indexOf("function PriceAlert"), source.indexOf("export function BottomNav"));
const flight = alert.slice(alert.indexOf("if (flight)"), alert.indexOf('if (product !== "hotel"'));
const hotel = alert.slice(alert.indexOf('if (product !== "hotel"'));

test("Flight Results keeps one compact accessible Track Price switch", () => {
  assert.equal(source.match(/<PriceAlert product="flight"/g)?.length, 1);
  assert.match(flight, /<Switch[\s\S]*accessibilityRole="switch"[\s\S]*accessibilityLabel="Track this flight price"/);
  assert.match(source, /compactPriceAlert: \{[^\n]*minHeight: 52[^\n]*borderRadius: 12/);
});

test("Flight OFF to ON creates an automatic alert from current live Duffel results", () => {
  assert.match(alert, /selectAutomaticFlightBaseline\(presentation\.liveResults, plan\.payload\.currency\)/);
  assert.match(alert, /travelApi\.createPriceAlert\(buildAutomaticFlightPriceAlertPayload\(plan, baseline\.price, baseline\.currency\)\)/);
  assert.doesNotMatch(flight, /Modal|TextInput|Target price|Create alert/);
});

test("Flight pause, reactivation, duplicate reconciliation and sign-in remain authoritative", () => {
  assert.match(alert, /matchingAlert\?\.status === "PAUSED"[\s\S]*updatePriceAlertStatus\(matchingAlert\.id, "ACTIVE"\)/);
  assert.match(alert, /updatePriceAlertStatus\(matchingAlert\.id, "PAUSED"\)/);
  assert.match(alert, /error instanceof TravelApiError && error\.status === 409[\s\S]*matchingFlightPriceAlert/);
  assert.match(alert, /readSession\(\)[\s\S]*requireSignIn\(\)/);
});

test("Flight reserves a stable loading slot and exposes accessible snackbar feedback", () => {
  assert.match(flight, /s0\.flightAlertLoadingSlot/);
  assert.match(source, /flightAlertLoadingSlot: \{ width: 20, minHeight: 44/);
  assert.match(source, /<PriceTrackingSnackbar[\s\S]*flightPriceAlertFeedback/);
  assert.match(alert, /onFeedback\?\.\("active"\)/);
  assert.match(alert, /onFeedback\?\.\("paused"\)/);
});

test("Hotel retains target entry, validation, paused-target reconciliation and modal accessibility", () => {
  assert.match(hotel, /<Modal visible=\{targetOpen\}/);
  assert.match(hotel, /<TextInput autoFocus/);
  assert.match(hotel, /message\("targetTotal"\)/);
  assert.match(alert, /parseTargetPrice\(targetDraft\)/);
  assert.match(alert, /samePausedHotelTarget[\s\S]*matchingHotelPriceAlert/);
  assert.match(alert, /buildHotelPriceAlertPayload/);
  assert.match(hotel, /accessibilityLabel="Close price alert"/);
});
