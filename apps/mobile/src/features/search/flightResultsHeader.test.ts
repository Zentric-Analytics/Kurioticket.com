import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { buildSearchPlan } from "../flow/travelSearchModel";

const read = (path: string) => readFileSync(resolve(path), "utf8");
const results = read("src/features/search/ApprovedResultsScreen.tsx");
const searchUi = read("src/features/search/SearchUi.tsx");
const details = read("src/features/search/ApprovedDetailScreen.tsx");
const header = results.slice(results.indexOf("function FlightResultsHeader"), results.indexOf("function FlightSortModal"));
const styles = results.slice(results.indexOf("const s0 = StyleSheet.create"));

const payload = buildSearchPlan("flight", { tripType:"round-trip", origin:"LOS", destination:"ABV", departureDate:"2030-08-19", returnDate:"2030-08-20", adults:"2", children:"1", infants:"1", cabin:"premium-economy" }, new Date("2030-01-01T00:00:00Z")).plan?.payload;

test("Flight Results keeps a compact dynamic route header and hotel TopBar", () => {
  assert.match(results, /flightResults \? \(\s*<FlightResultsHeader/);
  assert.match(results, /payload\.origin[\s\S]*?payload\.destination/);
  assert.match(results, /<TopBar \/>/);
  assert.doesNotMatch(header, /<Logo|Notifications|<Bell/);
});

test("Back and visible Edit retain existing navigation", () => {
  assert.match(header, /accessibilityLabel="Go back"[\s\S]*?router\.back\(\)/);
  assert.match(header, /accessibilityLabel="Edit search"[\s\S]*?>Edit<\/Text>/);
  assert.match(results, /pathname: "\/edit-flight-search", params: flightEditSearchParams\(params\)/);
  assert.match(styles, /flightHeaderBack: \{[\s\S]*?width: 44,[\s\S]*?height: 44/);
});

test("summary uses trip type, dates, traveler pluralization, and cabin from canonical state", () => {
  assert.equal(payload?.travelers, 4);
  assert.equal(payload?.cabinClass, "premium-economy");
  assert.match(results, /tripTypeLabel=\{FLIGHT_TRIP_TYPE_LABELS/);
  assert.match(results, /cabinClass=\{String\(payload\.cabinClass/);
  assert.match(header, /travelerCount === 1 \? "Traveler" : "Travelers"/);
  assert.match(header, /cabinClass\.split\("-"\)/);
  assert.equal(header.match(/flightHeaderMetadataSeparator/g)?.length, 3);
});

test("summary stays a plain, horizontally scrollable secondary line", () => {
  assert.match(header, /accessibilityLabel="Trip metadata row"[\s\S]*?horizontal[\s\S]*?showsHorizontalScrollIndicator=\{false\}/);
  assert.doesNotMatch(header, /CalendarDays|<User|Briefcase/);
  assert.match(styles, /flightHeaderMetadataRow: \{[\s\S]*?flexWrap: "nowrap"/);
  assert.match(header, /color: theme\.textSecondary/);
});

test("route is protected by balanced side controls and semantic theme colors", () => {
  assert.match(styles, /flightHeaderSide: \{ width: 52/);
  assert.match(styles, /flightHeaderEdit: \{[\s\S]*?width: 52/);
  assert.match(styles, /flightHeaderRouteBlock: \{ flex: 1, minWidth: 0, alignItems: "center"/);
  assert.match(header, /backgroundColor: theme\.background/);
  assert.match(header, /color: theme\.textPrimary/);
});

test("header remains compact and shared screens remain unchanged", () => {
  assert.match(styles, /flightHeader: \{[\s\S]*?paddingTop: 12,[\s\S]*?paddingBottom: 8/);
  assert.match(searchUi, /export function TopBar/);
  assert.match(details, /accessibilityLabel="Flight details header"/);
  assert.match(results, /<BottomNav flightResults=\{flightResults\} \/>/);
});
