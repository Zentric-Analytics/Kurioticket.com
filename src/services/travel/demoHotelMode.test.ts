import assert from "node:assert/strict";
import test from "node:test";

import { getHotelResultsMode } from "@/lib/env";
import { toPublicHotel } from "@/lib/searchCache";
import { demoHotelCatalog, getDemoHotelResultId } from "@/services/travel/demoHotelCatalog";
import { buildDemoHotelResults } from "@/services/travel/demoHotelResults";
import { normalizeHotelImageUrls } from "@/services/travel/hotelImages";
import { searchHotels } from "@/services/travel/hotelAggregator";
import { normalizeHotelResult } from "@/services/travel/normalizeHotelResult";
import type { HotelSearchParams } from "@/lib/types";

const search: HotelSearchParams = {
  destination: "Sample City",
  checkIn: "2026-08-01",
  checkOut: "2026-08-04",
  guests: 2,
  rooms: 1,
};

function withEnv<T>(env: Record<string, string | undefined>, run: () => T): T {
  const previous = new Map<string, string | undefined>();
  for (const key of Object.keys(env)) {
    previous.set(key, process.env[key]);
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  try {
    return run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function withEnvAsync<T>(env: Record<string, string | undefined>, run: () => Promise<T>): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const key of Object.keys(env)) {
    previous.set(key, process.env[key]);
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  try {
    return await run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("hotel results mode defaults and accepts only documented values", () => {
  assert.equal(withEnv({ HOTEL_RESULTS_MODE: undefined }, getHotelResultsMode), "demo");
  assert.equal(withEnv({ HOTEL_RESULTS_MODE: "demo" }, getHotelResultsMode), "demo");
  assert.equal(withEnv({ HOTEL_RESULTS_MODE: "live" }, getHotelResultsMode), "live");
  assert.equal(withEnv({ HOTEL_RESULTS_MODE: "invalid" }, getHotelResultsMode), "demo");
});

test("demo hotel catalogue is unique, fictional, deterministic, and internally related", () => {
  const snapshot = JSON.stringify(demoHotelCatalog);
  const ids = new Set(demoHotelCatalog.map((hotel) => hotel.id));
  assert.equal(ids.size, demoHotelCatalog.length);

  for (const hotel of demoHotelCatalog) {
    assert.match(hotel.name, /\S/);
    assert.doesNotMatch(hotel.name, /Marriott|Hilton|Hyatt|Sheraton|Westin|Holiday Inn|Ritz|Four Seasons/i);
    assert.equal(new Set(hotel.imageUrls).size, hotel.imageUrls.length);
    assert.ok(hotel.imageUrls.length >= 3);
    assert.deepEqual(normalizeHotelImageUrls(hotel.imageUrls), hotel.imageUrls);
    assert.ok(hotel.rating >= 0 && hotel.rating <= 5);
    assert.ok(hotel.reviewScore >= 0 && hotel.reviewScore <= 10);
    assert.equal(Number.isInteger(hotel.reviewCount), true);
    assert.ok(hotel.reviewCount >= 0);
    assert.ok(hotel.nightlyPrice > 0);
    assert.match(hotel.currency, /^[A-Z]+$/);
    for (const relatedId of hotel.relatedIds) {
      assert.ok(ids.has(relatedId));
      assert.notEqual(relatedId, hotel.id);
    }
  }
  assert.equal(JSON.stringify(demoHotelCatalog), snapshot);
});

test("hotel gallery URL normalization keeps only unique safe HTTPS strings in order", () => {
  const urls = normalizeHotelImageUrls([
    " https://example.com/a.jpg ",
    "http://example.com/b.jpg",
    "not a url",
    "https://example.com/a.jpg",
    42,
    "https://example.com/c.jpg",
  ]);
  assert.deepEqual(urls, ["https://example.com/a.jpg", "https://example.com/c.jpg"]);
  assert.deepEqual(normalizeHotelImageUrls("https://example.com/a.jpg"), []);
  assert.deepEqual(normalizeHotelImageUrls(null), []);
});

test("demo results map catalogue fields into normalized results and vary only totals by stay length", () => {
  const results = buildDemoHotelResults(search);
  assert.equal(results.length, demoHotelCatalog.length);
  for (const result of results) {
    const catalogue = demoHotelCatalog.find((hotel) => getDemoHotelResultId(hotel.id) === result.id);
    assert.ok(catalogue);
    assert.equal(result.provider, "Demo Hotel Catalogue");
    assert.equal(result.dataSource, "demo");
    assert.equal(result.imageUrl, result.imageUrls?.[0]);
    assert.equal(result.reviewScore, catalogue.reviewScore);
    assert.equal(result.reviewCount, catalogue.reviewCount);
    assert.equal(result.neighbourhood, catalogue.areaLabel);
    assert.equal(result.taxesAndFeesIncluded, catalogue.taxesAndFeesIncluded);
    assert.deepEqual(result.similarHotelIds, catalogue.relatedIds.map(getDemoHotelResultId));
    assert.equal(result.pricePerNight, catalogue.nightlyPrice);
    assert.equal(result.totalPrice, catalogue.nightlyPrice * 3);
  }

  const longerStay = buildDemoHotelResults({ ...search, checkOut: "2026-08-06" });
  assert.equal(longerStay[0].pricePerNight, results[0].pricePerNight);
  assert.equal(longerStay[0].totalPrice, results[0].pricePerNight * 5);
});

test("live provider normalization is isolated from demo metadata", () => {
  const live = normalizeHotelResult(
    "Hotel Partner",
    { id: "live-1", name: "Provider Hotel", price: 120, total: 360, currency: "usd", image: "https://example.com/live.jpg" },
    search,
  );
  assert.ok(live);
  assert.equal(live.dataSource, "live");
  assert.equal(live.reviewScore, undefined);
  assert.equal(live.reviewCount, undefined);
  assert.equal(live.imageUrls, undefined);
  assert.equal(live.neighbourhood, undefined);
  assert.equal(live.taxesAndFeesIncluded, undefined);
  assert.equal(live.similarHotelIds, undefined);
});

test("public hotel conversion preserves new fields but excludes raw provider references", () => {
  const result = buildDemoHotelResults(search)[0];
  const publicResult = toPublicHotel(result);
  assert.equal(publicResult.dataSource, "demo");
  assert.deepEqual(publicResult.imageUrls, result.imageUrls);
  assert.equal(publicResult.reviewScore, result.reviewScore);
  assert.equal(publicResult.reviewCount, result.reviewCount);
  assert.equal(publicResult.neighbourhood, result.neighbourhood);
  assert.equal(publicResult.taxesAndFeesIncluded, result.taxesAndFeesIncluded);
  assert.deepEqual(publicResult.similarHotelIds, result.similarHotelIds);
  assert.equal("rawProviderReference" in publicResult, false);
});

test("aggregator demo mode returns selected demo source without fallback status", async () => {
  await withEnvAsync({ HOTEL_RESULTS_MODE: "demo", HOTEL_PROVIDER_PRIMARY: "hotelbeds" }, async () => {
    const aggregate = await searchHotels(search);
    assert.equal(aggregate.unavailableMessage, undefined);
    assert.equal(aggregate.servedFromFallback, false);
    assert.equal(aggregate.providerStatuses.length, 1);
    assert.equal(aggregate.providerStatuses[0].provider, "Demo Hotel Catalogue");
    assert.equal(aggregate.providerStatuses[0].status, "success");
    assert.deepEqual(aggregate.warnings, ["Demo hotel listings are illustrative and are not live inventory."]);
    assert.ok(aggregate.results.length > 0);
    assert.ok(aggregate.results.every((result) => result.dataSource === "demo"));
  });
});

test("aggregator live mode keeps provider path and does not silently switch to demo", async () => {
  await withEnvAsync({ HOTEL_RESULTS_MODE: "live", HOTEL_PROVIDER_PRIMARY: "none", NODE_ENV: "production", ENABLE_DEVELOPMENT_FALLBACKS: undefined }, async () => {
    const aggregate = await searchHotels(search);
    assert.equal(aggregate.servedFromFallback, false);
    assert.equal(aggregate.results.length, 0);
    assert.equal(aggregate.providerStatuses[0].provider, "Hotel Provider");
    assert.equal(aggregate.unavailableMessage, "Live hotel search is temporarily unavailable. Please try again shortly.");
    assert.ok(aggregate.results.every((result) => result.provider !== "Demo Hotel Catalogue"));
  });
});
