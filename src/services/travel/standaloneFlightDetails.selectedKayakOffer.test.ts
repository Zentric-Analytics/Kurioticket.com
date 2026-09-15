import assert from "node:assert/strict";
import test from "node:test";

import type { FlightSearchParams, NormalizedFlightResult } from "@/lib/types";
import { buildProviderAwareFlightDetails } from "./standaloneFlightDetails";

const search: FlightSearchParams = {
  tripType: "one-way",
  origin: "BOS",
  destination: "JFK",
  departureDate: "2027-02-10",
  adults: 1,
  children: 0,
  infants: 0,
  travelers: 1,
  cabinClass: "economy",
};

const leg = {
  direction: "outbound" as const,
  originAirport: "BOS",
  destinationAirport: "JFK",
  departureTime: "2027-02-10T10:00:00Z",
  arrivalTime: "2027-02-10T11:00:00Z",
  duration: "1h",
  durationMinutes: 60,
  stops: 0,
  layovers: [],
  segments: [{
    originAirport: "BOS",
    destinationAirport: "JFK",
    departureTime: "2027-02-10T10:00:00Z",
    arrivalTime: "2027-02-10T11:00:00Z",
    airlineName: "Test Airline",
    flightNumber: "KT1",
  }],
};

function kayakOffer(id: string, providerOfferId: string, price: number): NormalizedFlightResult {
  return {
    id,
    provider: "KAYAK sandbox",
    providerOfferId,
    airlineName: "Test Airline",
    flightNumber: "KT1",
    originAirport: "BOS",
    destinationAirport: "JFK",
    departureTime: "2027-02-10T10:00:00Z",
    arrivalTime: "2027-02-10T11:00:00Z",
    duration: "1h",
    durationMinutes: 60,
    stops: 0,
    layovers: [],
    legs: [leg],
    cabinClass: "Economy",
    fareBrandName: "Provider Saver",
    baggageInfo: "Not supplied by provider",
    refundInfo: "Not supplied by provider",
    fareTerms: [],
    price,
    currency: "USD",
    bookingUrl: "https://affiliates.kayak.com/sandbox-clickout",
    partnerRedirectUrl: "https://affiliates.kayak.com/sandbox-clickout",
    valueScore: 0,
    riskScore: 0,
    comfortScore: 0,
    travelConfidenceScore: 0,
    travelEffortScore: 0,
    recommendationReasons: [],
    badges: [],
  };
}

test("KAYAK grouped fares preserve the offer selected from Flight Results as the primary fare", async () => {
  const selected = kayakOffer("kayak-sandbox:selected", "selected-offer", 180);
  const cheaperSibling = kayakOffer("kayak-sandbox:cheaper", "cheaper-offer", 120);

  const details = await buildProviderAwareFlightDetails({
    cachedSelected: selected,
    cachedAlternatives: [selected, cheaperSibling],
    search,
    now: 1,
  });

  assert.equal(details.status, "available");
  if (details.status !== "available") return;

  assert.equal(details.fareChoices.length, 1);
  assert.equal(details.fareChoices[0].selectedOffer, true);
  assert.equal(details.fareChoices[0].offer.id, selected.id);
  assert.equal(details.fareChoices[0].offer.price, selected.price);
  assert.equal(details.flight.id, selected.id);
  assert.equal(details.flight.price, selected.price);
});
