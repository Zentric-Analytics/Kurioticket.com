import assert from "node:assert/strict";
import test from "node:test";
import { priceAlertMatchesRecordedSearch } from "./priceAlertJourneyCorrelation";

const flight = {
  type: "FLIGHT", origin: "LOS", destination: "LHR", checkIn: null, checkOut: null,
  query: { departureDate: "2026-12-12", returnDate: "", tripType: "one-way" },
};
const alert = {
  type: "FLIGHT", origin: "LOS", destination: "LHR",
  query: { departureDate: "2026-12-12", returnDate: "", tripType: "one-way" },
};

test("Flight price alerts require exact product route and travel dates, not just matching cities", () => {
  assert.equal(priceAlertMatchesRecordedSearch(flight, alert), true);
  assert.equal(priceAlertMatchesRecordedSearch(flight, { ...alert, destination: "DXB" }), false);
  assert.equal(priceAlertMatchesRecordedSearch(flight, { ...alert, query: { ...alert.query, departureDate: "2026-12-13" } }), false);
  assert.equal(priceAlertMatchesRecordedSearch(flight, { ...alert, query: { ...alert.query, tripType: "round-trip" } }), false);
  assert.equal(priceAlertMatchesRecordedSearch({ ...flight, type: "HOTEL" }, alert), false);
});

test("Hotel price alerts require actual check-in and check-out dates", () => {
  const hotel = { type: "HOTEL", origin: null, destination: "Paris",
    checkIn: new Date("2026-12-12T00:00:00.000Z"), checkOut: new Date("2026-12-14T00:00:00.000Z"), query: { rooms: 1, guests: 2 } };
  const target = { type: "HOTEL", origin: null, destination: "Paris",
    query: { checkIn: "2026-12-12", checkOut: "2026-12-14", rooms: 1, guests: 2 } };
  assert.equal(priceAlertMatchesRecordedSearch(hotel, target), true);
  assert.equal(priceAlertMatchesRecordedSearch(hotel, { ...target, query: { ...target.query, checkOut: "2026-12-16" } }), false);
});

test("Car alerts require the same pickup/dropoff schedule, not only matching locations", () => {
  const car = { type: "CAR", origin: "CDG", destination: "CDG", checkIn: null, checkOut: null,
    query: { pickupDate: "2026-12-12", dropoffDate: "2026-12-14", pickupTime: "12:00", dropoffTime: "14:00", driverAge: "30" } };
  const target = { type: "CAR", origin: "CDG", destination: "CDG",
    query: { pickupDate: "2026-12-12", dropoffDate: "2026-12-14", pickupTime: "12:00", dropoffTime: "14:00", driverAge: "30" } };
  assert.equal(priceAlertMatchesRecordedSearch(car, target), true);
  assert.equal(priceAlertMatchesRecordedSearch(car, { ...target, query: { ...target.query, pickupTime: "09:00" } }), false);
  assert.equal(priceAlertMatchesRecordedSearch(car, { ...target, query: {} }), false);
});
