import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { FlightLeg, FlightSearchParams, NormalizedFlightResult } from "./types";
import {
  FLIGHT_CACHE_TTL_MS,
  buildFlightCacheUpsertQuery,
  createFlightResultCache,
  createMemoryFlightCacheBackend,
  createPrismaFlightCacheBackend,
  type SharedFlightCacheBackend,
  type SharedFlightCacheRecord,
  toFlightDetailsOffer,
  toPublicFlight,
} from "./searchCache";

const oneWaySearch: FlightSearchParams = {
  tripType: "one-way",
  origin: "LHR",
  destination: "JFK",
  departureDate: "2027-01-01",
  adults: 1,
  children: 0,
  infants: 0,
  travelers: 1,
  cabinClass: "economy",
};

function leg(origin: string, destination: string, date: string, index = 0): FlightLeg {
  const departureTime = `${date}T10:00:00Z`;
  const arrivalTime = `${date}T12:00:00Z`;
  return {
    direction: "leg",
    legIndex: index,
    originAirport: origin,
    destinationAirport: destination,
    departureTime,
    arrivalTime,
    duration: "2h",
    durationMinutes: 120,
    stops: 0,
    layovers: [],
    segments: [{
      originAirport: origin,
      destinationAirport: destination,
      departureTime,
      arrivalTime,
      airlineName: "Provider Air",
      flightNumber: `PA${100 + index}`,
    }],
  };
}

const flight = (
  id: string,
  expiresAt: number,
  legs: FlightLeg[] = [leg("LHR", "JFK", "2027-01-01")],
): NormalizedFlightResult => ({
  id,
  provider: "Duffel",
  providerOfferId: `offer-${id}`,
  providerExpiresAt: expiresAt,
  rawProviderReference: { providerResourceIds: ["must-not-be-persisted"] },
  airlineName: "Provider Air",
  originAirport: legs[0].originAirport,
  destinationAirport: legs.at(-1)!.destinationAirport,
  departureTime: legs[0].departureTime,
  arrivalTime: legs.at(-1)!.arrivalTime,
  duration: "2h",
  durationMinutes: 120 * legs.length,
  stops: 0,
  layovers: [],
  legs,
  cabinClass: "economy",
  baggageInfo: "bag",
  refundInfo: "refund",
  price: 100,
  currency: "EUR",
  bookingUrl: "",
  partnerRedirectUrl: "",
  valueScore: 1,
  riskScore: 1,
  comfortScore: 1,
  travelConfidenceScore: 1,
  travelEffortScore: 1,
  recommendationReasons: [],
  badges: [],
});

test("flight details projection keeps provider identity and handoff URLs private", () => {
  const details = toFlightDetailsOffer({
    ...flight("details", 15_000),
    bookingUrl: "https://private.example/book",
    partnerRedirectUrl: "https://private.example/redirect",
  });
  assert.equal("bookingUrl" in details, false);
  assert.equal("partnerRedirectUrl" in details, false);
  assert.equal("providerOfferId" in details, false);
  assert.equal("providerExpiresAt" in details, false);
  assert.equal("rawProviderReference" in details, false);
});

test("public flight projection removes all internal provider metadata", () => {
  const publicFlight = toPublicFlight(flight("public", 15_000));
  assert.equal(publicFlight.id, "public");
  assert.equal("providerOfferId" in publicFlight, false);
  assert.equal("providerExpiresAt" in publicFlight, false);
  assert.equal("rawProviderReference" in publicFlight, false);
});

