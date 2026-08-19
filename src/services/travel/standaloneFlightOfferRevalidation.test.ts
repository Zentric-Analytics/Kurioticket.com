import assert from "node:assert/strict";
import test from "node:test";
import type { FlightSearchParams, NormalizedFlightResult } from "@/lib/types";
import { flightMatchesSearch, revalidateStandaloneFlightOffer } from "./standaloneFlightOfferRevalidation";

const search: FlightSearchParams = {
  tripType: "round-trip", origin: "LHR", destination: "JFK",
  departureDate: "2027-01-01", returnDate: "2027-01-08",
  adults: 1, children: 0, infants: 0, travelers: 1, cabinClass: "economy",
};
const leg = (direction: "outbound" | "return", origin: string, destination: string, date: string) => ({
  direction, originAirport: origin, destinationAirport: destination,
  departureTime: `${date}T10:00:00Z`, arrivalTime: `${date}T18:00:00Z`,
  duration: "8h", durationMinutes: 480, stops: 0, layovers: [],
  segments: [{ originAirport: origin, destinationAirport: destination, departureTime: `${date}T10:00:00Z`, arrivalTime: `${date}T18:00:00Z`, airlineName: "Test Air", flightNumber: "TA1" }],
});
const flight: NormalizedFlightResult = {
  id: "kurioticket-flight", provider: "Duffel", providerOfferId: "off_secret",
  providerExpiresAt: Date.now() + 60_000, airlineName: "Test Air", flightNumber: "TA1",
  originAirport: "LHR", destinationAirport: "JFK", departureTime: "2027-01-01T10:00:00Z",
  arrivalTime: "2027-01-01T18:00:00Z", duration: "8h", durationMinutes: 480, stops: 0,
  layovers: [], legs: [leg("outbound", "LHR", "JFK", "2027-01-01"), leg("return", "JFK", "LHR", "2027-01-08")],
  cabinClass: "economy", fareBrandName: "Basic", baggageInfo: "1 carry-on included",
  refundInfo: "Not refundable", price: 700, currency: "GBP", bookingUrl: "", partnerRedirectUrl: "",
  valueScore: 1, riskScore: 1, comfortScore: 1, travelConfidenceScore: 1, travelEffortScore: 1,
  recommendationReasons: [], badges: [],
};

test("requires a complete, chronological round trip matching the search", () => {
  assert.equal(flightMatchesSearch(flight, search), true);
  assert.equal(flightMatchesSearch({ ...flight, legs: [flight.legs![0]] }, search), false);
  assert.equal(flightMatchesSearch({ ...flight, legs: [flight.legs![0], { ...flight.legs![1], destinationAirport: "LGW" }] }, search), false);
  assert.equal(flightMatchesSearch({ ...flight, legs: [flight.legs![0], { ...flight.legs![1], segments: [] }] }, search), false);
});

test("refreshes the server-owned identity and classifies confirmed, changed, and failures", async () => {
  const refresh = (value: NormalizedFlightResult) => async (id: string) => {
    assert.equal(id, "off_secret");
    return { provider: "Duffel", results: [value], status: "success" as const, latencyMs: 1 };
  };
  assert.equal((await revalidateStandaloneFlightOffer({ cachedOffer: flight, search, refreshDuffelOffer: refresh(flight) })).status, "confirmed");
  assert.equal((await revalidateStandaloneFlightOffer({ cachedOffer: flight, search, refreshDuffelOffer: refresh({ ...flight, price: 701 }) })).status, "changed");
  assert.equal((await revalidateStandaloneFlightOffer({ cachedOffer: flight, search, refreshDuffelOffer: async () => ({ provider: "Duffel", results: [], status: "failed", latencyMs: 1, errorCategory: "timeout" }) })).status, "temporary-failure");
  assert.equal((await revalidateStandaloneFlightOffer({ cachedOffer: flight, search, refreshDuffelOffer: async () => ({ provider: "Duffel", results: [], status: "failed", latencyMs: 1, errorCategory: "no_inventory" }) })).status, "unavailable");
});
