import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync("src/features/flow/HomeFlowScreen.tsx", "utf8");
const products = readFileSync("src/features/flow/ProductScreens.tsx", "utf8");

test("Home preserves the structured Flight search configuration", () => {
  assert.match(home, /<FlightSearchPanel compact structuredSearchAppearance enableHomepageDefaultOrigin homepageAirportPicker \/>/);
  assert.doesNotMatch(home, /<FlightSearchPanel embedded compact/);
  assert.doesNotMatch(home, /resultsModalAppearance/);
});

test("Home finishes only its Flight search with a semantic lower surface", () => {
  const wrapper = home.slice(home.indexOf("function HomeFlightSearchSurface"), home.indexOf("const products"));
  assert.match(wrapper, /\{ borderColor: ft\.colors\.border \}/);
  assert.doesNotMatch(wrapper, /backgroundColor: ft\.colors\.(?:page|surface|card)|ft\.styles\.shadow/);
  assert.match(home, /homeFlightSearchSurface: \{[\s\S]*?backgroundColor: "transparent",[\s\S]*?borderLeftWidth: 0,[\s\S]*?borderRightWidth: 0,[\s\S]*?borderBottomWidth: 1,[\s\S]*?borderTopWidth: 0,[\s\S]*?borderBottomLeftRadius: 16,[\s\S]*?borderBottomRightRadius: 16,[\s\S]*?paddingBottom: 8/);
  assert.match(home, /flights: availability\.flightSearch\s*\? <HomeFlightSearchSurface>\s*<FlightSearchPanel compact structuredSearchAppearance enableHomepageDefaultOrigin homepageAirportPicker \/>\s*<\/HomeFlightSearchSurface>/);
  assert.equal(home.match(/<HomeFlightSearchSurface>/g)?.length, 1);
  assert.match(home, /\{searchPanel\[activeProduct\]\}[\s\S]*?<PopularDestinationStays/);
});

test("Home opts into generic structured Flight cards without changing other product surfaces", () => {
  const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
  assert.match(panel, /const usesStructuredCards = resultsModalAppearance \|\| structuredSearchAppearance/);
  assert.match(panel, /showBaseline=\{!usesStructuredCards\}/);
  assert.match(panel, /styles\.routeFields, usesStructuredCards && \[styles\.resultsModalCard/);
  assert.match(panel, /label="Travel dates"[\s\S]*?appearance=\{usesStructuredCards \? "resultsModalCard" : "default"\}/);
  assert.match(panel, /label="Travelers & Cabin Class"[\s\S]*?appearance=\{usesStructuredCards \? "resultsModalCard" : "default"\}/);
  assert.match(panel, /structuredCardAppearance=\{usesStructuredCards\}/);
  assert.match(panel, /!embedded && !usesStructuredCards && ft\.styles\.card/);
});

test("Home structured Flight submits align with their cards without changing Results Change Search", () => {
  const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
  assert.match(panel, /button:\{padding:8,paddingTop:16\}/);
  assert.match(panel, /structuredSearchButton:\{paddingHorizontal:0\}/);
  assert.match(panel, /style=\{\[styles\.button, structuredSearchAppearance && styles\.structuredSearchButton\]\}/);
  assert.doesNotMatch(panel, /usesStructuredCards && styles\.structuredSearchButton/);
  assert.doesNotMatch(panel, /resultsModalAppearance && styles\.structuredSearchButton/);
});

test("Home contains embedded Hotel and Car forms in its themed search surface", () => {
  assert.match(home, /function HomeSearchSurface[\s\S]*?style=\{\[ft\.styles\.card, ft\.styles\.shadow\]\}/);
  assert.match(home, /<HomeSearchSurface>\s*<HotelSearchPanel embedded params=\{\{\}\} \/>\s*<\/HomeSearchSurface>/);
  assert.match(home, /<HomeSearchSurface>\s*<CarSearchPanel embedded params=\{\{\}\} startWithEmptyRentalDates \/>\s*<\/HomeSearchSurface>/);
  assert.match(home, /cars:[\s\S]*startWithEmptyRentalDates/);
  assert.doesNotMatch(products, /startWithEmptyRentalDates/);
});

test("Home Packages uses one package-owned card and dedicated route uses the same form", () => {
  assert.match(home, /<PackagesSearchPanel presentation="home" \/>/);
  assert.match(products, /const packageBuilder = <PackageSearchForm presentation=\{presentation\} \/>/);
  assert.match(products, /return isHome \? \([\s\S]*?ft\.styles\.card/);
  assert.match(products, /export function DealsScreen\(\)[\s\S]*?<PackagesSearchPanel \/>/);
  assert.doesNotMatch(products, /<FlightSearchPanel embedded|<HotelSearchPanel embedded|<CarSearchPanel embedded/);
});
