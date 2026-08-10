import assert from "node:assert/strict";
import test from "node:test";
import type { FlightResult } from "../../api/travelApi";
import { displayFlightLegs, stopLabel } from "./flightCardPresentation";

const flight = (patch: Partial<FlightResult> = {}) => ({
  id: "provider-flight", provider: "Provider", airlineName: "Truth Air",
  originAirport: "LOS", destinationAirport: "JFK",
  departureTime: "2026-08-10T06:58:00Z", arrivalTime: "2026-08-10T13:48:00Z",
  duration: "11h 50m", durationMinutes: 710, stops: 0, layovers: [],
  cabinClass: "economy", baggageInfo: "Carry-on included", refundInfo: "Review before booking",
  price: 603, currency: "USD", bookingUrl: "https://provider.test", partnerRedirectUrl: "https://provider.test",
  valueScore: 90, riskScore: 1, comfortScore: 80, travelConfidenceScore: 80,
  travelEffortScore: 80, recommendationReasons: [], badges: [],
  searchPolicy: { source: "duffel", bookable: true, action: { kind: "internal-detail", href: "/flights/details/provider-flight", enabled: true } },
  ...patch,
} as FlightResult);

test("top-level provider fields become one truthful outbound leg", () => {
  assert.deepEqual(displayFlightLegs(flight()), [{
    direction: "outbound", originAirport: "LOS", destinationAirport: "JFK",
    departureTime: "2026-08-10T06:58:00Z", arrivalTime: "2026-08-10T13:48:00Z",
    duration: "11h 50m", stops: 0,
  }]);
});

test("return is rendered only when provider-normalized return data exists", () => {
  const outbound = { direction: "outbound" as const, originAirport: "LOS", destinationAirport: "JFK", departureTime: "out", arrivalTime: "out-arrive", duration: "10h", durationMinutes: 600, stops: 0, layovers: [], segments: [] };
  const result = flight({ legs: [outbound, { ...outbound, direction: "return", originAirport: "JFK", destinationAirport: "LOS", departureTime: "return", arrivalTime: "return-arrive" }] });
  const legs = displayFlightLegs(result);
  assert.equal(legs.length, 2);
  assert.equal(legs[1].direction, "return");
  assert.equal(legs[1].departureTime, "return");
  assert.notEqual(legs[1].departureTime, legs[0].departureTime);
});

test("stop copy preserves provider stop counts", () => {
  assert.equal(stopLabel(0), "Nonstop");
  assert.equal(stopLabel(1), "1 stop");
  assert.equal(stopLabel(2), "2 stops");
});
