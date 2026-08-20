import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const form = readFileSync("src/features/flow/PackageSearchForm.tsx", "utf8");
const screen = readFileSync("src/features/flow/ProductScreens.tsx", "utf8");

test("Packages is one owned form with one CTA and no embedded product stack", () => {
  assert.equal((form.match(/label="Search package"/g) ?? []).length, 1);
  assert.doesNotMatch(screen, /<FlightSearchPanel embedded|<HotelSearchPanel embedded|<CarSearchPanel embedded/);
  assert.doesNotMatch(screen, />\s*(Flights|Hotels|Cars)\s*</);
  assert.match(screen, /<PackageSearchForm presentation=\{presentation\}/);
});

test("compact package selector is a horizontally scrolling accessible selection group", () => {
  assert.match(form, /accessibilityRole="radiogroup"/);
  assert.match(form, /<ScrollView horizontal showsHorizontalScrollIndicator=\{false\}/);
  assert.match(form, /accessibilityRole="radio" accessibilityState=\{\{ checked: selected, selected \}\}/);
  assert.match(form, /borderBottomColor/);
});

test("package fields expose one destination, date and coordinated party definition", () => {
  assert.equal((form.match(/label="Destination"/g) ?? []).length, 1);
  assert.equal((form.match(/label="Travel dates"/g) ?? []).length, 1);
  assert.match(form, /"Travelers & Rooms"/);
  assert.doesNotMatch(form, /Round-trip|One way-trip|Multi-city trip|packages\/results|package-results/);
});
