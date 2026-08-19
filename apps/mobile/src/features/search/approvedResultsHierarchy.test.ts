import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const resultsBody = source.slice(
  source.indexOf("export function ApprovedResultsScreen"),
  source.indexOf("const stopLabels"),
);

test("ready flight results place one eligible price alert before their summary and cards", () => {
  const flightAlert = source.indexOf('status === "ready" && product === "flight" && availability.priceAlerts');
  const summary = source.indexOf('status === "ready" ? (', flightAlert);
  const cards = source.indexOf('sorted.map((x, i)', summary);
  const filteredEmpty = source.indexOf('title="No flights match these filters"', cards);
  const hotelAlert = source.indexOf('product === "hotel" && availability.priceAlerts', filteredEmpty);
  const bottomNavigation = source.indexOf("<BottomNav flightResults={flightResults} />", hotelAlert);

  assert.ok(flightAlert >= 0, "the flight price-alert eligibility guard should exist");
  assert.ok(flightAlert < summary, "the flight price alert should precede the results summary");
  assert.ok(summary < cards, "the results summary should precede flight cards");
  assert.ok(cards < filteredEmpty, "flight cards should precede the filtered-empty state");
  assert.ok(filteredEmpty < hotelAlert, "the separately placed hotel price alert should remain after results");
  assert.ok(hotelAlert < bottomNavigation, "all result content should precede bottom navigation");
  assert.equal(
    source.match(/product === "flight" && availability\.priceAlerts/g)?.length,
    1,
    "the flight price alert should render only once",
  );
});

test("the compact flight alert uses the route-tracking copy and retains its existing action", () => {
  const component = source.slice(source.indexOf("function PriceAlert"), source.indexOf("export function BottomNav"));
  assert.match(component, /router\.push\("\/price-alerts"\)/);
  assert.match(component, /Track prices for this route/);
  assert.match(component, /Get notified when prices drop\./);
  assert.doesNotMatch(component, /Get the best deals/);
  assert.doesNotMatch(component, /Prices may change\. Book now and save\./);
  assert.match(component, /<Bell /);
  assert.match(component, /require\("\.\.\/\.\.\/\.\.\/assets\/heroes\/flights-aircraft\.png"\)/);
  assert.doesNotMatch(component, /Create price alert/);
  assert.doesNotMatch(component, /Create a one-time email alert/);
  assert.doesNotMatch(component, /<FlowIcon name="bell"/);
});

test("the flight price action is an accessible, backend-honest switch", () => {
  const component = source.slice(source.indexOf("function PriceAlert"), source.indexOf("export function BottomNav"));
  assert.match(component, /<Switch[\s\S]*?accessibilityLabel="Track prices"/);
  assert.match(component, /accessibilityRole="switch"/);
  assert.match(component, /accessibilityState=\{\{ checked: false \}\}/);
  assert.match(component, /value=\{false\}/);
  assert.match(component, /onValueChange=\{\(\) => router\.push\("\/price-alerts"\)\}/);
});

test("the compact alert stays horizontal and readable on narrow screens", () => {
  assert.match(source, /const narrow = width < 350/);
  assert.match(source, /flightAlert: \{[\s\S]*?flexDirection: "row"/);
  assert.doesNotMatch(source, /flightAlertNarrow: \{[^}]*flexDirection: "column"/);
  assert.match(source, /flightAlertCopy: \{ flex: 1, minWidth: 0/);
  assert.match(source, /flightAlertSkyNarrow: \{ width: 42 \}/);
  assert.match(source, /flightAlertSwitchTarget: \{ minWidth: 48, minHeight: 48/);
});

test("the flight alert uses semantic light and dark theme values", () => {
  const theme = readFileSync(resolve("src/theme/AppTheme.tsx"), "utf8");
  for (const token of ["priceAlertSurface", "priceAlertBorder", "priceAlertAccent", "switchTrack", "switchTrackActive"]) {
    assert.equal(theme.match(new RegExp(`${token}:`, "g"))?.length, 2, `${token} should be defined for both themes`);
    assert.match(source, new RegExp(`theme\\.${token}`));
  }
});

test("flight price-alert eligibility is route-level while the summary stays filter-aware", () => {
  assert.match(source, /product === "flight" && availability\.priceAlerts/);
  assert.doesNotMatch(source, /sorted\.length > 0 && availability\.priceAlerts/);
  assert.match(source, /\{sorted\.length\}\{" "\}[\s\S]*?"flights"/);
});

test("feature-disabled flight results render no unguarded price alert", () => {
  assert.equal(resultsBody.match(/<PriceAlert product=\{product\} \/>/g)?.length, 2);
  assert.match(resultsBody, /product === "flight" && availability\.priceAlerts \? \(\s*<PriceAlert/);
  assert.match(resultsBody, /product === "hotel" && availability\.priceAlerts \? <PriceAlert/);
});

test("loading and error states cannot expose the flight price alert", () => {
  assert.doesNotMatch(source, /status === "(?:loading|error)"[^\n]*<PriceAlert/);
  assert.match(source, /status === "ready" && product === "flight" && availability\.priceAlerts/);
});

test("the compact flight price notice uses the Lucide Info icon", () => {
  assert.match(source, /<Info[\s\S]*?<Text style=\{\[s0\.change, \{ color: theme\.textPrimary \}\]\}>Price may change<\/Text>/);
});
