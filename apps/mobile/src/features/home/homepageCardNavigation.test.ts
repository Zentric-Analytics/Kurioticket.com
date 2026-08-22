import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { buildSearchPlan } from "../flow/travelSearchModel";
import { discoverAdventureNavigation, getDefaultHomepageRouteCardDepartureDate, homepageAdventureRouteParams } from "./homepageCardNavigation";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const regional = source("src/features/home/RegionalDestinationRoutes.tsx");
const helper = source("src/features/home/homepageCardNavigation.ts");
const websiteHomepage = source("../../src/app/page.tsx");
const websiteRouteHelper = source("../../src/lib/home/homepageRouteCardLinks.ts");

test("Regional destination route cards open the website flight-results route search contract", () => {
  const params = homepageAdventureRouteParams({ originCode: "LOS", destinationCode: "LHR" }, new Date("2026-06-09T00:00:00.000Z"));
  assert.deepEqual(params, { tripType: "one-way", origin: "LOS", destination: "LHR", departureDate: "2026-07-24", travelers: "1", adults: "1", children: "0", infants: "0", cabinClass: "economy", currency: "USD", market: "NG" });
  assert.ok(buildSearchPlan("flight", params, new Date("2026-06-09T00:00:00.000Z")).plan);
  assert.match(websiteHomepage, /function buildDiscoveryCardHref[\s\S]*return buildRouteCardHref\(price, options\)/);
  assert.match(websiteRouteHelper, /pathname: "\/flights\/results"/);
  assert.deepEqual(discoverAdventureNavigation({ originCode: "LOS", destinationCode: "LHR" }), { pathname: "/flight-results", params: homepageAdventureRouteParams({ originCode: "LOS", destinationCode: "LHR" }) });
  assert.equal(getDefaultHomepageRouteCardDepartureDate(new Date("2026-06-09T00:00:00.000Z")), "2026-07-24");
  assert.doesNotMatch(helper, /returnDate|cabin:\s|from:|to:/);
  assert.doesNotMatch(regional, /pathname:\s*"\/(?:hotels|hotel-results)"/);
});

test("Regional destination navigation uses the website fallback instead of entering results with an invalid route", () => {
  assert.equal(discoverAdventureNavigation({ originCode: "LOS", destinationCode: "LOS" }), "/flights");
  assert.equal(discoverAdventureNavigation({ originCode: "Lagos", destinationCode: "LHR" }), "/flights");
  assert.deepEqual(
    discoverAdventureNavigation({ originCode: " los ", destinationCode: " lhr " }),
    {
      pathname: "/flight-results",
      params: homepageAdventureRouteParams({ originCode: "LOS", destinationCode: "LHR" }),
    },
  );
  assert.match(websiteHomepage, /buildHomepageRouteCardFlightHref[\s\S]*\?\? "\/flights"/);
});

test("homepage card navigation preserves favorites, auth-neutral taps, and loop-safe back stacks", () => {
  assert.match(regional, /router\.push\(discoverAdventureNavigation\(route\)\)/);
  assert.doesNotMatch(regional, /router\.replace|router\.back|isAuthenticated\s*\?/);
});

test("Android and iOS share the same card, results, loading, and back-stack implementation", () => {
  const flightRoute = source("app/flight-results.tsx");
  const hotelRoute = source("app/hotel-results.tsx");
  const results = source("src/features/flow/TravelResultsScreen.tsx");

  assert.doesNotMatch(regional + helper, /Platform\.OS/);
  assert.match(flightRoute, /TravelResultsScreen product="flight"/);
  assert.match(hotelRoute, /TravelResultsScreen product="hotel"/);
  assert.match(results, /setStatus\("loading"\)/);
  assert.match(results, /travelApi\.searchFlights\(payload/);
  assert.match(results, /travelApi\.searchHotels\(payload/);
  assert.match(results, /accessibilityLabel="Go back"[\s\S]*router\.back\(\)/);
});
