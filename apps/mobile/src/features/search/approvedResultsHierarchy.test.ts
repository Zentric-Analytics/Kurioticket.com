import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const resultsBody = source.slice(
  source.indexOf("export function ApprovedResultsScreen"),
  source.indexOf("const stopLabels"),
);

test("ready flight results place the hierarchy controls before the alert and cards", () => {
  const flightAlert = source.indexOf('status === "ready" && product === "flight" && plan.plan');
  const summary = source.indexOf("flightResultCountLabel(sorted.length)");
  const controls = source.indexOf("{filterRail}", summary);
  const cards = source.indexOf('sorted.map((x, i)', flightAlert);
  const filteredEmpty = source.indexOf('title="No flights match these filters"', cards);
  const hotelAlert = source.indexOf('product === "hotel" && availability.priceAlerts', filteredEmpty);
  const bottomNavigation = source.indexOf("<BottomNav flightResults={flightResults} />", hotelAlert);

  assert.ok(flightAlert >= 0, "the flight price-alert eligibility guard should exist");
  assert.ok(summary < controls, "the results count should precede controls");
  assert.ok(flightAlert < cards, "the flight price alert should precede flight cards");
  assert.ok(cards < filteredEmpty, "flight cards should precede the filtered-empty state");
  assert.ok(filteredEmpty < hotelAlert, "the separately placed hotel price alert should remain after results");
  assert.ok(hotelAlert < bottomNavigation, "all result content should precede bottom navigation");
  assert.equal(
    source.match(/product === "flight" && plan\.plan/g)?.length,
    1,
    "the flight price alert should render only once",
  );
});

test("the compact flight alert keeps its copy while replacing the management redirect", () => {
  const component = source.slice(source.indexOf("function PriceAlert"), source.indexOf("export function BottomNav"));
  const flightBranch = component.slice(0, component.indexOf("  return (", component.indexOf("if (flight)")));
  assert.doesNotMatch(flightBranch, /router\.push\("\/price-alerts"\)/);
  assert.match(component, /Track prices for this route/);
  assert.match(component, /Get notified when prices drop\./);
  assert.doesNotMatch(component, /Get the best deals/);
  assert.doesNotMatch(component, /Prices may change\. Book now and save\./);
  assert.match(component, /<Bell /);
  assert.doesNotMatch(component, /flights-aircraft|flightAlertSky|flightAlertAircraft/);
  assert.match(component, /Create flight price alert/);
  assert.doesNotMatch(component, /Create a one-time email alert/);
  assert.doesNotMatch(component, /<FlowIcon name="bell"/);
});

test("the flight price action is an accessible, backend-honest switch", () => {
  const component = source.slice(source.indexOf("function PriceAlert"), source.indexOf("export function BottomNav"));
  assert.match(component, /<Switch[\s\S]*?accessibilityLabel="Track prices"/);
  assert.match(component, /accessibilityRole="switch"/);
  assert.match(component, /accessibilityState=\{\{ checked: isTracking, disabled:/);
  assert.match(component, /value=\{isTracking\}/);
  assert.match(component, /onValueChange=\{\(next\) => void handleToggle\(next\)\}/);
});

test("the compact alert stays horizontal and readable on narrow screens", () => {
  assert.match(source, /flightAlert: \{[\s\S]*?flexDirection: "row"/);
  assert.match(source, /flightAlertCopy: \{ flex: 1, minWidth: 0/);
  assert.match(source, /flightAlertSwitchTarget: \{ minWidth: 48, minHeight: 48/);
  assert.doesNotMatch(source, /flightAlertNarrow|flightAlertSkyNarrow/);
});

test("the flight alert uses content-driven compact vertical spacing", () => {
  const bannerStyle = source.slice(source.indexOf("flightAlert: {"), source.indexOf("flightAlertIcon: {"));
  const iconStyle = source.slice(source.indexOf("flightAlertIcon: {"), source.indexOf("flightAlertCopy: {"));
  const copyStyles = source.slice(source.indexOf("flightAlertCopy: {"), source.indexOf("flightAlertSwitchTarget: {"));

  assert.match(bannerStyle, /paddingVertical: 10/);
  assert.doesNotMatch(bannerStyle, /(?:minHeight|height):/);
  assert.match(iconStyle, /width: 38[\s\S]*height: 38/);
  assert.match(copyStyles, /flightAlertCopy: \{[^}]*gap: 2/);
  assert.match(copyStyles, /flightAlertTitle: \{ fontSize: 15, lineHeight: 19/);
  assert.match(copyStyles, /flightAlertSubtitle: \{ fontSize: 12, lineHeight: 16/);
});

test("the flight alert has no aircraft placeholder or visible banner border", () => {
  const component = source.slice(source.indexOf("function PriceAlert"), source.indexOf("export function BottomNav"));
  const bannerStyle = source.slice(source.indexOf("flightAlert: {"), source.indexOf("flightAlertIcon: {"));

  assert.doesNotMatch(component, /<Image|flight-price-alert-aircraft|flights-aircraft/);
  assert.doesNotMatch(bannerStyle, /borderWidth|borderColor/);
  assert.ok(existsSync(resolve("assets/heroes/flights-aircraft.png")), "the shared aircraft asset should remain in the repository");
});

test("the flight alert uses semantic light and dark theme values", () => {
  const theme = readFileSync(resolve("src/theme/AppTheme.tsx"), "utf8");
  for (const token of ["priceAlertSurface", "priceAlertBorder", "priceAlertAccent", "switchTrack", "switchTrackActive"]) {
    assert.equal(theme.match(new RegExp(`${token}:`, "g"))?.length, 2, `${token} should be defined for both themes`);
    assert.match(source, new RegExp(`theme\\.${token}`));
  }
});

test("flight price-alert eligibility is route-level while the count stays filter-aware", () => {
  assert.match(source, /product === "flight" && plan\.plan/);
  assert.doesNotMatch(source, /sorted\.length > 0 && availability\.priceAlerts/);
  assert.match(source, /flightResultCountLabel\(sorted\.length\)/);
});

test("feature-disabled flight results pass availability into the switch while retaining existing alert management", () => {
  assert.match(resultsBody, /<PriceAlert product=\{product\} plan=\{plan\.plan\} results=\{results as FlightResult\[\]\} available=\{availability\.priceAlerts\} \/>/);
  assert.match(resultsBody, /product === "hotel" && availability\.priceAlerts \? <PriceAlert/);
});

test("loading and error states cannot expose the flight price alert", () => {
  assert.doesNotMatch(source, /status === "(?:loading|error)"[^\n]*<PriceAlert/);
  assert.match(source, /status === "ready" && product === "flight" && plan\.plan/);
});
