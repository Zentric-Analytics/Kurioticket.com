import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const picker = readFileSync(
  "src/components/search/MobileCarLocationPicker.tsx",
  "utf8",
);
const homepage = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
const cars = readFileSync("src/app/cars/page.tsx", "utf8");
const packages = readFileSync(
  "src/components/search/DealsSearchForm.tsx",
  "utf8",
);

test("shared Cars picker matches the Flight navigation and input geometry", () => {
  assert.match(
    picker,
    /showBackLabel=\{true\}[\s\S]*showCancelAction=\{false\}/,
  );
  assert.match(
    picker,
    /mode === "pickup"[\s\S]*Pickup location[\s\S]*Return location/,
  );
  assert.match(picker, /Airport, city, or address/);
  assert.match(
    picker,
    /<MapPin[\s\S]*h-\[18px\] w-\[18px\][\s\S]*<input/,
  );
  assert.match(
    picker,
    /h-\[50px\][\s\S]*rounded-\[10px\][\s\S]*border-slate-300[\s\S]*ps-12 pe-12[\s\S]*text-\[15px\] font-medium/,
  );
  assert.match(picker, /<X className="h-\[18px\] w-\[18px\]"/);
  assert.doesNotMatch(picker, /\bSearch\b|<Search/);
});

test("blank queries stay clean and never request generic suggestions", () => {
  assert.match(
    picker,
    /const trimmedQuery = query\.trim\(\);\s*if \(!trimmedQuery\) return;/,
  );
  assert.match(
    picker,
    /searchCarLocationSuggestions\(trimmedQuery, \{ limit: 8 \}\)/,
  );
  assert.doesNotMatch(
    picker,
    /Popular locations|Recent searches|readRecentCarLocations|recents/,
  );
});

test("selecting Rome canonically updates the query and leaves exactly one row", () => {
  assert.match(
    picker,
    /const select = \(item: CarLocationSuggestion\) => \{[\s\S]*?setDraft\(item\);[\s\S]*?setQuery\(formatSelectedCarLocation\(item\)\);[\s\S]*?setResults\(\[item\]\);[\s\S]*?setSearchCompleted\(true\);[\s\S]*?\};/,
  );
  assert.match(picker, /const visibleResults = draft \? \[draft\] : results;/);
  assert.match(picker, /visibleResults\.map\(\(item\)/);
  assert.doesNotMatch(picker, /carsSearch\.locationSuggestions/);
});

test("airport selection uses its canonical city and code while retaining airport detail", () => {
  assert.match(
    picker,
    /item\.kind === "airport" && item\.airportCode[\s\S]*`\$\{item\.city \|\| item\.primaryText\} \(\$\{item\.airportCode\}\)`/,
  );
  assert.match(
    picker,
    /item\.kind === "airport" \? item\.primaryText : item\.secondaryText/,
  );
  assert.match(picker, /\{item\.airportCode\}/);
});

test("selection prevents a second search and ignores stale responses", () => {
  assert.match(picker, /if \(!open \|\| draft\) return;/);
  assert.match(
    picker,
    /requestId !== searchRequestRef\.current\) return;/,
  );
  assert.match(picker, /\}, \[draft, open, query\]\);/);
  assert.match(
    picker,
    /const select[\s\S]*searchRequestRef\.current \+= 1;[\s\S]*setDraft\(item\)/,
  );
});

test("editing after selection clears the draft and returns to search mode", () => {
  assert.match(
    picker,
    /onChange=\{\(event\) => \{[\s\S]*?setQuery\(event\.target\.value\);[\s\S]*?setDraft\(null\);[\s\S]*?setResults\(\[\]\);[\s\S]*?setSearchCompleted\(false\);/,
  );
});

test("clear X resets all selection and search state before focusing the input", () => {
  assert.match(
    picker,
    /const clear = \(\) => \{[\s\S]*?setQuery\(""\);[\s\S]*?setDraft\(null\);[\s\S]*?setResults\(\[\]\);[\s\S]*?setSearchCompleted\(false\);[\s\S]*?inputRef\.current\?\.focus\(\{ preventScroll: true \}\)/,
  );
  assert.match(picker, /onClick=\{clear\}/);
});

test("Done commits only a canonical selected draft and Back only closes", () => {
  assert.match(
    picker,
    /if \(!draft\) return;\s*onCommit\(draft\.value\);\s*requestClose\(\);/,
  );
  assert.match(picker, /disabled=\{!draft\}/);
  assert.match(picker, /launcherRef=\{launcherRef\}[\s\S]*onClose=\{onClose\}/);
  assert.equal((picker.match(/onCommit\(/g) ?? []).length, 1);
});

test("rows use the clean neutral MapPin hierarchy without chips or chevrons", () => {
  assert.match(picker, /className="h-5 w-5 shrink-0 text-slate-700"/);
  assert.match(picker, /selected && "bg-blue-50\/60"/);
  assert.match(picker, /text-\[13px\] font-medium leading-5 text-slate-500/);
  assert.doesNotMatch(
    picker,
    /Building2|Plane|ChevronRight|Check(?:Circle)?|rounded-full bg-slate-50 px-2|>City<|>Airport<|>Area</,
  );
});

test("Pickup and Return share one implementation across every Cars surface", () => {
  assert.equal(
    (picker.match(/export function MobileCarLocationPicker/g) ?? []).length,
    1,
  );
  assert.match(picker, /mode: "pickup" \| "return"/);
  for (const source of [homepage, cars, packages]) {
    assert.match(source, /<MobileCarLocationPicker/);
  }
  assert.match(homepage, /onCommit=\{\(value\) => updateCarsValue/);
  assert.match(cars, /onCommit=\{\(nextValue\) => updateValue/);
  assert.match(
    packages,
    /customizeInheritedField\(current, "carPickup", nextValue\)/,
  );
});

test("desktop CarLocationAutocomplete remains unchanged and available", () => {
  assert.match(homepage, /hidden sm:block[\s\S]*CarLocationAutocomplete/);
  assert.match(cars, /<CarLocationAutocomplete/);
});
