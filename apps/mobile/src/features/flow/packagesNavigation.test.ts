import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("home exposes the canonical Packages identity and route in product order", () => {
  const home = source("src/features/flow/HomeFlowScreen.tsx");
  const flights = home.indexOf('{ label: "Flights"');
  const hotels = home.indexOf('{ label: "Hotels"');
  const cars = home.indexOf('{ label: "Cars"');
  const packages = home.indexOf('{ label: "Packages", route: "/packages", icon: "packages" }');

  assert.ok(flights < hotels && hotels < cars && cars < packages);
  assert.doesNotMatch(home, /label: "Deals"/);
  assert.match(home, /accessibilityLabel=\{`Open \$\{product\.label\}`\}/);
  assert.match(home, /product\.route !== "\/packages" \|\| availability\.deals/);
});

test("Packages icon composes the configurable, decorative canonical mark", () => {
  const icon = source("src/features/flow/PackagesIcon.tsx");

  assert.match(icon, /export function PackagesIcon/);
  assert.match(icon, /Building2/);
  assert.match(icon, /Plane/);
  assert.match(icon, /CarFront/);
  assert.match(icon, /size = 24/);
  assert.match(icon, /color = "#071A48"/);
  assert.match(icon, /rotate: "-12deg"/);
  assert.match(icon, /size \* 0\.68/);
  assert.match(icon, /size \* 0\.58/);
  assert.match(icon, /size \* 0\.5/);
  assert.match(icon, /accessibilityElementsHidden/);
  assert.match(icon, /importantForAccessibility="no-hide-descendants"/);
  assert.doesNotMatch(icon, /\bTag\b|name="deal"/);
});

test("customer and legacy routes share the existing package screen", () => {
  const dealsRoute = source("app/deals.tsx");
  const packagesRoute = source("app/packages.tsx");

  assert.equal(packagesRoute, dealsRoute);
  assert.match(packagesRoute, /DealsScreen as default/);
});

test("package destination uses customer-facing copy while preserving internal models", () => {
  const products = source("src/features/flow/ProductScreens.tsx");

  assert.match(products, /title="Packages"/);
  assert.match(products, /Checking package availability…/);
  assert.match(products, /Packages are temporarily unavailable/);
  assert.doesNotMatch(products, /title="Deals"|Checking Deals availability|Deals are temporarily unavailable/);
  assert.match(products, /export function DealsScreen/);
  assert.match(products, /type DealTab/);
  assert.match(products, /availability\.deals/);
});
