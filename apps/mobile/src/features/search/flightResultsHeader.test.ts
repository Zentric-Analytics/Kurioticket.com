import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { buildSearchPlan } from "../flow/travelSearchModel";

const read = (path: string) => readFileSync(resolve(path), "utf8");
const results = read("src/features/search/ApprovedResultsScreen.tsx");
const searchUi = read("src/features/search/SearchUi.tsx");
const details = read("src/features/search/ApprovedDetailScreen.tsx");
const invocation = results.slice(results.indexOf("<FlightResultsHeader"), results.indexOf("/>", results.indexOf("<FlightResultsHeader")) + 2);
const header = results.slice(results.indexOf("function FlightResultsHeader"), results.indexOf("function FlightSortModal"));
const styles = results.slice(results.indexOf("const s0 = StyleSheet.create"));

const payload = buildSearchPlan("flight", {
  tripType: "round-trip",
  origin: "LOS",
  destination: "ABV",
  departureDate: "2030-08-19",
  returnDate: "2030-08-20",
  adults: "2",
  children: "1",
  infants: "1",
  cabin: "premium-economy",
}, new Date("2030-01-01T00:00:00Z")).plan?.payload;

test("Flight Results uses a compact header containing only back, dynamic route, and visible Edit", () => {
  assert.match(results, /flightResults \? \(\s*<FlightResultsHeader/);
  assert.match(invocation, /route=\{`\$\{String\(payload\.origin/);
  assert.match(invocation, /payload\.tripType === "one-way" \? "→" : "⇄"/);
  assert.match(invocation, /payload\.destination/);
  assert.match(header, /accessibilityLabel="Flight search summary"/);
  assert.match(header, /accessibilityLabel="Go back"/);
  assert.match(header, /\{route\}/);
  assert.match(header, /accessibilityLabel="Edit search"[\s\S]*?>Edit<\/Text>/);
});

test("Flight Results header removes all secondary metadata and its component props", () => {
  for (const obsolete of [
    "Trip metadata row",
    "tripTypeLabel",
    "travelerCount",
    "cabinClass",
    "dateRange",
    "Traveler",
    "Travelers",
    "flightHeaderMetadataSeparator",
  ]) {
    assert.doesNotMatch(header, new RegExp(obsolete));
    assert.doesNotMatch(invocation, new RegExp(obsolete));
  }
  assert.doesNotMatch(header, /<ScrollView|horizontal|metadata/i);
  assert.match(header, /route: string;[\s\S]*?onEdit: \(\) => void;/);
});

test("obsolete Flight Results metadata styles are removed", () => {
  for (const style of [
    "flightHeaderMetadataAlignmentRow",
    "flightHeaderMetadataInset",
    "flightHeaderMetadataScroller",
    "flightHeaderMetadataRow",
    "flightHeaderMetadataText",
    "flightHeaderMetadataSeparator",
  ]) {
    assert.doesNotMatch(results, new RegExp(style));
  }
});

test("Back and Edit retain their existing navigation", () => {
  assert.match(header, /accessibilityLabel="Go back"[\s\S]*?router\.back\(\)/);
  assert.match(header, /accessibilityLabel="Edit search"[\s\S]*?onPress=\{onEdit\}/);
  assert.match(results, /pathname: "\/edit-flight-search", params: flightEditSearchParams\(params\)/);
  assert.match(styles, /flightHeaderBack: \{[\s\S]*?width: 44,[\s\S]*?height: 44/);
});

test("route remains centered with balanced side controls and compact spacing", () => {
  assert.match(styles, /flightHeaderSide: \{ width: 52/);
  assert.match(styles, /flightHeaderEdit: \{[\s\S]*?width: 52/);
  assert.match(styles, /flightHeaderRouteBlock: \{ flex: 1, minWidth: 0, alignItems: "center"/);
  assert.match(styles, /flightHeaderRoute: \{ minWidth: 0, textAlign: "center"/);
  assert.match(styles, /flightHeader: \{[\s\S]*?paddingTop: 12,[\s\S]*?paddingBottom: 8/);
  assert.match(header, /backgroundColor: theme\.background/);
  assert.match(header, /color: theme\.textPrimary/);
});

test("canonical flight search data remains available after presentation metadata removal", () => {
  assert.equal(payload?.tripType, "round-trip");
  assert.equal(payload?.departureDate, "2030-08-19");
  assert.equal(payload?.returnDate, "2030-08-20");
  assert.equal(payload?.travelers, 4);
  assert.equal(payload?.cabinClass, "premium-economy");
});

test("hotel TopBar and Flight Details header remain unchanged", () => {
  assert.match(results, /<TopBar \/>/);
  assert.match(searchUi, /export function TopBar/);
  assert.match(details, /accessibilityLabel="Flight details header"/);
  assert.match(details, /accessibilityLabel="Trip metadata row"/);
  assert.match(results, /<BottomNav flightResults=\{flightResults\} \/>/);
});
