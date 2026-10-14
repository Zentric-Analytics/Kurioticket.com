import assert from "node:assert/strict";
import test from "node:test";
import { publicLocationSelection, resolveProviderSelection } from "./selectionAuthority";
import type { CanonicalLocation } from "./types";

test("public location strips provider identifiers without mutating server authority", () => {
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
});

test("selection tokens are encrypted, portable, tamper-evident, and time-limited", () => {
  const location: CanonicalLocation = {
    id: "city:private-test", kind: "city", primaryLabel: "Private test city",
    supportingLabel: "Test region", submittedValue: "Private test city",
    staticCoverage: { flights: "none", hotels: "none", cars: "none", packages: "none" },
    providerBindings: [{ provider: "kayak", value: "private-provider-place", verification: "verified", provenance: "provider-discovery" }],
    source: { catalog: "kurioticket", datasetVersion: "test" },
  };
  const selected = publicLocationSelection(location, "hotels");
  assert.ok(selected.selectionToken);
  assert.ok(selected.selectionToken.length <= 200);
  assert.equal(selected.selectionToken.includes("private-provider-place"), false);
  assert.deepEqual(resolveProviderSelection(selected, "hotels", "kayak"), { ok: true, value: "private-provider-place" });
  const tampered = `${selected.selectionToken.slice(0, -1)}${selected.selectionToken.endsWith("A") ? "B" : "A"}`;
  assert.deepEqual(resolveProviderSelection({ ...selected, selectionToken: tampered }, "hotels", "kayak"), { ok: false, reason: "LOCATION_RESOLUTION_FAILED" });
  assert.deepEqual(resolveProviderSelection(selected, "hotels", "kayak", Date.now() + 15 * 60_000 + 1), { ok: false, reason: "LOCATION_RESOLUTION_FAILED" });
});
