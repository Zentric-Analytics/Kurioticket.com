import test from "node:test";
import assert from "node:assert/strict";
import { resolveRegularKayakSearch, regularKayakRequest } from "./kayakRegularSearch";
import { KayakSandboxClient } from "./kayakSandbox";
import { issueLocationSelection } from "@/lib/locations/selectionAuthority";

const hotel = { destination: "Boston, Massachusetts, United States", checkIn: "2099-10-12", checkOut: "2099-10-17", guests: "2", rooms: "1", currency: "JPY" };

for (const fixture of [
  {
    destination: "New York, NY", destinationId: "us-new-york", providerValue: "kplace:59560",
    specificDestination: "New York Mills, New York, United States", specificProviderValue: "kplace:59561",
    commaFreeDestinations: ["New York United States", "New York New York United States", "New York NY United States"],
    commaFreeNearNames: ["New York Mills United States", "New York Mills New York United States"],
    candidates: [
      { label: "New York, United States", value: "kplace:59560", kind: "city" },
      { label: "Syracuse, New York, United States", value: "kplace:59696", kind: "city" },
      { label: "New York Mills, New York, United States", value: "kplace:59561", kind: "city" },
      { label: "Brooklyn, New York, United States", value: "kplace:164176", kind: "city" },
      { label: "Queens, New York, United States", value: "kplace:164175", kind: "city" },
    ],
  },
  {
    destination: "Miami, FL", destinationId: "us-miami", providerValue: "kplace:53912",
    specificDestination: "Miami Beach, Florida, United States", specificProviderValue: "kplace:53913",
    commaFreeDestinations: ["Miami United States", "Miami Florida United States", "Miami FL United States"],
    commaFreeNearNames: ["Miami Beach United States", "Miami Beach Florida United States"],
    candidates: [
      { label: "Miami, Florida, United States", value: "kplace:53912", kind: "city" },
      { label: "Miami Beach, Florida, United States", value: "kplace:53913", kind: "city" },
    ],
  },
]) {
  test(`popular hotel destination ${fixture.destination} prefers the exact city over longer city names`, async () => {
    for (const candidates of [fixture.candidates, [...fixture.candidates].reverse()]) {
      const result = await resolveRegularKayakSearch("hotels", {
        ...hotel, destination: fixture.destination, destinationId: fixture.destinationId,
      }, async (term, vertical) => {
        assert.equal(term, fixture.destination);
        assert.equal(vertical, "hotels");
        return candidates;
      });
      assert.ok(result.supported && result.search.vertical === "hotels");
      assert.equal(result.search.destination, fixture.providerValue);
    }
  });

  test(`explicit hotel destination ${fixture.specificDestination} is never replaced by the broader catalogue city`, async () => {
    const search = { ...hotel, destination: fixture.specificDestination };
    for (const candidates of [fixture.candidates, [...fixture.candidates].reverse()]) {
      const result = await resolveRegularKayakSearch("hotels", search, async () => candidates);
      assert.ok(result.supported && result.search.vertical === "hotels");
      assert.equal(result.search.destination, fixture.specificProviderValue);
    }
    const withoutRequestedCity = await resolveRegularKayakSearch("hotels", search,
      async () => fixture.candidates.filter(candidate => candidate.value !== fixture.specificProviderValue));
    assert.equal(withoutRequestedCity.supported, false);
  });

  test(`comma-free hotel destination ${fixture.destination} recognizes only known country and region forms`, async () => {
    for (const destination of fixture.commaFreeDestinations) {
      for (const candidates of [fixture.candidates, [...fixture.candidates].reverse()]) {
        const result = await resolveRegularKayakSearch("hotels", { ...hotel, destination }, async (term, vertical) => {
          assert.equal(term, destination);
          assert.equal(vertical, "hotels");
          return candidates;
        });
        assert.ok(result.supported && result.search.vertical === "hotels", destination);
        assert.equal(result.search.destination, fixture.providerValue);
      }
    }
  });

  test(`comma-free names near ${fixture.destination} are never absorbed into the catalogue city`, async () => {
    for (const destination of fixture.commaFreeNearNames) {
      const result = await resolveRegularKayakSearch("hotels", { ...hotel, destination }, async () => fixture.candidates);
      assert.equal(result.supported, false, destination);
    }
  });

  test(`comma-free ${fixture.destination} still rejects wrong-country, wrong-kind and ambiguous provider matches`, async () => {
    const exactCity = fixture.candidates.find(candidate => candidate.value === fixture.providerValue)!;
    const search = { ...hotel, destination: fixture.commaFreeDestinations[0] };
    for (const candidates of [
      [{ ...exactCity, label: `${exactCity.label.split(",")[0]}, Mexico` }],
      [{ ...exactCity, kind: "airport" }],
      [exactCity, { ...exactCity, value: "kplace:99999" }],
    ]) {
      const result = await resolveRegularKayakSearch("hotels", search, async () => candidates);
      assert.equal(result.supported, false);
    }
  });
}

