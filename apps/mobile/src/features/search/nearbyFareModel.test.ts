import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNearbyFarePayload,
  freshNearbyFare,
  getNearbyFareDates,
  nearbyFareCacheKey,
  NEARBY_FARE_CACHE_TTL_MS,
  NEARBY_FARE_REQUEST_CONCURRENCY,
  preserveRoundTripDuration,
  prioritizeNearbyDates,
  runNearbyFareQueue,
  selectNearbyFareResult,
  type NearbyFareState,
} from "./nearbyFareModel";

const base = {
  tripType: "round-trip", origin: "LOS", destination: "LHR",
  departureDate: "2026-10-23", returnDate: "2026-10-30",
  adults: 1, children: 0, infants: 0, cabinClass: "economy", currency: "NGN",
};

test("builds the web-parity ten-day window four days before the selected date", () => {
  const dates = getNearbyFareDates("2026-10-23", "2026-10-01");
  assert.equal(dates.length, 10);
  assert.deepEqual(dates, ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28"]);
});

test("clamps the range to local today and shifts safely across calendar boundaries", () => {
  assert.deepEqual(getNearbyFareDates("2026-03-02", "2026-03-01").slice(0, 4), ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04"]);
  assert.deepEqual(getNearbyFareDates("2027-01-02", "2026-12-01").slice(0, 5), ["2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
});

test("prioritizes the selected date then alternates closest earlier and later dates", () => {
  const dates = getNearbyFareDates("2026-10-23", "2026-10-01");
  assert.deepEqual(prioritizeNearbyDates(dates, "2026-10-23").slice(0, 7), ["2026-10-23", "2026-10-22", "2026-10-24", "2026-10-21", "2026-10-25", "2026-10-20", "2026-10-26"]);
});

test("round trips preserve calendar duration for background requests and selection", () => {
  assert.equal(preserveRoundTripDuration("2026-10-23", "2026-10-30", "2026-10-25"), "2026-11-01");
  assert.deepEqual(buildNearbyFarePayload(base, "2026-10-25"), { ...base, departureDate: "2026-10-25", returnDate: "2026-11-01" });
  const oneWay = { ...base, tripType: "one-way", returnDate: undefined };
  assert.deepEqual(buildNearbyFarePayload(oneWay, "2026-10-25"), { ...oneWay, departureDate: "2026-10-25" });
});

test("cache is fresh only within ten minutes", () => {
  const cache = new Map<string, NearbyFareState>();
  cache.set("fresh", { date: "2026-10-23", status: "success", amount: 10, currency: "USD", fetchedAt: 1_000 });
  cache.set("stale", { date: "2026-10-24", status: "unavailable", fetchedAt: 1_000 });
  assert.equal(freshNearbyFare(cache, "fresh", 1_000 + NEARBY_FARE_CACHE_TTL_MS)?.status, "success");
  assert.equal(freshNearbyFare(cache, "stale", 1_001 + NEARBY_FARE_CACHE_TTL_MS), undefined);
  assert.equal(cache.has("stale"), false);
});

test("cache identity isolates route, travelers, cabin, currency, and round-trip context", () => {
  const key = nearbyFareCacheKey(base, "2026-10-25", "NGN");
  for (const changed of [
    { ...base, origin: "JFK" }, { ...base, destination: "MIA" }, { ...base, adults: 2 },
    { ...base, children: 1 }, { ...base, infants: 1 }, { ...base, cabinClass: "business" },
    { ...base, returnDate: "2026-11-02" }, { ...base, tripType: "one-way" },
  ]) assert.notEqual(nearbyFareCacheKey(changed, "2026-10-25", "NGN"), key);
  assert.notEqual(nearbyFareCacheKey(base, "2026-10-25", "USD"), key);
  assert.equal(nearbyFareCacheKey(base, "2026-10-25", "NGN"), key);
});

test("nearby fare selection keeps real provider inventory when FX conversion is unavailable", () => {
  const fares = [
    { id: "provider-fare", price: 120_000, currency: "NGN" },
  ];
  assert.equal(selectNearbyFareResult(fares, () => null)?.id, "provider-fare");
});

test("nearby fare selection still chooses the lowest comparable converted fare when FX is available", () => {
  const fares = [
    { id: "higher", price: 100, currency: "USD" },
    { id: "lower", price: 90, currency: "EUR" },
  ];
  const normalized = new Map([["higher", 100], ["lower", 95]]);
  assert.equal(selectNearbyFareResult(fares, (fare) => normalized.get(fare.id) ?? null)?.id, "lower");
});

test("bounded queue never exceeds production web concurrency", async () => {
  let active = 0;
  let maximum = 0;
  await runNearbyFareQueue(Array.from({ length: 10 }, (_, i) => String(i)), async () => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active -= 1;
  }, () => true);
  assert.equal(maximum, NEARBY_FARE_REQUEST_CONCURRENCY);
});

test("a stale generation stops taking queued work", async () => {
  let current = true;
  const handled: string[] = [];
  await runNearbyFareQueue(["one", "two", "three"], async (date) => {
    handled.push(date);
    current = false;
  }, () => current, 1);
  assert.deepEqual(handled, ["one"]);
});
