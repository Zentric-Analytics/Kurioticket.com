import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const resultsBody = source.slice(
  source.indexOf("export function ApprovedResultsScreen"),
  source.indexOf("const stopLabels"),
);

test("ready flight results follow the approved sticky hierarchy", () => {
  const header = resultsBody.indexOf("<FlightResultsHeader");
  const list = resultsBody.indexOf("<Animated.SectionList");
  const sectionList = resultsBody.slice(list, resultsBody.indexOf(") : (", list));
  const listHeader = sectionList.slice(sectionList.indexOf("ListHeaderComponent="), sectionList.indexOf("renderItem="));
  const renderItem = sectionList.slice(sectionList.indexOf("renderItem="), sectionList.indexOf("ListEmptyComponent="));

  assert.ok(header >= 0 && header < list);
  assert.match(resultsBody, /if \(status === "loading"\) return <NativeBrandedSearchLoading product=\{product\}/);
  assert.match(listHeader, /ListHeaderComponent=\{animatedFlightDateStrip\}/);
  assert.match(listHeader, /renderSectionHeader[\s\S]*?\{filterRail\}[\s\S]*?stickySectionHeadersEnabled/);
  assert.ok(listHeader.indexOf("ListHeaderComponent=") < listHeader.indexOf("renderSectionHeader="));
  assert.match(listHeader, /\{filterRail\}[\s\S]*?<FlightResultsSummaryRow/);
  assert.doesNotMatch(renderItem, /PriceAlert|flightResultCountLabel/);
  assert.match(renderItem, /<FlightCard/);
  assert.doesNotMatch(resultsBody.slice(header, list), /flightPersistentSearchControls|\{filterRail\}/);
  assert.equal(sectionList.match(/<FlightResultsSummaryRow/g)?.length, 1);
  assert.equal(source.match(/flightResultCountLabel\(count\)/g)?.length, 1);
});

test("the compact flight alert removes the large subtitle and management redirect", () => {
  const component = source.slice(source.indexOf("function PriceAlert"), source.indexOf("export function BottomNav"));
  const flightBranch = component.slice(0, component.indexOf("  return (", component.indexOf("if (flight)")));
  assert.doesNotMatch(flightBranch, /router\.push\("\/price-alerts"\)/);
  assert.match(component, /Track this flight price/);
  assert.doesNotMatch(component, /Get notified when fares change/);
  assert.doesNotMatch(component, /Get the best deals/);
  assert.doesNotMatch(component, /Prices may change\. Book now and save\./);
  assert.match(component, /<Bell accessible=\{false\} size=\{17\}/);
  assert.doesNotMatch(component, /flights-aircraft|flightAlertSky|flightAlertAircraft/);
  assert.match(component, /Create flight price alert/);
  assert.doesNotMatch(component, /Create a one-time email alert/);
  assert.doesNotMatch(component, /<FlowIcon name="bell"/);
});

