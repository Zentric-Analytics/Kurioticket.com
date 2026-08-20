import * as assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("home product controls switch in place while dedicated product routes remain", () => {
  const home = source("src/features/flow/HomeFlowScreen.tsx");
  for (const route of ["/flights", "/hotels", "/cars", "/packages"]) assert.match(home, new RegExp(`route: "${route}"`));
  assert.match(home, /setActiveProduct\(product\.id\)/);
  assert.doesNotMatch(home, /router\.push\(product\.route\)/);
  assert.equal(existsSync(join(process.cwd(), "app", "deals.tsx")), true);
  assert.equal(existsSync(join(process.cwd(), "app", "packages.tsx")), true);
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
  assert.match(flight, /options=\{\[\{ value: "round-trip"/);
  assert.match(flight, /value: "multi-city"/);
  assert.match(flight, /from: current\.to, to: current\.from/);
  assert.match(flight, /validateFlightForm\(form\)/);
  assert.match(flight, /pathname: "\/flight-results"/);
});

test("deals and read-only My Trips expose real selected-state controls without internal management routes", () => {
  const products = source("src/features/flow/ProductScreens.tsx");
  const tabs = source("src/features/flow/TabScreens.tsx");
  assert.match(products, /useState<DealTab>\("hotel-flight"\)/);
  assert.match(tabs, /useState<TripTab>\("upcoming"\)/);
  assert.match(tabs, /Linking\.openURL/);
  assert.match(tabs, /providerConfirmationCode/);
  assert.doesNotMatch(tabs, /pathname: "\/trips\/\[id\]"/);
});

test("profile exposes only account capabilities backed by production data", () => {
  const profile = source("src/features/profile/profileModel.ts");
  for (const route of ["/personal-information", "/price-alerts", "/saved", "/settings", "/faq", "/support", "/email-preferences", "/travel-preferences"]) assert.match(profile, new RegExp(route));
  for (const unsupported of ["/payment-methods", "/saved-travelers", "Saved travelers", "Language selection", "not available in this version"]) assert.doesNotMatch(profile, new RegExp(unsupported));
  assert.doesNotMatch(profile, /https:\/\/kurioticket\.com\/(faq|support)/);
});

test("unsupported routes are absent while compatibility routes remain", () => {
  for (const route of ["payment-methods.tsx", "saved-travelers.tsx", "explore-trip.tsx"]) assert.equal(existsSync(join(process.cwd(), "app", route)), false);
  for (const route of ["welcome.tsx", "home.tsx", "connection-status.tsx"]) assert.equal(existsSync(join(process.cwd(), "app", route)), true);
});
