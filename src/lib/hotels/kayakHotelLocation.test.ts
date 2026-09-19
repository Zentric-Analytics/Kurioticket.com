import assert from "node:assert/strict";
import test from "node:test";
import type { NormalizedHotelResult } from "@/lib/types";
import { kayakHotelLocationDetails } from "./kayakHotelLocation";

function hotel(rawProviderReference: unknown): NormalizedHotelResult {
  return {
    id: "kayak-sandbox:test",
    provider: "KAYAK sandbox",
    name: "Provider Hotel",
    rating: 0,
    location: "10 Test Street",
    amenities: [],
    roomType: "Room",
    cancellationInfo: "See supplied rate details",
    pricePerNight: 100,
    totalPrice: 200,
    currency: "USD",
    bookingUrl: "https://affiliates.kayak.com/sandbox-clickout",
    partnerRedirectUrl: "https://affiliates.kayak.com/sandbox-clickout",
    valueScore: 0,
    travelConfidenceScore: 0,
    arrivalSuitabilityScore: 0,
    recommendationReasons: [],
    badges: [],
    dataSource: "demo",
    rawProviderReference,
  };
}

test("KAYAK location details require provider-backed valid coordinates", () => {
  const details = kayakHotelLocationDetails(hotel({
    kind: "kayak-hotel-details",
    details: {
      source: "KAYAK",
      overview: {
        address: "10 Test Street",
        countryCode: "US",
        place: [{ label: "city", value: "New York" }],
      },
    },
    location: {
      address: "10 Test Street",
      countryCode: "US",
      latitude: 40.75,
      longitude: -73.98,
    },
  }));
  assert.ok(details);
  assert.equal(details.latitude, 40.75);
  assert.equal(details.longitude, -73.98);
  assert.equal(details.streetAddress, "10 Test Street");
  assert.equal(details.city, "New York");
  assert.equal(details.country, "US");
});

test("KAYAK location details never invent missing or invalid coordinates", () => {
  assert.equal(kayakHotelLocationDetails(hotel({
    kind: "kayak-hotel-details",
    details: { source: "KAYAK", overview: { address: "10 Test Street" } },
  })), null);
  assert.equal(kayakHotelLocationDetails(hotel({
    kind: "kayak-hotel-details",
    details: { source: "KAYAK", overview: { address: "10 Test Street" } },
    location: { latitude: 200, longitude: -73.98 },
  })), null);
});
