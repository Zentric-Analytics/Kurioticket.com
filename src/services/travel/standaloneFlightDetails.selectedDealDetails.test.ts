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

function kayakOffer(
  id: string,
  providerOfferId: string,
  price: number,
  providerName: string,
  totalAmount: number,
): NormalizedFlightResult {
  return {
    id,
    provider: "KAYAK sandbox",
    providerOfferId,
    bookingProviderName: providerName,
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
    fareBrandName: "Economy",
    baggageInfo: "Not supplied by provider",
    refundInfo: "Not supplied by provider",
    fareTerms: [],
    providerDetails: {
      price: { totalAmount, totalCurrency: "USD" },
      updatedAt: `2027-02-10T0${providerName === "Seller A" ? "1" : "2"}:00:00Z`,
      offerOwner: { name: providerName },
    },
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

test("each grouped KAYAK deal retains its own sanitized offer details", async () => {
  const sellerA = kayakOffer("kayak-sandbox:a", "offer-a", 434, "Seller A", 434);
  const sellerB = kayakOffer("kayak-sandbox:b", "offer-b", 875, "Seller B", 875);

  const details = await buildProviderAwareFlightDetails({
    cachedSelected: sellerA,
    cachedAlternatives: [sellerA, sellerB],
    search,
    now: 1,
  });

  assert.equal(details.status, "available");
  if (details.status !== "available") return;

  const fare = details.fareChoices[0];
  assert.equal(fare.deals.length, 2);

  const alternate = fare.deals.find(({ offerId }) => offerId === sellerB.id);
  assert.ok(alternate);
  assert.equal(alternate.offer.id, sellerB.id);
  assert.equal(alternate.offer.providerDetails?.price?.totalAmount, 875);
  assert.equal(alternate.offer.providerDetails?.offerOwner?.name, "Seller B");
  assert.equal("bookingUrl" in alternate.offer, false);
  assert.equal("partnerRedirectUrl" in alternate.offer, false);
});
