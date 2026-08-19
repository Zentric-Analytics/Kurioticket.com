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
  assert.match(home, /<HomeSearchSurface>\s*<CarSearchPanel embedded params=\{\{\}\} \/>\s*<\/HomeSearchSurface>/);
});

test("Home Packages unifies its selector and builder without a nested standalone card", () => {
  assert.match(home, /<PackagesSearchPanel presentation="home" \/>/);
  assert.match(products, /presentation = "standalone"/);
  assert.match(products, /const packageBuilder = \([\s\S]*?<ScrollView[\s\S]*?<Animated\.View/);
  assert.match(products, /return isHome \? \([\s\S]*?<View style=\{\[ft\.styles\.card, ft\.styles\.shadow\]\}>\{packageBuilder\}<\/View>/);
  assert.match(products, /!isHome && styles\.packageCard/);
  assert.match(products, /!isHome && ft\.styles\.shadow/);
});

test("dedicated Packages and embedded package children retain their presentation contracts", () => {
  assert.match(products, /export function DealsScreen\(\)[\s\S]*?<PackagesSearchPanel \/>/);
  assert.match(products, /<FlightSearchPanel embedded showSubmit=\{false\}/);
  assert.match(products, /<HotelSearchPanel\s+embedded/);
  assert.match(products, /<CarSearchPanel\s+embedded/);
});
