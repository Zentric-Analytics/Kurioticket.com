import assert from "node:assert/strict";
import test from "node:test";
import type { MobileRecentSearch } from "../../api/travelApi";
import { recentSearchNavigation } from "./recentSearchNavigation";

const recent = (type: "flight" | "hotel" | "car" | "package", params: Record<string, unknown>): MobileRecentSearch => ({
  id: "recent-1", type, label: "Previous search", subtitle: "Stored search",
  href: type === "flight" ? "/flights/results" : type === "hotel" ? "/hotels/results" : type === "car" ? "/cars/results" : "/packages/results", params,
  createdAt: "2026-08-24T00:00:00.000Z", updatedAt: "2026-08-24T00:00:00.000Z",
});

test("complete package search reopens native results while incomplete context returns to the form", () => {
  assert.equal(recentSearchNavigation(recent("package", { mode: "hotel-flight", destination: "Paris", startDate: "2099-01-01", endDate: "2099-01-03" })).pathname, "/package-results");
  assert.equal(recentSearchNavigation(recent("package", { mode: "hotel-flight", destination: "Paris" })).pathname, "/packages");
});

test("complete car search reopens results while incomplete legacy context returns to the form", () => {
  const complete = recentSearchNavigation(recent("car", { pickupLocation: "LOS", dropoffLocation: "LOS", pickupDate: "2099-08-30", pickupTime: "10:00", dropoffDate: "2099-09-01", dropoffTime: "10:00", driverAge: 30 }));
  assert.equal(complete.pathname, "/car-results");
  assert.equal(complete.params.driverAge, "30");
  const incomplete = recentSearchNavigation(recent("car", { pickupLocation: "LOS", pickupDate: "2099-08-30" }));
  assert.equal(incomplete.pathname, "/cars");
  assert.equal("dropoffDate" in incomplete.params, false);
});

test("canonical any-age car searches reopen results without losing their range", () => {
  const route = recentSearchNavigation(recent("car", { pickupLocation: "LOS", dropoffLocation: "LOS", pickupDate: "2099-08-30", pickupTime: "10:00", dropoffDate: "2099-09-01", dropoffTime: "10:00", driverAge: "18-70" }));
  assert.equal(route.pathname, "/car-results");
  assert.equal(route.params.driverAge, "18-70");
});

test("valid one-way flight reopens native results with numeric server params made route-safe", () => {
  const route = recentSearchNavigation(recent("flight", {
    tripType: "one-way", origin: "LOS", destination: "LHR", departureDate: "2099-08-30",
    adults: 2, children: 1, infants: 0, travelers: 3, cabinClass: "economy",
    result: { id: "old" }, visual: "fixture", currency: "USD", providerData: "private",
  }));
  assert.equal(route.pathname, "/flight-results");
  assert.deepEqual(route.params, {
    tripType: "one-way", origin: "LOS", destination: "LHR", departureDate: "2099-08-30",
    adults: "2", children: "1", infants: "0", travelers: "3", cabinClass: "economy",
  });
});

test("valid round trip preserves its real return date without inventing values", () => {
  const route = recentSearchNavigation(recent("flight", {
    tripType: "round-trip", origin: "LOS", destination: "LHR", departureDate: "2099-08-30",
    returnDate: "2099-09-10", adults: 1, children: 0, infants: 0, travelers: 1,
  }));
  assert.equal(route.pathname, "/flight-results");
  assert.equal(route.params.returnDate, "2099-09-10");
});

test("valid hotel reopens native results and preserves numeric occupancy", () => {
  const route = recentSearchNavigation(recent("hotel", {
    destination: "Accra", checkIn: "2099-09-01", checkOut: "2099-09-05", guests: 4, rooms: 2,
    result: "old", currency: "GHS",
  }));
  assert.equal(route.pathname, "/hotel-results");
  assert.deepEqual(route.params, { destination: "Accra", checkIn: "2099-09-01", checkOut: "2099-09-05", guests: "4", rooms: "2" });
});

test("expired flight falls back to the form with only legitimate stored fields", () => {
  const route = recentSearchNavigation(recent("flight", {
    tripType: "one-way", origin: "LOS", destination: "LHR", departureDate: "2020-01-01", adults: 1,
    providerData: { secret: true },
  }));
  assert.equal(route.pathname, "/flights");
  assert.deepEqual(route.params, { tripType: "one-way", origin: "LOS", destination: "LHR", departureDate: "2020-01-01", adults: "1" });
});

test("incomplete hotel falls back to the form without inventing check-out", () => {
  const route = recentSearchNavigation(recent("hotel", { destination: "Kigali", checkIn: "2099-10-01", guests: 2, visual: "ignore" }));
  assert.equal(route.pathname, "/hotels");
  assert.deepEqual(route.params, { destination: "Kigali", checkIn: "2099-10-01", guests: "2" });
  assert.equal("checkOut" in route.params, false);
});
