import assert from "node:assert/strict";
import test from "node:test";

import { GET } from "./route";
import { rememberHotels } from "@/lib/searchCache";
import type { NormalizedHotelResult } from "@/lib/types";
import { staticHotelCatalogue } from "@/services/travel/staticHotelCatalogue";

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
  const response = await GET(
    new Request("https://kurioticket.test/api/hotels/details"),
  );
  const payload = (await response.json()) as { error?: string };

  assert.equal(response.status, 400);
  assert.equal(payload.error, "Hotel id is required.");
});

test("hotel details returns 404 for an unknown id", async () => {
  const response = await GET(
    new Request(
      "https://kurioticket.test/api/hotels/details?id=unknown-hotel-details-test",
    ),
  );
  const payload = (await response.json()) as { error?: string };

  assert.equal(response.status, 404);
  assert.equal(payload.error, "Hotel not found.");
});

test("hotel details returns the selected cached public hotel", async () => {
  const selectedId = `hotel-details-selected-${Date.now()}`;
  const otherId = `hotel-details-other-${Date.now()}`;
  rememberHotels([
    testHotel(otherId, "Other Cached Hotel"),
    testHotel(selectedId, "Selected Cached Hotel"),
  ]);

  const response = await GET(
    new Request(
      `https://kurioticket.test/api/hotels/details?id=${encodeURIComponent(selectedId)}`,
    ),
  );
  const payload = (await response.json()) as {
    hotel?: Record<string, unknown>;
    roomOptions?: unknown[];
  };

  assert.equal(response.status, 200);
  assert.equal(payload.hotel?.id, selectedId);
  assert.equal(payload.hotel?.name, "Selected Cached Hotel");
  assert.equal(
    Object.hasOwn(payload.hotel ?? {}, "rawProviderReference"),
    false,
  );
  assert.deepEqual(payload.roomOptions, []);
});

test("provider hotel details keep property facts separate while exposing verified KAYAK location coordinates", async () => {
  const id = `kayak-sandbox:location-${Date.now()}`;
  const hotel = testHotel(id, "KAYAK Provider Hotel");
  hotel.provider = "KAYAK sandbox";
  hotel.dataSource = "demo";
  hotel.location = "10 Test Street";
  hotel.rawProviderReference = {
    kind: "kayak-hotel-details",
    details: {
      source: "KAYAK",
      overview: { address: "10 Test Street", countryCode: "US" },
    },
    location: {
      address: "10 Test Street",
      countryCode: "US",
      latitude: 40.75,
      longitude: -73.98,
    },
  };
  rememberHotels([hotel]);

  const response = await GET(
    new Request(
      `https://kurioticket.test/api/hotels/details?id=${encodeURIComponent(id)}`,
    ),
  );
  const payload = (await response.json()) as {
    hotel: Record<string, unknown>;
    propertyDetails: unknown;
    locationDetails: {
      latitude: number;
      longitude: number;
      streetAddress: string;
      country: string;
    } | null;
    providerDetails?: {
      source?: string;
      overview?: { address?: string; countryCode?: string };
    } | null;
  };

  assert.equal(response.status, 200);
  assert.equal(payload.propertyDetails, null);
  assert.deepEqual(payload.locationDetails && {
    latitude: payload.locationDetails.latitude,
    longitude: payload.locationDetails.longitude,
    streetAddress: payload.locationDetails.streetAddress,
    country: payload.locationDetails.country,
  }, {
    latitude: 40.75,
    longitude: -73.98,
    streetAddress: "10 Test Street",
    country: "US",
  });
  assert.equal(payload.providerDetails?.source, "KAYAK");
  assert.equal(payload.providerDetails?.overview?.address, "10 Test Street");
  assert.equal(Object.hasOwn(payload.hotel, "rawProviderReference"), false);
});

test("static details include sanitized room options and requested stay totals", async () => {
  const response = await GET(
    new Request(
      "https://kurioticket.test/api/hotels/details?id=hotel-le-six-paris&checkIn=2027-06-01&checkOut=2027-06-04&rooms=2&guests=4",
    ),
  );
  const payload = (await response.json()) as {
    hotel: Record<string, unknown>;
    propertyDetails: Record<string, unknown>;
    locationDetails?: Record<string, unknown>;
    roomOptions: Array<Record<string, unknown>>;
  };
  assert.equal(response.status, 200);
  assert.equal(payload.hotel.id, "hotel-le-six-paris");
  assert.equal(
    payload.hotel.totalPrice,
    Number(payload.hotel.pricePerNight) * 3 * 2,
  );
  assert.equal(typeof payload.propertyDetails.description, "string");
  assert.equal(typeof payload.propertyDetails.latitude, "number");
  assert.equal(typeof payload.propertyDetails.longitude, "number");
  assert.equal(payload.propertyDetails.city, "Paris");
  assert.equal(payload.locationDetails?.latitude, payload.propertyDetails.latitude);
  assert.equal(payload.locationDetails?.longitude, payload.propertyDetails.longitude);
  assert.equal(
    Object.hasOwn(payload.propertyDetails, "rawProviderReference"),
    false,
  );
  assert.ok(payload.roomOptions.length >= 2);
  for (const room of payload.roomOptions) {
    assert.equal(room.hotelId, "hotel-le-six-paris");
    assert.equal(room.totalPrice, Number(room.pricePerNight) * 3 * 2);
    assert.equal(room.pricingKind, "indicative");
    assert.equal(Object.hasOwn(room, "rawProviderReference"), false);
  }
});

