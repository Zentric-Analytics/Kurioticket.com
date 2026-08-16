import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const picker = readFileSync("src/components/search/MobileAirportPicker.tsx", "utf8");
const shell = readFileSync("src/components/search/FlightMobilePickerShell.tsx", "utf8");
const consumers = [
  "src/components/search/SearchTabs.tsx",
  "src/components/search/StandaloneFlightSearchForm.tsx",
  "src/components/search/DealsSearchForm.tsx",
  "src/components/results/FlightResultsClient.tsx",
].map((path) => readFileSync(path, "utf8"));

test("shared airport picker owns the approved search, rows, recents, and Done footer", () => {
  assert.match(picker, /<FlightMobilePickerShell/);
  assert.match(picker, /<MapPin[\s\S]*?<input/);
  assert.match(picker, /h-\[50px\][\s\S]*?rounded-\[10px\]/);
  assert.match(picker, /<X className="h-\[18px\] w-\[18px\]"/);
  assert.match(picker, /deriveRecentAirports\(recentEntries, 3\)/);
  assert.match(picker, /readRecentSearches\(\)/);
  assert.match(picker, /fetchBackendRecentSearches/);
  assert.match(picker, /min-h-\[80px\]/);
  assert.match(picker, /\{city\} \(\{airport\.code\}\)/);
  assert.match(picker, /h-\[52px\] w-full rounded-\[9px\]/);
  assert.doesNotMatch(picker, />\s*Clear\s*</);
  assert.doesNotMatch(picker, /<Plane/);
});

test("draft selection commits only through Done while shell close discards it", () => {
  assert.match(picker, /const \[draft, setDraft\]/);
  assert.match(picker, /onSelect=\{\(\) => selectDraft\(airport\)\}/);
  assert.match(picker, /onClick=\{\(\) => commit\(requestClose\)\}/);
  assert.match(picker, /onClose=\{onClose\}/);
  assert.doesNotMatch(picker, /onClick=\{\(\) => \{\s*onCommit/);
});

test("all mobile flight-airport consumers render the same shared picker", () => {
  for (const source of consumers) {
    assert.match(source, /import \{ MobileAirportPicker \}/);
    assert.match(source, /<MobileAirportPicker/);
  }
  assert.match(consumers[0], /field: "origin"[\s\S]*?field: "destination"/);
  assert.match(consumers[1], /field: "origin"[\s\S]*?field: "destination"/);
  assert.match(consumers[2], /field=\{kind\}/);
  assert.match(consumers[3], /field="origin"[\s\S]*?field="destination"/);
});

test("shared shell keeps centered header chrome, dialog semantics, scrolling, and safe footer", () => {
  assert.match(shell, /role="dialog"/);
  assert.match(shell, /aria-modal="true"/);
  assert.match(shell, /grid-cols-\[1fr_auto_1fr\]/);
  assert.match(shell, /min-h-\[62px\]/);
  assert.match(shell, /rtl:rotate-180/);
  assert.match(shell, /touch-pan-y overflow-y-auto overscroll-contain/);
  assert.match(shell, /env\(safe-area-inset-bottom\)/);
  assert.match(shell, /border-t[\s\S]*?\{renderedFooter\}/);
});
