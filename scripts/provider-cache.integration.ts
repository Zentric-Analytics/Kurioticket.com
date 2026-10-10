import assert from "node:assert/strict";
import test from "node:test";
import { getPrisma } from "../src/lib/prisma";
import { rememberProviderResults, getProviderResultWithContext, rememberHotelSearchCohort, getHotelSearchCohort } from "../src/services/travel/providerResultCache";
import type { NormalizedHotelResult } from "../src/lib/types";

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
    // A later search must not overwrite the first search's distinct result identity.
    await rememberProviderResults("hotel", [{ id: "second-search", name: "Other hotel" }], search);
    assert.deepEqual((await getProviderResultWithContext("hotel", results[1041].id))?.result, results[1041]);
  } finally { await db.$disconnect(); }
});
