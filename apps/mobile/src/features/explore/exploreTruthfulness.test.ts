import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const explore = source("src/features/explore/ExploreScreen.tsx") + source("src/features/explore/exploreData.ts");
const products = source("src/features/flow/ProductScreens.tsx");
const results = source("src/features/flow/TravelResultsScreen.tsx");

test("Explore and product entry screens contain no prototype prices or commercial claims", () => {
  const entry = explore + products;
  for (const copy of ["$420", "$680", "$350", "$540", "$210", "$320", "$120", "$140", "$90", "$25/day", "$45/day", "$85/day", "Best Price Guarantee", "We match any lower price", "Free Cancellation", "Deals for you", "Today’s top deals"]) assert.doesNotMatch(entry, new RegExp(copy.replace(/[$]/g, "\\$&"), "i"));
});

test("misleading Explore and View all interactions are absent", () => {
  assert.doesNotMatch(explore, /destination.*Anywhere|goDestination\("Anywhere"\)/);
  assert.doesNotMatch(explore + products, /onPress=\{\(\) => undefined\}/);
  assert.doesNotMatch(explore, /Miami|Round trip/);
});

test("provider-backed result prices remain rendered", () => {
  assert.match(results, /result\.currency.*result\.price\.toFixed/);
  assert.match(results, /result\.totalPrice\.toFixed/);
  assert.match(results, /offer\.totalPrice\.toFixed/);
});

test("Deals retains every reusable product form and package tab", () => {
  for (const route of ["/flights", "/hotels", "/cars"]) assert.match(products, new RegExp(route));
  for (const tab of ["hotel-flight", "hotel-flight-car", "flight", "hotel", "car"]) assert.match(products, new RegExp(`value: "${tab}"`));
});
