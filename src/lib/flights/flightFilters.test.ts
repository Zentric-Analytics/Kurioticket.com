import assert from "node:assert/strict";
import test from "node:test";

import type { PublicFlightResult } from "@/lib/types";
import {
  activeFlightFilterCount,
  flightAirportEndpoints,
  flightJourneyDurationMinutes,
  flightMatchesFilters,
  flightMaximumStops,
  hasStructuredBaggage,
  hasStructuredFlexibility,
  matchingFlightCount,
  type FlightFilterState,
} from "./flightFilters";

const leg = (
  direction: "outbound" | "return" | "leg",
  legIndex: number,
  originAirport: string,
  destinationAirport: string,
  stops = 0,
  durationMinutes = 60,
  departureTime = "2026-10-01T08:00:00+01:00",
  arrivalTime = "2026-10-01T09:00:00+01:00",
) => ({
  direction,
  legIndex,
  originAirport,
  destinationAirport,
  stops,
  durationMinutes,
  departureTime,
  arrivalTime,
  duration: `${durationMinutes}m`,
  layovers: stops ? [{ airport: "ACC", duration: "1h", quality: "unknown" as const }] : [],
  segments: [],
});

const flight = (id: string, overrides: Partial<PublicFlightResult> = {}): PublicFlightResult => ({
  id,
  provider: "test",
  airlineName: "Kurio Air",
  originAirport: "LOS",
  destinationAirport: "ABV",
  departureTime: "2026-10-01T08:00:00+01:00",
  arrivalTime: "2026-10-01T09:00:00+01:00",
  duration: "1h",
  durationMinutes: 60,
  stops: 0,
  layovers: [],
  cabinClass: "economy",
  baggageInfo: "marketing copy is ignored",
  refundInfo: "marketing copy is ignored",
  price: 100,
  currency: "USD",
  bookingUrl: "#",
  partnerRedirectUrl: "#",
  valueScore: 1,
  riskScore: 0,
  comfortScore: 1,
  travelConfidenceScore: 1,
  travelEffortScore: 1,
  recommendationReasons: [],
  badges: [],
  ...overrides,
});

const emptyFilters = (): FlightFilterState => ({
  maximumPrice: null,
  maximumTakeoff: null,
  maximumLanding: null,
  maximumDuration: null,
  stops: [],
  airlines: [],
  fromAirports: [],
  toAirports: [],
  journeyTimeMaximums: {},
  baggageIncluded: false,
  flexible: false,
  quality: [],
});

test("quick facet drafts combine with every committed facet", () => {
  const inventory = [
    flight("match", { airlineName: "A", price: 90, legs: [leg("outbound", 0, "LOS", "ABV", 1)] }),
    flight("wrong-price", { airlineName: "A", price: 190, legs: [leg("outbound", 0, "LOS", "ABV", 1)] }),
    flight("wrong-stop", { airlineName: "A", price: 90, legs: [leg("outbound", 0, "LOS", "ABV", 0)] }),
    flight("wrong-airline", { airlineName: "B", price: 90, legs: [leg("outbound", 0, "LOS", "ABV", 1)] }),
  ];
  const committed = { ...emptyFilters(), maximumPrice: 100, stops: ["1"], airlines: ["A"] };
  const airlineDraft = { ...committed, airlines: ["A"] };
  const stopsDraft = { ...committed, stops: ["1"] };
  const airportDraft = { ...committed, fromAirports: ["LOS"], toAirports: ["ABV"] };
  assert.equal(matchingFlightCount(inventory, airlineDraft), 1);
  assert.equal(matchingFlightCount(inventory, stopsDraft), 1);
  assert.equal(matchingFlightCount(inventory, airportDraft), 1);
  assert.equal(matchingFlightCount(inventory, { ...airportDraft, toAirports: ["LHR"] }), 0);
});

