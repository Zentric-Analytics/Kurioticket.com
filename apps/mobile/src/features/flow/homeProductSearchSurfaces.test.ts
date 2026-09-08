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

test("Home Flight search owns a full-width rounded lower boundary", () => {
  const wrapper = home.slice(home.indexOf("function HomeFlightSearchSurface"), home.indexOf("const products"));
  assert.match(wrapper, /backgroundColor: ft\.colors\.page/);
  assert.match(wrapper, /shadowColor: ft\.colors\.shadow/);
  assert.doesNotMatch(wrapper, /ft\.styles\.shadow/);
  assert.match(home, /const HOME_CONTENT_HORIZONTAL_PADDING = 14/);
  assert.match(home, /homeFlightSearchSurface: \{[\s\S]*?marginHorizontal: -HOME_CONTENT_HORIZONTAL_PADDING,[\s\S]*?paddingHorizontal: HOME_CONTENT_HORIZONTAL_PADDING/);
  assert.match(home, /homeFlightSearchSurface: \{[\s\S]*?borderBottomLeftRadius: 30,[\s\S]*?borderBottomRightRadius: 30/);
  assert.match(home, /homeFlightSearchSurface: \{[\s\S]*?shadowOffset: \{ width: 0, height: 4 \},[\s\S]*?shadowRadius: 12,[\s\S]*?elevation: 1/);
  assert.doesNotMatch(home, /homeFlightSearchSurface: \{[^}]*border(?:Top|Left|Right|Bottom)?Width/s);
  assert.doesNotMatch(home, /homeFlightSearchBottom/);
  assert.match(home, /flights: availability\.flightSearch\s*\? <HomeFlightSearchSurface>\s*<FlightSearchPanel compact structuredSearchAppearance enableHomepageDefaultOrigin homepageAirportPicker \/>\s*<\/HomeFlightSearchSurface>/);
  assert.equal(home.match(/<HomeFlightSearchSurface>/g)?.length, 1);
  assert.match(home, /\{searchPanel\[activeProduct\]\}\s*<PopularDestinationStays compactTopSpacing=\{activeProduct === "flights"\} \/>/);
});

test("Home compacts only the Flight-to-popular-stays transition without changing the global gap", () => {
  const popularStays = readFileSync("src/features/home/PopularDestinationStays.tsx", "utf8");
  assert.match(home, /content: \{ paddingHorizontal: HOME_CONTENT_HORIZONTAL_PADDING, paddingBottom: 26, gap: 14 \}/);
  assert.match(popularStays, /section: \{ gap: 24, marginTop: 4 \}/);
  assert.match(popularStays, /compactTopSpacing: \{ marginTop: -4 \}/);
  assert.match(popularStays, /style=\{\[styles\.section, compactTopSpacing && styles\.compactTopSpacing\]\}/);
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
  assert.match(home, /homeFlightSearchSurface: \{[\s\S]*?paddingBottom: 12/);
  assert.equal(8 + 12, 20, "the existing CTA wrapper and Home surface compose 20dp clearance");
  assert.doesNotMatch(home, /searchFooter|homeSubmitFooterAppearance/);
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
