import assert from "node:assert/strict";
import test from "node:test";
import { discoverLocations, providerLocation, type DiscoveryAdapter } from "./discovery";
import { resolveProviderSelection } from "./selectionAuthority";
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

test("provider-support filtering removes attractive catalogue-only suggestions", async () => {
  const owned = place("akure", "Akure", "city", "NG");
  const verified = providerLocation("kayak", "AKR", { ...owned, id: "provider-akure" });
  const result = await discoverLocations({
    query: "Akure",
    product: "cars",
    catalog: [owned],
    adapters: [{ provider: "kayak", products: ["cars"], discover: async () => [verified] }],
    supportedByProviders: ["kayak"],
  });
  assert.equal(result.suggestions.length, 1);
  assert.deepEqual(resolveProviderSelection(result.suggestions[0], "cars", "kayak"), { ok: true, value: "AKR" });
});

test("provider-support filtering returns no selectable result when only the local catalogue matches", async () => {
  const result = await discoverLocations({
    query: "Akure",
    product: "cars",
    catalog: [place("akure", "Akure", "city", "NG")],
    adapters: [],
    supportedByProviders: ["kayak"],
  });
  assert.deepEqual(result.suggestions, []);
});

test("provider and canonical duplicates merge into one public result with an opaque binding", async () => {
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

test("provider IATA city codes are not relabeled or merged as airports", async () => {
  const city = providerLocation("kayak", "NYC", { ...place("nyc-city", "New York", "city"), codes: { iata: "NYC" } });
  const airport = providerLocation("kayak", "NYC", { ...place("nyc-airport", "New York", "airport"), codes: { iata: "NYC" } });
  const result = await discoverLocations({
    query: "New York",
    product: "cars",
    catalog: [],
    adapters: [{ provider: "kayak", products: ["cars"], discover: async () => [city, airport] }],
    supportedByProviders: ["kayak"],
  });
  assert.deepEqual(new Set(result.suggestions.map((suggestion) => suggestion.kind)), new Set(["city", "airport"]));
});

test("provider cities with the same name keep their distinct destinations", async () => {
  const tempeArizona = providerLocation("kayak", "kplace:60798", {
    ...place("tempe-arizona", "Tempe", "city"),
    supportingLabel: "Arizona, United States",
    submittedValue: "Tempe, Arizona, United States",
    country: undefined,
  });
  const tempeNewSouthWales = providerLocation("kayak", "kplace:2764694", {
    ...place("tempe-new-south-wales", "Tempe", "city"),
    supportingLabel: "New South Wales, Australia",
    submittedValue: "Tempe, New South Wales, Australia",
    country: undefined,
  });
  const result = await discoverLocations({
    query: "Tempe",
    product: "hotels",
    catalog: [],
    adapters: [{ provider: "kayak", products: ["hotels"], discover: async () => [tempeArizona, tempeNewSouthWales] }],
    supportedByProviders: ["kayak"],
  });

  assert.equal(result.suggestions.length, 2);
  assert.deepEqual(result.suggestions.map((suggestion) => suggestion.submittedValue), [
    "Tempe, Arizona, United States",
    "Tempe, New South Wales, Australia",
  ]);
  assert.deepEqual(resolveProviderSelection(result.suggestions[0], "hotels", "kayak"), { ok: true, value: "kplace:60798" });
  assert.deepEqual(resolveProviderSelection(result.suggestions[1], "hotels", "kayak"), { ok: true, value: "kplace:2764694" });
});
