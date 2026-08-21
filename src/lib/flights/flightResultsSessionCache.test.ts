import assert from "node:assert/strict";
import { test } from "node:test";

import type { PublicFlightResult } from "@/lib/types";
import {
  buildFlightResultsSearchKey,
  FLIGHT_RESULTS_SESSION_CACHE_KEY,
  FLIGHT_RESULTS_SESSION_CACHE_TTL_MS,
  readFlightResultsSessionSnapshot,
  writeFlightResultsSessionSnapshot,
} from "./flightResultsSessionCache";

const multiCitySearch = {
  origin: "IAH",
  destination: "IAH",
  departureDate: "2026-10-10",
  tripType: "multi-city",
  adults: 1,
  children: 0,
  infants: 0,
  travelers: 1,
  cabinClass: "economy",
  currency: "USD",
};

const fourLegs = [
  { origin: "IAH", destination: "LAX", departureDate: "2026-10-10" },
  { origin: "LAX", destination: "JFK", departureDate: "2026-10-15" },
  { origin: "JFK", destination: "LHR", departureDate: "2026-10-20" },
  { origin: "LHR", destination: "IAH", departureDate: "2026-10-25" },
];

const fiveLegs = [
  ...fourLegs.slice(0, 3),
  { origin: "LHR", destination: "CDG", departureDate: "2026-10-25" },
  { origin: "CDG", destination: "IAH", departureDate: "2026-10-30" },
];

test("multi-city session identity includes every requested leg", () => {
  const fourLegKey = buildFlightResultsSearchKey({
    ...multiCitySearch,
    legs: fourLegs,
  });
  const fiveLegKey = buildFlightResultsSearchKey({
    ...multiCitySearch,
    legs: fiveLegs,
  });

  assert.notEqual(fourLegKey, fiveLegKey);
  assert.match(fiveLegKey, /LHR>CDG@2026-10-25/);
  assert.match(fiveLegKey, /CDG>IAH@2026-10-30/);

  const storage = new MemoryStorage();
  writeFlightResultsSessionSnapshot(fourLegKey, [result], [], FLIGHT_RESULTS_SESSION_CACHE_TTL_MS, storage, 100);
  assert.equal(readFlightResultsSessionSnapshot(fiveLegKey, storage, 200), null);
});

test("multi-city identity is stable and sensitive to every canonical leg field", () => {
  const key = (legs: typeof fiveLegs) =>
    buildFlightResultsSearchKey({ ...multiCitySearch, legs });
  const baseline = key(fiveLegs);

  assert.equal(key(fiveLegs.map((leg) => ({ ...leg }))), baseline);
  assert.notEqual(key(fiveLegs.map((leg, index) => index === 2 ? { ...leg, origin: "BOS" } : leg)), baseline);
  assert.notEqual(key(fiveLegs.map((leg, index) => index === 2 ? { ...leg, destination: "MAD" } : leg)), baseline);
  assert.notEqual(key(fiveLegs.map((leg, index) => index === 2 ? { ...leg, departureDate: "2026-10-21" } : leg)), baseline);
  assert.notEqual(key(fiveLegs.slice(0, 4)), baseline);
  assert.notEqual(key([...fiveLegs.slice(0, 4), { ...fiveLegs[4], destination: "DFW" }]), baseline);
});

test("traveler composition and cabin remain part of provider-result identity", () => {
  const base = { ...multiCitySearch, legs: fiveLegs };
  const baseline = buildFlightResultsSearchKey(base);

  assert.notEqual(buildFlightResultsSearchKey({ ...base, adults: 2, travelers: 2 }), baseline);
  assert.notEqual(buildFlightResultsSearchKey({ ...base, children: 1, travelers: 2 }), baseline);
  assert.notEqual(buildFlightResultsSearchKey({ ...base, cabinClass: "business" }), baseline);
});

test("one-way, round-trip, and multi-city identities restore only themselves", () => {
  const common = { adults: 1, children: 0, infants: 0, travelers: 1, cabinClass: "economy", currency: "USD" };
  const oneWay = buildFlightResultsSearchKey({ ...common, tripType: "one-way", origin: "IAH", destination: "LAX", departureDate: "2026-10-10" });
  const roundTrip = buildFlightResultsSearchKey({ ...common, tripType: "round-trip", origin: "IAH", destination: "LAX", departureDate: "2026-10-10", returnDate: "2026-10-20" });
  const multiCity = buildFlightResultsSearchKey({ ...multiCitySearch, legs: fourLegs });
  const storage = new MemoryStorage();

  assert.equal(buildFlightResultsSearchKey({ ...common, tripType: "one-way", origin: "IAH", destination: "LAX", departureDate: "2026-10-10" }), oneWay);
  assert.equal(buildFlightResultsSearchKey({ ...common, tripType: "round-trip", origin: "IAH", destination: "LAX", departureDate: "2026-10-10", returnDate: "2026-10-20" }), roundTrip);
  assert.notEqual(oneWay, roundTrip);
  assert.notEqual(roundTrip, multiCity);
  writeFlightResultsSessionSnapshot(roundTrip, [result], [], FLIGHT_RESULTS_SESSION_CACHE_TTL_MS, storage, 100);
  assert.ok(readFlightResultsSessionSnapshot(roundTrip, storage, 200));
  assert.equal(readFlightResultsSessionSnapshot(multiCity, storage, 200), null);
});

test("legacy snapshots without server-owned validity are invalidated", () => {
  const storage = new MemoryStorage();
  storage.setItem(FLIGHT_RESULTS_SESSION_CACHE_KEY, JSON.stringify({ version: 2, searchKey: "legacy", savedAt: 100, results: [result], warnings: [] }));

  assert.equal(readFlightResultsSessionSnapshot("legacy", storage, 200), null);
  assert.equal(storage.getItem(FLIGHT_RESULTS_SESSION_CACHE_KEY), null);
});

