import assert from "node:assert/strict";
import test from "node:test";
import { searchCanonicalHotelCatalog } from "./hotelCatalogService";

const first = (query: string) => searchCanonicalHotelCatalog({ query, limit: 8 }).suggestions[0];

test("hotel catalog ranks code, exact, alias, accent, substring and controlled fuzzy queries", () => {
  assert.equal(first("JFK")?.id, "us-jfk-area");
  assert.equal(first("London")?.id, "gb-london");
  assert.equal(first("Westminster")?.id, "gb-london");
  assert.equal(first("Montreal")?.id, "ca-montreal");
  assert.equal(first("de Janeiro")?.id, "br-rio");
  assert.equal(first("Londn")?.id, "gb-london");
  assert.equal(searchCanonicalHotelCatalog({ query: "Ldn" }).suggestions.length, 0);
});

test("hotel catalog response is explicitly owned, static and not live availability", () => {
  const result = searchCanonicalHotelCatalog({ query: "Paris", locale: "fr" });
  assert.deepEqual(result.provenance, {
    source: "owned-catalog",
    catalogVersion: "legacy-catalog-v1",
    isLiveAvailability: false,
    staticCoverage: "exact",
  });
  assert.equal(result.suggestions[0]?.canonical?.staticCoverage.hotels, "exact");
});

test("canonical display is additive and preserves submitted URL values", () => {
  const london = first("London");
  assert.equal(london?.canonical?.primaryLabel, "London");
  assert.equal(london?.canonical?.supportingLabel, "England, United Kingdom");
  assert.equal(london?.canonical?.submittedValue, "London, United Kingdom");
  assert.equal(london?.searchValue, "London, United Kingdom");
});

test("unknown text returns truthful permissive recovery without fabricated suggestions", () => {
  const result = searchCanonicalHotelCatalog({ query: "Uncatalogued Moon Base" });
  assert.equal(result.suggestions.length, 0);
  assert.equal(result.recovery?.kind, "unverified");
  assert.equal(result.recovery?.coverage, "unverified");
  assert.equal(result.recovery?.canSubmit, true);
  assert.equal(result.recovery?.canSubmitQuery, true);
});
