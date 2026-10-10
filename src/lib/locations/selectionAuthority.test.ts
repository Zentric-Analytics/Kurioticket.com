import assert from "node:assert/strict";
import test from "node:test";
import { clearLocationSelectionsForTest, publicLocationSelection, resolveProviderSelection } from "./selectionAuthority";
import type { CanonicalLocation } from "./types";

test("public location strips provider identifiers without mutating server authority", () => {
  clearLocationSelectionsForTest();
  const location: CanonicalLocation = {
    id: "city:test", kind: "city", primaryLabel: "Test city",
    supportingLabel: "Test region", submittedValue: "Test city",
    staticCoverage: { flights: "none", hotels: "none", cars: "none", packages: "none" },
    providerIds: { kayak: "provider-city" },
    providerBindings: [{ provider: "kayak", value: "provider-city", verification: "verified", provenance: "provider-discovery" }],
    source: { catalog: "kurioticket", datasetVersion: "test" },
  };
  const before = structuredClone(location);
  const result = publicLocationSelection(location, "hotels");
  assert.equal(Object.hasOwn(result, "providerIds"), false);
  assert.deepEqual(result.providerBindings, []);
  assert.deepEqual(location, before);
  assert.deepEqual(resolveProviderSelection(result, "hotels", "kayak"), { ok: true, value: "provider-city" });
  assert.deepEqual(resolveProviderSelection(result, "cars", "kayak"), { ok: false, reason: "LOCATION_RESOLUTION_FAILED" });
  clearLocationSelectionsForTest();
});