test("hotel details does not return a different cached hotel for an unknown id", async () => {
  const cachedId = `hotel-details-cached-${Date.now()}`;
  rememberHotels([testHotel(cachedId, "Cached Hotel Should Not Leak")]);

  const response = await GET(
    new Request(
      `https://kurioticket.test/api/hotels/details?id=${cachedId}-missing`,
    ),
  );
  const payload = (await response.json()) as {
    hotel?: Record<string, unknown>;
    error?: string;
  };

  assert.equal(response.status, 404);
  assert.equal(payload.hotel, undefined);
  assert.equal(payload.error, "Hotel not found.");
});

test("Park Plaza details expose the matching Westminster address and coordinates", async () => {
  const response = await GET(
    new Request(
      "https://kurioticket.test/api/hotels/details?id=park-plaza-westminster-bridge",
    ),
  );
  const payload = (await response.json()) as {
    hotel: { name: string };
    propertyDetails: {
      latitude: number;
      longitude: number;
      streetAddress: string;
    };
    relatedHotels: Array<Record<string, unknown>>;
  };

  assert.equal(response.status, 200);
  assert.equal(payload.hotel.name, "Park Plaza Westminster Bridge London");
  assert.equal(payload.propertyDetails.latitude, 51.501);
  assert.equal(payload.propertyDetails.longitude, -0.1167);
  assert.match(
    payload.propertyDetails.streetAddress,
    /200 Westminster Bridge Rd/i,
  );
  assert.match(payload.propertyDetails.streetAddress, /SE1 7UT/i);
  assert.equal(payload.relatedHotels.length, 7);
  assert.equal(new Set(payload.relatedHotels.map((hotel) => hotel.id)).size, 7);
  assert.equal(
    new Set(payload.relatedHotels.map((hotel) => hotel.name)).size,
    7,
  );
  assert.equal(
    payload.relatedHotels.some(
      (hotel) => hotel.id === "park-plaza-westminster-bridge",
    ),
    false,
  );
  assert.equal(
    payload.relatedHotels.some((hotel) =>
      Object.hasOwn(hotel, "rawProviderReference"),
    ),
    false,
  );
});

test("static hotel details return only available sanitized same-city alternatives", async () => {
  for (const selected of staticHotelCatalogue) {
    const response = await GET(
      new Request(
        `https://kurioticket.test/api/hotels/details?id=${encodeURIComponent(selected.id)}&checkIn=2027-06-01&checkOut=2027-06-04&rooms=1&guests=2`,
      ),
    );
    const payload = (await response.json()) as {
      hotel: { id: string };
      propertyDetails: { city: string };
      relatedHotels: Array<{
        id: string;
        location: string;
        imageUrl: string;
        rawProviderReference?: unknown;
      }>;
    };
    assert.equal(response.status, 200, selected.id);
    assert.equal(payload.hotel.id, selected.id);
    const expectedRelatedCount = selected.inventoryKind === "discovery" ? 0 : 7;
    assert.equal(payload.relatedHotels.length, expectedRelatedCount, selected.id);
    assert.equal(
      new Set(payload.relatedHotels.map((hotel) => hotel.id)).size,
      expectedRelatedCount,
      selected.id,
    );
    assert.ok(
      payload.relatedHotels.every((hotel) => hotel.id !== selected.id),
      selected.id,
    );
    assert.ok(
      payload.relatedHotels.every((hotel) =>
        hotel.location.startsWith(payload.propertyDetails.city),
      ),
      selected.id,
    );
    assert.ok(
      payload.relatedHotels.every(
        (hotel) => hotel.imageUrl && !("rawProviderReference" in hotel),
      ),
      selected.id,
    );
  }
});


