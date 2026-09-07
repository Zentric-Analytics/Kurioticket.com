import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync("src/features/flow/HomeFlowScreen.tsx", "utf8");
const products = readFileSync("src/features/flow/ProductScreens.tsx", "utf8");

test("Home preserves Flights as the existing card reference", () => {
  assert.match(home, /<FlightSearchPanel compact structuredSearchAppearance enableHomepageDefaultOrigin homepageAirportPicker \/>/);
  assert.doesNotMatch(home, /<FlightSearchPanel embedded compact/);
  assert.doesNotMatch(home, /resultsModalAppearance/);
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
