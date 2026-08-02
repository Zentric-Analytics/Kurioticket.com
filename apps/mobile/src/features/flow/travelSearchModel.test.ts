import assert from "node:assert/strict";
import test from "node:test";
import { buildSearchPlan, validBookableCar, validBookableHotel, validFlight } from "./travelSearchModel";

const now = new Date("2026-07-30T12:00:00Z");
test("flight plans preserve stable parameters and premium economy", () => {
  const params = { tripType: "round-trip", from: "JFK", to: "LAX", departureDate: "2026-08-10", returnDate: "2026-08-17", travelers: "1", cabin: "Premium Economy" };
  const first = buildSearchPlan("flight", params, now).plan!;
  const second = buildSearchPlan("flight", { ...params }, now).plan!;
  assert.equal(first.key, second.key);
  assert.equal(first.payload.cabinClass, "premium-economy");
  assert.equal(first.payload.adults, 1);
});
test("invalid flight, hotel, and car dates are blocked before requests", () => {
  assert.ok(buildSearchPlan("flight", { from: "JFK", to: "JFK", departureDate: "2026-08-10" }, now).error);
  assert.ok(buildSearchPlan("flight", { tripType: "one-way", from: "JFK", to: "LAX", departureDate: "2026-08-10", travelers: "many" }, now).error);
  assert.ok(buildSearchPlan("hotel", { destination: "Paris", checkIn: "2026-08-10", checkOut: "2026-08-09" }, now).error);
  assert.ok(buildSearchPlan("car", { pickupLocation: "LAX", pickupDate: "2026-08-10", dropoffDate: "2026-08-10", pickupTime: "12:00", dropoffTime: "11:00" }, now).error);
  assert.ok(buildSearchPlan("car", { pickupLocation: "LAX", pickupDate: "2026-08-10", dropoffDate: "2026-08-11", pickupTime: "99:00", dropoffTime: "10:00" }, now).error);
});
test("hotel guests, rooms and car driver age are preserved", () => {
  assert.deepEqual(buildSearchPlan("hotel", { destination: "Paris", checkIn: "2026-08-10", checkOut: "2026-08-12", guests: "4", rooms: "2" }, now).plan?.payload, { destination: "Paris", checkIn: "2026-08-10", checkOut: "2026-08-12", guests: 4, rooms: 2 });
  assert.equal(buildSearchPlan("car", { pickupLocation: "LAX", dropoffLocation: "SFO", pickupDate: "2026-08-10", pickupTime: "10:00", dropoffDate: "2026-08-12", dropoffTime: "10:00", driverAge: "42" }, now).plan?.payload.driverAge, "42");
});
test("car plans reject every server-unsupported driver age from 71 through 99", () => {
  const base = { pickupLocation: "LAX", dropoffLocation: "SFO", pickupDate: "2026-08-10", pickupTime: "10:00", dropoffDate: "2026-08-12", dropoffTime: "10:00" };
  for (let age = 71; age <= 99; age += 1) assert.ok(buildSearchPlan("car", { ...base, driverAge: String(age) }, now).error);
});
test("shared result policy accepts website inventory and still rejects malformed records", () => {
  const plan = buildSearchPlan("flight", { tripType: "one-way", from: "JFK", to: "LAX", departureDate: "2026-08-10", travelers: "1", cabin: "Economy" }, now).plan!;
  const internalAction = { source: "duffel", bookable: true, action: { kind: "internal-detail", href: "/flights/details/f", enabled: true } };
  const flight = { id: "f", provider: "Duffel", airlineName: "Air", originAirport: "JFK", destinationAirport: "LAX", departureTime: "2026-08-10T12:00:00Z", arrivalTime: "2026-08-10T15:00:00Z", price: 100, currency: "USD", bookingUrl: "", partnerRedirectUrl: "", searchPolicy: internalAction };
  assert.equal(validFlight(flight as never, plan), true);
  assert.equal(validFlight({ ...flight, destinationAirport: "SFO" } as never, plan), false);
  const staticCar = { id: "c", rentalCompanyName: "Kurioticket", inventorySource: "kurioticket-static-cars", offers: [{ bookingProviderName: "Kurioticket", totalPrice: 50, currency: "USD" }], searchPolicy: { source: "kurioticket-static-cars", bookable: false, action: { kind: "internal-detail", href: "/cars/details/c", enabled: true } } };
  assert.equal(validBookableCar(staticCar as never), true);
  assert.equal(validBookableCar({ ...staticCar, searchPolicy: { ...staticCar.searchPolicy, bookable: true } } as never), true);
});