test("hotel catalogue aliases still resolve to the verified canonical city", async () => {
  const result = await resolveRegularKayakSearch("hotels", { ...hotel, destination: "NYC" }, async () => [
    { label: "New York, United States", value: "kplace:59560", kind: "city" },
    { label: "New York Mills, New York, United States", value: "kplace:59561", kind: "city" },
  ]);
  assert.ok(result.supported && result.search.vertical === "hotels");
  assert.equal(result.search.destination, "kplace:59560");
});

test("an exact provider city wins even when its name is also a broader catalogue alias", async () => {
  const result = await resolveRegularKayakSearch("hotels", { ...hotel, destination: "Miami Beach" }, async () => [
    { label: "Miami, Florida, United States", value: "kplace:53912", kind: "city" },
    { label: "Miami Beach, Florida, United States", value: "kplace:53913", kind: "city" },
  ]);
  assert.ok(result.supported && result.search.vertical === "hotels");
  assert.equal(result.search.destination, "kplace:53913");
});

test("hotel location recovery never substitutes the same city name in another country", async () => {
  const result = await resolveRegularKayakSearch("hotels", { ...hotel, destination: "San Francisco, California, United States" }, async () => [
    { label: "San Francisco, Nayarit, Mexico", value: "kplace:2", kind: "city" },
  ]);
  assert.equal(result.supported, false);
});

test("different equally ranked places are not disambiguated by label length", async () => {
  const result = await resolveRegularKayakSearch("hotels", { ...hotel, destination: "Example City, Example Country" }, async () => [
    { label: "Example City, North, Example Country", value: "kplace:1", kind: "city" },
    { label: "Example City, Southwest, Example Country", value: "kplace:2", kind: "city" },
  ]);
  assert.equal(result.supported, false);
});

