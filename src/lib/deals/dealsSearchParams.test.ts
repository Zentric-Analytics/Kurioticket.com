import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDealsQuery,
  buildFlightApiRequest,
  buildModifyDealsUrl,
  buildStandaloneFlightUrl,
  dealsModes,
  getDealsProducts,
  parseDealsSearchParams,
  validateDealsSearch,
  type DealsSearch,
} from "./dealsSearchParams";
const base: DealsSearch = {
  mode: "hotel-flight-car",
  origin: "LHR",
  destination: "JFK",
  startDate: "2026-09-10",
  endDate: "2026-09-17",
  adults: 2,
  children: 0,
  rooms: 1,
  cabinClass: "economy",
  hotelStayMode: "match-trip",
  hotelCheckIn: "2026-09-10",
  hotelCheckOut: "2026-09-17",
  carPickupLocation: "JFK",
  carDropoffLocation: "JFK",
  carPickupDate: "2026-09-10",
  carDropoffDate: "2026-09-17",
  carPickupTime: "10:00",
  carDropoffTime: "10:00",
  driverAge: "18-70",
};
test("all modes have the expected products", () => {
  assert.deepEqual(dealsModes.map(getDealsProducts), [
    { flight: true, hotel: true, car: false },
    { flight: true, hotel: true, car: true },
    { flight: true, hotel: false, car: true },
    { flight: false, hotel: true, car: true },
  ]);
});
test("mode validation and irrelevant URL fields", () => {
  const flightCar = {
    ...base,
    mode: "flight-car" as const,
    rooms: 0,
    hotelCheckIn: "",
  };
  assert.deepEqual(validateDealsSearch(flightCar, new Date("2026-01-01")), {});
  assert.equal(buildDealsQuery(flightCar).has("rooms"), false);
  const hotelCar = { ...base, mode: "hotel-car" as const, origin: "" };
  assert.equal(buildFlightApiRequest(hotelCar, "USD"), null);
  assert.equal(buildDealsQuery(hotelCar).has("origin"), false);
});
test("custom Hotel boundaries", () => {
  const s = {
    ...base,
    hotelStayMode: "custom" as const,
    hotelCheckIn: "2026-09-09",
  };
  assert.equal(
    validateDealsSearch(s, new Date("2026-01-01")).hotelCheckIn,
    "deals.error.hotelBoundary",
  );
});
test("Car defaults and date time/age validation", () => {
  const parsed = parseDealsSearchParams(
    new URLSearchParams(
      "mode=hotel-car&destination=Paris&startDate=2026-09-10&endDate=2026-09-17",
    ),
  );
  assert.equal(parsed.carPickupLocation, "Paris");
  assert.equal(parsed.carPickupTime, "10:00");
  const bad = {
    ...base,
    carDropoffDate: base.carPickupDate,
    carDropoffTime: "09:00",
    driverAge: "x",
  };
  const e = validateDealsSearch(bad, new Date("2026-01-01"));
  assert.ok(e.carDropoffTime);
  assert.ok(e.driverAge);
});
test("parse/build and Modify search round trips", () => {
  const restored = parseDealsSearchParams(buildDealsQuery(base));
  assert.deepEqual(restored, base);
  assert.ok(buildModifyDealsUrl(base).startsWith("/deals?mode="));
});
test("Flight API body and full standalone URL", () => {
  assert.deepEqual(buildFlightApiRequest(base, "GBP"), {
    origin: "LHR",
    destination: "JFK",
    departureDate: "2026-09-10",
    returnDate: "2026-09-17",
    adults: 2,
    children: 0,
    infants: 0,
    cabinClass: "economy",
    currency: "GBP",
  });
  const url = buildStandaloneFlightUrl(base);
  for (const key of [
    "tripType=round-trip",
    "infants=0",
    "travelers=2",
    "cabinClass=economy",
  ])
    assert.ok(url.includes(key));
});
