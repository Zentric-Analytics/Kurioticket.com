import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const form = readFileSync("src/features/flow/PackageSearchForm.tsx", "utf8");
const primitives = readFileSync("src/features/flow/FlowPrimitives.tsx", "utf8");
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

test("package traveler summary derives from committed party state with singular grammar", () => {
  assert.match(form, /const travelerCount = search\.adults \+ search\.children \+ search\.infants/);
  assert.match(form, /travelerCount === 1 \? "traveler" : "travelers"/);
  assert.doesNotMatch(form, /2 travelers/);
});

test("package party draft copies committed state when the sheet opens", () => {
  assert.match(form, /useState\(search\)/);
  assert.match(form, /if \(visible\) setDraft\(search\)/);
  assert.doesNotMatch(form, /setDraft\(createPackageSearch/);
});


test("Packages shares the compact search field presentation", () => {
  assert.match(form, /import \{ CompactSearchField, PrimaryButton \} from "\.\/FlowPrimitives"/);
  assert.equal((form.match(/<CompactSearchField /g) ?? []).length, 5);
  assert.doesNotMatch(form, /function CompactField/);
  assert.match(primitives, /export function CompactSearchField/);
});
