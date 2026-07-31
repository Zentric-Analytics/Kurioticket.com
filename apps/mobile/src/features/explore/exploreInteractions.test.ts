import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { findAirportByDestination } from "../flow/airportMatching";
import { parseSavedDestinationIds } from "../../storage/savedDestinationsModel";

const exploreSource = () => readFileSync("src/features/explore/ExploreScreen.tsx", "utf8");

test("matches Explore destinations by city, country, or airport code", () => {
  assert.equal(findAirportByDestination("Paris")?.code, "CDG");
  assert.equal(findAirportByDestination(" united kingdom ")?.code, "LHR");
  assert.equal(findAirportByDestination("dxb")?.city, "Dubai");
  for (const city of ["Bali", "Santorini", "London"]) assert.equal(findAirportByDestination(city)?.city, city);
  assert.equal(findAirportByDestination("Beaches"), undefined);
});

test("saved destination parsing restores only identifiers and tolerates failures", () => {
  assert.deepEqual(parseSavedDestinationIds('["Paris","Dubai"]'), ["Paris", "Dubai"]);
  assert.deepEqual(parseSavedDestinationIds('["Paris",42,{"image":1}]'), ["Paris"]);
  assert.deepEqual(parseSavedDestinationIds("not json"), []);
});

test("Explore tabs remain local and expose selected accessibility state", () => {
  const source = exploreSource();
  assert.match(source, /accessibilityRole="tab" accessibilityState=\{\{ selected: tab === item \}\}/);
  assert.doesNotMatch(source, /next === "Inspiration"[\s\S]*router\.push/);
  assert.match(source, /tab === "Deals" \? <DealBanner \/>/);
});

test("heart and destination actions are sibling controls without propagation workarounds", () => {
  const source = exploreSource();
  assert.doesNotMatch(source, /stopPropagation/);
  assert.match(source, /onPress=\{\(\) => goDestination\(item\.name\)\}/);
  assert.match(source, /onPress=\{\(\) => onToggleFavorite\(item\.name\)\}/);
  assert.match(source, /accessibilityLabel=\{`Explore \$\{item\.name\}, \$\{item\.region\}, from \$\{item\.price\}`\}/);
  assert.match(source, /accessibilityState=\{\{ selected: saved \}\}/);
});

test("interest cards pass their represented destination into flight search", () => {
  const source = exploreSource();
  assert.match(source, /goDestination\(item\.destination\)/);
});

test("disabled discovery cards and the Price Alerts route are explicit", () => {
  const source = exploreSource();
  assert.match(source, /accessibilityLabel="Price alerts" onPress=\{\(\) => router\.push\("\/price-alerts"\)\}/);
  assert.match(source, /title: "Countries", description: "Coming soon"/);
  assert.match(source, /title: "Regions", description: "Coming soon"/);
  assert.doesNotMatch(source, /missing\("(?:Countries|Regions)"\)/);
});
