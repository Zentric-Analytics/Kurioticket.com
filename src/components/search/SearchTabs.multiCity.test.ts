import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const searchTabs = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
const editor = readFileSync("src/components/search/MultiCityFlightEditor.tsx", "utf8");
const results = readFileSync("src/components/results/FlightResultsClient.tsx", "utf8");
const native = readFileSync("apps/mobile/src/features/flow/FlightSearchPanel.tsx", "utf8");

test("every visible web Multi-city selector is enabled and has no coming-soon copy", () => {
  assert.doesNotMatch(searchTabs, /const unavailable = mode === "multi-city"|Multi-city search coming soon|aria-disabled=\{unavailable\}|disabled=\{unavailable\}/);
  assert.doesNotMatch(results, /aria-disabled=\{option\.value === "multi-city"\}|disabled=\{option\.value === "multi-city"\}|multiCityComingSoon/);
  assert.match(searchTabs, /onClick=\{\(\) => onSelectTripType\(mode\)\}/);
  assert.match(results, /handleTripTypeChange\("multi-city"\)/);
});

test("homepage uses the canonical leg editor, limits, and indexed URL encoder", () => {
  assert.match(searchTabs, /useState<FlightSearchLeg\[\]>/);
  assert.match(searchTabs, /<MultiCityFlightEditor[\s\S]*?legs=\{multiCityLegs\}[\s\S]*?onChange=\{setMultiCityLegs\}/);
  assert.match(searchTabs, /appendFlightLegParams\(params, authoritativeLegs\)/);
  assert.match(searchTabs, /if \(tripType !== "multi-city"\) try/);
  assert.match(editor, /MULTI_CITY_MIN_LEGS/);
  assert.match(editor, /MULTI_CITY_MAX_LEGS/);
  assert.match(editor, /previous\?\.destination/);
});

test("homepage validates provider-backed airport suggestions before enabling search", () => {
  assert.match(editor, /\/api\/flights\/places/);
  assert.match(editor, /onSelect\(option\)/);
  assert.match(editor, /markVerified\(index, "origin", option\.code\)/);
  assert.match(editor, /markVerified\(index, "destination", option\.code\)/);
  assert.match(searchTabs, /!multiCityAirportsValid/);
});

test("Results transitions Multi-city edits to the canonical full-leg editor", () => {
  assert.match(results, /if \(nextTripType === "multi-city"\)/);
  assert.match(results, /projectSearchLegs\("multi-city", legs\)/);
  assert.match(results, /appendFlightLegParams\(params, legs\)/);
  assert.match(results, /router\.push\(`\/flights\?\$\{params\.toString\(\)\}`\)/);
  assert.match(results, /tripTypeInput === "multi-city"[\s\S]*?router\.push\(`\/flights\?\$\{searchQueryString\}`\)/);
});

test("native Multi-city remains explicitly out of scope for the web fix", () => {
  assert.match(native, /if \(tripType === "multi-city"\) return/);
  assert.match(native, /disabled: true/);
});
