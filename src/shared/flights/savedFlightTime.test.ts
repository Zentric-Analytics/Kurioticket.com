import assert from "node:assert/strict";
import test from "node:test";
import { canonicalSavedFlightDateTime as instant, savedFlightTimeFields } from "./savedFlightTime";
import { createSavedItemInputSchema } from "../../services/savedRecentService";

test("staging SFO airport-local clock resolves to the real instant, not UTC", () => {
  assert.equal(instant("2026-12-16T11:36:00", "SFO"), "2026-12-16T19:36:00.000Z");
  assert.equal(instant("2026-12-16T12:54:00", "LAX"), "2026-12-16T20:54:00.000Z");
});
test("explicit UTC and offsets retain their meaning, including legacy unknown airports", () => {
  assert.equal(instant("2026-12-16T11:36:00Z", "XXX"), "2026-12-16T11:36:00.000Z");
  assert.equal(instant("2026-12-16T11:36:00-08:00", "SFO"), "2026-12-16T19:36:00.000Z");
  assert.equal(instant("2026-12-16T11:36:00.125+05:45"), "2026-12-16T05:51:00.125Z");
});
test("DST folds and gaps fail closed; explicit offsets disambiguate folds", () => {
  for (const value of ["2026-03-08T02:30:00", "2026-11-01T01:30:00"]) assert.throws(() => instant(value, "JFK"), /ambiguous or nonexistent/);
  assert.equal(instant("2026-11-01T01:30:00-04:00", "JFK"), "2026-11-01T05:30:00.000Z");
  assert.equal(instant("2026-11-01T01:30:00-05:00", "JFK"), "2026-11-01T06:30:00.000Z");
  assert.equal(instant("2026-07-01T12:00:00", "JFK"), "2026-07-01T16:00:00.000Z");
});
test("half-hour DST folds and nonexistent dates cannot silently normalize", () => {
  assert.throws(() => instant("2026-04-05T01:45:00", undefined, "Australia/Lord_Howe"), /ambiguous/);
  for (const value of ["2026-02-30T11:00:00Z", "2026-13-01T12:00:00", "2026-12-16T24:00:00", "garbage", "2026-01-01T12:00:00+25:00"]) assert.throws(() => instant(value, "SFO"), /Invalid/);
});
test("missing or invalid timezone fails safely; authoritative airport mapping wins", () => {
  assert.throws(() => instant("2026-12-16T11:36:00", "XXX"), /timezone is unavailable/);
  assert.throws(() => instant("2026-12-16T11:36:00", undefined, "Invalid/Zone"), /timezone is unavailable/);
  assert.equal(instant("2026-12-16T11:36:00", "SFO", "UTC"), "2026-12-16T19:36:00.000Z");
});
test("different zones, overnight and international date-line crossings preserve local dates", () => {
  const flight = { originAirport: "HND", destinationAirport: "LAX", departureTime: "2026-12-16T23:00:00", arrivalTime: "2026-12-16T16:00:00" };
  const result = savedFlightTimeFields(flight);
  assert.equal(result.departureTime, "2026-12-16T14:00:00.000Z");
  assert.equal(result.arrivalTime, "2026-12-17T00:00:00.000Z");
  assert.equal(result.flightTime.departure.local, flight.departureTime);
  assert.equal(instant("2026-12-17T06:00:00", "LHR"), "2026-12-17T06:00:00.000Z");
});
test("shared web/native backend resolves raw local payloads but rejects ambiguous persistence", () => {
  const input = { type: "flight", provider: "Duffel", airlineName: "Duffel Airways", originAirport: "SFO", destinationAirport: "LAX", departureTime: "2026-12-16T11:36:00", arrivalTime: "2026-12-16T12:54:00", price: 50, currency: "USD", payload: { flightResultId: "sandbox-offer" } };
  const parsed = createSavedItemInputSchema.parse(input);
  assert.equal(parsed.type, "flight");
  if (parsed.type !== "flight") throw new Error("Expected flight");
  assert.equal(parsed.type === "flight" && parsed.departureTime, "2026-12-16T19:36:00.000Z");
  assert.equal((parsed.payload as { flightTime: { departure: { local: string } } }).flightTime.departure.local, input.departureTime);
  assert.equal(createSavedItemInputSchema.safeParse({ ...input, originAirport: "XXX" }).success, false);
  assert.equal(createSavedItemInputSchema.safeParse({ ...input, originAirport: "JFK", departureTime: "2026-11-01T01:30:00" }).success, false);
  const invalidArrival = createSavedItemInputSchema.safeParse({ ...input, arrivalTime: "not-a-date" });
  assert.equal(invalidArrival.success, false);
  if (!invalidArrival.success) assert.equal(invalidArrival.error.issues[0].path[0], "arrivalTime");
  const legacy = createSavedItemInputSchema.parse({ ...input, departureTime: "2026-12-16T11:36:00Z", arrivalTime: "2026-12-16T12:54:00Z" });
  if (legacy.type !== "flight") throw new Error("Expected flight");
  assert.deepEqual(legacy.payload, input.payload);
});
