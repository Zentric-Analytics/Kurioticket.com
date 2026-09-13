import test from "node:test";
import assert from "node:assert/strict";
import { resolveRegularKayakSearch, regularKayakRequest } from "./kayakRegularSearch";
import { KayakSandboxClient } from "./kayakSandbox";

const hotel = { destination: "Boston, Massachusetts, United States", checkIn: "2099-10-12", checkOut: "2099-10-17", guests: "2", rooms: "1", currency: "JPY" };
const locationTarget = (provider: "kayak", value: string) => JSON.stringify({
  id: "city:us-boston", kind: "city", primaryLabel: "Boston", supportingLabel: "Massachusetts, United States",
  submittedValue: "Boston, Massachusetts, United States", verification: "verified",
  providerBindings: [{ provider, value, kind: "city", verification: "verified", provenance: "provider-discovery" }],
});
test("regular hotel search uses the selected verified provider binding without rediscovery", async () => {
  const result = await resolveRegularKayakSearch("hotels", { ...hotel, destinationLocation: locationTarget("kayak", "kplace:58075") }, async () => { throw new Error("post-submit discovery is forbidden"); });
  assert.equal(result.supported, true);
  if (result.supported) assert.deepEqual(result.search, { vertical: "hotels", destination: "kplace:58075", departure: hotel.checkIn, returnDate: hotel.checkOut, adults: 2 });
});
test("ambiguous or text-only hotel destinations remain unsupported instead of being guessed", async () => {
  const result = await resolveRegularKayakSearch("hotels", hotel, async () => [{ label: hotel.destination, value: "kplace:1" }]);
  assert.equal(result.supported, false);
  if (!result.supported) assert.match(result.reason, /verified binding/);
});
test("provider IDs remain namespaced", async () => {
  const duffelOnly = JSON.stringify({ ...JSON.parse(locationTarget("kayak", "kplace:1")), providerBindings: [{ provider: "duffel", value: "pla_1", verification: "verified", provenance: "provider-discovery" }] });
  const result = await resolveRegularKayakSearch("hotels", { ...hotel, destinationLocation: duffelOnly }, async () => []);
  assert.equal(result.supported, false);
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
  const target = locationTarget("kayak", "SFO");
  const result = await resolveRegularKayakSearch("cars", { pickupLocation: "San Francisco, United States", pickupLocationTarget: target, pickupDate: "2099-10-12", dropoffDate: "2099-10-17", pickupTime: "10:30", dropoffTime: "16:45" }, async () => { throw new Error("post-submit discovery is forbidden"); });
  assert.equal(result.supported, true);
  if (result.supported && result.search.vertical === "cars") assert.equal(result.search.origin, "SFO");
});
test("a car free-text candidate is never accepted by first-candidate guessing", async () => {
  const result = await resolveRegularKayakSearch("cars", { pickupLocation: "Springfield", pickupDate: "2099-10-12", dropoffDate: "2099-10-17", pickupTime: "10:30", dropoffTime: "16:45" }, async () => [{ label: "Springfield", value: "SPI" }]);
  assert.equal(result.supported, false);
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
