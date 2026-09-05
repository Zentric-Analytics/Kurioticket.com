import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(`src/features/flow/${file}`, "utf8");
const flight = read("FlightSearchPanel.tsx");
const hotel = read("HotelSearchPanel.tsx");
const car = read("CarSearchPanel.tsx");
const packages = read("PackageSearchForm.tsx");
const searchForms = [flight, hotel, car, packages];

const compactField = (source: string, label: string) => {
  const start = source.indexOf(`<CompactSearchField label="${label}"`);
  return start < 0 ? "" : source.slice(start, source.indexOf("/>", start) + 2);
};

test("native search-form location fields suppress only their trailing affordance", () => {
  for (const [source, labels] of [
    [flight, ["Origin", "Destination"]],
    [hotel, ["Destination"]],
    [car, ["Pickup location", "Drop-off location"]],
    [packages, ["Origin", "Destination"]],
  ] as const) {
    for (const label of labels) {
      const field = compactField(source, label);
      assert.match(field, /icon="location"/);
      assert.match(field, /trailing=\{false\}/);
      assert.match(field, /onPress=/);
    }
  }

  const editor = flight.slice(flight.indexOf("function MultiCityEditor"), flight.indexOf("function ErrorText"));
  for (const label of ["Origin", "Destination"]) {
    const start = editor.indexOf(`<CompactSearchField label="${label}"`);
    const field = editor.slice(start, editor.indexOf("/>", start) + 2);
    assert.match(field, /icon="location"/);
    assert.match(field, /onPress=/);
    assert.match(field, /trailing=\{false\}/);
  }
});

test("remaining native search-form field chevrons are right-facing", () => {
  for (const source of searchForms) assert.doesNotMatch(source, /name="chevronDown"/);
  assert.match(compactField(flight, "Travelers & Cabin Class"), /<FlowIcon name="chevron"/);
  assert.match(read("FlowPrimitives.tsx"), /trailing \?\? <FlowIcon name="chevron"/);
});
