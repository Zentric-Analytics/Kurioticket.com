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
  assert.match(source, /onPress=\{\(\) => router\.push\(destinationHref\(item\.slug\)\)\}/);
  assert.match(source, /onPress=\{\(\) => onToggleFavorite\(item\.name\)\}/);
  assert.match(source, /accessibilityLabel=\{`Explore \$\{item\.name\}, \$\{item\.region\}, from \$\{item\.price\}`\}/);
  assert.match(source, /accessibilityState=\{\{ selected: saved \}\}/);
});

test("popular destinations route to guides while View all stays hidden", () => {
  const source = exploreSource();
  const popular = source.slice(source.indexOf("function PopularDestinations"), source.indexOf("function TrendingSearches"));
  assert.match(popular, /destinationHref\(item\.slug\)/);
  assert.doesNotMatch(popular, /goDestination\(item\.name\)|Anywhere|onViewAll/);
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

test("Trending searches keep natural-width accessible destination actions", () => {
  const source = exploreSource();
  const trending = source.slice(source.indexOf("function TrendingSearches"), source.indexOf("function DealBanner"));
  const chipStyle = source.match(/chip: \{([^}]+)\}/)?.[1] ?? "";

  for (const destination of ["New York", "London", "Dubai", "Rome", "Barcelona", "Bangkok"]) {
    assert.match(readFileSync("src/features/explore/exploreData.ts", "utf8"), new RegExp(destination));
  }
  assert.match(trending, /accessibilityLabel=\{`Search flights to \$\{name\}`\}/);
  assert.match(trending, /onPress=\{\(\) => goDestination\(name\)\}/);
  assert.match(trending, /numberOfLines=\{1\}/);
  assert.match(chipStyle, /minHeight: 46/);
  assert.match(source, /chipGrid: \{[^}]*flexWrap: "wrap"/);
  assert.doesNotMatch(chipStyle, /width:/);
  assert.doesNotMatch(chipStyle, /%/);
});

test("Explore more distinguishes routed cards from non-actionable disabled cards", () => {
  const source = exploreSource();
  const grid = source.slice(source.indexOf("function ExploreMoreGrid"), source.indexOf("export function ExploreScreen"));

  assert.match(source, /title: "Flights", description: "Search flights to anywhere"[\s\S]*router\.push\("\/flights"\)/);
  assert.match(source, /title: "Hotels", description: "Find the perfect stay"[\s\S]*router\.push\("\/hotels"\)/);
  assert.match(grid, /item\.action \? <FlowIcon name="chevron"/);
  assert.match(grid, /<View key=\{item\.title\} accessible accessibilityLabel=.*accessibilityState=\{\{ disabled: true \}\}/);
  assert.doesNotMatch(grid, /numberOfLines=\{1\}/);
  assert.doesNotMatch(grid, /Alert|alert\s*\(/);
  assert.doesNotMatch(source, /moreCardDisabled: \{[^}]*opacity/);
});
