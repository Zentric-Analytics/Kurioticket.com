import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { buildSearchPlan } from "../flow/travelSearchModel";
import { discoverAdventureNavigation, homepageAdventureRouteParams, homepageHotelDestinationParams, popularDestinationStayNavigation } from "./homepageCardNavigation";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const popular = source("src/features/home/PopularDestinationStays.tsx");
const adventure = source("src/features/home/DiscoverNextAdventure.tsx");
const helper = source("src/features/home/homepageCardNavigation.ts");

test("Popular destination stay cards use the existing hotel search contract or safe form-prefill fallback", () => {
  const params = homepageHotelDestinationParams({ city: "Dubai" });
  assert.deepEqual(params, { destination: "Dubai" });
  assert.equal(buildSearchPlan("hotel", params).plan, undefined);
  assert.deepEqual(popularDestinationStayNavigation({ city: "Dubai" }), { pathname: "/hotels", params });
  assert.doesNotMatch(helper, /checkIn|checkOut|guests|rooms/);
  assert.doesNotMatch(popular, /pathname:\s*"\/(?:flights|flight-results)"/);
});

test("Discover adventure cards use the existing flight search contract or safe form-prefill fallback", () => {
  const params = homepageAdventureRouteParams({ originCode: "LOS", destinationCode: "LHR" });
  assert.deepEqual(params, { from: "LOS", to: "LHR" });
  assert.equal(buildSearchPlan("flight", params).plan, undefined);
  assert.deepEqual(discoverAdventureNavigation({ originCode: "LOS", destinationCode: "LHR" }), { pathname: "/flights", params });
  assert.doesNotMatch(helper, /departureDate|returnDate|travelers|adults|children|infants|cabin/);
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
