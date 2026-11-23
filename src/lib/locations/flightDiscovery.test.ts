import assert from "node:assert/strict";
import test from "node:test";
import { fromFlightPlaceSuggestion, searchOwnedFlightLocations } from "./flightDiscovery";

test("owned flight discovery ranks codes and preserves submitted URL values", () => {
  const result = searchOwnedFlightLocations("LOS");
  assert.equal(result.locations[0]?.codes?.iata, "LOS");
  assert.equal(result.locations[0]?.submittedValue, "LOS");
  assert.equal(result.matches[0]?.tier, "code-exact");
});

test("owned flight discovery supports accent normalization, substrings and bounded typos", () => {
  assert.ok(searchOwnedFlightLocations("montreal").locations.some((location) => location.codes?.iata === "YUL"));
  assert.ok(searchOwnedFlightLocations("muhammed").locations.some((location) => location.codes?.iata === "LOS"));
  assert.ok(searchOwnedFlightLocations("heathrw").locations.some((location) => location.codes?.iata === "LHR"));
  assert.deepEqual(searchOwnedFlightLocations("LSS").locations, []);
});

test("owned flight discovery reports provenance without claiming availability", () => {
  const result = searchOwnedFlightLocations("Lagos", 2);
  assert.equal(result.source, "owned-catalog");
  assert.equal(result.catalogVersion, "legacy-airports-v1");
  assert.equal(result.isLiveAvailability, false);
  assert.ok(result.locations.every((location) => location.staticCoverage.flights === "reference-only"));
});

test("live place normalization preserves display and submitted code without inventory claims", () => {
  const location = fromFlightPlaceSuggestion({ code: "LOS", city: "Lagos", airport: "Murtala Muhammed International Airport", country: "Nigeria", countryCode: "NG", duffelPlaceId: "pla_live" });
  assert.equal(location.primaryLabel, "Lagos (LOS)");
  assert.equal(location.supportingLabel, "Murtala Muhammed International Airport");
  assert.equal(location.submittedValue, "LOS");
  assert.equal(location.providerIds?.duffel, "pla_live");
  assert.equal(location.staticCoverage.flights, "reference-only");
});
