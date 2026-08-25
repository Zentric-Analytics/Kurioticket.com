import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const resultsBody = source.slice(
  source.indexOf("export function ApprovedResultsScreen"),
  source.indexOf("const stopLabels"),
);

test("ready flight results place the hierarchy controls before the alert and cards", () => {
  const sectionList = source.slice(source.indexOf("<SectionList"), source.indexOf(") : (", source.indexOf("<SectionList")));
  const renderItem = sectionList.slice(sectionList.indexOf("renderItem="), sectionList.indexOf("ListHeaderComponent="));
  const stickyHeader = sectionList.slice(sectionList.indexOf("renderSectionHeader="), sectionList.indexOf("ListEmptyComponent="));

  assert.match(renderItem, /index === 0 && status === "ready" && !flightState && plan\.plan/);
  assert.ok(renderItem.indexOf("<PriceAlert") < renderItem.indexOf("<FlightCard"), "the alert should precede the first real flight card");
  assert.match(stickyHeader, /flightResultCountLabel\(sorted\.length\)[\s\S]*?filterRail : null/);
  assert.doesNotMatch(stickyHeader, /PriceAlert/);
  assert.match(sectionList, /stickySectionHeadersEnabled/);
  assert.match(sectionList, /sections=\{\[\{ data: !flightState \? sorted as FlightResult\[\] : \[\] \}\]\}/);
  assert.doesNotMatch(sectionList, /data:.*PriceAlert|keyExtractor=.*PriceAlert/);
  assert.doesNotMatch(sectionList, /ListFooterComponent=[^\n]*PriceAlert/);
  assert.equal(
    renderItem.match(/<PriceAlert/g)?.length,
    1,
    "the flight price alert should render only once",
  );
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

  assert.match(bannerStyle, /paddingVertical: 6/);
  assert.doesNotMatch(bannerStyle, /(?:minHeight|height):/);
  assert.doesNotMatch(source, /flightAlertIcon:/);
  assert.match(copyStyles, /flightAlertCopy: \{[^}]*gap: 2/);
  assert.match(copyStyles, /flightAlertTitle: \{ fontSize: 15, lineHeight: 19/);
  assert.match(copyStyles, /flightAlertSubtitle: \{ fontSize: 12, lineHeight: 16/);
});

test("the flight alert has no aircraft placeholder or visible banner border", () => {
  const component = source.slice(source.indexOf("function PriceAlert"), source.indexOf("export function BottomNav"));
  const bannerStyle = source.slice(source.indexOf("flightAlert: {"), source.indexOf("flightAlertCopy: {"));

  assert.doesNotMatch(component, /<Image|flight-price-alert-aircraft|flight-price-alert-bell|flights-aircraft/);
  assert.doesNotMatch(bannerStyle, /borderWidth|borderColor/);
});

test("the flight alert uses semantic light and dark theme values", () => {
  const theme = readFileSync(resolve("src/theme/AppTheme.tsx"), "utf8");
  for (const token of ["priceAlertSurface", "switchTrack", "switchTrackActive"]) {
    assert.equal(theme.match(new RegExp(`${token}:`, "g"))?.length, 2, `${token} should be defined for both themes`);
    assert.match(source, new RegExp(`theme\\.${token}`));
  }
});

test("flight price-alert eligibility is route-level while the count stays filter-aware", () => {
  assert.match(source, /index === 0 && status === "ready" && !flightState && plan\.plan/);
  assert.doesNotMatch(source, /sorted\.length > 0 && availability\.priceAlerts/);
  assert.match(source, /flightResultCountLabel\(sorted\.length\)/);
});

test("feature-disabled flight results pass availability into the switch while retaining existing alert management", () => {
  assert.match(resultsBody, /<PriceAlert product=\{product\} plan=\{plan\.plan\} results=\{results as FlightResult\[\]\} available=\{availability\.priceAlerts\} \/>/);
  assert.match(resultsBody, /product === "hotel" && availability\.priceAlerts \? <PriceAlert/);
});

test("loading and error states cannot expose the flight price alert", () => {
  assert.doesNotMatch(source, /status === "(?:loading|error)"[^\n]*<PriceAlert/);
  assert.match(source, /index === 0 && status === "ready" && !flightState && plan\.plan/);
});
