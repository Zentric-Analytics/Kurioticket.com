import assert from "node:assert/strict";
import test from "node:test";

import {
  ALL_HOTEL_STAR_RATINGS,
  countHotelsByStarRating,
  getHotelStarRatingCategory,
  hotelMatchesStarRating,
} from "./hotelStarRatingFilter";

test("invalid ratings return null", () => {
  assert.equal(getHotelStarRatingCategory(null), null);
  assert.equal(getHotelStarRatingCategory(undefined), null);
  assert.equal(getHotelStarRatingCategory("4.7"), null);
  assert.equal(getHotelStarRatingCategory(Number.NaN), null);
  assert.equal(getHotelStarRatingCategory(Infinity), null);
});

test("zero and negative ratings return null", () => {
  assert.equal(getHotelStarRatingCategory(0), null);
  assert.equal(getHotelStarRatingCategory(-1), null);
});

test("decimal ratings map to exact floored categories", () => {
  assert.equal(getHotelStarRatingCategory(1.9), 1);
  assert.equal(getHotelStarRatingCategory(2.8), 2);
  assert.equal(getHotelStarRatingCategory(3.8), 3);
  assert.equal(getHotelStarRatingCategory(4.0), 4);
  assert.equal(getHotelStarRatingCategory(4.7), 4);
  assert.equal(getHotelStarRatingCategory(4.99), 4);
  assert.equal(getHotelStarRatingCategory(5.0), 5);
});

test("values above 5 clamp to 5", () => {
  assert.equal(getHotelStarRatingCategory(5.1), 5);
  assert.equal(getHotelStarRatingCategory(12), 5);
});

test("star rating matching uses all or exact categories", () => {
  assert.equal(hotelMatchesStarRating(null, ALL_HOTEL_STAR_RATINGS), true);
  assert.equal(hotelMatchesStarRating(4.7, ALL_HOTEL_STAR_RATINGS), true);
  assert.equal(hotelMatchesStarRating(4.7, 4), true);
  assert.equal(hotelMatchesStarRating(3.8, 4), false);
  assert.equal(hotelMatchesStarRating(5.0, 4), false);
});

test("counts group decimal ratings and keep invalid ratings under All only", () => {
  const hotels = [
    { rating: 1.9 },
    { rating: 2.8 },
    { rating: 3.8 },
    { rating: 4.0 },
    { rating: 4.7 },
    { rating: 4.99 },
    { rating: 5.0 },
    { rating: 7 },
    { rating: null },
    { rating: 0 },
  ];
  const original = hotels.map((hotel) => ({ ...hotel }));

  assert.deepEqual(countHotelsByStarRating(hotels), {
    0: 10,
    1: 1,
    2: 1,
    3: 1,
    4: 3,
    5: 2,
  });
  assert.deepEqual(hotels, original);
});
