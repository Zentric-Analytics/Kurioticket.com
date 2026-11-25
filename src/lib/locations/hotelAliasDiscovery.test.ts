import assert from "node:assert/strict";
import test from "node:test";
import { fromHotelDestination } from "./adapters";
import { discoverLocations, providerLocation } from "./discovery";
import { resolveProviderSelection } from "./selectionAuthority";
import type { CanonicalLocation } from "./types";

const city = fromHotelDestination({ id: "us-new-york", name: "New York", region: "New York", country: "United States", countryCode: "US", kind: "city", searchValue: "New York, NY", aliases: ["NYC"] });
const providerCity = (country: string, region?: string): CanonicalLocation => providerLocation("kayak", "fixture-provider-city", {
  ...city, id: "provider-city-" + country, country: undefined, region,
  supportingLabel: [region, country].filter(Boolean).join(", "), submittedValue: "New York, " + country, aliases: [],
});

for (const query of ["NYC", "NewYork", "New York"]) {
  test(`hotel ${query} discovers the verified city using its unambiguous owned name`, async () => {
    const calls: string[] = [];
    const result = await discoverLocations({ query, product: "hotels", catalog: [city], supportedByProviders: ["kayak"],
      adapters: [{ provider: "kayak", products: ["hotels"], discover: async value => { calls.push(value); return [providerCity("United States")]; } }],
    });
    assert.deepEqual(calls, ["New York"]);
    assert.equal(result.suggestions.length, 1);
    assert.equal(result.suggestions[0].kind, "city");
    assert.equal(result.suggestions[0].id, "provider-city-United States");
    assert.deepEqual(result.suggestions[0].providerBindings, []);
    assert.deepEqual(resolveProviderSelection(result.suggestions[0], "hotels", "kayak"), { ok: true, value: "fixture-provider-city" });
  });
}

test("hotel alias enrichment cannot grant support to a catalogue-only city", async () => {
  const result = await discoverLocations({ query: "NYC", product: "hotels", catalog: [city], supportedByProviders: ["kayak"],
    adapters: [{ provider: "kayak", products: ["hotels"], discover: async () => [] }],
  });
  assert.deepEqual(result.suggestions, []);
});

test("hotel aliases never transfer across countries or specific regions", async () => {
  for (const location of [providerCity("United Kingdom"), { ...providerCity("United States", "Maine"), primaryLabel: "Portland" }]) {
    const reference = location.primaryLabel === "Portland"
      ? { ...city, primaryLabel: "Portland", region: "Oregon", aliases: ["Rose City"] }
      : city;
    const query = reference.aliases![0];
    const result = await discoverLocations({ query, product: "hotels", catalog: [reference], supportedByProviders: ["kayak"],
      adapters: [{ provider: "kayak", products: ["hotels"], discover: async () => [location] }],
    });
    assert.deepEqual(result.suggestions, []);
  }
});

test("ambiguous hotel aliases keep the original provider query", async () => {
  let submitted = "";
  const result = await discoverLocations({ query: "NYC", product: "hotels", catalog: [city, { ...city, id: "another-city", primaryLabel: "Another City" }], supportedByProviders: ["kayak"],
    adapters: [{ provider: "kayak", products: ["hotels"], discover: async query => { submitted = query; return []; } }],
  });
  assert.equal(submitted, "NYC");
  assert.deepEqual(result.suggestions, []);
});
