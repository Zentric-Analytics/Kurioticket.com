import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./HotelResultsClient.tsx", import.meta.url), "utf8");

test("wide desktop uses a dedicated 288px rail and smaller screens use the filter dialog", () => {
  assert.match(source, /xl:grid-cols-\[288px_minmax\(0,1fr\)\]/);
  assert.match(source, /w-\[288px\][^\n]*xl:block/);
  assert.match(source, /sm:w-\[420px\] xl:hidden/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /max-width: 1279px/);
});

test("hotel class is multi-select and empty selection means all", () => {
  assert.match(source, /selectedHotelClasses: number\[\]/);
  assert.match(source, /type="checkbox"/);
  assert.match(source, /selectedHotelClasses\.length === 0/);
  assert.doesNotMatch(source, /Any property type|Any room type/);
});

test("price filters share the static estimated-total basis", () => {
  assert.match(source, /Minimum estimated stay total/);
  assert.match(source, /Maximum estimated stay total/);
  assert.match(source, /Estimated total for \{stayNights\}/);
  assert.match(source, /total >= minPrice && total <= maxPrice/);
  assert.match(source, /kind: "priceRange"/);
});

test("filter sheet exposes clear and deterministic result apply feedback", () => {
  assert.match(source, /disabled=\{activeFilterCount === 0\}/);
  assert.match(source, /Show \{sortedVisibleHotels\.length\}/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /event\.key === "Tab"/);
});
