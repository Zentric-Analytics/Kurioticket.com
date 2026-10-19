import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { createJiti } from "jiti";
import { discoverLocations } from "./discovery";
import { kayakDiscoveryAdapter } from "./providerDiscoveryAdapters";
import { resolveProviderSelection } from "./selectionAuthority";
import { GET } from "../../app/api/hotels/destinations/route";
import type { HotelDestinationSuggestion } from "../../data/hotelDestinations";
import { hotelSearchSchema } from "../validation";
import { readHotelDestinationSelection, writeHotelDestinationSelection } from "../hotels/destinationSelection";
import { resolveRegularKayakSearch } from "../../services/travel/kayakRegularSearch";

// Exercise the real pure native helpers without pulling platform-only type
// dependencies into the web TypeScript project.
const loadNative = createJiti(import.meta.url);
const { hotelDestinationLocation } = loadNative("../../../apps/mobile/src/features/flow/hotelSearchModel") as {
  hotelDestinationLocation(suggestion: HotelDestinationSuggestion): string | undefined;
};
const { buildSearchPlan } = loadNative("../../../apps/mobile/src/features/flow/travelSearchModel") as {
  buildSearchPlan(product: "hotel", params: Record<string, string>): { plan?: { payload: Record<string, unknown> } };
};

type ProviderPlace = {
  fullName: string;
  primaryPlaceType?: string;
  entityKey?: string;
  iataCode?: string;
};

function mockKayakDiscovery(context: TestContext, places: ProviderPlace[] | ((query: string) => ProviderPlace[])) {
  const environment = {
    KAYAK_SANDBOX_ENABLED: "true",
    KAYAK_SANDBOX_API_KEY: "test-key",
    NEXT_PUBLIC_APP_URL: "https://staging.kurioticket.com",
  };
  for (const [name, value] of Object.entries(environment)) {
    const previous = process.env[name];
    process.env[name] = value;
    context.after(() => {
      if (previous === undefined) delete process.env[name];
      else process.env[name] = previous;
    });
  }
  context.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const results = typeof places === "function" ? places(url.searchParams.get("searchTerm") ?? "") : places;
    return new Response(JSON.stringify({ results }), { status: 200 });
  });
  const adapter = kayakDiscoveryAdapter(new Request("https://example.test", {
    headers: { "x-forwarded-for": "192.0.2.10", "cf-connecting-ip": "192.0.2.10" },
  }));
  assert.ok(adapter);
  return adapter;
}

const newYorkCity: ProviderPlace = {
  fullName: "New York, United States",
  primaryPlaceType: "city",
  entityKey: "kplace:59560",
};

async function hotelSuggestions(query: string) {
  const params = new URLSearchParams({ q: query, limit: "8", countryCode: "US" });
  const response = await GET(new Request(`https://example.test/api/hotels/destinations?${params}`, {
    headers: { "x-forwarded-for": "192.0.2.10", "cf-connecting-ip": "192.0.2.10" },
  }));
  assert.equal(response.status, 200);
  const body = await response.json() as { suggestions: HotelDestinationSuggestion[] };
  return body.suggestions;
}

async function assertWebAndNativeSearch(suggestion: HotelDestinationSuggestion, expectedProviderId: string) {
  const checkIn = new Date();
  checkIn.setUTCDate(checkIn.getUTCDate() + 28);
  const checkOut = new Date(checkIn);
  checkOut.setUTCDate(checkOut.getUTCDate() + 7);
  const criteria = {
    destination: suggestion.searchValue,
    checkIn: checkIn.toISOString().slice(0, 10),
    checkOut: checkOut.toISOString().slice(0, 10),
    guests: "2", rooms: "1",
  };
  const nativeSelection = hotelDestinationLocation(suggestion);
  assert.ok(nativeSelection);
  const native = buildSearchPlan("hotel", { ...criteria, destinationLocation: nativeSelection });
  assert.ok(native.plan);
  const nativeSearch = hotelSearchSchema.parse(native.plan.payload);

  const webParams = new URLSearchParams(criteria);
  writeHotelDestinationSelection(webParams, suggestion, suggestion.searchValue);
  const webSelection = readHotelDestinationSelection(webParams.get("destinationLocation"), suggestion.searchValue);
  assert.ok(webSelection);
  const webSearch = hotelSearchSchema.parse({ ...Object.fromEntries(webParams), destinationLocation: webSelection });
  assert.equal(webSearch.destinationId, suggestion.id);

  for (const search of [nativeSearch, webSearch]) {
    assert.equal(search.destinationLocation?.kind, suggestion.canonical?.kind);
    const resolution = await resolveRegularKayakSearch("hotels", {
      ...criteria, destinationLocation: JSON.stringify(search.destinationLocation),
    }, async () => assert.fail("A selected provider binding must not fall back to a text lookup."));
    assert.ok(resolution.supported);
    assert.equal(resolution.search.vertical, "hotels");
    assert.ok(resolution.search.vertical === "hotels");
    assert.equal(resolution.search.destination, expectedProviderId);
  }
}

