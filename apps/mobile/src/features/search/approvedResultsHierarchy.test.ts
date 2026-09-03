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
  assert.match(listHeader, /ListHeaderComponent=\{status === "loading" \? \([\s\S]*?<FlightLoadingExperience[\s\S]*?\) : animatedFlightDateStrip\}/);
  assert.match(listHeader, /renderSectionHeader[\s\S]*?\{filterRail\}[\s\S]*?stickySectionHeadersEnabled/);
  assert.ok(listHeader.indexOf("ListHeaderComponent=") < listHeader.indexOf("renderSectionHeader="));
  assert.ok(renderItem.indexOf("<PriceAlert") < renderItem.indexOf("flightResultCountLabel(sorted.length)"));
  assert.ok(renderItem.indexOf("flightResultCountLabel(sorted.length)") < renderItem.indexOf("<FlightCard"));
  assert.doesNotMatch(resultsBody.slice(header, list), /flightPersistentSearchControls|\{filterRail\}/);
  assert.equal(sectionList.match(/<PriceAlert/g)?.length, 1);
  assert.equal(sectionList.match(/flightResultCountLabel\(sorted\.length\)/g)?.length, 1);
});

test("the compact flight alert keeps its copy while replacing the management redirect", () => {
  const component = source.slice(source.indexOf("function PriceAlert"), source.indexOf("export function BottomNav"));
  const flightBranch = component.slice(0, component.indexOf("  return (", component.indexOf("if (flight)")));
  assert.doesNotMatch(flightBranch, /router\.push\("\/price-alerts"\)/);
  assert.match(component, /Track this flight price/);
  assert.match(component, /Get notified when fares change/);
  assert.doesNotMatch(component, /Get the best deals/);
  assert.doesNotMatch(component, /Prices may change\. Book now and save\./);
  assert.doesNotMatch(component, /flight-price-alert-bell|flightAlertIcon/);
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
  const bannerStyle = source.slice(source.indexOf("flightAlert: {"), source.indexOf("flightAlertCopy: {"));
  const copyStyles = source.slice(source.indexOf("flightAlertCopy: {"), source.indexOf("flightAlertSwitchTarget: {"));

  assert.match(bannerStyle, /borderRadius: 10/);
  assert.match(bannerStyle, /paddingVertical: 0/);
  assert.doesNotMatch(bannerStyle, /(?:minHeight|height):/);
  assert.doesNotMatch(source, /flightAlertIcon:/);
  assert.match(copyStyles, /flightAlertCopy: \{[^}]*gap: 1/);
  assert.match(copyStyles, /flightAlertTitle: \{ fontSize: 14, lineHeight: 18, fontWeight: "700", fontFamily: appFonts\.bold/);
  assert.match(copyStyles, /flightAlertSubtitle: \{ fontSize: 12, lineHeight: 16/);
});

test("the flight alert is a neutral bordered utility row without decoration or elevation", () => {
  const component = source.slice(source.indexOf("function PriceAlert"), source.indexOf("export function BottomNav"));
  const bannerStyle = source.slice(source.indexOf("flightAlert: {"), source.indexOf("flightAlertCopy: {"));

  assert.doesNotMatch(component, /<Image|flight-price-alert-aircraft|flight-price-alert-bell|flights-aircraft/);
  assert.doesNotMatch(component, /<FlowIcon/);
  assert.match(bannerStyle, /borderWidth: 1/);
  assert.match(component, /backgroundColor: theme\.surface, borderColor: theme\.priceAlertBorder/);
  assert.doesNotMatch(bannerStyle, /shadowColor|shadowOpacity|shadowRadius|elevation/);
  assert.doesNotMatch(bannerStyle, /(?:minHeight|height):/);
});

test("the flight alert uses semantic light and dark theme values", () => {
  const theme = readFileSync(resolve("src/theme/AppTheme.tsx"), "utf8");
  for (const token of ["surface", "priceAlertBorder", "switchTrack", "switchTrackActive"]) {
    assert.equal(theme.match(new RegExp(`${token}:`, "g"))?.length, 2, `${token} should be defined for both themes`);
    assert.match(source, new RegExp(`theme\\.${token}`));
  }
});

test("flight price-alert eligibility is route-level while the count stays filter-aware", () => {
  assert.match(source, /renderItem={[\s\S]*?status === "ready" && !flightState && plan\.plan[\s\S]*?<PriceAlert/);
  assert.doesNotMatch(source, /sorted\.length > 0 && availability\.priceAlerts/);
  assert.match(source, /flightResultCountLabel\(sorted\.length\)/);
});

test("feature-disabled flight results pass availability into the switch while retaining existing alert management", () => {
  assert.match(resultsBody, /<PriceAlert product=\{product\} plan=\{plan\.plan\} results=\{results as FlightResult\[\]\} available=\{availability\.priceAlerts\} \/>/);
  assert.match(resultsBody, /product === "hotel" && plan\.plan \? <PriceAlert[\s\S]*?hotelResults=\{results as HotelResult\[\]\}[\s\S]*?available=\{availability\.priceAlerts\}/);
});

test("loading and error states cannot expose the flight price alert", () => {
  assert.doesNotMatch(source, /status === "(?:loading|error)"[^\n]*<PriceAlert/);
  assert.match(source, /status === "ready" && !flightState && plan\.plan/);
});
