import test from "node:test";
import assert from "node:assert/strict";
import { searchLocationSchema, verifiedProviderValue } from "./searchTarget";

const target = {
  id: "city:us-new-york", kind: "city", primaryLabel: "New York", supportingLabel: "NY, United States",
  submittedValue: "New York, NY, United States", verification: "verified",
  providerBindings: [
    { provider: "kayak", value: "kplace:123", kind: "city", verification: "verified", provenance: "provider-discovery" },
    { provider: "duffel", value: "cit_nyc_us", kind: "city", verification: "verified", provenance: "provider-discovery" },
  ],
} as const;

test("a selected location preserves canonical identity and namespaced provider bindings", () => {
  const parsed = searchLocationSchema.parse(target);
  assert.equal(parsed.id, "city:us-new-york");
  assert.equal(parsed.submittedValue, "New York, NY, United States");
  assert.equal(verifiedProviderValue(parsed, "kayak"), "kplace:123");
  assert.equal(verifiedProviderValue(parsed, "duffel"), "cit_nyc_us");
});

test("ambiguous duplicate and unverified bindings are never resolved", () => {
  const parsed = searchLocationSchema.parse({ ...target, providerBindings: [
    target.providerBindings[0],
    { ...target.providerBindings[0], value: "kplace:456" },
  ] });
  assert.equal(verifiedProviderValue(parsed, "kayak"), undefined);
  const unverified = searchLocationSchema.parse({ ...target, providerBindings: [{ ...target.providerBindings[0], verification: "unverified" }] });
  assert.equal(verifiedProviderValue(unverified, "kayak"), undefined);
});