test("same-name New York city and region stay distinct and searchable through web and native selection", async (context) => {
  mockKayakDiscovery(context, [
    newYorkCity,
    { ...newYorkCity, primaryPlaceType: "region", entityKey: "kplace:59562" },
  ]);
  const suggestions = await hotelSuggestions("New York");

  assert.equal(suggestions.length, 2);
  const [city, region] = suggestions;
  assert.equal(city.kind, "city");
  assert.equal(region.kind, "custom");
  assert.notEqual(city.id, region.id);
  assert.equal(region.id, "place:region-new-york-united-states");
  assert.equal(city.searchValue, "New York, United States");
  assert.equal(region.searchValue, city.searchValue);
  assert.equal(region.canonical?.supportingLabel, "Region, United States");
  assert.equal(region.country, "United States");
  assert.deepEqual(city.canonical?.providerBindings, []);
  assert.deepEqual(region.canonical?.providerBindings, []);
  await assertWebAndNativeSearch(city, "kplace:59560");
  await assertWebAndNativeSearch(region, "kplace:59562");
});

test("hotel discovery preserves city, district, landmark and airport kinds while excluding unknown types", async (context) => {
  const supported: ProviderPlace[] = [
    newYorkCity,
    { fullName: "Midtown, New York, United States", primaryPlaceType: "district", entityKey: "kplace:2" },
    { fullName: "Central Park, New York, United States", primaryPlaceType: "landmark", entityKey: "kplace:3" },
    { fullName: "LaGuardia, New York, United States, (LGA)", primaryPlaceType: "airport", entityKey: "kplace:4" },
  ];
  const unsupported = ["unknown", undefined].map((primaryPlaceType, index) => ({
    ...newYorkCity, primaryPlaceType, entityKey: `kplace:${100 + index}`,
  }));
  const adapter = mockKayakDiscovery(context, [...supported, ...unsupported]);
  const result = await discoverLocations({
    query: "New York", product: "hotels", catalog: [], adapters: [adapter], supportedByProviders: ["kayak"],
  });

  assert.deepEqual(result.suggestions.map((suggestion) => suggestion.kind), ["city", "district", "landmark", "airport"]);
  assert.deepEqual(result.suggestions.map((suggestion) => resolveProviderSelection(suggestion, "hotels", "kayak")),
    supported.map((place) => ({ ok: true, value: place.entityKey })),
  );
});

test("captured country responses keep country choices and long landmarks searchable on web and native", async (context) => {
  // Public provider labels/IDs captured on 2026-10-19; no signed tokens or credentials.
  const captures = [
    { query: "Nigeria", count: 2, places: [
      { fullName: "Nigeria", primaryPlaceType: "country", entityKey: "kplace:25500" },
      { fullName: "Nigerian National Mosque, Abuja, Abuja Capital Territory, Nigeria", primaryPlaceType: "landmark", entityKey: "kplace:2749971" },
    ] },
    { query: "United States", count: 5, places: [
      { fullName: "United States", primaryPlaceType: "country", entityKey: "kplace:63129" },
      { fullName: "United States Virgin Islands, U.S. Virgin Islands", primaryPlaceType: "touristregion", entityKey: "kplace:2597802" },
      { fullName: "U.S. Virgin Islands", primaryPlaceType: "country", entityKey: "kplace:57300" },
      { fullName: "United States Military Academy at West Point, West Point, New York, United States", primaryPlaceType: "landmark", entityKey: "kplace:2772826" },
      { fullName: "United States Embassy, Madrid, Spain", primaryPlaceType: "landmark", entityKey: "kplace:2740646" },
      { fullName: "United States Coast Guard Academy, New London, Connecticut, United States", primaryPlaceType: "landmark", entityKey: "kplace:2717161" },
    ] },
  ];
  mockKayakDiscovery(context, (query) => {
    const capture = captures.find((candidate) => candidate.query === query);
    assert.ok(capture);
    return capture.places;
  });
  for (const capture of captures) {
    const suggestions = await hotelSuggestions(capture.query);
    assert.equal(suggestions.length, capture.count);
    const country = suggestions.find((suggestion) => suggestion.searchValue === capture.query);
    assert.ok(country);
    assert.equal(country.name, capture.query);
    // Native and desktop clients require a nonempty country before showing a row.
    assert.equal(country.country, capture.query);
    assert.equal(country.region, "");
    assert.equal(country.kind, "custom");
    assert.equal(country.canonical?.kind, "custom");
    assert.equal(country.canonical?.supportingLabel, "Country");
    for (const suggestion of suggestions) {
      const providerPlace = capture.places.find((place) => place.fullName === suggestion.searchValue);
      assert.ok(providerPlace);
      assert.ok(suggestion.country);
      await assertWebAndNativeSearch(suggestion, providerPlace.entityKey);
    }
  }
});

