import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const priceAlert = source.slice(source.indexOf("function PriceAlert"), source.indexOf("export function BottomNav"));
const flightAlert = priceAlert.slice(priceAlert.indexOf("if (flight)"), priceAlert.indexOf('if (product !== "hotel"'));
const hotelAlert = priceAlert.slice(priceAlert.indexOf('if (product !== "hotel"'));

test("Flight Track Price uses a dedicated compact native switch presentation", () => {
  assert.match(flightAlert, /<Switch style=\{s0\.flightPriceAlertSwitch\} hitSlop=\{6\} accessibilityRole="switch" accessibilityLabel="Track this flight price"/);
  assert.match(source, /flightPriceAlertSwitch: \{ transform: \[\{ scale: 0\.88 \}, \{ translateY: 1 \}\] \}/);
  assert.match(source, /flightAlertSwitchSlot: \{ minWidth: 51, minHeight: 44/);
  assert.doesNotMatch(flightAlert, />On<|>Off</);
});

test("Hotel Track Price does not inherit the Flight-only transform", () => {
  assert.match(hotelAlert, /<Switch style=\{Platform\.OS === "ios" \? s0\.hotelAlertSwitchIos : undefined\}/);
  assert.doesNotMatch(hotelAlert, /flightPriceAlertSwitch|hitSlop=\{6\}/);
});
