import assert from "node:assert/strict";
import test from "node:test";

import type { PublicHotelResult } from "@/lib/types";
import {
  compareHotelsByAvailablePrice,
  getComparableHotelTotalUsd,
  getHotelPriceDetails,
  getLowestPricedHotelId,
  hasHotelPrice,
} from "@/lib/hotels/hotelResultAvailability";

function hotel(overrides: Partial<PublicHotelResult> = {}): PublicHotelResult {
  return {
    id: "hotel-1",
    provider: "test",
    name: "Test Hotel",
    rating: 4,
    location: "Paris",
    pricePerNight: 100,
    totalPrice: 200,
    currency: "USD",
    amenities: [],
    roomType: "Standard room",
    cancellationInfo: "Flexible",
    bookingUrl: "https://example.com/book",
    partnerRedirectUrl: "https://example.com/redirect",
    valueScore: 80,
    travelConfidenceScore: 80,
    arrivalSuitabilityScore: 80,
    recommendationReasons: [],
    badges: [],
    ...overrides,
  } as PublicHotelResult;
}

function discovery(id = "discovery-1"): PublicHotelResult {
  return {
    id,
    provider: "places",
    name: "Discovery Hotel",
    inventoryKind: "discovery",
    rating: 4,
    location: "Paris",
    amenities: [],
    roomType: "Hotel",
    cancellationInfo: "Rate unavailable",
    valueScore: 70,
    travelConfidenceScore: 70,
    arrivalSuitabilityScore: 70,
    recommendationReasons: [],
    badges: [],
  };
}

test("an existing-style bookable hotel without inventoryKind is priced", () => {
  assert.equal(hasHotelPrice(hotel()), true);
});

test("an explicitly bookable hotel is priced", () => {
  assert.equal(hasHotelPrice(hotel({ inventoryKind: "bookable" })), true);
});

test("a discovery hotel is unpriced", () => {
  assert.equal(getHotelPriceDetails(discovery()), null);
});

test("missing price fields are unpriced", () => {
  assert.equal(getHotelPriceDetails({ ...hotel(), pricePerNight: undefined } as unknown as PublicHotelResult), null);
  assert.equal(getHotelPriceDetails({ ...hotel(), totalPrice: undefined } as unknown as PublicHotelResult), null);
});

test("zero prices are unpriced", () => {
  assert.equal(getHotelPriceDetails(hotel({ pricePerNight: 0 })), null);
  assert.equal(getHotelPriceDetails(hotel({ totalPrice: 0 })), null);
});

test("negative prices are unpriced", () => {
  assert.equal(getHotelPriceDetails(hotel({ pricePerNight: -1 })), null);
  assert.equal(getHotelPriceDetails(hotel({ totalPrice: -1 })), null);
});

test("NaN and Infinity are unpriced", () => {
  assert.equal(getHotelPriceDetails(hotel({ pricePerNight: Number.NaN })), null);
  assert.equal(getHotelPriceDetails(hotel({ totalPrice: Number.POSITIVE_INFINITY })), null);
});

test("blank currency is unpriced", () => {
  assert.equal(getHotelPriceDetails(hotel({ currency: "   " })), null);
});

test("currency is normalized to uppercase", () => {
  assert.deepEqual(getHotelPriceDetails(hotel({ currency: " eur " })), {
    pricePerNight: 100,
    totalPrice: 200,
    currency: "EUR",
  });
});

test("comparable USD total is null for discovery", () => {
  assert.equal(getComparableHotelTotalUsd(discovery()), null);
});

test("priced hotels sort before discovery hotels", () => {
  assert.equal(compareHotelsByAvailablePrice(discovery(), hotel()), 1);
  assert.equal(compareHotelsByAvailablePrice(hotel(), discovery()), -1);
});

test("two discovery hotels compare equally", () => {
  assert.equal(compareHotelsByAvailablePrice(discovery("a"), discovery("b")), 0);
});

test("the lowest-priced ID ignores discovery hotels", () => {
  assert.equal(getLowestPricedHotelId([discovery(), hotel({ id: "expensive", totalPrice: 300 }), hotel({ id: "cheap", totalPrice: 150 })]), "cheap");
});

test("lowest-priced ID is null when all hotels are discovery-only", () => {
  assert.equal(getLowestPricedHotelId([discovery("a"), discovery("b")]), null);
});
