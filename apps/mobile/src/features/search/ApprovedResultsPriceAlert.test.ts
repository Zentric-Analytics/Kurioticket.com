import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source = fs.readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const flightAlert = source.slice(source.indexOf("function PriceAlert"), source.indexOf("export function BottomNav"));

test("Flight Results toggle manages alerts in place rather than opening Price Alerts", () => {
  assert.doesNotMatch(flightAlert.slice(0, flightAlert.indexOf("if (flight)")), /push\("\/price-alerts"\)/);
  assert.match(flightAlert, /updatePriceAlertStatus\(matchingAlert\.id, "ACTIVE"\)/);
  assert.match(flightAlert, /updatePriceAlertStatus\(matchingAlert\.id, "PAUSED"\)/);
  assert.match(flightAlert, /createPriceAlert\(buildFlightPriceAlertPayload/);
});

test("Flight Results switch exposes real state and prevents duplicate pending taps", () => {
  assert.match(flightAlert, /value=\{isTracking\}/);
  assert.match(flightAlert, /checked: isTracking/);
  assert.match(flightAlert, /disabled=\{pending \|\| loadingAlert \|\| unavailable\}/);
  assert.match(flightAlert, /if \(pendingRef\.current \|\| loadingAlert/);
});

test("guest activation is gated by the canonical session and sign-in flow", () => {
  assert.match(flightAlert, /if \(!await readSession\(\)\.catch\(\(\) => null\)\)/);
  assert.match(flightAlert, /"Sign in required"/);
  assert.match(flightAlert, /"Sign in to track prices for this route\."/);
  assert.match(flightAlert, /router\.push\("\/\(tabs\)\/profile\/sign-in"\)/);
});

test("new alerts validate target input through the shared helper before creation", () => {
  assert.match(flightAlert, /parseTargetPrice\(targetDraft\)/);
  assert.match(flightAlert, /visible=\{targetOpen\}/);
  assert.match(flightAlert, /setMatchingAlert\(created\.alert\)/);
});
