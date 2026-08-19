import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync("src/features/flow/HomeFlowScreen.tsx", "utf8");
const products = readFileSync("src/features/flow/ProductScreens.tsx", "utf8");

test("Home exposes all four in-place products in their canonical order", () => {
  const options = [...home.matchAll(/\{ id: "([^"]+)", label: "([^"]+)", route: "([^"]+)"/g)];
  assert.deepEqual(options.map((match) => match[2]), ["Flights", "Hotels", "Cars", "Packages"]);
  assert.match(home, /useState<HomeProduct>\("flights"\)/);
  assert.match(home, /onPress=\{\(\) => setActiveProduct\(product\.id\)\}/);
  assert.doesNotMatch(home, /router\.push\(product\.route\)/);
});

test("Home product tabs expose one selected state driven by activeProduct", () => {
  assert.match(home, /const selected = activeProduct === product\.id/);
  assert.match(home, /accessibilityRole="tab"/);
  assert.match(home, /accessibilityState=\{\{ selected \}\}/);
  assert.match(home, /selected && \[styles\.productActive/);
  assert.doesNotMatch(home, /index === 0/);
});

test("Home switches the search area to reusable panels without route screens", () => {
  assert.match(home, /flights: availability\.flightSearch[\s\S]*?<FlightSearchPanel compact enableHomepageDefaultOrigin homepageAirportPicker \/>/);
  assert.match(home, /hotels: availability\.hotelSearch[\s\S]*?<HomeSearchSurface>\s*<HotelSearchPanel embedded params=\{\{\}\} \/>\s*<\/HomeSearchSurface>/);
  assert.match(home, /cars: availability\.carSearch[\s\S]*?<HomeSearchSurface>\s*<CarSearchPanel embedded params=\{\{\}\} \/>\s*<\/HomeSearchSurface>/);
  assert.match(home, /packages: availability\.deals[\s\S]*?<PackagesSearchPanel presentation="home" \/>/);
  assert.match(home, /\{searchPanel\[activeProduct\]\}/);
  assert.doesNotMatch(home, /<(?:Flights|Hotels|Cars|Deals)Screen/);
});

test("every Home product remains selectable and availability gates its content", () => {
  for (const flag of ["flightSearch", "hotelSearch", "carSearch", "deals"]) {
    assert.match(home, new RegExp(`availability\\.${flag}`));
  }
  assert.match(home, /\{products\.map\(\(product\)/);
  assert.doesNotMatch(home, /products\.filter/);
});

test("Home keeps its hero and surrounding discovery content around the switchable search area", () => {
  const selector = home.indexOf("{products.map");
  const panel = home.indexOf("{searchPanel[activeProduct]}");
  assert.ok(home.indexOf("<HomeHero />") < selector);
  assert.ok(selector < panel);
  for (const component of ["PopularDestinationStays", "HomepageAdventureDiscovery", "HomepageDealPromos", "RegionalDestinationRoutes"]) {
    assert.ok(home.indexOf(`<${component} />`) > panel);
  }
});

test("Home and the Packages route share one extracted package builder", () => {
  assert.match(products, /export function PackagesSearchPanel\(\{/);
  assert.match(products, /export function DealsScreen\(\)[\s\S]*?<PackagesSearchPanel \/>/);
  assert.equal((products.match(/const dealTabs:/g) ?? []).length, 1);
  assert.equal((products.match(/function dealTabAvailable/g) ?? []).length, 1);
  assert.doesNotMatch(home, /dealTabs|dealTabAvailable|includesFlight|includesHotel|includesCar/);
});

test("dedicated product routes remain configured independently", () => {
  const options = [...home.matchAll(/\{ id: "[^"]+", label: "[^"]+", route: "([^"]+)"/g)];
  assert.deepEqual(options.map((match) => match[1]), ["/flights", "/hotels", "/cars", "/packages"]);
  for (const screen of ["FlightsScreen", "HotelsScreen", "CarsScreen", "DealsScreen"]) {
    assert.match(products, new RegExp(`export function ${screen}\\(`));
  }
});
