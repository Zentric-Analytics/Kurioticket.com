import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const picker = readFileSync("src/components/search/MobileCarLocationPicker.tsx", "utf8");
const homepage = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
const cars = readFileSync("src/app/cars/page.tsx", "utf8");
const packages = readFileSync("src/components/search/DealsSearchForm.tsx", "utf8");

test("shared Cars picker matches approved mobile structure", () => {
  assert.match(picker, /showCancelAction=\{false\}[\s\S]*showBackLabel=\{false\}/);
  assert.match(picker, /mode === "pickup"[\s\S]*Pickup location[\s\S]*Return location/);
  assert.match(picker, /carsResults\.returnLocationLabel/);
  assert.match(picker, /<Search aria-hidden="true"/);
  assert.match(picker, /Airport, city, or address/);
  assert.match(picker, /carsSearch\.locationSuggestions/);
  for (const icon of ["Building2", "MapPin", "Plane"]) assert.match(picker, new RegExp(icon));
  assert.match(picker, /h-\[52px\][\s\S]*Done/);
});

test("blank mobile Cars queries stay clean and never request generic suggestions", () => {
  assert.match(picker, /const trimmedQuery = query\.trim\(\);\s*if \(!trimmedQuery\) \{\s*setResults\(\[\]\);\s*setSearchCompleted\(false\);\s*return;/);
  assert.match(picker, /searchCarLocationSuggestions\(trimmedQuery, \{ limit: 8 \}\)/);
  assert.doesNotMatch(picker, /searchCarLocationSuggestions\(query,/);
  assert.doesNotMatch(picker, /carsSearch\.popularLocations|Popular locations/);
  assert.doesNotMatch(picker, /recentSearches\.title|Recent searches|readRecentCarLocations|recents/);
  assert.doesNotMatch(picker, /query\.trim\(\) \? results : results/);
});

test("results and empty states render only for a completed non-empty query", () => {
  assert.match(picker, /\{trimmedQuery \? <section[\s\S]*carsSearch\.locationSuggestions[\s\S]*results\.map/);
  assert.match(picker, /searchCompleted && !results\.length[\s\S]*carsSearch\.noMatchingLocations/);
  assert.doesNotMatch(picker, /Recent searches|Popular locations/);
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

test("location rows use neutral result metadata and reserve blue for selection", () => {
  assert.match(picker, /<Icon aria-hidden="true" className="h-5 w-5 text-slate-600"/);
  assert.doesNotMatch(picker, /<Icon[^>]*text-\[#075EE8\]/);
  assert.match(picker, /bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">Airport/);
  assert.doesNotMatch(picker, /bg-blue-50[^>]*>Airport|text-\[#075EE8\][^>]*>Airport/);
});

test("selecting a result only changes the draft and keeps the query and result list in place", () => {
  assert.match(picker, /const select = \(item: CarLocationSuggestion\) => \{ setDraft\(item\); \};/);
  const selectBody = picker.match(/const select = \(item: CarLocationSuggestion\) => \{([^}]*)\};/)?.[1] ?? "";
  assert.doesNotMatch(selectBody, /setQuery|setResults|setSearchCompleted|searchCarLocationSuggestions/);
  assert.match(picker, /useEffect\([\s\S]*?searchCarLocationSuggestions\(trimmedQuery, \{ limit: 8 \}\)[\s\S]*?\}, \[open, query\]\)/);
});

test("results show one semantic, background-only draft selection without changing the search", () => {
  assert.equal((picker.match(/selected=\{draft\?\.id === item\.id\}/g) ?? []).length, 1);
  assert.match(picker, /aria-pressed=\{selected\}/);
  assert.match(picker, /selected \? "bg-\[#075EE8\]\/5" : ""/);
  assert.match(picker, /!selected \? <ChevronRight/);
  assert.doesNotMatch(picker, /\bCheck(?:Circle)?\b|selectedIndicator/);
});

test("Done commits the canonical draft while Back remains a discard-only close", () => {
  assert.match(picker, /const next = draft\?\.value \?\? \(query\.trim\(\) \|\| value\.trim\(\)\)/);
  assert.match(picker, /if \(!next\) return; onCommit\(next\); onClose\(\)/);
  assert.match(picker, /launcherRef=\{launcherRef\} onClose=\{onClose\}/);
  assert.equal((picker.match(/onCommit\(/g) ?? []).length, 1);
});
