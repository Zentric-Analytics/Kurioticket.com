import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("home product controls navigate to dedicated product routes", () => {
  const home = source("src/features/flow/HomeFlowScreen.tsx");
  for (const route of ["/flights", "/hotels", "/cars", "/deals"]) assert.match(home, new RegExp(`route: "${route}"`));
  assert.match(home, /router\.push\(product\.route\)/);
});

test("bottom navigation keeps the approved order and active accessibility state", () => {
  const layout = source("app/(tabs)/_layout.tsx");
  const tabBar = source("src/features/tabs/KurioticketTabBar.tsx");
  assert.ok(layout.indexOf('name="index"') < layout.indexOf('name="trips"'));
  assert.ok(layout.indexOf('name="trips"') < layout.indexOf('name="explore"'));
  assert.ok(layout.indexOf('name="explore"') < layout.indexOf('name="profile"'));
  assert.match(tabBar, /accessibilityState=\{\{ selected: focused \}\}/);
});

test("flight controls retain trip type, complete airport swap, and validated submission", () => {
  const flight = source("src/features/flow/FlightSearchPanel.tsx");
  assert.match(flight, /useState<TripType>\("round-trip"\)/);
  assert.match(flight, /const previous = from; setFrom\(to\); setTo\(previous\)/);
  assert.match(flight, /if \(from\.code === to\.code\)/);
  assert.match(flight, /pathname: "\/flight-results"/);
});

test("deals, trips, and trip details expose real selected-state controls and routes", () => {
  const products = source("src/features/flow/ProductScreens.tsx");
  const tabs = source("src/features/flow/TabScreens.tsx");
  const details = source("src/features/flow/TripDetailsScreen.tsx");
  assert.match(products, /useState<DealTab>\("all"\)/);
  assert.match(tabs, /useState<TripTab>\("upcoming"\)/);
  assert.match(tabs, /pathname: "\/trips\/\[id\]"/);
  assert.match(details, /travelApi\.trip\(id\)/);
  assert.match(details, /bookingReference/);
});

test("profile exposes only account capabilities backed by production data", () => {
  const tabs = source("src/features/flow/TabScreens.tsx");
  for (const route of ["/personal-information", "/price-alerts", "/currency"]) assert.match(tabs, new RegExp(route));
  for (const unsupported of ["/payment-methods", "/saved-travelers"]) assert.doesNotMatch(tabs, new RegExp(unsupported));
  assert.doesNotMatch(tabs, /Alert\.alert/);
});
