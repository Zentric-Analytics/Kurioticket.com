import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const picker = readFileSync("src/components/search/MobileCarLocationPicker.tsx", "utf8");
const recents = readFileSync("src/lib/cars/recentCarLocations.ts", "utf8");
const homepage = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
const cars = readFileSync("src/app/cars/page.tsx", "utf8");
const packages = readFileSync("src/components/search/DealsSearchForm.tsx", "utf8");

test("shared Cars picker matches approved mobile structure", () => {
  assert.match(picker, /showCancelAction=\{false\}[\s\S]*showBackLabel=\{false\}/);
  assert.match(picker, /mode === "pickup"[\s\S]*Pickup location[\s\S]*Return location/);
  assert.match(picker, /carsResults\.returnLocationLabel/);
  assert.match(picker, /<Search aria-hidden="true"/);
  assert.match(picker, /Airport, city, or address/);
  assert.match(picker, /recentSearches\.title/);
  assert.match(picker, /carsSearch\.locationSuggestions/);
  for (const icon of ["Clock3", "Building2", "Plane"]) assert.match(picker, new RegExp(icon));
  assert.match(picker, /h-\[52px\][\s\S]*Done/);
});

test("blank mobile Cars queries stay clean and never request generic suggestions", () => {
  assert.match(picker, /const trimmedQuery = query\.trim\(\);\s*if \(!trimmedQuery\) return;/);
  assert.match(picker, /searchCarLocationSuggestions\(trimmedQuery, \{ limit: 8 \}\)/);
  assert.doesNotMatch(picker, /searchCarLocationSuggestions\(query,/);
  assert.doesNotMatch(picker, /carsSearch\.popularLocations|Popular locations/);
  assert.doesNotMatch(picker, /query\.trim\(\) \? results : results/);
});

test("results and empty states render only for a completed non-empty query", () => {
  assert.match(picker, /\{trimmedQuery \? <section[\s\S]*carsSearch\.locationSuggestions[\s\S]*results\.map/);
  assert.match(picker, /searchCompleted && !results\.length[\s\S]*carsSearch\.noMatchingLocations/);
  assert.match(picker, /!trimmedQuery && recents\.length[\s\S]*recentSearches\.title/);
  assert.doesNotMatch(picker, /Start typing to see suggestions/);
});

test("opening and clearing the query immediately discard stale suggestions", () => {
  assert.match(picker, /setQuery\(""\);\s*setDraft\(null\);\s*setResults\(\[\]\);\s*setSearchCompleted\(false\)/);
  assert.match(picker, /onChange=\{\(event\) => \{ setQuery\(event\.target\.value\); setDraft\(null\); setResults\(\[\]\); setSearchCompleted\(false\); \}\}/);
  assert.match(picker, /\{trimmedQuery \? <section/);
});

test("Pickup and Return share the same query-gated picker body", () => {
  assert.equal((picker.match(/export function MobileCarLocationPicker/g) ?? []).length, 1);
  assert.match(picker, /mode: "pickup" \| "return"/);
  assert.match(picker, /mode === "pickup"[\s\S]*Pickup location[\s\S]*Return location/);
});

test("Cars recents are dedicated, capped, deduped, and removable", () => {
  assert.match(recents, /kurioticket:recent-car-locations/);
  assert.match(recents, /MAX_RECENTS = 3/);
  assert.match(recents, /filter\(\(item\) => item\.id !== location\.id\)/);
  assert.match(recents, /removeRecentCarLocation/);
  assert.ok((recents.match(/localStorage\.setItem/g) ?? []).length === 2);
  assert.ok((recents.match(/try \{/g) ?? []).length >= 3);
});

test("homepage, standalone Cars, and Packages reuse the shared picker", () => {
  for (const source of [homepage, cars, packages]) assert.match(source, /<MobileCarLocationPicker/);
  assert.match(homepage, /onCommit=\{\(value\) => updateCarsValue/);
  assert.match(cars, /onCommit=\{\(nextValue\) => updateValue/);
  assert.match(packages, /customizeInheritedField\(current, "carPickup", nextValue\)/);
});

test("desktop CarLocationAutocomplete remains available", () => {
  assert.match(homepage, /hidden sm:block[\s\S]*CarLocationAutocomplete/);
  assert.match(cars, /<CarLocationAutocomplete/);
});
