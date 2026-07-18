import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  GOOGLE_PLACES_DETAILS_FIELD_MASK,
  GOOGLE_PLACES_TEXT_SEARCH_FIELD_MASK,
  buildGooglePlacesHotelId,
  getGooglePlaceIdFromHotelId,
  getGooglePlacesHotelDetails,
  isGooglePlacesHotelId,
  normalizeGooglePlacesHotel,
  searchGooglePlacesHotels,
} from "@/services/travel/providers/googlePlacesHotelProvider";

const originalFetch = globalThis.fetch;
const originalKey = process.env.GOOGLE_PLACES_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
  else process.env.GOOGLE_PLACES_API_KEY = originalKey;
});

function place(id: string, overrides = {}) {
  return {
    id,
    displayName: { text: `Hotel ${id}` },
    formattedAddress: `${id} Main Street`,
    shortFormattedAddress: `${id} Short`,
    types: ["hotel"],
    primaryTypeDisplayName: { text: "Hotel" },
    rating: 4.6,
    userRatingCount: 123,
    googleMapsUri: `https://maps.google.com/?cid=${encodeURIComponent(id)}`,
    businessStatus: "OPERATIONAL",
    attributions: [{ provider: "Google", providerUri: "https://google.com" }],
    ...overrides,
  };
}

function searchParams() {
  return { destination: "Paris", checkIn: "2026-08-01", checkOut: "2026-08-03", guests: 2, rooms: 1 };
}

test("Google Places result IDs round trip and reject malformed/non-Google IDs", () => {
  const id = buildGooglePlacesHotelId("ChIJ+/?:#[]@!");
  assert.equal(getGooglePlaceIdFromHotelId(id), "ChIJ+/?:#[]@!");
  assert.equal(isGooglePlacesHotelId(id), true);
  assert.equal(getGooglePlaceIdFromHotelId("google-places:%E0%A4%A"), null);
  assert.equal(getGooglePlaceIdFromHotelId("demo:123"), null);
  assert.equal(isGooglePlacesHotelId("demo:123"), false);
});

test("normalizes valid discovery hotels truthfully", () => {
  const hotel = normalizeGooglePlacesHotel(place("abc", { attributions: [{ provider: "  Source  ", providerUri: "https://source.example/a" }, { provider: "  " }] }));
  assert.ok(hotel);
  assert.equal(hotel.id, buildGooglePlacesHotelId("abc"));
  assert.equal(hotel.provider, "Google Maps");
  assert.equal(hotel.name, "Hotel abc");
  assert.equal(hotel.location, "abc Main Street");
  assert.equal(hotel.rating, 4.6);
  assert.equal(hotel.reviewScore, 4.6);
  assert.equal(hotel.reviewCount, 123);
  assert.equal(hotel.inventoryKind, "discovery");
  assert.equal(hotel.sourceUrl, "https://maps.google.com/?cid=abc");
  assert.deepEqual(hotel.sourceAttributions, [{ provider: "Source", providerUri: "https://source.example/a" }]);
  assert.equal("pricePerNight" in hotel, false);
  assert.equal("totalPrice" in hotel, false);
  assert.equal("currency" in hotel, false);
  assert.equal("bookingUrl" in hotel, false);
  assert.equal("partnerRedirectUrl" in hotel, false);
});

test("normalizes rating, review count, fallback address, and missing rating", () => {
  const hotel = normalizeGooglePlacesHotel(place("fallback", { formattedAddress: "", rating: 6, userRatingCount: 1.2 }));
  assert.ok(hotel);
  assert.equal(hotel.location, "fallback Short");
  assert.equal(hotel.rating, 0);
  assert.equal(hotel.reviewScore, undefined);
  assert.equal(hotel.reviewCount, undefined);
});