test("non-Latin location names retain their identity during provider matching", async () => {
  const result = await resolveRegularKayakSearch("hotels", { ...hotel, destination: "東京, 日本" }, async () => [
    { label: "東京, 日本", value: "kplace:3", kind: "city" },
  ]);
  assert.equal(result.supported, true);
  if (result.supported && result.search.vertical === "hotels") assert.equal(result.search.destination, "kplace:3");
});
const locationTarget = (provider: "kayak", value: string, product: "hotels" | "cars" = "hotels") => { const location = {
  id: "city:us-boston", kind: "city", primaryLabel: "Boston", supportingLabel: "Massachusetts, United States",
  submittedValue: "Boston, Massachusetts, United States", verification: "verified",
  providerBindings: [{ provider, value, kind: "city", verification: "verified", provenance: "provider-discovery" }],
  staticCoverage: { flights: "none", hotels: "none", cars: "none", packages: "none" }, source: { catalog: "kurioticket", datasetVersion: "test" },
} as const; return JSON.stringify({ ...location, selectionToken: issueLocationSelection(location, product) }); };
test("regular hotel search uses the selected verified provider binding without rediscovery", async () => {
  const result = await resolveRegularKayakSearch("hotels", { ...hotel, destinationLocation: locationTarget("kayak", "kplace:58075") }, async () => { throw new Error("post-submit discovery is forbidden"); });
  assert.equal(result.supported, true);
  if (result.supported) assert.deepEqual(result.search, { vertical: "hotels", destination: "kplace:58075", departure: hotel.checkIn, returnDate: hotel.checkOut, adults: 2 });
});
test("a canonical hotel city is resolved to the matching provider place", async () => {
  const sanFrancisco = { ...hotel, destination: "San Francisco, California, United States" };
  const result = await resolveRegularKayakSearch("hotels", sanFrancisco, async (term, vertical) => {
    assert.equal(term, sanFrancisco.destination);
    assert.equal(vertical, "hotels");
    return [
      { label: "San Francisco International Airport (SFO)", value: "kplace:58074", kind: "airport" },
      { label: "San Francisco, California, United States", value: "kplace:58075", kind: "city" },
      { label: "San Francisco, Nayarit, Mexico", value: "kplace:58076", kind: "city" },
    ];
  });
  assert.equal(result.supported, true);
  if (result.supported && result.search.vertical === "hotels") assert.equal(result.search.destination, "kplace:58075");
});
test("an unbound selected hotel destination is not rediscovered as a different provider place", async () => {
  const location = {
    id: "city:example", kind: "city", primaryLabel: "Example City", supportingLabel: "Example Country",
    submittedValue: "Example City, Example Country", verification: "catalogue-only", providerBindings: [],
    staticCoverage: { flights: "none", hotels: "none", cars: "none", packages: "none" },
    source: { catalog: "kurioticket", datasetVersion: "test" },
  } as const;
  const target = JSON.stringify({ ...location, selectionToken: issueLocationSelection(location, "hotels") });
  const result = await resolveRegularKayakSearch("hotels", { ...hotel, destination: location.submittedValue, destinationLocation: target }, async () => {
    throw new Error("selected destinations must not be silently rediscovered");
  });
  assert.equal(result.supported, false);
  if (!result.supported) assert.match(result.reason, /selected destination/i);
});
test("tampering with client-carried provider IDs cannot replace the server-authoritative binding", async () => {
  const duffelOnly = JSON.stringify({ ...JSON.parse(locationTarget("kayak", "kplace:1")), providerBindings: [{ provider: "duffel", value: "pla_1", verification: "verified", provenance: "provider-discovery" }] });
  const result = await resolveRegularKayakSearch("hotels", { ...hotel, destinationLocation: duffelOnly }, async () => []);
  assert.equal(result.supported, true);
  if (result.supported && result.search.vertical === "hotels") assert.equal(result.search.destination, "kplace:1");
});
test("invalid hotel occupancy never calls the provider", async () => {
  const result = await resolveRegularKayakSearch("hotels", { ...hotel, rooms: "2" }, async () => { throw new Error("must not call"); });
  assert.equal(result.supported, false);
});
test("normal airport labels and rental times are preserved for KAYAK", async () => {
  const result = await resolveRegularKayakSearch("cars", { pickupLocation: "Logan International Airport (BOS)", pickupDate: "2099-10-12", dropoffDate: "2099-10-17", pickupTime: "10:30", dropoffTime: "16:45" }, async () => []);
  assert.deepEqual(result, { supported: true, search: { vertical: "cars", origin: "BOS", departure: "2099-10-12", returnDate: "2099-10-17", pickupTime: "10:30", dropoffTime: "16:45" } });
});
test("a selected car city is translated only through its verified provider binding", async () => {
  const target = locationTarget("kayak", "SFO", "cars");
  const result = await resolveRegularKayakSearch("cars", { pickupLocation: "San Francisco, United States", pickupLocationTarget: target, pickupDate: "2099-10-12", dropoffDate: "2099-10-17", pickupTime: "10:30", dropoffTime: "16:45" }, async () => { throw new Error("post-submit discovery is forbidden"); });
  assert.equal(result.supported, true);
  if (result.supported && result.search.vertical === "cars") assert.equal(result.search.origin, "SFO");
});
test("an unbound selected car city is not silently reinterpreted as a provider airport", async () => {
  const location = {
    id: "city:ng-abuja", kind: "city", primaryLabel: "Abuja", supportingLabel: "Nigeria",
    submittedValue: "Abuja, Nigeria", verification: "catalogue-only", providerBindings: [],
    staticCoverage: { flights: "none", hotels: "none", cars: "none", packages: "none" },
    source: { catalog: "kurioticket", datasetVersion: "test" },
  } as const;
  const target = JSON.stringify({ ...location, selectionToken: issueLocationSelection(location, "cars") });
  const result = await resolveRegularKayakSearch("cars", {
    pickupLocation: "Abuja, Nigeria", pickupLocationTarget: target,
    pickupDate: "2099-10-12", dropoffDate: "2099-10-17", pickupTime: "10:30", dropoffTime: "16:45",
  }, async () => [{ label: "Nnamdi Azikiwe International Airport (ABV)", value: "ABV", kind: "airport" }]);
  assert.equal(result.supported, false);
  if (!result.supported) assert.match(result.reason, /selected pick-up location|verified car-search match/i);
});
test("an ambiguous car free-text candidate is never accepted by first-candidate guessing", async () => {
  const result = await resolveRegularKayakSearch("cars", { pickupLocation: "Springfield", pickupDate: "2099-10-12", dropoffDate: "2099-10-17", pickupTime: "10:30", dropoffTime: "16:45" }, async () => [{ label: "Springfield, Illinois", value: "SPI" }]);
  assert.equal(result.supported, false);
});
test("a canonical car city is not silently resolved to a similarly named airport", async () => {
  const result = await resolveRegularKayakSearch("cars", { pickupLocation: "San Francisco, California, United States", pickupDate: "2099-10-12", dropoffDate: "2099-10-17", pickupTime: "10:30", dropoffTime: "16:45" }, async (_term, vertical) => {
    assert.equal(vertical, "cars");
    return [{ label: "San Francisco International Airport (SFO)", value: "SFO", kind: "airport" }];
  });
  assert.equal(result.supported, false);
});
test("a provider city suggestion preserves its exact provider city value", async () => {
  const result = await resolveRegularKayakSearch("cars", { pickupLocation: "San Francisco, California, United States", pickupDate: "2099-10-12", dropoffDate: "2099-10-17", pickupTime: "10:30", dropoffTime: "16:45" }, async (_term, vertical) => {
    assert.equal(vertical, "cars");
    return [{ label: "San Francisco, California, United States", value: "SFO", kind: "city" }];
  });
  assert.equal(result.supported, true);
  if (result.supported && result.search.vertical === "cars") assert.equal(result.search.origin, "SFO");
});
test("ordinary flight criteria retain route and travelers while sandbox USD stays separate", async () => {
  const result = await resolveRegularKayakSearch("flights", { origin: "BOS", destination: "JFK", departureDate: "2099-10-12", tripType: "one-way", travelers: "2", currency: "JPY" }, async () => []);
  assert.equal(result.supported, true);
  if (result.supported) assert.deepEqual(result.search, { vertical: "flights", origin: "BOS", destination: "JFK", departure: "2099-10-12", adults: 2 });
});
test("regular requests reject nested criteria and oversized fields", () => {
  assert.equal(regularKayakRequest.safeParse({ action: "regular-search", vertical: "hotels", criteria: { destination: { url: "https://example.com" } } }).success, false);
  assert.equal(regularKayakRequest.safeParse({ action: "regular-search", vertical: "hotels", criteria: { destination: "x".repeat(251) } }).success, false);
});
test("car transport sends actual selected hours and minutes", async () => {
  const fetcher: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.searchStartParameters.pickup.hour, 10);
    assert.equal(body.searchStartParameters.pickup.minute, 30);
    assert.equal(body.searchStartParameters.dropoff.hour, 16);
    assert.equal(body.searchStartParameters.dropoff.minute, 45);
    return Response.json({ status: "complete", currency: "USD", priceMode: "total", results: [] });
  };
  await new KayakSandboxClient("test-key", fetcher).search({ vertical: "cars", origin: "BOS", departure: "2099-10-12", returnDate: "2099-10-17", pickupTime: "10:30", dropoffTime: "16:45" }, "test-track");
});