test("the flight price action is an accessible, backend-honest action chip", () => {
  const component = source.slice(source.indexOf("function PriceAlert"), source.indexOf("export function BottomNav"));
  assert.match(component, /<Pressable accessibilityRole="button" accessibilityLabel=\{actionAccessibilityLabel\}/);
  assert.match(component, /accessibilityState=\{\{ selected: isTracking, disabled:/);
  assert.match(component, /onPress=\{\(\) => void handleToggle\(!isTracking\)\}/);
  assert.doesNotMatch(component, /<Switch|accessibilityRole="switch"/);
});

test("the compact alert stays horizontal and readable on narrow screens", () => {
  assert.match(source, /flightAlert: \{[\s\S]*?flexDirection: "row"/);
  assert.match(source, /flightAlertCopy: \{ flex: 1, minWidth: 0/);
  assert.match(source, /flightAlertAction: \{ minWidth: 92, height: 38/);
  assert.doesNotMatch(source, /flightAlertNarrow|flightAlertSkyNarrow/);
});

test("the flight alert uses intentional panel spacing", () => {
  const bannerStyle = source.slice(source.indexOf("flightAlertCompact: {"), source.indexOf("flightAlertCopy: {"));
  const copyStyles = source.slice(source.indexOf("flightAlertCopy: {"), source.indexOf("flightAlertAction: {"));

  assert.match(bannerStyle, /minHeight: 48/);
  assert.doesNotMatch(source, /flightAlertIcon:/);
  assert.match(copyStyles, /flightAlertCopy: \{[^}]*gap: 1/);
  assert.match(copyStyles, /flightAlertTitle: \{ fontSize: 14, lineHeight: 18, fontWeight: "700", fontFamily: appFonts\.bold/);
  assert.match(copyStyles, /flightAlertSubtitle: \{ fontSize: 12, lineHeight: 16/);
});

test("the flight alert is a neutral utility row without decoration or elevation", () => {
  const component = source.slice(source.indexOf("function PriceAlert"), source.indexOf("export function BottomNav"));
  const bannerStyle = source.slice(source.indexOf("flightAlert: {"), source.indexOf("flightAlertCopy: {"));

  assert.doesNotMatch(component, /<Image|flight-price-alert-aircraft|flight-price-alert-bell|flights-aircraft/);
  assert.doesNotMatch(component, /<FlowIcon/);
  assert.match(component, /backgroundColor: theme\.surface, borderColor: theme\.priceAlertBorder/);
  assert.doesNotMatch(bannerStyle, /shadowColor|shadowOpacity|shadowRadius|elevation/);
  assert.match(bannerStyle, /minHeight: 48/);
});

test("the flight alert uses semantic light and dark theme values", () => {
  const theme = readFileSync(resolve("src/theme/AppTheme.tsx"), "utf8");
  for (const token of ["surface", "priceAlertBorder", "switchTrack", "switchTrackActive"]) {
    assert.equal(theme.match(new RegExp(`${token}:`, "g"))?.length, 2, `${token} should be defined for both themes`);
    assert.match(source, new RegExp(`theme\\.${token}`));
  }
});

test("flight price-alert eligibility is route-level while the count stays filter-aware", () => {
  assert.match(source, /renderSectionHeader={[\s\S]*?status === "ready" && !flightState && plan\.plan[\s\S]*?<FlightResultsSummaryRow/);
  assert.doesNotMatch(source, /sorted\.length > 0 && availability\.priceAlerts/);
  assert.match(source, /count=\{sorted\.length\}/);
  assert.match(source, /flightResultCountLabel\(count\)/);
});

test("feature-disabled flight results pass availability into the switch while retaining existing alert management", () => {
  assert.match(resultsBody, /<FlightResultsSummaryRow[\s\S]*?priceAlertsAvailable=\{availability\.priceAlerts\}/);
  assert.match(resultsBody, /plan\.plan \? <PriceAlert product=\{product\} plan=\{plan\.plan\} hotelResults=\{results as HotelResult\[\]\} available=\{availability\.priceAlerts\}/);
});

test("loading and error states cannot expose the flight price alert", () => {
  assert.doesNotMatch(source, /status === "(?:loading|error)"[^\n]*<PriceAlert/);
  assert.match(source, /status === "ready" && !flightState && plan\.plan/);
});

test("ready Hotel stack has parity sections and current-page cards", () => { assert.match(resultsBody,/hotelFilterChips/); assert.match(resultsBody,/hasGoogleMapsDiscovery/); assert.match(resultsBody,/hotelResults=\{results as HotelResult\[\]\}/); assert.match(resultsBody,/hotelResultsSummary/); assert.match(resultsBody,/hotelPageResults.map/); });
test("filtered-empty Hotel state remains isolated from summary, alert, and cards", () => {
  const emptyStart = resultsBody.indexOf('status === "ready" && product === "hotel" && results.length > 0 && sorted.length === 0');
  const emptyBranch = resultsBody.slice(emptyStart, resultsBody.indexOf(": null}", emptyStart));
  assert.match(emptyBranch, /No stays match these filters\./);
  assert.match(emptyBranch, /Clear filters/);
  assert.doesNotMatch(emptyBranch, /results found|Showing 1–0|PriceAlert|HotelCard/);
});
