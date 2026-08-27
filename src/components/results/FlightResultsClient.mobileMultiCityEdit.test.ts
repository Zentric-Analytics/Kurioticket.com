import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const results = readFileSync(
  "src/components/results/FlightResultsClient.tsx",
  "utf8",
);

const mobileHandler = results.slice(
  results.indexOf("function handleMobileTripTypeChange"),
  results.indexOf("function rememberMobileSearchScrollPosition"),
);
const mobileForm = results.slice(
  results.indexOf(
    'function renderCompactSearchForm(placement: "mobile" | "desktop")',
  ),
  results.indexOf("shouldShowDesktopCompactSummary", results.indexOf("function renderCompactSearchForm")),
);
const submitHandler = results.slice(
  results.indexOf("function handleCompactSearchSubmit"),
  results.indexOf("const priceLabelCurrency"),
);

test("mobile trip-type changes stay in the drawer and preserve the Multi-city draft", () => {
  assert.match(mobileForm, /handleMobileTripTypeChange\(option\.value\)/);
  assert.match(mobileHandler, /setTripTypeInput\("multi-city"\)/);
  assert.match(mobileHandler, /if \(multiCityLegs\.length === 0\)/);
  assert.match(mobileHandler, /projectSearchLegs\("multi-city", projectedLegs\)/);
  assert.doesNotMatch(mobileHandler, /router\.push|setMobileSearchOpen\(false\)/);
});

test("mobile Multi-city mode replaces route and dates with the canonical editor", () => {
  assert.match(mobileForm, /tripTypeInput === "multi-city" \? \([\s\S]*?<MultiCityFlightEditor/);
  assert.match(mobileForm, /legs=\{multiCityLegs\}/);
  assert.match(mobileForm, /onChange=\{setMultiCityLegs\}/);
  assert.match(mobileForm, /onAirportValidityChange=\{setMultiCityAirportsValid\}/);
  assert.match(mobileForm, /data-mobile-route-fields/);
  assert.match(mobileForm, /data-mobile-field="travelers"/);
});

test("Multi-city validation and submission use the shared indexed results contract", () => {
  assert.match(submitHandler, /MULTI_CITY_MIN_LEGS/);
  assert.match(submitHandler, /MULTI_CITY_MAX_LEGS/);
  assert.match(submitHandler, /multiCityAirportsValid/);
  assert.match(submitHandler, /appendFlightLegParams\(nextParams, multiCityLegs\)/);
  assert.match(submitHandler, /`\/flights\/results\?\$\{nextParams\.toString\(\)\}`/);
  assert.doesNotMatch(submitHandler, /`\/flights\?/);
});

test("existing Multi-city result URLs restore their indexed legs", () => {
  assert.match(results, /setMultiCityLegs\(parseFlightLegParams\(normalizedSearchValues\)\)/);
  assert.match(results, /useState<FlightSearchLeg\[\]>/);
});
