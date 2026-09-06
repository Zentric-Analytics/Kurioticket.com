import assert from "node:assert/strict";
import test from "node:test";
import type { FlightResult } from "../../api/travelApi";
import { hasPositiveFareFlexibility } from "./flightFilters";

const leg = (direction: "outbound" | "return" | "leg", legIndex: number) => ({
  direction,
  legIndex,
  originAirport: "LOS",
  destinationAirport: "LHR",
  departureTime: `2026-10-${10 + legIndex}T08:00:00Z`,
  arrivalTime: `2026-10-${10 + legIndex}T12:00:00Z`,
  duration: "4h",
  durationMinutes: 240,
  stops: 0,
  layovers: [],
  segments: [],
});

const result = (legs: ReturnType<typeof leg>[], fareTerms: FlightResult["fareTerms"]) => ({
  id: "flight",
  provider: "Duffel",
  airlineName: "Air",
  originAirport: "LOS",
  destinationAirport: "LHR",
  departureTime: "2026-10-10T08:00:00Z",
  arrivalTime: "2026-10-10T12:00:00Z",
  duration: "4h",
  durationMinutes: 240,
  stops: 0,
  layovers: [],
  price: 100,
  currency: "USD",
  legs,
  fareTerms,
}) as unknown as FlightResult;

const positive = (category: "refund" | "change", legDirection?: "outbound" | "return" | "leg", legIndex?: number) => ({
  category,
  semantic: "positive" as const,
  legDirection,
  legIndex,
  text: "Allowed",
});
const negative = (category: "refund" | "change", legDirection?: "outbound" | "return" | "leg", legIndex?: number) => ({
  category,
  semantic: "negative" as const,
  legDirection,
  legIndex,
  text: "Not allowed",
});

test("round-trip flexibility requires a positive refund-or-change term on every scoped leg", () => {
  const legs = [leg("outbound", 0), leg("return", 1)];
  assert.equal(hasPositiveFareFlexibility(result(legs, [
    positive("change", "outbound", 0),
    negative("refund", "return", 1),
  ])), false);
  assert.equal(hasPositiveFareFlexibility(result(legs, [
    positive("change", "outbound", 0),
    positive("refund", "return", 1),
  ])), true);
});

test("multi-city flexibility requires every leg index to be covered", () => {
  const legs = [leg("leg", 0), leg("leg", 1), leg("leg", 2)];
  assert.equal(hasPositiveFareFlexibility(result(legs, [
    positive("refund", "leg", 0),
    positive("change", "leg", 1),
  ])), false);
  assert.equal(hasPositiveFareFlexibility(result(legs, [
    positive("refund", "leg", 0),
    positive("change", "leg", 1),
    positive("change", "leg", 2),
  ])), true);
});

test("a genuinely trip-scoped positive term qualifies the whole itinerary", () => {
  const legs = [leg("outbound", 0), leg("return", 1)];
  assert.equal(hasPositiveFareFlexibility(result(legs, [positive("refund")])), true);
});