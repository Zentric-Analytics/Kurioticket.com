import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { hasMinimumCarLocationSearchLetters } from "@/lib/cars/locationSearchQuery";

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
    /mode === "pickup"[\s\S]*carsSearch.choosePickupLocation[\s\S]*carsSearch.chooseReturnLocation/,
  );
  assert.match(picker, /Airport, city, or address/);
  assert.match(picker, /<MapPin[\s\S]*h-\[18px\] w-\[18px\][\s\S]*<input/);
  assert.match(
    picker,
    /h-\[50px\][\s\S]*rounded-\[10px\][\s\S]*border-slate-300[\s\S]*ps-12 pe-12[\s\S]*text-\[15px\] font-medium/,
  );
  assert.match(picker, /<X className="h-\[18px\] w-\[18px\]"/);
  assert.doesNotMatch(picker, /\bSearch\b|<Search/);
});

test("Cars Results Edit gates searches and keeps a native empty state", () => {
  assert.match(
    picker,
    /hasMinimumCarLocationSearchLetters\(query\)/,
  );
  assert.match(picker, /if \(nativeCarsAppearance\) return;/);
  assert.match(picker, /nativeCarsAppearance \? 180 : 120/);
  assert.match(picker, /Start typing to find a location\./);
  assert.match(
    picker,
    /fetch\(\`\/api\/cars\/locations\?\$\{params\.toString\(\)\}\`/,
  );
  assert.match(
    picker,
    /loadCarLocationSuggestions\(trimmedQuery, controller\.signal, 8\)/,
  );
  assert.match(
    picker,
    /return searchCarLocationSuggestions\(query\.trim\(\), \{ limit \}\)/,
  );
  assert.doesNotMatch(
    picker,
    /Popular locations|Recent searches|readRecentCarLocations|recents/,
  );
});

test("selecting Rome canonically updates the query and leaves exactly one row", () => {
  assert.match(
    picker,
    /const select = \(item: CarLocationSuggestion, requestClose: \(\) => void\) => \{[\s\S]*?setDraft\(item\);[\s\S]*?setQuery\(formatSelectedCarLocation\(item\)\);[\s\S]*?setResults\(\[item\]\);[\s\S]*?setSearchCompleted\(true\);[\s\S]*?\};/,
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
  assert.match(picker, /requestId !== searchRequestRef\.current\) return;/);
  assert.match(picker, /\}, \[draft, open, query, nativeCarsAppearance\]\);/);
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

test("default mode auto-commits while canonical draft behavior remains available", () => {
  assert.match(picker, /commitOnSelect = true/);
  assert.match(
    picker,
    /if \(!draft\) return;\s*onCommit\(draft\.value, draft\);\s*requestClose\(\);/,
  );
  assert.match(picker, /disabled=\{!draft\}/);
  assert.match(picker, /launcherRef=\{launcherRef\}[\s\S]*onClose=\{onClose\}/);
  assert.match(picker, /commitOnSelect\s*\? undefined/);
  assert.match(picker, /: \(requestClose\) => \(/);
});

test("commitOnSelect immediately commits the canonical row and closes without Done", () => {
  assert.match(picker, /commitOnSelect\?: boolean/);
  assert.match(
    picker,
    /searchRequestRef\.current \+= 1;\s*if \(commitOnSelect\) \{\s*onCommit\(item\.value, item\);\s*requestClose\(\);\s*return;/,
  );
  assert.match(picker, /\{\(requestClose\) => \(/);
  assert.match(picker, /onSelect=\{\(\) => select\(item, requestClose\)\}/);
  assert.equal((picker.match(/onCommit\(/g) ?? []).length, 2);
});

test("Cars Results Edit rows use the native car hierarchy without chips or chevrons", () => {
  assert.match(picker, /<CarFront className="h-\[22px\] w-\[22px\] text-\[#071A48\]"/);
  assert.match(picker, /h-\[46px\] w-\[46px\][\s\S]*rounded-xl bg-white/);
  assert.match(picker, /<MapPin[\s\S]*h-\[18px\] w-\[18px\][\s\S]*<input/);
  assert.match(picker, /selected && nativeCarsAppearance && "border-l-\[#064CF7\] bg-\[#F2F6FF\]"/);
  assert.match(picker, /text-\[14px\] font-bold leading-\[19px\] text-\[#071A48\]/);
  assert.match(picker, /text-\[11px\] font-normal leading-4 text-\[#56658E\]/);
  assert.doesNotMatch(
    picker,
    /Building2|Plane|ChevronRight|Check(?:Circle)?|rounded-full bg-slate-50 px-2|>City<|>Airport<|>Area</,
  );
});

test("Cars Results Edit owns a native white surface and a dedicated results scroller", () => {
  assert.match(picker, /surfaceVariant=\{nativeCarsAppearance \? "white" : "default"\}/);
  assert.match(picker, /contentLayout=\{nativeCarsAppearance \? "contained" : "scroll"\}/);
  assert.match(picker, /nativeCarsAppearance && "bg-white px-5 py-3"/);
  assert.match(picker, /nativeCarsAppearance && "flex h-full min-h-0 flex-col"/);
  assert.match(picker, /nativeCarsAppearance && "shrink-0"/);
  assert.match(
    picker,
    /mt-3 min-h-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-contain bg-white \[-webkit-overflow-scrolling:touch\]/,
  );
  assert.match(picker, /role=\{nativeCarsAppearance \? "listbox" : undefined\}/);
  assert.match(picker, /role=\{nativeCarsAppearance \? "option" : undefined\}/);
});

test("Cars Results Edit rows use native geometry without the shared outer card", () => {
  assert.match(
    picker,
    /min-h-\[68px\] gap-\[10px\] border-b-\[#E7ECF5\] border-l-\[3px\] border-l-transparent px-2 py-2\.5/,
  );
  assert.match(
    picker,
    /!nativeCarsAppearance &&[\s\S]*"overflow-hidden rounded-\[11px\] border border-slate-200 bg-white shadow-/,
  );
  assert.doesNotMatch(
    picker,
    /className="overflow-hidden rounded-\[11px\] border border-slate-200 bg-white shadow-/,
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
  assert.match(homepage, /onCommit=\{\(value, suggestion\) => \{/);
  assert.match(homepage, /"pickupLocationTarget"[\s\S]*serializeCarLocationTarget\(suggestion\)/);
  assert.match(cars, /onCommit=\{\(nextValue, suggestion\) => \{/);
  assert.match(cars, /"pickupLocationTarget"[\s\S]*serializeCarLocationTarget\(suggestion\)/);
  assert.match(
    packages,
    /customizeInheritedField\(current, "carPickup", nextValue\)/,
  );
});

test("desktop CarLocationAutocomplete remains unchanged and available", () => {
  assert.match(homepage, /hidden sm:block[\s\S]*CarLocationAutocomplete/);
  assert.match(cars, /<CarLocationAutocomplete/);
});


test("minimum query counts alphabetic letters only", () => {
  for (const query of ["", "L", "1", "L1"]) assert.equal(hasMinimumCarLocationSearchLetters(query), false);
  for (const query of ["Lo", "NY", "L A", "L1A"]) assert.equal(hasMinimumCarLocationSearchLetters(query), true);
});
