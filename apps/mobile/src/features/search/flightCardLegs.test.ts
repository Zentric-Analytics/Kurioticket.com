import assert from "node:assert/strict";
import test from "node:test";
import type { FlightResult } from "../../api/travelApi";
import { flightCardLegs } from "./flightCardLegs";

const result = {
  originAirport: "LOS",
  destinationAirport: "ABV",
  departureTime: "2026-09-01T14:42:00+01:00",
  arrivalTime: "2026-09-01T15:57:00+01:00",
  duration: "1h 15m",
  stops: 0,
  legs: [
    { direction: "outbound", originAirport: "LOS", destinationAirport: "ABV", departureTime: "2026-09-01T14:42:00+01:00", arrivalTime: "2026-09-01T15:57:00+01:00", duration: "1h 15m", durationMinutes: 75, stops: 0, layovers: [], segments: [] },
    { direction: "return", originAirport: "ABV", destinationAirport: "LOS", departureTime: "2026-09-08T18:05:00+01:00", arrivalTime: "2026-09-08T20:35:00+01:00", duration: "2h 30m", durationMinutes: 150, stops: 1, layovers: [], segments: [] },
  ],
} as unknown as FlightResult;

test("round-trip cards select distinct authoritative outbound and return legs", () => {
  const legs = flightCardLegs(result, true);
  assert.deepEqual(legs.outbound, result.legs?.[0]);
  assert.deepEqual(legs.returnLeg, result.legs?.[1]);
  assert.equal(legs.outbound.departureTime, "2026-09-01T14:42:00+01:00");
  assert.equal(legs.returnLeg?.departureTime, "2026-09-08T18:05:00+01:00");
  assert.equal(legs.returnLeg?.arrivalTime, "2026-09-08T20:35:00+01:00");
  assert.equal(legs.returnLeg?.duration, "2h 30m");
  assert.equal(legs.returnLeg?.stops, 1);
});

test("return values are not fabricated from or copied from the outbound leg", () => {
  const { outbound, returnLeg } = flightCardLegs(result, true);
  assert.notEqual(returnLeg?.departureTime, outbound.departureTime);
  assert.notEqual(returnLeg?.arrivalTime, outbound.arrivalTime);
  assert.notEqual(returnLeg?.duration, outbound.duration);
  assert.notEqual(returnLeg?.stops, outbound.stops);

  const withoutProviderReturn = { ...result, legs: result.legs?.slice(0, 1) } as FlightResult;
  assert.equal(flightCardLegs(withoutProviderReturn, true).returnLeg, undefined);
});

test("one-way cards never expose a return section even if stale leg data exists", () => {
  assert.equal(flightCardLegs(result, false).returnLeg, undefined);
});
