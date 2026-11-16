import assert from "node:assert/strict";
import test from "node:test";
import type { FlightResult, MobileSavedItem } from "../api/travelApi";
import { canonicalSavedFlightDateTime } from "./savedFlightDateTime";
import { flightSavedSignature, mapFlightToSaved, savedSignature } from "./savedMapping";

const OFFSET_AWARE_ISO =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function assertSavedFlightApiDateContract(value: string) {
  assert.match(value, OFFSET_AWARE_ISO);
  assert.equal(Number.isFinite(Date.parse(value)), true);
}

test("canonicalizes provider-local, UTC, offset, and fractional itinerary values", () => {
  assert.equal(canonicalSavedFlightDateTime("2026-08-27T20:07", "LOS"), "2026-08-27T19:07:00.000Z");
  assert.equal(canonicalSavedFlightDateTime("2026-08-27T20:07:00", "LOS"), "2026-08-27T19:07:00.000Z");
  assert.equal(canonicalSavedFlightDateTime("2026-08-27T20:07:00Z"), "2026-08-27T20:07:00.000Z");
  assert.equal(canonicalSavedFlightDateTime("2026-08-27T20:07:00+01:00"), "2026-08-27T19:07:00.000Z");
  assert.equal(canonicalSavedFlightDateTime("2026-08-27T20:07:00.125", "LOS"), "2026-08-27T19:07:00.125Z");
});

test("rejects malformed and impossible datetimes instead of manufacturing dates", () => {
  for (const value of ["not-a-date", "2026-02-30T20:07:00", "2026-08-27 20:07:00", "2026-08-27T25:07:00", "2026-08-27T20:07:00+99:00"]) {
    assert.throws(() => canonicalSavedFlightDateTime(value), /Invalid saved flight datetime/);
  }
});

test("Duffel local mapping passes the Saved API datetime contract and keeps round-trip identity", () => {
  const flight = {
    id: "off_private_transient", provider: "Duffel", airlineName: "Duffel Airways", originAirport: "LOS", destinationAirport: "JNB",
    departureTime: "2026-08-27T20:07:00", arrivalTime: "2026-08-28T03:43:00", price: 900, currency: "USD",
  } as FlightResult;
  const createdPayload = mapFlightToSaved(flight);
  assert.equal(createdPayload.departureTime, "2026-08-27T19:07:00.000Z");
  assert.equal(createdPayload.arrivalTime, "2026-08-28T01:43:00.000Z");
  assertSavedFlightApiDateContract(createdPayload.departureTime);
  assertSavedFlightApiDateContract(createdPayload.arrivalTime);
  assert.equal((createdPayload.payload as { result: FlightResult }).result.departureTime, flight.departureTime);
  assert.equal((createdPayload.payload as { result: FlightResult }).result.arrivalTime, flight.arrivalTime);

  const serverItem = { ...createdPayload, id: "saved-real-id", createdAt: "2026-08-01T00:00:00.000Z", departureTime: "2026-08-27T19:07:00.000Z", arrivalTime: "2026-08-28T01:43:00.000Z" } as MobileSavedItem;
  assert.equal(savedSignature(createdPayload), savedSignature(serverItem));
  assert.equal(flightSavedSignature(flight), savedSignature(serverItem));
});

test("native saved mapping rejects unresolved local times and retains legacy explicit instants", () => {
  const flight = { provider: "Duffel", airlineName: "Air", originAirport: "XXX", destinationAirport: "LAX", departureTime: "2026-12-16T11:36:00", arrivalTime: "2026-12-16T12:54:00", price: 54, currency: "USD" } as FlightResult;
  assert.throws(() => mapFlightToSaved(flight), /timezone is unavailable/);
  assert.throws(() => mapFlightToSaved({ ...flight, originAirport: "JFK", departureTime: "2026-11-01T01:30:00" }), /ambiguous/);
  assert.equal(mapFlightToSaved({ ...flight, departureTime: "2026-12-16T11:36:00Z" }).departureTime, "2026-12-16T11:36:00.000Z");
});
