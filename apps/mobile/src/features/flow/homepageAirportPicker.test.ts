import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const panel = source("src/features/flow/FlightSearchPanel.tsx");
const home = source("src/features/flow/HomeFlowScreen.tsx");
const products = source("src/features/flow/ProductScreens.tsx");

test("the homepage enables its local airport picker for guest and authenticated renders", () => {
  assert.match(home, /<FlightSearchPanel compact enableHomepageDefaultOrigin homepageAirportPicker \/>/);
  assert.equal(home.match(/homepageAirportPicker/g)?.length, 1);
  assert.doesNotMatch(home, /isAuthenticated\s*\?[^:]*homepageAirportPicker/s);
});

test("default origin is homepage-only and independent of authentication state", () => {
  assert.equal(home.match(/enableHomepageDefaultOrigin/g)?.length, 1);
  assert.doesNotMatch(home, /isAuthenticated\s*\?[^:]*enableHomepageDefaultOrigin/s);
  assert.doesNotMatch(products, /enableHomepageDefaultOrigin/);
  assert.match(panel, /enableHomepageDefaultOrigin = false/);
  assert.match(panel, /userControlsOrigin\.current = true; setPicker\("from"\)/);
  assert.doesNotMatch(panel.split("useEffect")[0], /fetchHomepageDefaultOrigin\(\)/);
});

test("the actual AirportSheet calls the metro-aware search on the homepage", () => {
  assert.match(panel, /const searched = homepageOnly \? searchHomepageAirports\(query\) : searchAirports\(query\)/);
  assert.match(panel, /<AirportSheet[\s\S]*homepageOnly=\{homepageAirportPicker\}/);
});

test("origin and destination use the same metro-aware homepage AirportSheet", () => {
  assert.match(panel, /kind=\{picker === "from" \|\| picker === "to" \? picker : undefined\}/);
  assert.match(panel, /kind === "from" \? "Choose origin" : "Choose destination"/);
  assert.equal(panel.match(/<AirportSheet /g)?.length, 1);
});

test("non-homepage flight search does not enable homepage airport logic", () => {
  assert.match(products, /<FlightSearchPanel ref=\{panel\} params=\{params\} \/>/);
  assert.doesNotMatch(products, /homepageAirportPicker|searchHomepageAirports/);
  assert.match(panel, /homepageAirportPicker = false/);
});
