import assert from "node:assert/strict";
import test from "node:test";

import { ALL_HOTEL_STAR_RATINGS, countHotelsByStarRating, getHotelStarRatingCategory, hotelMatchesStarRating } from "./hotelStarRatingFilter";

test("only exact classifications one through five are categories", () => {
  for (const value of [1, 2, 3, 4, 5] as const) assert.equal(getHotelStarRatingCategory(value), value);
  for (const value of [4.6, 5.1, 12, null, undefined, "4", Number.NaN]) assert.equal(getHotelStarRatingCategory(value), null);
});

test("matching uses all or the exact explicit classification", () => {
  assert.equal(hotelMatchesStarRating(4.6, ALL_HOTEL_STAR_RATINGS), true);
  assert.equal(hotelMatchesStarRating(4.6, 4), false);
  assert.equal(hotelMatchesStarRating(4, 4), true);
  assert.equal(hotelMatchesStarRating(5, 4), false);
});

test("counts retain missing and Google-style scores under All only without mutation", () => {
  const hotels = [{ classificationStars: 1 }, { classificationStars: 4 }, { classificationStars: 4.6 }, { classificationStars: 5 }, {}];
  const original = hotels.map((hotel) => ({ ...hotel }));
  assert.deepEqual(countHotelsByStarRating(hotels), { 0: 5, 1: 1, 2: 0, 3: 0, 4: 1, 5: 1 });
  assert.deepEqual(hotels, original);
});
