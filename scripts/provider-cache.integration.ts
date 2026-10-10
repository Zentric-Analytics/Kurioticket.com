import assert from "node:assert/strict";
import test from "node:test";
import { getPrisma } from "../src/lib/prisma";
import { rememberProviderResults, getProviderResultWithContext, rememberHotelSearchCohort, getHotelSearchCohort } from "../src/services/travel/providerResultCache";
import type { NormalizedHotelResult } from "../src/lib/types";
import { createPrismaFlightCacheBackend, type SharedFlightCacheRecord } from "../src/lib/searchCache";

// Deliberately refuse non-disposable targets, including all Render hosts.
const target = new URL(process.env.DATABASE_URL || "http://invalid");
assert.ok(["localhost", "127.0.0.1"].includes(target.hostname));
assert.equal(target.pathname, "/kurioticket_cache_test");

test("PostgreSQL persists every batched offer, duplicate update and complete cohort", async () => {
  const db = getPrisma();
  try {
    await db.$executeRawUnsafe(`CREATE TABLE "ProviderResultCache" (
      "cacheKey" text PRIMARY KEY, "vertical" text NOT NULL, "resultId" text NOT NULL,
      "normalizedResult" jsonb NOT NULL, "searchContext" jsonb,
      "expiresAt" timestamp(3) NOT NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" timestamp(3) NOT NULL, UNIQUE ("vertical", "resultId")
    )`);
    const results: NormalizedHotelResult[] = Array.from({ length: 1042 }, (_, i) => ({
      id: `integration-${i}`, name: `Hotel ${i}`, pricePerNight: i + 1, totalPrice: i + 1,
      provider: "Synthetic", currency: "USD", bookingUrl: "https://example.com", partnerRedirectUrl: "https://example.com",
      rating: 4, location: "Test city", amenities: [], roomType: "Test room", cancellationInfo: "Test policy",
      valueScore: 80, travelConfidenceScore: 80, arrivalSuitabilityScore: 80, recommendationReasons: [], badges: [],
    }));
    const search = { destination: "Synthetic test city", checkIn: "2030-01-01", checkOut: "2030-01-02", guests: 1, rooms: 1 };
    await rememberProviderResults("hotel", [...results, { ...results[0], pricePerNight: 999 }], search);
    assert.equal(await db.providerResultCache.count(), 1042);
    assert.deepEqual((await getProviderResultWithContext("hotel", results[1041].id))?.result, results[1041]);
    assert.equal((await getProviderResultWithContext<{ pricePerNight: number }>("hotel", results[0].id))?.result.pricePerNight, 999);
    await rememberHotelSearchCohort(results, search);
    assert.deepEqual(await getHotelSearchCohort(search), results);
    const updatedCohort = results.map(result => ({ ...result, cancellationInfo: "Updated policy" }));
    await rememberHotelSearchCohort(updatedCohort, search);
    assert.deepEqual(await getHotelSearchCohort(search), updatedCohort);
    // A later search must not overwrite the first search's distinct result identity.
    await rememberProviderResults("hotel", [{ id: "second-search", name: "Other hotel" }], search);
    assert.deepEqual((await getProviderResultWithContext("hotel", results[1041].id))?.result, results[1041]);
    // A blocked database must not hold the response indefinitely or proceed
    // with thousands of queued writes. Use only this disposable table.
    let releaseLock!: () => void;
    let confirmLock!: () => void;
    const held = new Promise<void>(resolve => { releaseLock = resolve; });
    const acquired = new Promise<void>(resolve => { confirmLock = resolve; });
    const lock = db.$transaction(async tx => {
      await tx.$executeRawUnsafe('LOCK TABLE "ProviderResultCache" IN ACCESS EXCLUSIVE MODE');
      confirmLock();
      await held;
    }, { timeout: 15_000 });
    await acquired;
    const started = Date.now();
    try {
      await rememberProviderResults("hotel", Array.from({ length: 200 }, (_, i) => ({ id: `blocked-${i}` })), search);
      assert.ok(Date.now() - started < 7000, "cache write must terminate within its bounded database deadline");
    } finally { releaseLock(); await lock; }
    assert.equal(await db.providerResultCache.count({ where: { resultId: { startsWith: "blocked-" } } }), 0);
  } finally { await db.$disconnect(); }
});

test("flight cache batches commit all identities and roll back a later batch failure", async () => {
  // The preceding lock-timeout test deliberately opens the shared circuit.
  await new Promise(resolve => setTimeout(resolve, 5100));
  const db = getPrisma();
  try {
    await db.$executeRawUnsafe(`CREATE TABLE "FlightResultCache" (
      "publicResultId" text PRIMARY KEY, "normalizedResult" jsonb NOT NULL,
      "searchContext" jsonb, "searchKey" text, "itineraryKey" text NOT NULL,
      "expiresAt" timestamp(3) NOT NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    const backend = createPrismaFlightCacheBackend();
    const records = Array.from({ length: 103 }, (_, i): SharedFlightCacheRecord => ({
      publicResultId: `flight-integration-${i}`, normalizedResult: { id: `flight-integration-${i}` } as never,
      searchContext: null, searchKey: null, itineraryKey: "test", expiresAt: Date.now() + 60_000,
    }));
    assert.deepEqual(await backend.write(records), records.map(record => record.publicResultId));
    assert.equal(await db.flightResultCache.count(), 103);
    const invalid = records.slice(0, 100).map((record, i) => ({ ...record, publicResultId: i < 50 ? `rollback-${i}` : "duplicate-in-second-batch" }));
    await assert.rejects(backend.write(invalid));
    assert.equal(await db.flightResultCache.count(), 103, "no first-batch rows may survive failure of the second batch");
  } finally { await db.$disconnect(); }
});
