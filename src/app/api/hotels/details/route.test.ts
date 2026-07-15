import assert from "node:assert/strict";
import test from "node:test";

import { GET } from "./route";
import { rememberHotels } from "@/lib/searchCache";
import type { NormalizedHotelResult } from "@/lib/types";

function testHotel(id: string, name: string): NormalizedHotelResult {
  return {
    id,
    provider: "Test Provider",
    name,
    imageUrl: "https://example.com/hotel.jpg",
    imageUrls: ["https://example.com/hotel.jpg"],
    rating: 4,
    reviewScore: 8.7,
    reviewCount: 120,
    neighbourhood: "Test Area",
    location: "Test City",
    distanceFromCenter: "1 km from centre",
    pricePerNight: 100,
    totalPrice: 200,
    currency: "USD",
    amenities: ["Free Wi-Fi"],
    roomType: "Double room",
    cancellationInfo: "Free cancellation",
    taxesAndFeesIncluded: true,
    dataSource: "live",
    bookingUrl: "https://example.com/book",
    partnerRedirectUrl: "https://example.com/redirect",
    valueScore: 80,
    travelConfidenceScore: 85,
    arrivalSuitabilityScore: 75,
    recommendationReasons: ["Central location"],
    badges: ["Best value"],
    rawProviderReference: { supplier: "secret" },
  };
}

test("hotel details returns 400 when id is missing", async () => {
  const response = GET(new Request("https://kurioticket.test/api/hotels/details"));
  const payload = await response.json() as { error?: string };

  assert.equal(response.status, 400);
  assert.equal(payload.error, "Hotel id is required.");
});

test("hotel details returns 404 for an unknown id", async () => {
  const response = GET(new Request("https://kurioticket.test/api/hotels/details?id=unknown-hotel-details-test"));
  const payload = await response.json() as { error?: string };

  assert.equal(response.status, 404);
  assert.equal(payload.error, "This hotel quote is no longer available. Please search again for current prices.");
});

test("hotel details returns the selected cached public hotel", async () => {
  const selectedId = `hotel-details-selected-${Date.now()}`;
  const otherId = `hotel-details-other-${Date.now()}`;
  rememberHotels([
    testHotel(otherId, "Other Cached Hotel"),
    testHotel(selectedId, "Selected Cached Hotel"),
  ]);

  const response = GET(new Request(`https://kurioticket.test/api/hotels/details?id=${encodeURIComponent(selectedId)}`));
  const payload = await response.json() as { hotel?: Record<string, unknown> };

  assert.equal(response.status, 200);
  assert.equal(payload.hotel?.id, selectedId);
  assert.equal(payload.hotel?.name, "Selected Cached Hotel");
  assert.equal(Object.hasOwn(payload.hotel ?? {}, "rawProviderReference"), false);
});

test("hotel details does not return a different cached hotel for an unknown id", async () => {
  const cachedId = `hotel-details-cached-${Date.now()}`;
  rememberHotels([testHotel(cachedId, "Cached Hotel Should Not Leak")]);

  const response = GET(new Request(`https://kurioticket.test/api/hotels/details?id=${cachedId}-missing`));
  const payload = await response.json() as { hotel?: Record<string, unknown>; error?: string };

  assert.equal(response.status, 404);
  assert.equal(payload.hotel, undefined);
  assert.equal(payload.error, "This hotel quote is no longer available. Please search again for current prices.");
});
