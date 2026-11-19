import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { buildSearchPlan } from "../flow/travelSearchModel";
import { discoverAdventureNavigation, getDefaultHomepageRouteCardDepartureDate, homepageAdventureRouteParams } from "./homepageCardNavigation";
import { resolveMarketplaceContext } from "../../../../../src/shared/marketplace/marketplaceContext";

const marketplace = resolveMarketplaceContext({ locale: "en-NG", selectedMarket: "NG", explicitCurrency: "NGN" });

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const regional = source("src/features/home/RegionalDestinationRoutes.tsx");
const helper = source("src/features/home/homepageCardNavigation.ts");
const websiteHomepage = source("../../src/app/page.tsx");
const websiteRouteHelper = source("../../src/lib/home/homepageRouteCardLinks.ts");

test("Regional destination route cards open the website flight-results route search contract", () => {
  const params = homepageAdventureRouteParams({ originCode: "LOS", destinationCode: "LHR" }, marketplace, new Date("2026-06-09T00:00:00.000Z"));
  assert.deepEqual(params, { tripType: "one-way", origin: "LOS", destination: "LHR", departureDate: "2026-07-24", travelers: "1", adults: "1", children: "0", infants: "0", cabinClass: "economy", currency: "NGN", market: "NG" });
  assert.ok(buildSearchPlan("flight", params, new Date("2026-06-09T00:00:00.000Z")).plan);
  assert.match(websiteHomepage, /function buildDiscoveryCardHref[\s\S]*return buildRouteCardHref\(price, options\)/);
  assert.match(websiteRouteHelper, /pathname: "\/flights\/results"/);
  assert.deepEqual(discoverAdventureNavigation({ originCode: "LOS", destinationCode: "LHR" }, marketplace), { pathname: "/flight-results", params: homepageAdventureRouteParams({ originCode: "LOS", destinationCode: "LHR" }, marketplace) });
  assert.equal(getDefaultHomepageRouteCardDepartureDate(new Date("2026-06-09T00:00:00.000Z")), "2026-07-24");
  assert.doesNotMatch(helper, /returnDate|cabin:\s|from:|to:/);
  assert.doesNotMatch(regional, /pathname:\s*"\/(?:hotels|hotel-results)"/);
});

test("Home flight routes preserve the active marketplace and explicit currency", () => {
  const euMarketplace = resolveMarketplaceContext({ locale: "en-GB", selectedMarket: "GB", explicitCurrency: "EUR" });
  const params = homepageAdventureRouteParams({ originCode: "LHR", destinationCode: "CDG" }, euMarketplace, new Date("2026-06-09T00:00:00.000Z"));
  assert.equal(params.market, "GB");
  assert.equal(params.currency, "EUR");
  assert.doesNotMatch(helper, /DEFAULT_ROUTE_CARD_(?:MARKET|CURRENCY)/);
});

test("Regional destination navigation uses the website fallback instead of entering results with an invalid route", () => {
  assert.equal(discoverAdventureNavigation({ originCode: "LOS", destinationCode: "LOS" }, marketplace), "/flights");
  assert.equal(discoverAdventureNavigation({ originCode: "Lagos", destinationCode: "LHR" }, marketplace), "/flights");
  assert.deepEqual(
    discoverAdventureNavigation({ originCode: " los ", destinationCode: " lhr " }, marketplace),
    {
      pathname: "/flight-results",
      params: homepageAdventureRouteParams({ originCode: "LOS", destinationCode: "LHR" }, marketplace),
    },
  );
  assert.match(websiteHomepage, /buildHomepageRouteCardFlightHref[\s\S]*\?\? "\/flights"/);
});

test("homepage card navigation preserves favorites, auth-neutral taps, and loop-safe back stacks", () => {
  assert.match(regional, /router\.push\(discoverAdventureNavigation\(route, marketplace\)\)/);
  assert.doesNotMatch(regional, /router\.replace|router\.back|isAuthenticated\s*\?/);
});

test("Android and iOS share the same card, results, loading, and back-stack implementation", () => {
  const flightRoute = source("app/flight-results.tsx");
  const hotelRoute = source("app/hotel-results.tsx");
  const results = source("src/features/search/ApprovedResultsScreen.tsx");

  assert.doesNotMatch(regional + helper, /Platform\.OS/);
  assert.match(flightRoute, /TravelResultsScreen product="flight"/);
  assert.match(hotelRoute, /TravelResultsScreen product="hotel"/);
  assert.match(results, /setStatus\("loading"\)/);
  assert.match(results, /travelApi\.searchFlights\(plan\.plan\.payload/);
  assert.match(results, /travelApi\.searchHotels\(plan\.plan\.payload/);
  assert.match(results, /accessibilityLabel="Go back"[\s\S]*router\.back\(\)/);
});