test("rejects non-lodging, closed, and malformed places", () => {
  assert.equal(normalizeGooglePlacesHotel(place("food", { types: ["restaurant"] })), null);
  assert.equal(normalizeGooglePlacesHotel(place("closed", { businessStatus: "CLOSED_PERMANENTLY" })), null);
  assert.equal(normalizeGooglePlacesHotel(place("future", { businessStatus: "FUTURE_OPENING" })), null);
  assert.equal(normalizeGooglePlacesHotel(place("bad", { businessStatus: "BROKEN" })), null);
  assert.equal(normalizeGooglePlacesHotel(place("", {})), null);
  assert.equal(normalizeGooglePlacesHotel(place("blank", { displayName: { text: " " } })), null);
  assert.equal(normalizeGooglePlacesHotel(place("addr", { formattedAddress: " ", shortFormattedAddress: " " })), null);
});

test("Text Search sends safe exact requests, paginates three pages, and deduplicates", async () => {
  process.env.GOOGLE_PLACES_API_KEY = "test-key";
  const requests: { url: string; init: RequestInit; body: Record<string, unknown> }[] = [];
  globalThis.fetch = (async (url, init = {}) => {
    requests.push({ url: String(url), init, body: JSON.parse(String(init.body)) });
    const index = requests.length;
    const places = Array.from({ length: 20 }, (_, i) => place(index === 2 && i === 0 ? "p0" : `p${(index - 1) * 20 + i}`));
    return Response.json({ places, ...(index < 3 ? { nextPageToken: `token-${index}` } : {}) });
  }) as typeof fetch;

  const result = await searchGooglePlacesHotels(searchParams());
  assert.equal(result.status, "success");
  assert.equal(result.results.length, 59);
  assert.equal(requests.length, 3);
  for (const request of requests) {
    assert.equal(request.url, "https://places.googleapis.com/v1/places:searchText");
    assert.equal(request.url.includes("test-key"), false);
    assert.equal(request.init.method, "POST");
    assert.equal((request.init.headers as Record<string, string>)["X-Goog-Api-Key"], "test-key");
    assert.equal((request.init.headers as Record<string, string>)["X-Goog-FieldMask"], GOOGLE_PLACES_TEXT_SEARCH_FIELD_MASK);
    assert.equal(request.body.textQuery, "hotels in Paris");
    assert.equal(request.body.pageSize, 20);
    assert.equal(request.body.rankPreference, "RELEVANCE");
  }
  assert.equal(requests[0].body.pageToken, undefined);
  assert.equal(requests[1].body.pageToken, "token-1");
  assert.equal(requests[2].body.pageToken, "token-2");
  assert.equal(result.results[0].id, buildGooglePlacesHotelId("p0"));
});

test("Text Search stops when no next token and caps at 60 unique results", async () => {
  process.env.GOOGLE_PLACES_API_KEY = "test-key";
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return Response.json({ places: Array.from({ length: 20 }, (_, i) => place(`u${(calls - 1) * 20 + i}`)), ...(calls === 1 ? {} : { nextPageToken: "ignored" }) });
  }) as typeof fetch;
  const onePage = await searchGooglePlacesHotels(searchParams());
  assert.equal(calls, 1);
  assert.equal(onePage.results.length, 20);
});

test("Place Details uses GET, details mask, and does not request photos or reviews", async () => {
  process.env.GOOGLE_PLACES_API_KEY = "test-key";
  let requestUrl = "";
  let requestInit: RequestInit = {};
  globalThis.fetch = (async (url, init = {}) => {
    requestUrl = String(url);
    requestInit = init;
    return Response.json(place("details-id"));
  }) as typeof fetch;
  const hotel = await getGooglePlacesHotelDetails(buildGooglePlacesHotelId("details-id"));
  assert.ok(hotel);
  assert.equal(requestUrl, "https://places.googleapis.com/v1/places/details-id");
  assert.equal(requestInit.method, "GET");
  const mask = (requestInit.headers as Record<string, string>)["X-Goog-FieldMask"];
  assert.equal(mask, GOOGLE_PLACES_DETAILS_FIELD_MASK);
  assert.equal(mask.includes("photos"), false);
  assert.equal(mask.includes("reviews"), false);
});
