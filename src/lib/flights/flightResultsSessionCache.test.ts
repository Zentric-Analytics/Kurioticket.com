import assert from "node:assert/strict";
import { test } from "node:test";

import type { PublicFlightResult } from "@/lib/types";
import {
  FLIGHT_RESULTS_SESSION_CACHE_KEY,
  FLIGHT_RESULTS_SESSION_CACHE_TTL_MS,
  readFlightResultsSessionSnapshot,
  writeFlightResultsSessionSnapshot,
} from "./flightResultsSessionCache";

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
  writeFlightResultsSessionSnapshot("search", [result], ["limited"], storage, 100);

  assert.deepEqual(readFlightResultsSessionSnapshot("search", storage, 200), {
    version: 1,
    searchKey: "search",
    savedAt: 100,
    results: [result],
    warnings: ["limited"],
  });
});

test("requires the requested search key to match", () => {
  const storage = new MemoryStorage();
  writeFlightResultsSessionSnapshot("first", [result], [], storage, 100);
  assert.equal(readFlightResultsSessionSnapshot("second", storage, 200), null);
  assert.ok(storage.getItem(FLIGHT_RESULTS_SESSION_CACHE_KEY));
});

test("expires and removes snapshots after thirty minutes", () => {
  const storage = new MemoryStorage();
  writeFlightResultsSessionSnapshot("search", [result], [], storage, 100);
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
      version: 1,
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
    writeFlightResultsSessionSnapshot("search", [result], [], storage),
  );
});

test("writer strips non-public provider references", () => {
  const storage = new MemoryStorage();
  const unsafeResult = {
    ...result,
    rawProviderReference: { credential: "secret" },
  } as PublicFlightResult;
  writeFlightResultsSessionSnapshot("search", [unsafeResult], [], storage, 100);

  const serialized = storage.getItem(FLIGHT_RESULTS_SESSION_CACHE_KEY) ?? "";
  assert.equal(serialized.includes("rawProviderReference"), false);
  assert.equal(serialized.includes("secret"), false);
});
