import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildHomepageHotelPromoRoute,
  HOMEPAGE_FLIGHT_PROMO_ROUTE,
  HOMEPAGE_HOTEL_PROMO_DEFAULTS,
} from "./homepagePromoNavigation";

test("hotel promo creates visible destination intent without hidden stay defaults", () => {
  assert.deepEqual(buildHomepageHotelPromoRoute(), {
    pathname: "/hotels",
    params: {
      destination: "Tokyo",
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

test("both platforms share one promo implementation and existing results loading UI", () => {
  const promo = readFileSync("src/features/home/HomepageDealPromos.tsx", "utf8");
  const results = readFileSync("src/features/flow/TravelResultsScreen.tsx", "utf8");
  assert.doesNotMatch(promo, /Platform\.OS|android|ios/i);
  assert.match(results, /status === "loading"/);
  assert.match(results, /<ActivityIndicator/);
  assert.match(results, /onPress=\{\(\) => router\.back\(\)\}/);
});
