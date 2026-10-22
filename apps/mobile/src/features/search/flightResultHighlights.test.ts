import assert from "node:assert/strict";
import test from "node:test";
import type { FlightResult } from "../../api/travelApi";
import { deriveFlightResultHighlights } from "./flightResultHighlights";

const flight = (id: string, price: number, durationMinutes: number, valueScore?: number) =>
  ({ id, price, durationMinutes, valueScore }) as FlightResult;

test("uses normalized fares, structured duration, and authoritative value ranking", () => {
  const displayed = [flight("best", 300, 300, 95), flight("cheap", 90, 200, 70), flight("fast", 200, 80, 80)];
  const normalized = new Map([["best", 250], ["cheap", 100], ["fast", 150]]);
  assert.deepEqual([...deriveFlightResultHighlights(displayed, (result) => normalized.get(result.id) ?? null)], [
    ["best", "Best"], ["cheap", "Cheapest"], ["fast", "Fastest"],
  ]);
});

test("does not fabricate labels when corresponding values are absent", () => {
  const displayed = [flight("unknown-a", Number.NaN, Number.NaN), flight("unknown-b", Number.NaN, Number.NaN)];
  assert.deepEqual([...deriveFlightResultHighlights(displayed, () => null)], []);
});

test("assigns one label per card using Best, Cheapest, Fastest priority", () => {
  const displayed = [flight("winner", 50, 60, 100), flight("runner-up", 80, 90, 90)];
  assert.deepEqual([...deriveFlightResultHighlights(displayed, (result) => result.price)], [["winner", "Best"]]);
});

test("resolves ties by displayed order without mutating results", () => {
  const displayed = [flight("filtered-first", 100, 60, 80), flight("filtered-second", 100, 60, 80)];
  const before = displayed.slice();
  assert.deepEqual([...deriveFlightResultHighlights(displayed, (result) => result.price)], [["filtered-first", "Best"]]);
  assert.deepEqual(displayed, before);
});

test("classification composes with the currently displayed filtered subset", () => {
  const loaded = [flight("hidden", 40, 40, 95), flight("visible-a", 90, 100, 70), flight("visible-b", 80, 120, 60)];
  const labels = deriveFlightResultHighlights(loaded.filter((result) => result.id.startsWith("visible")), (result) => result.price);
  assert.equal(labels.get("visible-a"), "Best");
  assert.equal(labels.get("visible-b"), "Cheapest");
  assert.equal(labels.has("hidden"), false);
});

const journey = (direction: "outbound" | "return" | "leg", legIndex: number, durationMinutes: number) => ({
  direction, legIndex, durationMinutes, originAirport: "AAA", destinationAirport: "BBB",
  departureTime: "2027-01-01T10:00:00Z", arrivalTime: "2027-01-01T12:00:00Z",
  duration: `${durationMinutes}m`, stops: 0, layovers: [], segments: [],
});
const itinerary = (id: string, durationMinutes: number, legs: ReturnType<typeof journey>[], valueScore: number) =>
  ({ id, price: 100, durationMinutes, legs, valueScore }) as unknown as FlightResult;

test("Fastest highlight uses the same longest structured journey metric for one-way and round-trip", () => {
  const oneWayAuthoritative = itinerary("one-way-authoritative", 10, [journey("outbound", 0, 120)], 1);
  const oneWayTopLevel = itinerary("one-way-top-level", 20, [journey("outbound", 0, 180)], 100);
  assert.equal(deriveFlightResultHighlights([oneWayTopLevel, oneWayAuthoritative], () => 100).get("one-way-authoritative"), "Fastest");

  const a = itinerary("round-trip-a", 60, [journey("outbound", 0, 60), journey("return", 1, 300)], 100);
  const b = itinerary("round-trip-b", 180, [journey("outbound", 0, 180), journey("return", 1, 180)], 1);
  assert.equal(deriveFlightResultHighlights([a, b], () => 100).get("round-trip-b"), "Fastest");
});

test("Fastest highlight uses longest individual multi-city journey rather than aggregate top-level order", () => {
  const aggregateShorter = itinerary("aggregate-shorter", 420, [journey("leg", 0, 60), journey("leg", 1, 300), journey("leg", 2, 60)], 100);
  const longestShorter = itinerary("longest-shorter", 540, [journey("leg", 0, 180), journey("leg", 1, 180), journey("leg", 2, 180)], 1);
  assert.equal(deriveFlightResultHighlights([aggregateShorter, longestShorter], () => 100).get("longest-shorter"), "Fastest");
});

test("Fastest highlight falls back to valid top-level duration and ignores invalid duration", () => {
  const invalid = flight("invalid", 100, Number.NaN, 100);
  const legacy = flight("legacy", 100, 75, 1);
  assert.equal(deriveFlightResultHighlights([invalid, legacy], () => 100).get("legacy"), "Fastest");
  assert.notEqual(deriveFlightResultHighlights([invalid], () => null).get("invalid"), "Fastest");
});
