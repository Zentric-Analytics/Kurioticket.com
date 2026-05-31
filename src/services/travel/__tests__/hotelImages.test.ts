import test from "node:test";
import assert from "node:assert/strict";

import { normalizeHotelImageUrl, selectPremiumHotelFallbackImage } from "../hotelImages";

test("hotel image helper accepts valid HTTPS provider URLs", () => {
  const url = "https://images.example.com/hotel.jpg";
  assert.equal(normalizeHotelImageUrl(url, { destination: "Paris" }), url);
});

test("hotel image helper rejects empty, malformed, and non-HTTPS URLs", () => {
  const fallback = selectPremiumHotelFallbackImage({ destination: "Paris" });

  assert.equal(normalizeHotelImageUrl("", { destination: "Paris" }), fallback);
  assert.equal(normalizeHotelImageUrl("not a url", { destination: "Paris" }), fallback);
  assert.equal(normalizeHotelImageUrl("http://images.example.com/hotel.jpg", { destination: "Paris" }), fallback);
});

test("hotel image fallback selection is deterministic", () => {
  const context = { destination: "Seattle", hotelName: "Waterfront House", providerId: "123" };

  assert.equal(selectPremiumHotelFallbackImage(context), selectPremiumHotelFallbackImage(context));
});

test("missing provider images receive destination-aware premium fallback URLs", () => {
  const imageUrl = normalizeHotelImageUrl(undefined, { destination: "Miami", hotelName: "Beach House" });

  assert.ok(imageUrl.startsWith("https://images.unsplash.com/"));
  assert.equal(imageUrl, selectPremiumHotelFallbackImage({ destination: "Miami", hotelName: "Beach House" }));
});