test("static Hotel details can recommend KAYAK hotels from the same merged search cohort", async () => {
  const selected = testHotel("hotel-le-six-paris", "Hotel Le Six");
  selected.provider = "Kurioticket static catalogue";
  selected.location = "Paris, France";

  const kayak = testHotel(`kayak-sandbox:related-${Date.now()}`, "KAYAK Paris Alternative");
  kayak.provider = "KAYAK sandbox";
  kayak.dataSource = "demo";
  kayak.location = "Paris, France";

  rememberHotels(
    [selected, kayak],
    {
      destination: "Paris",
      checkIn: "2027-06-01",
      checkOut: "2027-06-04",
      guests: 2,
      rooms: 1,
    },
  );

  const response = await GET(
    new Request(
      "https://kurioticket.test/api/hotels/details?id=hotel-le-six-paris&checkIn=2027-06-01&checkOut=2027-06-04&rooms=1&guests=2",
    ),
  );
  const payload = (await response.json()) as {
    relatedHotels: Array<{
      id: string;
      provider: string;
      rawProviderReference?: unknown;
    }>;
  };

  assert.equal(response.status, 200);
  assert.equal(payload.relatedHotels.length, 1);
  assert.equal(payload.relatedHotels[0]?.id, kayak.id);
  assert.equal(payload.relatedHotels[0]?.provider, "KAYAK sandbox");
  assert.equal(Object.hasOwn(payload.relatedHotels[0] ?? {}, "rawProviderReference"), false);
});

test("Hotel details return every other hotel from an 18-result New York search cohort", async () => {
  const search = {
    destination: "New York",
    checkIn: "2027-10-17",
    checkOut: "2027-10-24",
    guests: 2,
    rooms: 1,
  };
  const hotels = Array.from({ length: 18 }, (_, index) => {
    const hotel = testHotel(
      `new-york-related-${index + 1}-${Date.now()}`,
      `New York Hotel ${index + 1}`,
    );
    hotel.provider = index % 2 === 0 ? "Kurioticket static catalogue" : "KAYAK sandbox";
    hotel.dataSource = index % 2 === 0 ? "live" : "demo";
    hotel.location = "New York, United States";
    hotel.pricePerNight = 100 + index;
    hotel.totalPrice = (100 + index) * 7;
    return hotel;
  });
  rememberHotels(hotels, search);

  const selected = hotels[0]!;
  const response = await GET(
    new Request(
      `https://kurioticket.test/api/hotels/details?id=${encodeURIComponent(selected.id)}&destination=${encodeURIComponent(search.destination)}&checkIn=${search.checkIn}&checkOut=${search.checkOut}&rooms=${search.rooms}&guests=${search.guests}`,
    ),
  );
  const payload = (await response.json()) as {
    hotel: { id: string };
    relatedHotels: Array<{ id: string; provider: string }>;
  };

  assert.equal(response.status, 200);
  assert.equal(payload.hotel.id, selected.id);
  assert.equal(payload.relatedHotels.length, 17);
  assert.equal(new Set(payload.relatedHotels.map((hotel) => hotel.id)).size, 17);
  assert.equal(payload.relatedHotels.some((hotel) => hotel.id === selected.id), false);
  assert.ok(payload.relatedHotels.some((hotel) => hotel.provider === "KAYAK sandbox"));
  assert.ok(payload.relatedHotels.some((hotel) => hotel.provider === "Kurioticket static catalogue"));
  assert.deepEqual(
    payload.relatedHotels.map((hotel) => hotel.id),
    hotels.slice(1).map((hotel) => hotel.id),
  );
});

test("KAYAK Hotel details can recommend Kurioticket hotels from the same merged search cohort", async () => {
  const selected = testHotel(`kayak-sandbox:selected-${Date.now()}`, "KAYAK New York Hotel");
  selected.provider = "KAYAK sandbox";
  selected.dataSource = "demo";
  selected.location = "New York, United States";

  const kurioticket = testHotel("hotel-le-six-paris", "Kurioticket Alternative");
  kurioticket.provider = "Kurioticket static catalogue";
  kurioticket.location = "New York, United States";

  rememberHotels(
    [selected, kurioticket],
    {
      destination: "New York",
      checkIn: "2027-07-01",
      checkOut: "2027-07-04",
      guests: 2,
      rooms: 1,
    },
  );

  const response = await GET(
    new Request(
      `https://kurioticket.test/api/hotels/details?id=${encodeURIComponent(selected.id)}&destination=${encodeURIComponent("New York")}&checkIn=2027-07-01&checkOut=2027-07-04&rooms=1&guests=2`,
    ),
  );
  const payload = (await response.json()) as {
    hotel: { id: string };
    relatedHotels: Array<{
      id: string;
      provider: string;
      rawProviderReference?: unknown;
    }>;
  };

  assert.equal(response.status, 200);
  assert.equal(payload.hotel.id, selected.id);
  assert.equal(payload.relatedHotels.length, 1);
  assert.equal(payload.relatedHotels[0]?.id, kurioticket.id);
  assert.equal(payload.relatedHotels[0]?.provider, "Kurioticket static catalogue");
  assert.equal(Object.hasOwn(payload.relatedHotels[0] ?? {}, "rawProviderReference"), false);
});
