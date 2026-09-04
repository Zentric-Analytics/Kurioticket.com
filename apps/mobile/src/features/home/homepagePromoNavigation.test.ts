import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildHomepageHotelPromoRoute,
  HOMEPAGE_FLIGHT_PROMO_ROUTE,
  HOMEPAGE_HOTEL_PROMO_DEFAULTS,
} from "./homepagePromoNavigation";

test("hotel promo creates a complete direct exploratory search", () => {
  assert.deepEqual(buildHomepageHotelPromoRoute(new Date("2030-01-01T00:00:00Z")), {
    pathname: "/hotel-results",
    params: {
      destination: "Tokyo",
      checkIn: "2030-01-29",
      checkOut: "2030-02-05",
      guests: "2",
      rooms: "1",
      sort: "cheapest",
      intentSource: "home-promo",
    },
  });
  assert.deepEqual(HOMEPAGE_HOTEL_PROMO_DEFAULTS, { destination: "Tokyo" });
});

test("flight promo follows the website /deals contract without inventing search values", () => {
  assert.equal(HOMEPAGE_FLIGHT_PROMO_ROUTE, "/deals");
});

test("promo-only defaults cannot leak into either normal product form", () => {
  const hotels = readFileSync("src/features/flow/hotelSearchModel.ts", "utf8");
  const flights = readFileSync("src/features/flow/flightSearchModel.ts", "utf8");
  assert.doesNotMatch(hotels, /HOMEPAGE_HOTEL_PROMO_DEFAULTS|Tokyo/);
  assert.doesNotMatch(flights, /HOMEPAGE_(?:HOTEL|FLIGHT)_PROMO/);
});

test("both platforms share one promo implementation and canonical results loading UI", () => {
  const promo = readFileSync("src/features/home/HomepageDealPromos.tsx", "utf8");
  const results = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
  const route = readFileSync("src/features/flow/TravelResultsScreen.tsx", "utf8");
  assert.doesNotMatch(promo, /Platform\.OS|android|ios/i);
  assert.match(results, /status === "loading"/);
  assert.match(results, /<NativeBrandedSearchLoading/);
  assert.doesNotMatch(route, /ActivityIndicator|LegacyTravelResultsScreen/);
});
