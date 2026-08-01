import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("homepage date defaults apply equally before and after authentication resolves", () => {
  const home = source("src/features/flow/HomeFlowScreen.tsx");
  assert.match(home, /<FlightSearchPanel compact homepageAirportPicker initializeHomepageDates \/>/);
  assert.equal(home.match(/initializeHomepageDates/g)?.length, 1);
  assert.doesNotMatch(home, /isAuthenticated\s*\?[^:]*initializeHomepageDates/s);
});

test("no non-homepage screen enables homepage date initialization", () => {
  const products = source("src/features/flow/ProductScreens.tsx");
  assert.doesNotMatch(products, /initializeHomepageDates/);
  assert.match(products, /<FlightSearchPanel ref=\{panel\} params=\{params\} \/>/);
});
