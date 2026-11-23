import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { issueLocationSelection, publicLocationSelection, resolveProviderSelection } from "./selectionAuthority";
import { searchLocationSchema } from "./searchTarget";
import { searchLocationSchema as webSearchLocationSchema } from "./searchTargetSchema";
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
  const parts = selected.selectionToken.split(".");
  const index = Math.floor(parts[3].length / 2);
  parts[3] = parts[3].slice(0, index) + (parts[3][index] === "A" ? "B" : "A") + parts[3].slice(index + 1);
  const tampered = parts.join(".");
  assert.deepEqual(resolveProviderSelection({ ...selected, selectionToken: tampered }, "hotels", "kayak"), { ok: false, reason: "LOCATION_RESOLUTION_FAILED" });
  assert.deepEqual(resolveProviderSelection(selected, "hotels", "kayak", Date.now() + 15 * 60_000 + 1), { ok: false, reason: "LOCATION_RESOLUTION_FAILED" });
});

test("long airport destinations stay within the portable token limit", () => {
  const location: CanonicalLocation = {
    id: "place:john-f-kennedy-intl-new-york-united-states-jfk",
    kind: "airport",
    primaryLabel: "John F Kennedy Intl",
    supportingLabel: "New York, United States, (JFK)",
    submittedValue: "John F Kennedy Intl, New York, United States, (JFK)",
    staticCoverage: { flights: "none", hotels: "none", cars: "none", packages: "none" },
    providerBindings: [{ provider: "kayak", value: "kplace:175485", kind: "airport", verification: "verified", provenance: "provider-discovery" }],
    source: { catalog: "kurioticket", datasetVersion: "test" },
  };
  const selected = publicLocationSelection(location, "hotels");

  assert.ok(selected.selectionToken.length <= 200);
  assert.deepEqual(resolveProviderSelection(selected, "hotels", "kayak"), { ok: true, value: "kplace:175485" });
});

const hotelLocation = (id: string, label: string, value = "kplace:2749971"): CanonicalLocation => ({
  id, kind: "landmark", primaryLabel: label.split(",")[0],
  supportingLabel: label.split(",").slice(1).join(",").trim(), submittedValue: label,
  staticCoverage: { flights: "none", hotels: "none", cars: "none", packages: "none" },
  providerBindings: [{ provider: "kayak", value, verification: "verified", provenance: "provider-discovery" }],
  source: { catalog: "kurioticket", datasetVersion: "test" },
});

test("long country-query landmarks fit existing app and web selection contracts", () => {
  const fixtures = [
    ["place:nigerian-national-mosque-abuja-abuja-capital-territory-nigeria", "Nigerian National Mosque, Abuja, Abuja Capital Territory, Nigeria", "kplace:2749971"],
    ["place:united-states-military-academy-at-west-point-west-point-new-york-united-states", "United States Military Academy at West Point, West Point, New York, United States", "kplace:2772826"],
    ["place:united-states-coast-guard-academy-new-london-connecticut-united-states", "United States Coast Guard Academy, New London, Connecticut, United States", "kplace:2717161"],
    [Array.from({ length: 3 }, (_, index) => createHash("sha256").update(`long-id-${index}`).digest("hex")).join("").slice(0, 160), "Long destination, Nigeria", "kplace:12345678901234567890"],
  ];
  for (const [id, label, value] of fixtures) {
    const selected = publicLocationSelection(hotelLocation(id, label, value), "hotels");
    assert.ok(selected.selectionToken.startsWith("v2."));
    assert.ok(selected.selectionToken.length <= 200);
    assert.deepEqual(selected.providerBindings, []);
    for (const schema of [searchLocationSchema, webSearchLocationSchema]) {
      const parsed = schema.parse(selected);
      assert.deepEqual(resolveProviderSelection(parsed, "hotels", "kayak"), { ok: true, value });
    }
  }
});

test("compact hotel tokens authenticate the selected ID and retain product and expiry checks", () => {
  const location = hotelLocation("place:nigeria-landmark", "Nigerian National Mosque, Nigeria");
  const now = 1_700_000_000_000;
  const selected = { id: location.id, selectionToken: issueLocationSelection(location, "hotels", now) };
  assert.deepEqual(resolveProviderSelection(selected, "hotels", "kayak", now), { ok: true, value: "kplace:2749971" });
  for (const id of ["place:different-country", "", "x".repeat(161)]) {
    assert.deepEqual(resolveProviderSelection({ ...selected, id }, "hotels", "kayak", now), { ok: false, reason: "LOCATION_RESOLUTION_FAILED" });
  }
  assert.deepEqual(resolveProviderSelection(selected, "cars", "kayak", now), { ok: false, reason: "LOCATION_RESOLUTION_FAILED" });
  assert.deepEqual(resolveProviderSelection(selected, "hotels", "kayak", now + 15 * 60_000), { ok: false, reason: "LOCATION_RESOLUTION_FAILED" });
});

test("hotel searches still accept both previously issued v1 binding formats", () => {
  // Golden tokens generated by the previous format using this test-only key.
  const previousSecret = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "hotel-selection-legacy-test-secret";
  try {
    const tokens = [
      "v1.BAQEBAQEBAQEBAQE.FfBpUuBwFqSKvlOyDz5tdQ.qSK2X40LWEmutPMZd5UL9wXhaoD1aH3M4GK1-r4zZfTDvhuEN0Gf6V0jU3eW5YYT7qUIck9bDGAPTLkMwbWTQNoRZkrFZqKKgQ6W2Kc7ZHRQUwYWCQ",
      "v1.BQUFBQUFBQUFBQUF.VEOPTaW6hrG1PmgieRWlDA.gK6Qsk-W0YYjBACsOYEfJsG0Lh0AePFAK9RGmPrkLIbmSc7nOwba1fQMxDnpq_fAHzqiBGtKI8EvS6Fmwm8xeoJLbX-xcH34dKGE3wjOm3VRixHQYSY7Tqk",
    ];
    for (const selectionToken of tokens) {
      assert.deepEqual(resolveProviderSelection({ id: "city:legacy", selectionToken }, "hotels", "kayak", 1_700_000_000_000), { ok: true, value: "kplace:59560" });
    }
  } finally {
    if (previousSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = previousSecret;
  }
});

test("flight and car token issuance retains its existing format", () => {
  const location = hotelLocation("city:test", "Test city", "ABC");
  for (const product of ["flights", "cars"] as const) {
    const selected = publicLocationSelection(location, product);
    assert.ok(selected.selectionToken.startsWith("v1."));
    assert.deepEqual(resolveProviderSelection(selected, product, "kayak"), { ok: true, value: "ABC" });
  }
});
