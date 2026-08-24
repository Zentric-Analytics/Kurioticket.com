import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  exploreFlightDestinationNavigation,
  exploreFlightResultsNavigation,
  exploreHotelResultsNavigation,
} from "./exploreSearchHandoff";

const detailsSource = () => readFileSync("src/features/explore/DestinationDetailsScreen.tsx", "utf8");

test("Explore flight handoff builds a Home-style one-way results search without hard-coded market or currency", () => {
  const route = exploreFlightResultsNavigation("los", "lhr", new Date("2030-01-01T12:00:00.000Z"));
  assert.ok(route && typeof route === "object");
  assert.equal(route.pathname, "/flight-results");
  assert.deepEqual(route.params, {
    tripType: "one-way",
    origin: "LOS",
    destination: "LHR",
    departureDate: "2030-02-15",
    travelers: "1",
    adults: "1",
    children: "0",
    infants: "0",
    cabinClass: "economy",
  });
  assert.equal("currency" in route.params, false);
  assert.equal("market" in route.params, false);
});

test("Explore flight handoff rejects malformed and same-airport routes", () => {
  assert.equal(exploreFlightResultsNavigation("", "LHR"), null);
  assert.equal(exploreFlightResultsNavigation("LOS", "LOS"), null);
  assert.equal(exploreFlightResultsNavigation("LAGOS", "LHR"), null);
});

const abidjan = {
  id: "ci-abidjan",
  name: "Abidjan",
  primaryAirportCode: "ABJ",
  airportCodes: ["ABJ"],
};

test("destination handoff uses the homepage origin to open flight results", async () => {
  const route = await exploreFlightDestinationNavigation(abidjan, async () => ({
    code: "LOS",
    city: "Lagos",
    country: "Nigeria",
    airport: "Murtala Muhammed International Airport",
  }));
  assert.ok(typeof route === "object");
  assert.equal(route.pathname, "/flight-results");
  assert.ok(route.params);
  assert.equal(route.params.origin, "LOS");
  assert.equal(route.params.destination, "ABJ");
});

test("destination handoff prefills Flights when the homepage origin is unavailable or fails", async () => {
  const fallback = {
    pathname: "/flights",
    params: { destinationId: "ci-abidjan", destination: "Abidjan", to: "ABJ", airportCodes: "ABJ" },
  };
  assert.deepEqual(await exploreFlightDestinationNavigation(abidjan, async () => null), fallback);
  assert.deepEqual(await exploreFlightDestinationNavigation(abidjan, async () => { throw new Error("offline"); }), fallback);
});

test("Explore hotel handoff goes directly to results with the selected destination", () => {
  assert.deepEqual(exploreHotelResultsNavigation("  Paris  "), {
    pathname: "/hotel-results",
    params: { destination: "Paris" },
  });
  assert.equal(exploreHotelResultsNavigation("   "), null);
});

test("destination details resolves the same geo default origin used by Home before opening flight results", () => {
  const source = detailsSource();
  assert.match(source, /exploreFlightDestinationNavigation\(\{/);
  assert.match(source, /primaryAirportCode: handoff\.primaryAirportCode/);
  assert.match(source, /currentDestinationId\.current !== requestedDestinationId/);
  assert.match(source, /flightSearchPending\.current/);
  const handoffSource = readFileSync("src/features/explore/exploreSearchHandoff.ts", "utf8");
  assert.match(handoffSource, /fetchHomepageDefaultOrigin/);
  assert.match(handoffSource, /exploreFlightResultsNavigation\(origin\.code, destination\.primaryAirportCode\)/);
  assert.match(source, /exploreHotelResultsNavigation\(destination\.name\)/);
  assert.doesNotMatch(source, /origin:\s*["']LOS["']|currency:\s*["']USD["']|market:\s*["']NG["']/);
});
