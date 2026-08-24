import assert from "node:assert/strict";
import test from "node:test";
import type { FlightResult, MobileSavedItem } from "../../api/travelApi";
import { hasValidSearchPlan, legacyFlightSearchParams, legacyHotelSearchParams, sanitizeSearchParams } from "./savedSearchContext";

const now = new Date("2029-01-01T00:00:00Z");

test("flight context retains only supported route-safe search values", () => {
  const params = sanitizeSearchParams("flight", { tripType: "one-way", from: "JFK", to: "LAX", departureDate: "2030-03-04", adults: 2, result: "snapshot", visual: "1", displayFare: "fare" });
  assert.deepEqual(params, { tripType: "one-way", from: "JFK", to: "LAX", departureDate: "2030-03-04", adults: "2" });
  assert.ok(hasValidSearchPlan("flight", params, now));
});

test("legacy one-way flight uses real fields and never invents a return date", () => {
  const item = { type: "flight", originAirport: "JFK", destinationAirport: "LAX", departureTime: "2030-03-04T12:00:00Z" } as unknown as MobileSavedItem;
  const params = legacyFlightSearchParams(item);
  assert.deepEqual(params, { tripType: "one-way", origin: "JFK", destination: "LAX", departureDate: "2030-03-04" });
  assert.equal((params as Record<string, string>).returnDate, undefined);
  assert.ok(hasValidSearchPlan("flight", params, now));
});

test("legacy round trip uses the provider return leg's actual date", () => {
  const result = { originAirport: "JFK", destinationAirport: "LAX", departureTime: "2030-03-04T12:00:00Z", legs: [{}, { departureTime: "2030-03-10T09:00:00Z" }] } as FlightResult;
  const params = legacyFlightSearchParams({ type: "flight" } as MobileSavedItem, result);
  assert.equal(params.tripType, "round-trip");
  assert.equal(params.returnDate, "2030-03-10");
});

test("legacy hotel uses only legitimate destination and stay dates", () => {
  const params = legacyHotelSearchParams({ type: "hotel", destination: "Paris", checkIn: "2030-04-01T00:00:00Z", checkOut: "2030-04-03T00:00:00Z" } as unknown as MobileSavedItem);
  assert.deepEqual(params, { destination: "Paris", checkIn: "2030-04-01", checkOut: "2030-04-03" });
  assert.ok(hasValidSearchPlan("hotel", params, now));
});

test("incomplete Explore destination search cannot open flight results", () => {
  const params = sanitizeSearchParams("flight", { destination: "Abidjan", to: "ABJ", destinationId: "ci-abidjan" });
  assert.equal(hasValidSearchPlan("flight", params, now), false);
});