test("shared cache migration is additive and indexes logical expiry and itinerary lookup", async () => {
  const sql = await readFile(
    new URL("../../prisma/migrations/20260821153000_add_shared_flight_result_cache/migration.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /CREATE TABLE "FlightResultCache"/);
  assert.match(sql, /"normalizedResult" JSONB NOT NULL/);
  assert.match(sql, /"searchContext" JSONB/);
  assert.match(sql, /"FlightResultCache_expiresAt_idx"/);
  assert.match(sql, /"FlightResultCache_searchKey_itineraryKey_expiresAt_idx"/);
  assert.doesNotMatch(sql, /DROP TABLE|ALTER TABLE/i);
});

test("two independent cache instances share exact offer, search, and compatible alternatives", async () => {
  const backend = createMemoryFlightCacheBackend();
  const processA = createFlightResultCache(backend);
  const processB = createFlightResultCache(backend);
  const selected = flight("duffel-result-opaque-a", 20_000);
  const alternative = flight("duffel-result-opaque-b", 20_000);
  await processA.remember([selected, alternative], 10_000, oneWaySearch);

  assert.equal((await processB.get(selected.id, 10_001))?.providerOfferId, "offer-duffel-result-opaque-a");
  assert.deepEqual(await processB.getSearch(selected.id, 10_001), oneWaySearch);
  assert.deepEqual((await processB.getCompatible(selected.id, 10_001)).map(({ id }) => id).sort(), [
    selected.id,
    alternative.id,
  ].sort());
});

test("cache mapping survives application cache recreation", async () => {
  const backend = createMemoryFlightCacheBackend();
  const beforeRestart = createFlightResultCache(backend);
  const selected = flight("duffel-result-restart", 20_000);
  await beforeRestart.remember([selected], 10_000, oneWaySearch);

  const afterRestart = createFlightResultCache(backend);
  assert.equal((await afterRestart.get(selected.id, 10_001))?.id, selected.id);
});

test("provider expiry wins when sooner, application TTL wins when sooner, and expired offers are skipped", async () => {
  const cache = createFlightResultCache(createMemoryFlightCacheBackend());
  await cache.remember([
    flight("provider-sooner", 15_000),
    flight("application-sooner", 10_000 + FLIGHT_CACHE_TTL_MS * 2),
    flight("already-expired", 10_000),
  ], 10_000, oneWaySearch);

  assert.equal((await cache.get("provider-sooner", 14_999))?.id, "provider-sooner");
  assert.equal(await cache.get("provider-sooner", 15_000), null);
  assert.equal((await cache.get("application-sooner", 10_000 + FLIGHT_CACHE_TTL_MS - 1))?.id, "application-sooner");
  assert.equal(await cache.get("application-sooner", 10_000 + FLIGHT_CACHE_TTL_MS), null);
  assert.equal(await cache.get("already-expired", 10_000), null);
});

test("five-leg canonical search survives a fresh cache instance without compatibility projection", async () => {
  const legs = [
    ["IAH", "LAX", "2027-02-01"],
    ["LAX", "JFK", "2027-02-03"],
    ["JFK", "LHR", "2027-02-05"],
    ["LHR", "CDG", "2027-02-07"],
    ["CDG", "IAH", "2027-02-09"],
  ].map(([origin, destination, date], index) => leg(origin, destination, date, index));
  const search: FlightSearchParams = {
    tripType: "multi-city",
    legs: legs.map(({ originAirport: origin, destinationAirport: destination, departureTime }) => ({
      origin,
      destination,
      departureDate: departureTime.slice(0, 10),
    })),
    origin: "IAH",
    destination: "IAH",
    departureDate: "2027-02-01",
    adults: 2,
    children: 1,
    infants: 0,
    travelers: 3,
    cabinClass: "economy",
  };
  const backend = createMemoryFlightCacheBackend();
  await createFlightResultCache(backend).remember([flight("duffel-result-five-leg", 30_000, legs)], 10_000, search);

  assert.deepEqual((await createFlightResultCache(backend).getSearch("duffel-result-five-leg", 10_001))?.legs, search.legs);
});

test("compatible lookup requires the complete physical multi-city itinerary", async () => {
  const baseLegs = [
    leg("IAH", "LAX", "2027-03-01", 0),
    leg("LAX", "JFK", "2027-03-03", 1),
    leg("JFK", "IAH", "2027-03-05", 2),
  ];
  const selected = flight("selected", 30_000, baseLegs);
  const same = flight("same", 30_000, cloneLegs(baseLegs));
  const wrongMiddle = flight("wrong-middle", 30_000, [
    baseLegs[0],
    leg("LAX", "BOS", "2027-03-03", 1),
    baseLegs[2],
  ]);
  const backend = createMemoryFlightCacheBackend();
  const cache = createFlightResultCache(backend);
  await cache.remember([selected, same, wrongMiddle], 10_000, {
    ...oneWaySearch,
    tripType: "multi-city",
    legs: baseLegs.map(({ originAirport: origin, destinationAirport: destination, departureTime }) => ({ origin, destination, departureDate: departureTime.slice(0, 10) })),
    origin: "IAH",
    destination: "IAH",
    departureDate: "2027-03-01",
  });

  assert.deepEqual((await cache.getCompatible(selected.id, 10_001)).map(({ id }) => id).sort(), ["same", "selected"]);
});

test("compatible lookup never crosses canonical traveler composition", async () => {
  const backend = createMemoryFlightCacheBackend();
  const cache = createFlightResultCache(backend);
  const selected = flight("one-traveler", 30_000);
  const otherParty = flight("two-travelers", 30_000);
  await cache.remember([selected], 10_000, oneWaySearch);
  await cache.remember([otherParty], 10_000, {
    ...oneWaySearch,
    adults: 2,
    travelers: 2,
  });

  assert.deepEqual((await cache.getCompatible(selected.id, 10_001)).map(({ id }) => id), [selected.id]);
});

test("persisted normalized record omits unused raw provider references but retains exact refresh identity", async () => {
  let written: SharedFlightCacheRecord[] = [];
  const memory = createMemoryFlightCacheBackend();
  const backend: SharedFlightCacheBackend = {
    ...memory,
    async write(records) {
      written = structuredClone(records);
      return memory.write(records);
    },
  };
  await createFlightResultCache(backend).remember([flight("private", 20_000)], 10_000, oneWaySearch);
  assert.equal(written[0].normalizedResult.providerOfferId, "offer-private");
  assert.equal("rawProviderReference" in written[0].normalizedResult, false);
  assert.match(written[0].publicResultId, /^private$/);
});

test("database failures fail soft for Search and fail closed for Details reads", async () => {
  const unavailable: SharedFlightCacheBackend = {
    async write() { throw new Error("database unavailable"); },
    async find() { throw new Error("database unavailable"); },
    async findCompatible() { throw new Error("database unavailable"); },
    async cleanupExpired() { throw new Error("database unavailable"); },
  };
  const cache = createFlightResultCache(unavailable);
  assert.equal((await cache.remember([flight("db-down", 20_000)], 10_000, oneWaySearch)).persisted, false);
  assert.equal(await cache.get("db-down", 10_001), null);
  assert.equal(await cache.getSearch("db-down", 10_001), null);
  assert.deepEqual(await cache.getCompatible("db-down", 10_001), []);
});

test("database RETURNING identity mismatch is a cache persistence failure", async () => {
  const memory = createMemoryFlightCacheBackend();
  const backend: SharedFlightCacheBackend = {
    ...memory,
    async write(records) {
      await memory.write(records);
      return records.slice(0, -1).map(({ publicResultId }) => publicResultId);
    },
  };
  const outcome = await createFlightResultCache(backend).remember(
    [flight("expected-a", 20_000), flight("expected-b", 20_000)],
    10_000,
    oneWaySearch,
    "main-results-request",
  );

  assert.deepEqual(outcome, { persisted: false, validForMs: 0 });
});

test("recaching without search authority clears stale passenger context", async () => {
  const cache = createFlightResultCache(createMemoryFlightCacheBackend());
  const selected = flight("cleared-search", 20_000);
  await cache.remember([selected], 10_000, oneWaySearch);
  await cache.remember([selected], 10_001);
  assert.equal(await cache.getSearch(selected.id, 10_002), null);
});

test("603-result cache writes remain complete and compatible", async () => {
  const memory = createMemoryFlightCacheBackend();
  let databaseCommittedIds: string[] = [];
  const backend: SharedFlightCacheBackend = {
    ...memory,
    async write(records) {
      databaseCommittedIds = await memory.write(records);
      return databaseCommittedIds;
    },
  };
  const cache = createFlightResultCache(backend);
  const results = Array.from({ length: 603 }, (_, index) =>
    flight(`duffel-result-large-${index}`, 40_000),
  );

  assert.equal((await cache.remember(results, 10_000, oneWaySearch)).persisted, true);
  const cacheInputIds = results.map(({ id }) => id).sort();
  const publicResponseIds = results.map(toPublicFlight).map(({ id }) => id).sort();
  assert.deepEqual(databaseCommittedIds.sort(), cacheInputIds);
  assert.deepEqual(publicResponseIds, cacheInputIds);
  for (const index of [0, Math.floor(results.length / 2), results.length - 1]) {
    assert.equal((await cache.get(results[index].id, 10_001))?.id, results[index].id);
  }
  for (const result of results) {
    assert.equal((await cache.get(result.id, 10_001))?.id, result.id);
  }
  assert.equal((await cache.getCompatible(results[0].id, 10_001)).length, 603);
  assert.equal("rawProviderReference" in (await cache.get(results[0].id, 10_001))!, false);
  assert.equal("providerOfferId" in toPublicFlight((await cache.get(results[0].id, 10_001))!), false);
});

test("552-result browser identity set exactly matches cache input and database RETURNING", async () => {
  const memory = createMemoryFlightCacheBackend();
  let databaseCommittedIds: string[] = [];
  const cache = createFlightResultCache({
    ...memory,
    async write(records) {
      databaseCommittedIds = await memory.write(records);
      return databaseCommittedIds;
    },
  });
  const results = Array.from({ length: 552 }, (_, index) =>
    flight(`duffel-result-production-${index}`, 40_000),
  );

  const outcome = await cache.remember(results, 10_000, oneWaySearch, "visible-main-request");
  const cacheInputIds = results.map(({ id }) => id).sort();
  const publicResponseIds = results.map(toPublicFlight).map(({ id }) => id).sort();
  assert.equal(outcome.persisted, true);
  assert.deepEqual(databaseCommittedIds.sort(), cacheInputIds);
  assert.deepEqual(publicResponseIds, cacheInputIds);
  for (const index of [0, Math.floor(results.length / 2), results.length - 1]) {
    assert.equal((await cache.get(results[index].id, 10_001))?.id, results[index].id);
  }
});

test("1000-result cache writes preserve every opaque mapping", async () => {
  const memory = createMemoryFlightCacheBackend();
  let databaseCommittedIds: string[] = [];
  const cache = createFlightResultCache({
    ...memory,
    async write(records) {
      databaseCommittedIds = await memory.write(records);
      return databaseCommittedIds;
    },
  });
  const results = Array.from({ length: 1000 }, (_, index) =>
    flight(`duffel-result-thousand-${index}`, 40_000),
  );

  assert.equal((await cache.remember(results, 10_000, oneWaySearch)).persisted, true);
  const resolved = await Promise.all(results.map(({ id }) => cache.get(id, 10_001)));
  assert.equal(resolved.filter(Boolean).length, 1000);
  assert.deepEqual(databaseCommittedIds.sort(), results.map(({ id }) => id).sort());
  assert.deepEqual(results.map(toPublicFlight).map(({ id }) => id).sort(), databaseCommittedIds);
});

test("bulk upsert retains existing opaque-ID update semantics", async () => {
  const cache = createFlightResultCache(createMemoryFlightCacheBackend());
  const original = flight("duffel-result-refresh", 20_000);
  const refreshed = {
    ...original,
    price: 175,
    fareBrandName: "Provider refreshed fare",
    providerExpiresAt: 25_000,
  };

  await cache.remember([original], 10_000, oneWaySearch);
  await cache.remember([refreshed], 10_001, oneWaySearch);
  const stored = await cache.get(original.id, 10_002);
  assert.equal(stored?.price, 175);
  assert.equal(stored?.fareBrandName, "Provider refreshed fare");
  assert.equal(stored?.providerExpiresAt, 25_000);
});

test("Postgres cache persistence uses one atomic set-based upsert for 603 rows", () => {
  const records = Array.from({ length: 603 }, (_, index): SharedFlightCacheRecord => ({
    publicResultId: `duffel-result-sql-${index}`,
    normalizedResult: flight(`duffel-result-sql-${index}`, 40_000),
    searchContext: oneWaySearch,
    searchKey: "search-key",
    itineraryKey: "itinerary-key",
    expiresAt: 40_000,
  }));
  const query = buildFlightCacheUpsertQuery(records);

  assert.match(query.sql, /^\s*INSERT INTO "FlightResultCache"/);
  assert.match(query.sql, /ON CONFLICT \("publicResultId"\) DO UPDATE SET/);
  assert.match(query.sql, /RETURNING "publicResultId"/);
  assert.doesNotMatch(query.sql, /BEGIN|COMMIT/);
  assert.equal(query.values.length, records.length * 6);
});

test("production backend keeps query count constant through 1000 rows", async () => {
  let executeCount = 0;
  const database = {
    async $queryRaw(query: { values: unknown[] }) {
      executeCount += 1;
      const size = query.values.length / 6;
      return Array.from({ length: size }, (_, index) => ({
        publicResultId: `duffel-result-query-${size}-${index}`,
      }));
    },
  };
  const backend = createPrismaFlightCacheBackend(() => database as never);
  const measurements = [];
  for (const size of [10, 100, 603, 1000]) {
    const records = Array.from({ length: size }, (_, index): SharedFlightCacheRecord => ({
      publicResultId: `duffel-result-query-${size}-${index}`,
      normalizedResult: flight(`duffel-result-query-${size}-${index}`, 40_000),
      searchContext: oneWaySearch,
      searchKey: "search-key",
      itineraryKey: "itinerary-key",
      expiresAt: 40_000,
    }));
    const before = performance.now();
    await backend.write(records);
    measurements.push({ size, elapsedMs: performance.now() - before });
  }

  assert.equal(executeCount, 4);
  assert.deepEqual(measurements.map(({ size }) => size), [10, 100, 603, 1000]);
  console.info("[flight-cache-test:bulk-write]", measurements);
});

function cloneLegs(legs: FlightLeg[]) {
  return structuredClone(legs);
}
