import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source = fs.readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const flightAlert = source.slice(source.indexOf("function PriceAlert"), source.indexOf("export function BottomNav"));

test("Flight Results price alert maps its existing weights to Inter faces", () => {
  assert.match(source, /flightAlertTitle: \{ fontSize: 14, lineHeight: 18, fontWeight: "700", fontFamily: appFonts\.bold \}/);
  assert.match(source, /flightAlertSubtitle: \{ fontSize: 12, lineHeight: 16, fontWeight: "500", fontFamily: appFonts\.medium \}/);
});

test("Flight Results price alert has the approved compact, content-driven footprint", () => {
  const bannerStyle = source.slice(source.indexOf("flightAlert: {"), source.indexOf("flightAlertCopy: {"));
  assert.match(bannerStyle, /borderRadius: 10/);
  assert.match(bannerStyle, /paddingHorizontal: 12/);
  assert.match(bannerStyle, /paddingVertical: 4/);
  assert.match(bannerStyle, /flexDirection: "row"/);
  assert.match(bannerStyle, /gap: 8/);
  assert.doesNotMatch(bannerStyle, /(?:minHeight|height):/);
  assert.match(source, /flightPriceAlertItem: \{ paddingHorizontal: 14, paddingBottom: 5 \}/);
  assert.match(source, /flightAlertSwitchTarget: \{ minWidth: 48, minHeight: 48/);
  assert.match(source, /Get notified when fares change<\/Text>/);
  assert.match(flightAlert, /flightAlertSubtitle, \{ color: supportTextColor \}/);
});

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
  assert.match(flightAlert, /router\.push\(signInHref\("\/\(tabs\)\/profile"\)\)/);
});

test("new alerts validate target input through the shared helper before creation", () => {
  assert.match(flightAlert, /parseTargetPrice\(targetDraft\)/);
  assert.match(flightAlert, /visible=\{targetOpen\}/);
  assert.match(flightAlert, /setMatchingAlert\(created\.alert\)/);
});
