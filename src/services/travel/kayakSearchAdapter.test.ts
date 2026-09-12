import assert from "node:assert/strict";
import test from "node:test";
import type { FlightSearchParams } from "@/lib/types";
import { adaptKayakFlightSearch, adaptKayakHotelSearch, adaptKayakCarSearch } from "./kayakSearchAdapter";

test("hotel sandbox preserves destination, dates and guests and rejects unsupported rooms", () => {
  const input = { destinationId: "kplace:123", checkIn: date(20), checkOut: date(25), guests: "2", rooms: "1" };
  assert.deepEqual(adaptKayakHotelSearch(input), { supported: true, search: {
    vertical: "hotels", destination: "kplace:123", departure: input.checkIn, returnDate: input.checkOut, adults: 2,
  } });
  for (const change of [{ rooms: "2" }, { children: "1" }, { currency: "EUR" }, { destinationId: "Paris" }, { guests: "7" }]) {
    assert.equal(adaptKayakHotelSearch({ ...input, ...change }).supported, false);
  }
});

test("car sandbox preserves supported rental criteria without silently changing times or locations", () => {
  const input = { pickupLocation: "BOS", dropoffLocation: "BOS", pickupDate: date(20), dropoffDate: date(25), pickupTime: "12:00", dropoffTime: "12:00" };
  assert.deepEqual(adaptKayakCarSearch(input), { supported: true, search: {
    vertical: "cars", origin: "BOS", departure: input.pickupDate, returnDate: input.dropoffDate,
  } });
  for (const change of [{ pickupTime: "10:00" }, { dropoffLocation: "JFK" }, { driverAge: "21" }, { vehicleType: "suv" }, { currency: "EUR" }]) {
    assert.equal(adaptKayakCarSearch({ ...input, ...change }).supported, false);
  }
});

const date = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const search: FlightSearchParams = {
  tripType: "round-trip", origin: "BOS", destination: "JFK",
  departureDate: date(20), returnDate: date(25),
  adults: 2, travelers: 2, children: 0, infants: 0, cabinClass: "economy", currency: "USD",
};

test("regular flight criteria map exactly to the sandbox request", () => {
  assert.deepEqual(adaptKayakFlightSearch(search), { supported: true, search: {
    vertical: "flights", origin: "BOS", destination: "JFK", adults: 2,
    departure: search.departureDate, returnDate: search.returnDate,
  } });
});

test("one-way mapping does not accidentally add a return journey", () => {
  const result = adaptKayakFlightSearch({ ...search, tripType: "one-way" });
  assert.equal(result.supported, true);
  if (result.supported) assert.equal(result.search.returnDate, undefined);
});

test("unsupported criteria are rejected instead of silently downgraded", () => {
  for (const change of [
    { tripType: "multi-city" }, { cabinClass: "business" }, { children: 1 },
    { infants: 1 }, { travelers: 3 }, { currency: "EUR" }, { adults: 7, travelers: 7 },
    { returnDate: undefined }, { origin: "Boston" }, { departureDate: "2000-01-01" },
    { legs: [{ origin: "LAX", destination: "JFK", departureDate: search.departureDate }] },
  ] as Partial<FlightSearchParams>[]) {
    assert.equal(adaptKayakFlightSearch({ ...search, ...change }).supported, false, JSON.stringify(change));
  }
});

test("matching authoritative legs are accepted", () => {
  assert.equal(adaptKayakFlightSearch({ ...search, legs: [
    { origin: "BOS", destination: "JFK", departureDate: search.departureDate },
    { origin: "JFK", destination: "BOS", departureDate: search.returnDate! },
  ] }).supported, true);
});
