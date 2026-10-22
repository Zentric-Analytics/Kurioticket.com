import assert from "node:assert/strict";
import test from "node:test";
import type { FlightResult } from "../../api/travelApi";
import { flightCardJourneys, flightCardJourneyAccessibility } from "./flightCardLegs";

const leg = (direction: "outbound" | "return" | "leg", legIndex: number, originAirport: string, destinationAirport: string) => ({
  direction, legIndex, originAirport, destinationAirport,
  departureTime: `2026-09-0${legIndex + 1}T0${legIndex + 7}:00:00Z`,
  arrivalTime: `2026-09-0${legIndex + 1}T${legIndex + 10}:30:00Z`,
  duration: `${legIndex + 3}h 30m`, durationMinutes: (legIndex + 3) * 60 + 30,
  stops: legIndex % 2, layovers: [], segments: [],
});
const result = (legs: ReturnType<typeof leg>[]) => ({
  originAirport: "TOP", destinationAirport: "LEVEL",
  departureTime: "2026-01-01T00:00:00Z", arrivalTime: "2026-01-01T01:00:00Z",
  duration: "99h", stops: 9, legs,
}) as unknown as FlightResult;

test("one-way cards render one OUTBOUND journey and retain the safe fallback", () => {
  const fallback = flightCardJourneys(result([]), "one-way");
  assert.equal(fallback.length, 1);
  assert.equal(fallback[0].label, "OUTBOUND");
  assert.equal(fallback[0].leg.originAirport, "TOP");
  assert.equal(flightCardJourneys(result([leg("return", 1, "ABV", "LOS")]), "one-way").length, 1);
});

test("round-trip cards select distinct authoritative outbound and return legs", () => {
  const outbound = leg("outbound", 0, "LOS", "ABV");
  const inbound = leg("return", 1, "ABV", "LOS");
  const journeys = flightCardJourneys(result([outbound, inbound]), "round-trip");
  assert.deepEqual(journeys.map(({ label, leg: value }) => [label, value]), [["OUTBOUND", outbound], ["RETURN", inbound]]);
  assert.notEqual(journeys[1].leg.departureTime, journeys[0].leg.departureTime);
  assert.equal(flightCardJourneys(result([outbound]), "round-trip").length, 1);
});

test("two multi-city legs expose each leg's authoritative presentation values", () => {
  const legs = [leg("leg", 0, "LOS", "LHR"), leg("leg", 1, "LHR", "JFK")];
  const journeys = flightCardJourneys(result(legs), "multi-city");
  assert.deepEqual(journeys.map(({ label, leg: value }) => [label, value]), [["FLIGHT 1", legs[0]], ["FLIGHT 2", legs[1]]]);
  assert.equal(journeys[1].leg.duration, "4h 30m");
  assert.equal(journeys[1].leg.stops, 1);
});

test("three multi-city legs preserve canonical array order without top-level fallback", () => {
  const legs = [leg("leg", 2, "JFK", "LAX"), leg("leg", 0, "LOS", "LHR"), leg("leg", 1, "LHR", "JFK")];
  const journeys = flightCardJourneys(result(legs), "multi-city");
  assert.deepEqual(journeys.map(({ label, leg: value }) => [label, value.originAirport]), [["FLIGHT 1", "JFK"], ["FLIGHT 2", "LOS"], ["FLIGHT 3", "LHR"]]);
  assert.ok(journeys.every(({ leg: value }) => value.originAirport !== "TOP"));
});

test("five multi-city legs are not truncated", () => {
  const legs = [["LOS", "LHR"], ["LHR", "JFK"], ["JFK", "LAX"], ["LAX", "SFO"], ["SFO", "SEA"]].map(([from, to], index) => leg("leg", index, from, to));
  assert.deepEqual(flightCardJourneys(result(legs), "multi-city").map(({ label }) => label), ["FLIGHT 1", "FLIGHT 2", "FLIGHT 3", "FLIGHT 4", "FLIGHT 5"]);
});

test("accessibility is generated from every ordered visible journey descriptor", () => {
  const journeys = flightCardJourneys(result([leg("leg", 0, "LOS", "LHR"), leg("leg", 1, "LHR", "JFK"), leg("leg", 2, "JFK", "LAX")]), "multi-city");
  const spoken = journeys.map((journey) => flightCardJourneyAccessibility(journey, (value) => value.slice(11, 16)));
  assert.equal(spoken.length, journeys.length);
  assert.match(spoken.join(", "), /^flight 1, 07:00 LOS.*flight 2, 08:00 LHR.*flight 3, 09:00 JFK/);
  assert.doesNotMatch(spoken.join(", "), /outbound/);
});
