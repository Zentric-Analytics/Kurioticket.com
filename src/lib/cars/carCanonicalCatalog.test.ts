import assert from "node:assert/strict";
import test from "node:test";
import { searchCanonicalCarCatalog } from "./carLocationSuggestions";

const first = async (query: string) => (await searchCanonicalCarCatalog(query, { limit: 10 })).suggestions[0];

test("canonical cars matches codes, exact cities, aliases, accents, substrings and bounded typos", async () => {
  assert.equal((await first("LOS"))?.airportCode, "LOS");
  assert.ok(!(await searchCanonicalCarCatalog("LOS")).suggestions.some((item) => item.kind === "custom"));
  assert.equal((await first("London"))?.kind, "city");
  assert.ok((await searchCanonicalCarCatalog("VI")).suggestions.some((item) => item.primaryText === "Victoria Island"));
  assert.ok((await searchCanonicalCarCatalog("Sao Paulo")).suggestions.some((item) => item.canonical?.primaryLabel.includes("São Paulo")));
  assert.ok((await searchCanonicalCarCatalog("Central Lond")).suggestions.some((item) => item.primaryText === "Central London"));
  assert.equal((await first("Londn"))?.primaryText, "London");
  assert.equal((await searchCanonicalCarCatalog("Ldn")).suggestions.filter((item) => item.validation === "owned-catalog").length, 0);
});

test("owned suggestions expose static non-live provenance and canonical labels", async () => {
  const result = await searchCanonicalCarCatalog("LOS");
  const airport = result.suggestions[0];
  assert.deepEqual(result.provenance, {
    source: "owned-catalog",
    catalogVersion: "legacy-catalog-v1",
    isLiveAvailability: false,
  });
  assert.equal(airport.validation, "owned-catalog");
  assert.equal(airport.isProviderValidated, false);
  assert.equal(airport.canonical?.staticCoverage.cars, "exact");
  assert.equal(airport.canonical?.primaryLabel, "Lagos (LOS)");
  assert.equal(airport.canonical?.supportingLabel, "Murtala Muhammed International Airport");
  assert.equal(airport.canonical?.submittedValue, airport.value);
});

test("unknown locations are explicit unverified submission recovery, never fabricated catalog matches", async () => {
  const result = await searchCanonicalCarCatalog("15 Example Road, Lagos");
  const custom = result.suggestions.at(-1);
  assert.equal(result.recovery?.kind, "unverified");
  assert.equal(result.recovery?.coverage, "unverified");
  assert.equal(result.recovery?.canSubmit, true);
  assert.equal(result.recovery?.canSubmitQuery, true);
  assert.equal(custom?.kind, "custom");
  assert.equal(custom?.validation, "unverified-text");
  assert.equal(custom?.isProviderValidated, false);
  assert.equal(custom?.canonical?.staticCoverage.cars, "none");
  assert.equal(custom?.canonical?.submittedValue, "15 Example Road, Lagos");
});

test("single-character zero results recover by asking for more text without fabricating a custom result", async () => {
  const result = await searchCanonicalCarCatalog("~");
  assert.deepEqual(result.suggestions, []);
  assert.equal(result.recovery?.kind, "continue-typing");
  assert.equal(result.recovery?.canSubmitQuery, false);
});
