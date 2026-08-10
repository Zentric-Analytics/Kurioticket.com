import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ui = readFileSync(resolve("src/features/search/SearchUi.tsx"), "utf8");
const results = readFileSync(
  resolve("src/features/search/ApprovedResultsScreen.tsx"),
  "utf8",
);

test("TopBar centers its unchanged logo independently of side actions", () => {
  assert.match(ui, /logo: \{ width: 142, height: 34 \}/);
  assert.match(
    ui,
    /logoCenter: \{[\s\S]*position: "absolute"[\s\S]*top: 24[\s\S]*left: 0[\s\S]*right: 0[\s\S]*alignItems: "center"/,
  );
  assert.match(ui, /pointerEvents="none" style=\{\[s\.logoCenter, compact && s\.logoCenterCompact\]\}/);
  assert.doesNotMatch(ui, /translateX/);
});

test("TopBar keeps back behavior and exposes a functional alert button and dot", () => {
  assert.match(ui, /accessibilityLabel="Go back"[\s\S]*router\.back\(\)/);
  assert.match(
    ui,
    /<Pressable[\s\S]*accessibilityRole="button"[\s\S]*accessibilityLabel="Price alerts"[\s\S]*router\.push\("\/price-alerts"\)[\s\S]*<FlowIcon name="bell"[\s\S]*<View style=\{s\.dot\}/,
  );
});

test("approved flight results create alerts through the canonical model and API", () => {
  assert.match(results, /buildFlightPriceAlertPayload/);
  assert.match(results, /flightAlertPresentation\("flight", true, results\)/);
  assert.match(results, /parseTargetPrice\(targetDraft\)/);
  assert.match(
    results,
    /travelApi\.createPriceAlert\([\s\S]*buildFlightPriceAlertPayload\(plan, parsed\.value, currency\)/,
  );
  assert.doesNotMatch(results, /label="Track prices"/);
});

test("approved alert UI rejects invalid live state and unsupported currencies", () => {
  assert.match(results, /disabled=\{!presentation\.enabled \|\| !currency\}/);
  assert.match(results, /Price alerts require a valid live flight result\./);
  assert.match(results, /A supported result currency was not available/);
});

test("approved alert creation preserves authentication and duplicate handling", () => {
  assert.match(results, /error\.status === 401/);
  assert.match(results, /router\.push\("\/email-auth"\)/);
  assert.match(results, /error\.status === 409/);
  assert.match(results, /error\.details\?\.duplicate === true/);
  assert.match(results, /This alert already exists/);
});

test("hotels truthfully offer management only and availability gates all result alerts", () => {
  assert.match(results, /Hotel alert creation is not currently supported/);
  assert.match(results, /label="View price alerts"/);
  assert.match(results, /status === "ready" && availability\.priceAlerts/);
  assert.doesNotMatch(results, /buildHotelPriceAlert|createHotelPriceAlert/);
});

test("flight cards preserve ranking, persistent favorites, provider data, and detail navigation", () => {
  assert.match(results, /rank === 0[\s\S]*Best overall[\s\S]*Great price/);
  assert.match(results, /useSavedFlights\(\)/);
  assert.match(results, /toggle\(result\.id\)/);
  assert.match(results, /money\(result\.currency, result\.price\)/);
  assert.match(results, /result\.baggageInfo/);
  assert.match(results, /result\.refundInfo/);
  assert.match(results, /pathname: "\/flight-details"[\s\S]*result: JSON\.stringify\(result\)/);
});

test("flight-only redesign keeps filters, sorting, dates, and HotelCard implementation", () => {
  assert.match(results, /filterAndSortFlights\(results as FlightResult\[\], filters, sort\)/);
  assert.match(results, /router\.setParams[\s\S]*departureDate: v/);
  assert.match(results, /setSort\(\(x\) => \(x === "best" \? "price" : "best"\)\)/);
  assert.match(results, /function HotelCard\(/);
  assert.doesNotMatch(results, /displayFlightLegs\(result\)[\s\S]*function HotelCard[\s\S]*displayFlightLegs/);
});