test("JFK same-day pickup is rejected after the rental-local time has passed", async () => {
  const result = await resolveRegularKayakSearch(
    "cars",
    {
      pickupLocation: "JFK",
      pickupDate: "2026-09-25",
      dropoffDate: "2026-09-27",
      pickupTime: "04:30",
      dropoffTime: "09:30",
    },
    async () => [],
    { now: new Date("2026-09-25T08:33:00Z") },
  );
  assert.equal(result.supported, false);
  if (!result.supported) {
    assert.equal(result.reasonCode, "pickup_time_past");
    assert.match(result.reason, /already passed at the rental location/i);
  }
});

test("PAE same-day pickup remains valid while it is still future in Washington", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-25T07:22:00Z") });
  const result = await resolveRegularKayakSearch(
    "cars",
    {
      pickupLocation: "Paine Field (PAE)",
      pickupDate: "2026-09-25",
      dropoffDate: "2026-09-27",
      pickupTime: "02:00",
      dropoffTime: "04:00",
    },
    async () => [],
    { now: new Date("2026-09-25T07:22:00Z") },
  );
  assert.equal(result.supported, true);
  if (result.supported && result.search.vertical === "cars") {
    assert.equal(result.search.origin, "PAE");
    assert.equal(result.search.pickupTime, "02:00");
  }
});

