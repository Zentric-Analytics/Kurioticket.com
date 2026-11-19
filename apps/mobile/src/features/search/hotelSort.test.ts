import assert from "node:assert/strict";
import test from "node:test";
import type { HotelResult } from "../../api/travelApi";
import { defaultHotelSort, hotelSortLabel, sortHotelsForResults } from "./hotelSort";

const hotel = (id: string, overrides: Partial<HotelResult> = {}): HotelResult => ({
  id, provider: "Provider", name: id, classificationStars: 4, reviewScore: 8, reviewScale: 10,
  reviewCount: 1, neighbourhood: "Centre", location: "Paris", amenities: [], roomType: "Room",
  cancellationInfo: "Flexible", valueScore: 5, travelConfidenceScore: 5, arrivalSuitabilityScore: 5,
  recommendationReasons: [], badges: [], pricePerNight: 50, totalPrice: 200, currency: "USD",
  bookingUrl: "https://example.com", partnerRedirectUrl: "https://example.com", ...overrides,
} as HotelResult);
const ids = (hotels: HotelResult[]) => hotels.map(({ id }) => id);

test("Hotel sorting defaults to Cheapest and uses total stay price", () => {
  assert.equal(defaultHotelSort, "cheapest");
  assert.equal(hotelSortLabel(defaultHotelSort), "Cheapest");
  const input = [hotel("low-night-high-total", { pricePerNight: 20, totalPrice: 300 }), hotel("high-night-low-total", { pricePerNight: 80, totalPrice: 160 })];
  assert.deepEqual(ids(sortHotelsForResults(input)), ["high-night-low-total", "low-night-high-total"]);
});

test("Cheapest normalizes currencies and places unsafe prices last", () => {
  const input = [hotel("eur", { totalPrice: 100, currency: "EUR" }), hotel("usd", { totalPrice: 150 }), hotel("unknown", { currency: "ZZZ" }), hotel("unpriced", { totalPrice: 0 })];
  assert.deepEqual(ids(sortHotelsForResults(input, "cheapest", { USD: 1, EUR: 0.5 })), ["usd", "eur", "unknown", "unpriced"]);
});

test("Cheapest is stable for equal comparable totals and does not mutate input", () => {
  const input = [hotel("first"), hotel("second")];
  assert.deepEqual(ids(sortHotelsForResults(input, "cheapest", { USD: 1 })), ["first", "second"]);
  assert.deepEqual(ids(input), ["first", "second"]);
});

test("Best value ranks valid priced scores, then comparable price, then missing scores", () => {
  const input = [hotel("missing", { valueScore: Number.NaN }), hotel("expensive", { valueScore: 9, totalPrice: 300 }), hotel("cheap", { valueScore: 9, totalPrice: 100 }), hotel("unpriced", { valueScore: 10, totalPrice: 0 })];
  assert.deepEqual(ids(sortHotelsForResults(input, "bestValue", { USD: 1 })), ["cheap", "expensive", "missing", "unpriced"]);
});

test("Best value preserves input order when no usable value scores exist", () => {
  const input = [hotel("first", { valueScore: Number.NaN }), hotel("second", { totalPrice: 0, valueScore: 99 })];
  assert.deepEqual(ids(sortHotelsForResults(input, "bestValue")), ["first", "second"]);
});

test("Top rated uses normalized reviews, classification fallback, price, and never rating", () => {
  const input = [
    hotel("fake-rating", { reviewScore: undefined, reviewScale: undefined, classificationStars: 2, rating: 10, totalPrice: 50 }),
    hotel("five-scale", { reviewScore: 4.5, reviewScale: 5, classificationStars: 1, totalPrice: 300 }),
    hotel("ten-scale", { reviewScore: 9, reviewScale: 10, classificationStars: 1, totalPrice: 100 }),
    hotel("fallback-price-high", { reviewScore: undefined, reviewScale: undefined, classificationStars: 5, totalPrice: 200 }),
    hotel("fallback-price-low", { reviewScore: undefined, reviewScale: undefined, classificationStars: 5, totalPrice: 100 }),
  ];
  assert.deepEqual(ids(sortHotelsForResults(input, "topRated", { USD: 1 })), ["ten-scale", "five-scale", "fallback-price-low", "fallback-price-high", "fake-rating"]);
  assert.deepEqual(ids(input), ["fake-rating", "five-scale", "ten-scale", "fallback-price-high", "fallback-price-low"]);
});