class MemoryStorage {
  readonly values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

const result = {
  id: "flight-1",
  provider: "provider",
  airlineName: "Example Air",
  originAirport: "JFK",
  destinationAirport: "LHR",
  departureTime: "2026-08-10T10:00:00Z",
  arrivalTime: "2026-08-10T18:00:00Z",
  duration: "8h",
  durationMinutes: 480,
  stops: 0,
  layovers: [],
  cabinClass: "economy",
  baggageInfo: "Included",
  refundInfo: "Refundable",
  price: 500,
  currency: "USD",
  bookingUrl: "https://example.com",
  partnerRedirectUrl: "",
  valueScore: 90,
  riskScore: 10,
  comfortScore: 80,
  travelConfidenceScore: 85,
  travelEffortScore: 20,
  recommendationReasons: [],
  badges: [],
} satisfies PublicFlightResult;

test("writes and reads a matching snapshot with warnings", () => {
  const storage = new MemoryStorage();
  writeFlightResultsSessionSnapshot("search", [result], ["limited"], FLIGHT_RESULTS_SESSION_CACHE_TTL_MS, storage, 100);

  assert.deepEqual(readFlightResultsSessionSnapshot("search", storage, 200), {
    version: 3,
    searchKey: "search",
    savedAt: 100,
    validUntil: 100 + FLIGHT_RESULTS_SESSION_CACHE_TTL_MS,
    results: [result],
    warnings: ["limited"],
  });
});

test("requires the requested search key to match", () => {
  const storage = new MemoryStorage();
  writeFlightResultsSessionSnapshot("first", [result], [], FLIGHT_RESULTS_SESSION_CACHE_TTL_MS, storage, 100);
  assert.equal(readFlightResultsSessionSnapshot("second", storage, 200), null);
  assert.ok(storage.getItem(FLIGHT_RESULTS_SESSION_CACHE_KEY));
});

test("expires and removes snapshots after thirty minutes", () => {
  const storage = new MemoryStorage();
  writeFlightResultsSessionSnapshot("search", [result], [], FLIGHT_RESULTS_SESSION_CACHE_TTL_MS, storage, 100);
  assert.equal(
    readFlightResultsSessionSnapshot(
      "search",
      storage,
      100 + FLIGHT_RESULTS_SESSION_CACHE_TTL_MS,
    ),
    null,
  );
  assert.equal(storage.getItem(FLIGHT_RESULTS_SESSION_CACHE_KEY), null);
});

test("provider-bounded server validity shortens the browser snapshot lifetime", () => {
  const storage = new MemoryStorage();
  const twelveMinutes = 12 * 60 * 1000;
  writeFlightResultsSessionSnapshot("search", [result], [], twelveMinutes, storage, 100);

  assert.ok(readFlightResultsSessionSnapshot("search", storage, 100 + twelveMinutes - 1));
  assert.equal(readFlightResultsSessionSnapshot("search", storage, 100 + twelveMinutes), null);
});

test("valid snapshots retain the exact opaque result identity", () => {
  const storage = new MemoryStorage();
  writeFlightResultsSessionSnapshot("search", [result], [], 60_000, storage, 100);

  assert.equal(readFlightResultsSessionSnapshot("search", storage, 200)?.results[0].id, result.id);
});

test("writer refuses snapshots without a positive server-owned validity", () => {
  const storage = new MemoryStorage();
  writeFlightResultsSessionSnapshot("search", [result], [], 0, storage, 100);

  assert.equal(storage.getItem(FLIGHT_RESULTS_SESSION_CACHE_KEY), null);
});

test("malformed JSON is removed without throwing", () => {
  const storage = new MemoryStorage();
  storage.setItem(FLIGHT_RESULTS_SESSION_CACHE_KEY, "not json");
  assert.doesNotThrow(() => readFlightResultsSessionSnapshot("search", storage));
  assert.equal(readFlightResultsSessionSnapshot("search", storage), null);
  assert.equal(storage.getItem(FLIGHT_RESULTS_SESSION_CACHE_KEY), null);
});

test("invalid result and warning shapes return null", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    FLIGHT_RESULTS_SESSION_CACHE_KEY,
    JSON.stringify({
      version: 3,
      searchKey: "search",
      savedAt: 100,
      results: [null],
      warnings: "not-an-array",
    }),
  );
  assert.equal(readFlightResultsSessionSnapshot("search", storage, 200), null);
});

test("storage read failures return null", () => {
  const storage = {
    getItem() {
      throw new Error("disabled");
    },
    setItem() {},
    removeItem() {},
  };
  assert.equal(readFlightResultsSessionSnapshot("search", storage), null);
});

test("storage write failures do not throw", () => {
  const storage = {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error("quota");
    },
    removeItem() {},
  };
  assert.doesNotThrow(() =>
    writeFlightResultsSessionSnapshot("search", [result], [], FLIGHT_RESULTS_SESSION_CACHE_TTL_MS, storage),
  );
});

test("writer strips non-public provider references", () => {
  const storage = new MemoryStorage();
  const unsafeResult = {
    ...result,
    rawProviderReference: { credential: "secret" },
  } as PublicFlightResult;
  writeFlightResultsSessionSnapshot("search", [unsafeResult], [], FLIGHT_RESULTS_SESSION_CACHE_TTL_MS, storage, 100);

  const serialized = storage.getItem(FLIGHT_RESULTS_SESSION_CACHE_KEY) ?? "";
  assert.equal(serialized.includes("rawProviderReference"), false);
  assert.equal(serialized.includes("secret"), false);
});
