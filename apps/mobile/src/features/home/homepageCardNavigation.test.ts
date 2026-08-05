import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { buildSearchPlan } from "../flow/travelSearchModel";
import { discoverAdventureNavigation, getDefaultHomepageRouteCardDepartureDate, homepageAdventureRouteParams, homepageHotelDestinationParams, popularDestinationStayNavigation } from "./homepageCardNavigation";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const popular = source("src/features/home/PopularDestinationStays.tsx");
const adventure = source("src/features/home/DiscoverNextAdventure.tsx");
const helper = source("src/features/home/homepageCardNavigation.ts");

test("Popular destination stay cards open the website hotel-results destination-only contract", () => {
  const params = homepageHotelDestinationParams({ city: "Dubai" });
  assert.deepEqual(params, { destination: "Dubai" });
  assert.equal(buildSearchPlan("hotel", params).plan, undefined);
  assert.deepEqual(popularDestinationStayNavigation({ city: "Dubai" }), { pathname: "/hotel-results", params });
  assert.doesNotMatch(helper, /checkIn|checkOut|guests|rooms/);
  assert.doesNotMatch(popular, /pathname:\s*"\/(?:flights|flight-results)"/);
});

test("Discover adventure cards open the website flight-results route search contract", () => {
  const params = homepageAdventureRouteParams({ originCode: "LOS", destinationCode: "LHR" }, new Date("2026-06-09T00:00:00.000Z"));
  assert.deepEqual(params, { tripType: "one-way", origin: "LOS", destination: "LHR", departureDate: "2026-07-24", travelers: "1", adults: "1", children: "0", infants: "0", cabinClass: "economy", currency: "USD", market: "NG" });
  assert.ok(buildSearchPlan("flight", params, new Date("2026-06-09T00:00:00.000Z")).plan);
  assert.deepEqual(discoverAdventureNavigation({ originCode: "LOS", destinationCode: "LHR" }), { pathname: "/flight-results", params: homepageAdventureRouteParams({ originCode: "LOS", destinationCode: "LHR" }) });
  assert.equal(getDefaultHomepageRouteCardDepartureDate(new Date("2026-06-09T00:00:00.000Z")), "2026-07-24");
  assert.doesNotMatch(helper, /returnDate|cabin:\s|from:|to:/);
  assert.doesNotMatch(adventure, /pathname:\s*"\/(?:hotels|hotel-results)"/);
});

test("homepage card navigation preserves favorites, auth-neutral taps, and loop-safe back stacks", () => {
  assert.match(popular, /router\.push\(popularDestinationStayNavigation\(destination\)\)/);
  assert.match(adventure, /router\.push\(discoverAdventureNavigation\(card\)\)/);
  assert.match(popular, /event\.stopPropagation\(\);\s*toggle\(destination\.id\);/);
  assert.match(adventure, /event\.stopPropagation\(\);\s*toggle\(card\.id\);/);
  assert.doesNotMatch(popular + adventure, /router\.replace|router\.back|isAuthenticated\s*\?/);
  assert.match(popular + adventure, /useSavedDestinations\(\)/);
});
