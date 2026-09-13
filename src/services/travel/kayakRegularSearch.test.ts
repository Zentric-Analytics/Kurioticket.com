import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveRegularKayakSearch, regularKayakRequest } from "./kayakRegularSearch";
import { KayakSandboxClient } from "./kayakSandbox";

const hotel = { destination: "Boston, Massachusetts, United States", checkIn: "2099-10-12", checkOut: "2099-10-17", guests: "2", rooms: "1", currency: "JPY" };
test("regular hotel search resolves a unique provider destination without mutating other providers' criteria", async () => {
  const result = await resolveRegularKayakSearch("hotels", hotel, async term => {
    assert.equal(term, hotel.destination);
    return [{ label: hotel.destination, value: "kplace:58075" }];
  });
  assert.equal(result.supported, true);
  if (result.supported) assert.deepEqual(result.search, { vertical: "hotels", destination: "kplace:58075", departure: hotel.checkIn, returnDate: hotel.checkOut, adults: 2 });
  assert.equal(hotel.currency, "JPY");
});
test("ambiguous hotel destinations require selection rather than silently searching another city", async () => {
  const choices = [{ label: "Boston, US", value: "kplace:1" }, { label: "Boston, GB", value: "kplace:2" }];
  const result = await resolveRegularKayakSearch("hotels", hotel, async () => choices);
  assert.equal(result.supported, false);
  if (!result.supported) assert.deepEqual(result.choices, choices);
});
test("invalid hotel occupancy never calls the provider", async () => {
  const result = await resolveRegularKayakSearch("hotels", { ...hotel, rooms: "2" }, async () => { throw new Error("must not call"); });
  assert.equal(result.supported, false);
});
test("normal airport labels and rental times are preserved for KAYAK", async () => {
  const result = await resolveRegularKayakSearch("cars", { pickupLocation: "Logan International Airport (BOS)", pickupDate: "2099-10-12", dropoffDate: "2099-10-17", pickupTime: "10:30", dropoffTime: "16:45" }, async () => []);
  assert.deepEqual(result, { supported: true, search: { vertical: "cars", origin: "BOS", departure: "2099-10-12", returnDate: "2099-10-17", pickupTime: "10:30", dropoffTime: "16:45" } });
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
test("all normal result routes retain their existing pipeline and add the gated provider section", () => {
  for (const [vertical, existing] of [["flights", "FlightResultsClient"], ["hotels", "HotelResultsClient"], ["cars", "CarsResultsContent"]]) {
    const source = readFileSync(`src/app/${vertical}/results/page.tsx`, "utf8");
    assert.ok(source.includes(`<${existing}`));
    assert.ok(source.includes(`<KayakMetasearchSection vertical="${vertical}"`));
  }
  const source = readFileSync("src/components/results/KayakMetasearchSection.tsx", "utf8");
  assert.match(source, /if \(!isKayakSandboxEnabled\(\)\) return children \?\? null/);
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
