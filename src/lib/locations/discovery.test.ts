import assert from "node:assert/strict";
import test from "node:test";
import { discoverLocations, providerLocation, type DiscoveryAdapter } from "./discovery";
import { clearLocationSelectionsForTest, resolveProviderSelection } from "./selectionAuthority";
import type { CanonicalLocation } from "./types";

const place = (id: string, primaryLabel: string, kind: CanonicalLocation["kind"] = "city", country = "US"): CanonicalLocation => ({
  id, kind, primaryLabel, supportingLabel: country === "US" ? "United States" : "France", submittedValue: primaryLabel,
  country: { code: country }, staticCoverage: { flights: "none", hotels: "exact", cars: "exact", packages: "none" },
  source: { catalog: "kurioticket", datasetVersion: "test" }, verification: "catalogue-only",
});

test("query ranking excludes unrelated catalogue rows and keeps ambiguous cities", async () => {
  const result = await discoverLocations({ query: "New", product: "hotels", catalog: [place("ny", "New York"), place("no", "New Orleans"), place("del", "Delhi"), place("syd", "Sydney")], adapters: [] });
  assert.deepEqual(result.suggestions.map((item) => item.primaryLabel), ["New York", "New Orleans"]);
});

test("provider and canonical duplicates merge into one public result with an opaque binding", async () => {
  clearLocationSelectionsForTest();
  const owned = place("ny", "New York");
  const adapter: DiscoveryAdapter = { provider: "kayak", products: ["hotels"], discover: async () => [providerLocation("kayak", "kplace:58075", owned)] };
  const result = await discoverLocations({ query: "New", product: "hotels", catalog: [owned], adapters: [adapter] });
  assert.equal(result.suggestions.length, 1);
  const selected = result.suggestions[0];
  assert.deepEqual(selected.providerBindings, []);
  assert.ok(selected.selectionToken && selected.selectionToken.length >= 20);
  assert.deepEqual(resolveProviderSelection(selected, "hotels", "kayak"), { ok: true, value: "kplace:58075" });
});

test("a client verified flag, tampered canonical id, and stale token are never authoritative", async () => {
  clearLocationSelectionsForTest();
  const owned = providerLocation("kayak", "kplace:1", place("bos", "Boston"));
  const result = await discoverLocations({ query: "Bos", product: "hotels", catalog: [owned], adapters: [] });
  const selected = result.suggestions[0];
  assert.deepEqual(resolveProviderSelection({ id: "paris", selectionToken: selected.selectionToken }, "hotels", "kayak"), { ok: false, reason: "LOCATION_RESOLUTION_FAILED" });
  assert.deepEqual(resolveProviderSelection({ id: "bos", selectionToken: selected.selectionToken }, "hotels", "kayak", Date.now() + 16 * 60_000), { ok: false, reason: "LOCATION_RESOLUTION_FAILED" });
});

test("slow discovery is bounded while owned fallback still answers", async () => {
  const slow: DiscoveryAdapter = { provider: "slow", products: ["cars"], discover: (_query, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("timeout")))) };
  const result = await discoverLocations({ query: "Paris", product: "cars", catalog: [place("paris", "Paris", "city", "FR")], adapters: [slow], timeoutMs: 5 });
  assert.equal(result.suggestions[0].primaryLabel, "Paris");
  assert.equal(result.sources[0].status, "timeout");
  assert.equal(result.sources[0].failure, "TIMEOUT");
});

test("airport and city remain visually and canonically distinct", async () => {
  const city = place("nyc", "New York");
  const airport = { ...place("jfk", "JFK — John F. Kennedy International Airport", "airport"), codes: { iata: "JFK" }, supportingLabel: "New York, United States" };
  const result = await discoverLocations({ query: "New", product: "flights", catalog: [city, airport], adapters: [] });
  assert.equal(result.suggestions.length, 2);
  assert.deepEqual(new Set(result.suggestions.map((item) => item.kind)), new Set(["city", "airport"]));
});
