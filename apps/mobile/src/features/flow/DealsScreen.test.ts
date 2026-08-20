import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const screen = readFileSync("src/features/flow/ProductScreens.tsx", "utf8");
const form = readFileSync("src/features/flow/PackageSearchForm.tsx", "utf8");
const model = readFileSync("src/features/flow/packageSearchModel.ts", "utf8");
test("Deals exposes exactly the four coordinated package options", () => {
  const labels = [...model.matchAll(/label: "([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(labels, ["Flight + Hotel", "Flight + Car", "Hotel + Car", "Flight + Hotel + Car"]);
});
test("Packages owns one canonical surface instead of reusable product sections", () => {
  assert.match(screen, /<PackageSearchForm presentation=\{presentation\}/);
  assert.doesNotMatch(screen, /<FlightSearchPanel embedded|<HotelSearchPanel embedded|<CarSearchPanel embedded/);
  assert.equal((form.match(/label="Search package"/g) ?? []).length, 1);
});
test("mode changes stay in place and preserve canonical state", () => {
  assert.match(form, /transitionPackageMode\(current, option\.value\)/);
  assert.doesNotMatch(form, /packages\/results|package-results/);
});