test("provider-resolved London city uses the resolved LHR rental timezone", async () => {
  const target = {
    id: "airport:gb-lhr",
    kind: "airport",
    primaryLabel: "London Heathrow Airport",
    supportingLabel: "London, United Kingdom",
    submittedValue: "London Heathrow Airport (LHR)",
    verification: "verified",
    providerBindings: [{ provider: "kayak", value: "LHR", kind: "airport", verification: "verified", provenance: "provider-discovery" }],
    staticCoverage: { flights: "none", hotels: "none", cars: "none", packages: "none" },
    source: { catalog: "kurioticket", datasetVersion: "test" },
  } as const;
  const result = await resolveRegularKayakSearch(
    "cars",
    {
      pickupLocation: target.submittedValue,
      pickupLocationTarget: JSON.stringify({ ...target, selectionToken: issueLocationSelection(target, "cars") }),
      pickupDate: "2026-09-25",
      dropoffDate: "2026-09-27",
      pickupTime: "02:30",
      dropoffTime: "05:00",
    },
    async () => assert.fail("a verified provider selection should not be rediscovered"),
    { now: new Date("2026-09-25T08:32:00Z") },
  );
  assert.equal(result.supported, false);
  if (!result.supported) assert.equal(result.reasonCode, "pickup_time_past");
});

test("future rental-local pickup preserves the exact user-selected time", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-25T08:33:00Z") });
  const result = await resolveRegularKayakSearch(
    "cars",
    {
      pickupLocation: "JFK",
      pickupDate: "2026-09-26",
      dropoffDate: "2026-09-28",
      pickupTime: "00:30",
      dropoffTime: "09:30",
    },
    async () => [],
    { now: new Date("2026-09-25T08:33:00Z") },
  );
  assert.equal(result.supported, true);
  if (result.supported && result.search.vertical === "cars") {
    assert.equal(result.search.departure, "2026-09-26");
    assert.equal(result.search.pickupTime, "00:30");
  }
});