test("FROM and TO are independent multi-city endpoints and exclude layovers", () => {
  const multi = flight("multi", {
    legs: [
      leg("leg", 0, "LOS", "ABV", 1),
      leg("leg", 1, "ABV", "LHR", 0),
    ],
  });
  assert.deepEqual(flightAirportEndpoints(multi), {
    fromAirports: ["LOS", "ABV"],
    toAirports: ["ABV", "LHR"],
  });
  assert.equal(flightMatchesFilters(multi, { ...emptyFilters(), fromAirports: ["LOS"] }), true);
  assert.equal(flightMatchesFilters(multi, { ...emptyFilters(), toAirports: ["LOS"] }), false);
  assert.equal(flightMatchesFilters(multi, { ...emptyFilters(), fromAirports: ["ACC"] }), false);
});

test("round-trip and multi-city stops use the worst authoritative journey leg", () => {
  const roundTrip = flight("rt", { stops: 0, legs: [leg("outbound", 0, "LOS", "ABV"), leg("return", 1, "ABV", "LOS", 2)] });
  const multi = flight("multi", { stops: 0, legs: [leg("leg", 0, "LOS", "ABV", 1), leg("leg", 1, "ABV", "LHR", 3)] });
  assert.equal(flightMaximumStops(roundTrip), 2);
  assert.equal(flightMaximumStops(multi), 3);
  assert.equal(flightMatchesFilters(roundTrip, { ...emptyFilters(), stops: ["2+"] }), true);
  assert.equal(flightMatchesFilters(multi, { ...emptyFilters(), stops: ["2+"] }), true);
});

test("duration and independent journey times use authoritative legs", () => {
  const result = flight("rt", {
    durationMinutes: 30,
    legs: [
      leg("outbound", 0, "LOS", "ABV", 0, 80, "2026-10-01T08:00:00+01:00"),
      leg("return", 1, "ABV", "LOS", 0, 140, "2026-10-05T20:00:00+01:00", "2026-10-05T22:00:00+01:00"),
    ],
  });
  assert.equal(flightJourneyDurationMinutes(result), 140);
  assert.equal(flightMatchesFilters(result, { ...emptyFilters(), maximumDuration: 100 }), false);
  assert.equal(flightMatchesFilters(result, { ...emptyFilters(), journeyTimeMaximums: { outbound: { takeoff: 600, landing: null }, return: { takeoff: 600, landing: null } } }), false);
  assert.equal(flightMatchesFilters(result, { ...emptyFilters(), journeyTimeMaximums: { outbound: { takeoff: 600, landing: null } } }), true);
  assert.equal(flightMatchesFilters(result, { ...emptyFilters(), journeyTimeMaximums: { "leg:9": { takeoff: 600, landing: null } } }), false);
});

test("price comparison callback and structured fare terms are authoritative", () => {
  const result = flight("fare", {
    price: 100,
    baggageInfo: "Baggage included!",
    refundInfo: "Fully refundable!",
    fareTerms: [
      { category: "baggage", semantic: "negative", text: "No bag" },
      { category: "refund", semantic: "positive", text: "Refundable" },
    ],
  });
  assert.equal(hasStructuredBaggage(result), false);
  assert.equal(hasStructuredFlexibility(result), true);
  assert.equal(flightMatchesFilters(result, { ...emptyFilters(), baggageIncluded: true }), false);
  assert.equal(flightMatchesFilters(result, { ...emptyFilters(), flexible: true }), true);
  assert.equal(flightMatchesFilters(result, { ...emptyFilters(), maximumPrice: 150 }, { priceValue: () => 200 }), false);
});

test("active count follows the same directional and journey state", () => {
  assert.equal(activeFlightFilterCount({
    ...emptyFilters(),
    stops: ["0", "1"],
    airlines: ["A", "B"],
    fromAirports: ["LOS"],
    toAirports: ["ABV"],
    journeyTimeMaximums: { outbound: { takeoff: 600, landing: 900 } },
  }), 7);
});
