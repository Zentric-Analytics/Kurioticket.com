import assert from "node:assert/strict";
import test from "node:test";

import {
  formatItineraryShortDate,
  formatItineraryTime,
  getItineraryDateKey,
} from "@/lib/utils";
import { filterFlightsByRequestedOutboundDate } from "@/services/travel/flightAggregator";
import type { NormalizedFlightResult } from "@/lib/types";

function flight(id: string, departureTime: string, arrivalTime: string): NormalizedFlightResult {
  return {
    id,
    provider: "Duffel",
    airlineName: "Test Air",
    originAirport: "LAX",
    destinationAirport: "JFK",
    departureTime,
    arrivalTime,
    duration: "5h 30m",
    durationMinutes: 330,
    stops: 0,
    layovers: [],
    legs: [
      {
        direction: "outbound",
        originAirport: "LAX",
        destinationAirport: "JFK",
        departureTime,
        arrivalTime,
        duration: "5h 30m",
        durationMinutes: 330,
        stops: 0,
        layovers: [],
        segments: [],
      },
    ],
    cabinClass: "economy",
    baggageInfo: "Baggage rules vary by fare",
    refundInfo: "Fare rules vary",
    price: 100,
    currency: "USD",
    bookingUrl: "",
    partnerRedirectUrl: "",
    valueScore: 80,
    riskScore: 20,
    comfortScore: 70,
    travelConfidenceScore: 80,
    travelEffortScore: 80,
    recommendationReasons: [],
    badges: [],
  };
}

test("itinerary formatting preserves provider-local offset-aware wall date and time", () => {
  const value = "2026-07-12T23:30:00-10:00";

  assert.equal(getItineraryDateKey(value), "2026-07-12");
  assert.match(formatItineraryTime({ value, locale: "en-US" }), /11:30/);
  assert.equal(formatItineraryShortDate({ value, locale: "en-US" }), "Jul 12");
});

test("itinerary formatting keeps legitimate next-day arrivals", () => {
  const departure = "2026-07-12T23:40:00-07:00";
  const arrival = "2026-07-13T07:55:00-04:00";

  assert.equal(getItineraryDateKey(departure), "2026-07-12");
  assert.equal(getItineraryDateKey(arrival), "2026-07-13");
  assert.equal(formatItineraryShortDate({ value: arrival, locale: "en-US" }), "Jul 13");
});

test("requested outbound departure date filtering rejects adjacent-day leakage", () => {
  const results = [
    flight("july-12", "2026-07-12T22:30:00-07:00", "2026-07-13T06:45:00-04:00"),
    flight("july-13", "2026-07-13T00:15:00-07:00", "2026-07-13T08:20:00-04:00"),
  ];

  assert.deepEqual(
    filterFlightsByRequestedOutboundDate(results, "2026-07-12").map((item) => item.id),
    ["july-12"],
  );
});