test("region, state and tourist-region provider scopes remain distinct without duplicate bindings", async (context) => {
  const places = ["region", "state", "touristregion"].map((primaryPlaceType, index) => ({
    ...newYorkCity, primaryPlaceType, entityKey: `kplace:${200 + index}`,
  }));
  const adapter = mockKayakDiscovery(context, [...places, { ...places[0] }]);
  const result = await discoverLocations({
    query: "New York", product: "hotels", catalog: [], adapters: [adapter], supportedByProviders: ["kayak"],
  });
  assert.equal(result.suggestions.length, 3);
  assert.equal(new Set(result.suggestions.map((suggestion) => suggestion.id)).size, 3);
  assert.ok(result.suggestions.every((suggestion) => suggestion.kind === "custom"));
  assert.deepEqual(result.suggestions.map((suggestion) => suggestion.supportingLabel), [
    "Region, United States", "State, United States", "Tourist region, United States",
  ]);
  assert.deepEqual(result.suggestions.map((suggestion) => resolveProviderSelection(suggestion, "hotels", "kayak")),
    places.map((place) => ({ ok: true, value: place.entityKey })),
  );
});

test("repeated hotel rows with the same provider identifier retain one usable binding", async (context) => {
  const adapter = mockKayakDiscovery(context, [newYorkCity, { ...newYorkCity }]);
  const result = await discoverLocations({
    query: "New York", product: "hotels", catalog: [], adapters: [adapter], supportedByProviders: ["kayak"],
  });

  assert.equal(result.suggestions.length, 1);
  assert.deepEqual(resolveProviderSelection(result.suggestions[0], "hotels", "kayak"), {
    ok: true, value: "kplace:59560",
  });
});

test("conflicting hotel city identifiers are not resolved by choosing an arbitrary binding", async (context) => {
  const adapter = mockKayakDiscovery(context, [newYorkCity, { ...newYorkCity, entityKey: "kplace:99999" }]);
  const result = await discoverLocations({
    query: "New York", product: "hotels", catalog: [], adapters: [adapter], supportedByProviders: ["kayak"],
  });

  assert.equal(result.suggestions.length, 1);
  assert.deepEqual(resolveProviderSelection(result.suggestions[0], "hotels", "kayak"), {
    ok: false, reason: "UNSUPPORTED_LOCATION",
  });
});

test("hotel broad-place normalization leaves flight and car IATA discovery unchanged", async (context) => {
  const adapter = mockKayakDiscovery(context, [
    { fullName: "New York, United States", primaryPlaceType: "city", iataCode: "NYC" },
    { fullName: "John F Kennedy Intl, New York, United States", iataCode: "JFK" },
  ]);
  for (const product of ["flights", "cars"] as const) {
    const result = await discoverLocations({
      query: "New York", product, catalog: [], adapters: [adapter], supportedByProviders: ["kayak"],
    });
    assert.deepEqual(result.suggestions.map((suggestion) => suggestion.kind), ["city", "airport"]);
    assert.deepEqual(result.suggestions.map((suggestion) => resolveProviderSelection(suggestion, product, "kayak")), [
      { ok: true, value: "NYC" },
      { ok: true, value: "JFK" },
    ]);
  }
});
