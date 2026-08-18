import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
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

test("Explore hotel handoff goes directly to results with the selected destination", () => {
  assert.deepEqual(exploreHotelResultsNavigation("  Paris  "), {
    pathname: "/hotel-results",
    params: { destination: "Paris" },
  });
  assert.equal(exploreHotelResultsNavigation("   "), null);
});

test("destination details resolves the same geo default origin used by Home before opening flight results", () => {
  const source = detailsSource();
  assert.match(source, /fetchHomepageDefaultOrigin\(\)/);
  assert.match(source, /exploreFlightResultsNavigation\(origin\.code, handoff\.primaryAirportCode\)/);
  assert.match(source, /currentDestinationId\.current !== requestedDestinationId/);
  assert.match(source, /flightSearchPending\.current/);
  assert.match(source, /pathname: "\/flights"/);
  assert.match(source, /destinationId: destination\.id, destination: destination\.name, to: handoff\.primaryAirportCode, airportCodes: handoff\.airportCodes\.join/);
  assert.match(source, /exploreHotelResultsNavigation\(destination\.name\)/);
  assert.doesNotMatch(source, /origin:\s*["']LOS["']|currency:\s*["']USD["']|market:\s*["']NG["']/);
});
