import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync("src/features/flow/HomeFlowScreen.tsx", "utf8");
const products = readFileSync("src/features/flow/ProductScreens.tsx", "utf8");

test("Home preserves Flights as the existing card reference", () => {
  assert.match(home, /<FlightSearchPanel compact enableHomepageDefaultOrigin homepageAirportPicker \/>/);
  assert.doesNotMatch(home, /<FlightSearchPanel embedded compact/);
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
