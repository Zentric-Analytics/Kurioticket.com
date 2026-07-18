import assert from "node:assert/strict";
import test from "node:test";

import type { PublicHotelResult } from "@/lib/types";
import {
  buildHotelDetailsResultsHref,
  canUseHotelDetailsProviderLink,
  getDistinctHotelDetailsLocationParts,
  getHotelDetailsCancellationText,
  getHotelDetailsStarRating,
  isSafeHotelDetailsHttpUrl,
  parseHotelDetailsSearchCount,
  parseHotelDetailsSearchDate,
} from "@/components/results/hotelDetails/hotelDetailsPresentation";

const t = (key: string) => ({
  "hotelResults.nonRefundable": "Non-refundable",
  "hotelResults.filter.freeCancellation": "Free cancellation",
  "hotelResults.payAtProperty": "Pay at property",
}[key] || "");

function hotel(overrides: Partial<PublicHotelResult> = {}): PublicHotelResult {
  return {
    id: "hotel-1",
    provider: "test",
    name: "Test Hotel",
    rating: 4,
    location: "Paris Center",
    neighbourhood: "Center",
    distanceFromCenter: "1 km from center",
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
  };
}

test("hotel details URL safety accepts only HTTP and HTTPS URLs", () => {
  assert.equal(isSafeHotelDetailsHttpUrl("https://example.com"), true);
  assert.equal(isSafeHotelDetailsHttpUrl("http://example.com"), true);
  assert.equal(isSafeHotelDetailsHttpUrl("javascript:alert(1)"), false);
  assert.equal(isSafeHotelDetailsHttpUrl("data:text/plain,hello"), false);
  assert.equal(isSafeHotelDetailsHttpUrl("file:///tmp/test"), false);
  assert.equal(isSafeHotelDetailsHttpUrl("https://"), false);
  assert.equal(isSafeHotelDetailsHttpUrl(""), false);
});

test("hotel details date parsing validates YYYY-MM-DD calendar dates", () => {
  assert.equal(parseHotelDetailsSearchDate("2026-07-18")?.getFullYear(), 2026);
  assert.equal(parseHotelDetailsSearchDate("2024-02-29")?.getDate(), 29);
  assert.equal(parseHotelDetailsSearchDate("07/18/2026"), null);
  assert.equal(parseHotelDetailsSearchDate("2026-02-30"), null);
});

test("hotel details count parsing respects integer limits", () => {
  assert.equal(parseHotelDetailsSearchCount("1", 1, 6), 1);
  assert.equal(parseHotelDetailsSearchCount("6", 1, 6), 6);
  assert.equal(parseHotelDetailsSearchCount("0", 1, 6), null);
  assert.equal(parseHotelDetailsSearchCount("7", 1, 6), null);
  assert.equal(parseHotelDetailsSearchCount("1.5", 1, 6), null);
  assert.equal(parseHotelDetailsSearchCount("abc", 1, 6), null);
});

test("hotel details results links preserve only valid search context", () => {
  assert.equal(buildHotelDetailsResultsHref({ destination: "New York", checkIn: "2026-08-01", checkOut: "2026-08-03", guests: "2", rooms: "1" }), "/hotels/results?destination=New+York&checkIn=2026-08-01&checkOut=2026-08-03&guests=2&rooms=1");
  assert.equal(buildHotelDetailsResultsHref({ checkIn: "2026-08-01", checkOut: "2026-08-03", guests: "2", rooms: "1" }), "/hotels/results");
  assert.equal(buildHotelDetailsResultsHref({ destination: "Paris", checkIn: "bad", checkOut: "2026-08-03", guests: "2", rooms: "1" }), "/hotels/results");
  assert.equal(buildHotelDetailsResultsHref({ destination: "Paris", checkIn: "2026-08-03", checkOut: "2026-08-03", guests: "2", rooms: "1" }), "/hotels/results");
  assert.equal(buildHotelDetailsResultsHref({ destination: "Paris", checkIn: "2026-08-01", checkOut: "2026-08-03", guests: "0", rooms: "1" }), "/hotels/results");
});

test("hotel details location parts remove duplicate and contained text", () => {
  assert.deepEqual(getDistinctHotelDetailsLocationParts(hotel({ location: " Paris Center ", neighbourhood: "Center" }), "1 km from center"), ["Paris Center", "1 km from center"]);
  assert.deepEqual(getDistinctHotelDetailsLocationParts(hotel({ location: "Paris", neighbourhood: "Paris" }), ""), ["Paris"]);
  assert.deepEqual(getDistinctHotelDetailsLocationParts(hotel({ location: " ", neighbourhood: " ", distanceFromCenter: "" }), "  "), []);
});

test("hotel details star ratings floor and clamp valid classification values", () => {
  assert.equal(getHotelDetailsStarRating(4.8), 4);
  assert.equal(getHotelDetailsStarRating(9), 5);
  assert.equal(getHotelDetailsStarRating(0), null);
  assert.equal(getHotelDetailsStarRating(-1), null);
  assert.equal(getHotelDetailsStarRating(Number.POSITIVE_INFINITY), null);
});

test("hotel details provider eligibility preserves live price and safe URL rules", () => {
  assert.equal(canUseHotelDetailsProviderLink(hotel()), true);
  assert.equal(canUseHotelDetailsProviderLink(hotel({ partnerRedirectUrl: "", bookingUrl: "https://example.com/book" })), true);
  assert.equal(canUseHotelDetailsProviderLink(hotel({ dataSource: "demo" })), false);
  assert.equal(canUseHotelDetailsProviderLink(hotel({ inventoryKind: "discovery" })), false);
  assert.equal(canUseHotelDetailsProviderLink(hotel({ totalPrice: 0 })), false);
  assert.equal(canUseHotelDetailsProviderLink(hotel({ partnerRedirectUrl: "", bookingUrl: "" })), false);
  assert.equal(canUseHotelDetailsProviderLink(hotel({ partnerRedirectUrl: "javascript:alert(1)" })), false);
});

test("hotel details cancellation text preserves known provider copy precedence", () => {
  assert.equal(getHotelDetailsCancellationText("Free cancellation until Friday", t), "Free cancellation");
  assert.equal(getHotelDetailsCancellationText("Free cancellation but non-refundable deposit", t), "Non-refundable");
  assert.equal(getHotelDetailsCancellationText("Pay at the property", t), "Pay at property");
  assert.equal(getHotelDetailsCancellationText("Provider-specific policy", t), "Provider-specific policy");
});
