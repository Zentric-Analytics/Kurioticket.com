import assert from "node:assert/strict";
import test from "node:test";
import { fromCarLocation } from "./adapters";

test("owned Cars city selections carry a deterministic KAYAK airport binding", () => {
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
  assert.ok(paris.codes?.iata);
  assert.deepEqual(paris.providerBindings, [{ provider: "kayak", value: paris.codes!.iata!, kind: "airport", verification: "verified", provenance: "catalogue" }]);
  assert.equal(paris.verification, "verified");
});

test("custom Cars locations do not invent a KAYAK binding", () => {
  const custom = fromCarLocation({ id: "custom", kind: "custom", value: "Somewhere", primaryText: "Somewhere", secondaryText: "", countryCode: "FR" });
  assert.equal(custom.codes, undefined);
  assert.deepEqual(custom.providerBindings, []);
  assert.equal(custom.verification, "catalogue-only");
});
