import assert from "node:assert/strict";
import test from "node:test";
import { fromCarLocation } from "./adapters";

test("owned Cars city selections do not silently infer an airport provider binding", () => {
  const paris = fromCarLocation({
    id: "city-fr-paris",
    kind: "city",
    value: "Paris, France",
    primaryText: "Paris",
    secondaryText: "France",
    city: "Paris",
    countryCode: "FR",
  });
  assert.equal(paris.kind, "city");
  assert.equal(paris.primaryLabel, "Paris");
  assert.equal(paris.codes, undefined);
  assert.deepEqual(paris.providerBindings, []);
  assert.equal(paris.verification, "catalogue-only");
});

test("exact owned Cars airport selections retain their verified KAYAK binding", () => {
  const cdg = fromCarLocation({
    id: "airport-cdg",
    kind: "airport",
    value: "Charles de Gaulle Airport (CDG)",
    primaryText: "Charles de Gaulle Airport",
    secondaryText: "Paris, France",
    city: "Paris",
    countryCode: "FR",
    airportCode: "CDG",
  });
  assert.equal(cdg.kind, "airport");
  assert.deepEqual(cdg.codes, { iata: "CDG" });
  assert.deepEqual(cdg.providerBindings, [{ provider: "kayak", value: "CDG", kind: "airport", verification: "verified", provenance: "catalogue" }]);
  assert.equal(cdg.verification, "verified");
});

test("custom Cars locations do not invent a KAYAK binding", () => {
  const custom = fromCarLocation({ id: "custom", kind: "custom", value: "Somewhere", primaryText: "Somewhere", secondaryText: "", countryCode: "FR" });
  assert.equal(custom.codes, undefined);
  assert.deepEqual(custom.providerBindings, []);
  assert.equal(custom.verification, "catalogue-only");
});
