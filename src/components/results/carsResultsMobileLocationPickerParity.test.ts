import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const resultsSource = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);
const pickerSource = readFileSync(
  new URL("../search/MobileCarLocationPicker.tsx", import.meta.url),
  "utf8",
);

test("mobile location fields launch dedicated pickup and return pickers", () => {
  assert.match(
    resultsSource,
    /placement === "mobile"[\s\S]*?<MobileLocationLauncher[\s\S]*?setMobilePicker\("pickupLocation"\)/,
  );
  assert.match(
    resultsSource,
    /placement === "mobile"[\s\S]*?<MobileLocationLauncher[\s\S]*?setMobilePicker\("returnLocation"\)/,
  );
  assert.match(
    resultsSource,
    /open=\{mobileSearchOpen && mobilePicker === "pickupLocation"\}/,
  );
  assert.match(
    resultsSource,
    /open=\{mobileSearchOpen && mobilePicker === "returnLocation"\}/,
  );
});

test("desktop location fields retain CarLocationAutocomplete", () => {
  assert.match(
    resultsSource,
    /function SearchInputCell[\s\S]*?<CarLocationAutocomplete/,
  );
  assert.match(resultsSource, /presentation="desktop"/);
});

test("mobile form submits one hidden control for each launcher value", () => {
  assert.match(
    resultsSource,
    /placement === "mobile"[\s\S]*?<input[\s\S]*?type="hidden"[\s\S]*?name="pickupLocation"[\s\S]*?value=\{pickupLocation\}/,
  );
  assert.match(
    resultsSource,
    /<input[\s\S]*?type="hidden"[\s\S]*?name="dropoffLocation"[\s\S]*?value=\{dropoffLocation\}/,
  );
  assert.doesNotMatch(
    resultsSource.match(
      /function MobileLocationLauncher[\s\S]*?function SearchInputCell/,
    )?.[0] ?? "",
    /name=/,
  );
});

test("picker query is isolated until a selected candidate is committed by Done", () => {
  assert.match(pickerSource, /const \[query, setQuery\] = useState\(""\)/);
  assert.match(
    pickerSource,
    /const \[draft, setDraft\] = useState<CarLocationSuggestion \| null>/,
  );
  assert.match(
    pickerSource,
    /onChange=\{\(event\) => \{[\s\S]*?setQuery\(event\.target\.value\)[\s\S]*?setDraft\(null\)/,
  );
  assert.doesNotMatch(pickerSource, /onChange=\{[^}]*onCommit/);
  assert.match(pickerSource, /onCommit\(draft\.value\);\s*requestClose\(\)/);
});

test("Back discards picker-local state and Flights shell restores launcher focus", () => {
  assert.match(pickerSource, /onClose=\{onClose\}/);
  assert.match(pickerSource, /launcherRef=\{launcherRef\}/);
  assert.match(resultsSource, /onClose=\{\(\) => setMobilePicker\(null\)\}/);
  assert.doesNotMatch(
    pickerSource,
    /router\.|onSubmit|closeMobileSearchDrawer/,
  );
});

test("Cars suggestion engine and typed custom values remain in the picker", () => {
  assert.match(pickerSource, /searchCarLocationSuggestions/);
  assert.match(pickerSource, /item\.kind === "custom"/);
  assert.match(pickerSource, /carsSearch\.loadingSuggestions/);
  assert.match(pickerSource, /carsSearch\.noMatchingLocations/);
  assert.match(pickerSource, /carsSearch\.suggestionsUnavailable/);
});
