import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import { getPrisma } from "../src/lib/prisma";
import { rememberProviderResults, getProviderResultWithContext, rememberHotelSearchCohort, getHotelSearchCohort } from "../src/services/travel/providerResultCache";
import type { NormalizedHotelResult } from "../src/lib/types";
import { createPrismaFlightCacheBackend, type SharedFlightCacheRecord } from "../src/lib/searchCache";
import { GET as hotelDetails } from "../src/app/api/hotels/details/route";
import { deleteExpiredCacheBatch } from "../src/lib/cacheMaintenance";

// Deliberately refuse non-disposable targets, including all Render hosts.
const target = new URL(process.env.DATABASE_URL || "http://invalid");
assert.ok(["localhost", "127.0.0.1"].includes(target.hostname));
assert.equal(target.pathname, "/kurioticket_cache_test");

test("PostgreSQL persists every batched offer, duplicate update and complete cohort", async t => {
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
      rating: 4, location: "Test city", amenities: [], roomType: randomBytes(1024).toString("hex"), cancellationInfo: "Test policy",
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
    const manifestRow = await db.providerResultCache.findFirstOrThrow({ where: {
      resultId: { startsWith: "__hotel-search-cohort__:", not: { contains: ":chunk:" } },
    } });
    const manifest = manifestRow.normalizedResult as { generation: string; chunks: number; format: string };
    assert.equal(manifest.format, "gzip-chunks-v1");
    assert.ok(manifest.chunks > 8, "exercise more than one bounded chunk-write batch");
    const firstChunk = await db.providerResultCache.findUniqueOrThrow({ where: {
      cacheKey: `${manifestRow.cacheKey}:chunk:${manifest.generation}:0`,
    } });
    assert.ok(Buffer.byteLength(JSON.stringify(firstChunk.normalizedResult)) <= 87386);
    await db.providerResultCache.delete({ where: { cacheKey: firstChunk.cacheKey } });
    assert.deepEqual(await getHotelSearchCohort(search), [], "missing chunk must never expose a partial result set");
    await db.providerResultCache.create({ data: firstChunk as never });
    assert.deepEqual(await getHotelSearchCohort(search), updatedCohort);
    await db.$executeRawUnsafe(`CREATE FUNCTION reject_manifest() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW."normalizedResult"->>'format' = 'gzip-chunks-v1' THEN RAISE EXCEPTION 'synthetic publish failure'; END IF; RETURN NEW; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER reject_manifest BEFORE INSERT OR UPDATE ON "ProviderResultCache" FOR EACH ROW EXECUTE FUNCTION reject_manifest()`);
    await rememberHotelSearchCohort(results, search);
    await db.$executeRawUnsafe('DROP TRIGGER reject_manifest ON "ProviderResultCache"');
    assert.deepEqual(await getHotelSearchCohort(search), updatedCohort, "failed publication preserves the previous complete generation");
    await new Promise(resolve => setTimeout(resolve, 5100));
    // A later search must not overwrite the first search's distinct result identity.
    await rememberProviderResults("hotel", [{ id: "second-search", name: "Other hotel" }], search);
    assert.deepEqual((await getProviderResultWithContext("hotel", results[1041].id))?.result, results[1041]);
    // Repeat the same criteria with fresh provider IDs, then resolve an older
    // offer on a worker with no in-memory hotel cache.
    const original = { ...results[0], id: "kayak-sandbox:original:one", provider: "KAYAK sandbox", propertyGroupId: "original:hotel" };
    if (original.inventoryKind === "discovery") throw new Error("Expected priced inventory");
    const sibling = { ...original, id: "kayak-sandbox:original:two", totalPrice: 280, roomType: "Suite" };
    const newer = { ...original, id: "kayak-sandbox:newer:one", propertyGroupId: "newer:hotel" };
    await rememberProviderResults("hotel", [original, sibling], search);
    assert.equal(await rememberHotelSearchCohort([original, sibling], search), true);
    assert.equal(await rememberHotelSearchCohort([newer], search), true);
    assert.deepEqual(await getHotelSearchCohort(search), [newer]);
    assert.deepEqual(await getHotelSearchCohort(search, undefined, original.id), [original, sibling]);
    assert.deepEqual(await getHotelSearchCohort(search, undefined, "kayak-sandbox:missing:one"), []);
    const params = new URLSearchParams({ id: original.id, ...search, guests: "1", rooms: "1" });
    const response = await hotelDetails(new Request(`https://kurioticket.test/api/hotels/details?${params}`));
    assert.equal(response.status, 200);
    const details = await response.json();
    assert.deepEqual(details.propertyOffers.map((offer: { hotel: { id: string } }) => offer.hotel.id), [original.id, sibling.id]);
    assert.equal(details.propertyOffers[1].hotel.totalPrice, 280);
    assert.equal(details.propertyOffers[1].hotel.roomType, "Suite");
    assert.deepEqual(await getHotelSearchCohort(search, Date.now() + 31 * 60_000, original.id), []);
    await t.test("snapshot-only PostgreSQL readers preserve details/context and atomic lookup publication", async () => {
      const snapshot = randomUUID();
      const deferredSearch = { ...search, destinationId: "place:fixture", guests: 2, adults: 1, children: 1 };
      const deferred = { ...original, id: `kayak-sandbox:${snapshot}:deferred`, propertyGroupId: `${snapshot}:hotel` };
      assert.equal(await rememberHotelSearchCohort([deferred], deferredSearch), true);
      assert.equal(await db.providerResultCache.findUnique({ where: { cacheKey: "hotel:" + deferred.id } }), null);
      assert.deepEqual(await getProviderResultWithContext("hotel", deferred.id), { result: deferred, searchContext: deferredSearch });
      const query = new URLSearchParams({ id: deferred.id, ...search, guests: "2", rooms: "1" });
      const response = await hotelDetails(new Request(`https://kurioticket.test/api/hotels/details?${query}`));
      assert.equal(response.status, 200);
      assert.equal((await response.json()).hotel.id, deferred.id);
      assert.equal(await getProviderResultWithContext("hotel", deferred.id.replace(snapshot, randomUUID())), null);

      const lookupKey = `hotel:__hotel-snapshot-lookup-v1__:${snapshot}`;
      const lookup = await db.providerResultCache.findUniqueOrThrow({ where: { cacheKey: lookupKey } });
      await db.providerResultCache.update({ where: { cacheKey: lookupKey }, data: { expiresAt: new Date(0) } });
      assert.equal(await getProviderResultWithContext("hotel", deferred.id), null);
      await db.providerResultCache.update({ where: { cacheKey: lookupKey }, data: { expiresAt: lookup.expiresAt } });
      assert.deepEqual((await getProviderResultWithContext("hotel", deferred.id))?.result, deferred);

      await db.$executeRawUnsafe(`CREATE FUNCTION reject_snapshot_lookup() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW."normalizedResult"->>'format' = 'hotel-snapshot-lookup-v1' THEN RAISE EXCEPTION 'synthetic lookup failure'; END IF; RETURN NEW; END $$`);
      await db.$executeRawUnsafe(`CREATE TRIGGER reject_snapshot_lookup BEFORE INSERT OR UPDATE ON "ProviderResultCache" FOR EACH ROW EXECUTE FUNCTION reject_snapshot_lookup()`);
      const failedSnapshot = randomUUID();
      const failed = { ...deferred, id: `kayak-sandbox:${failedSnapshot}:failed`, propertyGroupId: `${failedSnapshot}:hotel` };
      try {
        assert.equal(await rememberHotelSearchCohort([failed], deferredSearch), false);
        assert.equal(await db.providerResultCache.count({ where: { resultId: { endsWith: ":snapshot:" + failedSnapshot } } }), 0,
          "a rejected lookup must roll back its same-statement complete manifest");
        assert.equal(await db.providerResultCache.findUnique({ where: { cacheKey: `hotel:__hotel-snapshot-lookup-v1__:${failedSnapshot}` } }), null);
        assert.equal(await getProviderResultWithContext("hotel", failed.id), null);
      } finally { await db.$executeRawUnsafe('DROP TRIGGER reject_snapshot_lookup ON "ProviderResultCache"'); }
      // Let the intentional publication failure's circuit cooldown expire so
      // the following lock test still exercises a genuine database timeout.
      await new Promise(resolve => setTimeout(resolve, 5100));
    });
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
    const cutoff = new Date("2020-01-01T00:00:00Z");
    await db.$executeRaw`INSERT INTO "FlightResultCache" ("publicResultId", "normalizedResult", "itineraryKey", "expiresAt")
      SELECT 'expired-' || n, '{}'::jsonb, 'test', ${cutoff} FROM generate_series(1, 205) n`;
    const first = await deleteExpiredCacheBatch(cutoff, db);
    assert.equal(first.flights, 200);
    assert.equal(await db.flightResultCache.count(), 108, "all 103 valid rows survive");
    const second = await deleteExpiredCacheBatch(cutoff, db);
    assert.equal(second.flights, 5);
    assert.equal(await db.flightResultCache.count(), 103);
    assert.ok(await db.providerResultCache.count() > 0, "valid provider records survive");
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(6213, 1)`;
      assert.equal((await deleteExpiredCacheBatch(cutoff, db)).skipped, true);
    });
  } finally { await db.$disconnect(); }
});
