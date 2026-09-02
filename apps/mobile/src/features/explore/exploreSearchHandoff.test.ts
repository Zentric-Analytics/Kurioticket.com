import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  exploreFlightDestinationNavigation,
  exploreFlightResultsNavigation,
  exploreHotelSearchNavigation,
} from "./exploreSearchHandoff";
import { destinations } from "./destinationCatalogue";

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

const explorationNow = new Date("2030-01-01T00:00:00Z");
const completeExplorationParams = {
  checkIn: "2030-01-29",
  checkOut: "2030-02-05",
  guests: "2",
  rooms: "1",
  sort: "cheapest",
  intentSource: "explore",
};

test("Explore Hotel handoff preserves canonical Hotel destinations", () => {
  assert.deepEqual(exploreHotelSearchNavigation({ id: "fr-paris", name: "  Paris  " }, "explore", explorationNow), {
    pathname: "/hotel-results",
    params: { destinationId: "fr-paris", destination: "Paris, France", ...completeExplorationParams },
  });
  const london = exploreHotelSearchNavigation({ id: "gb-london", name: "London" }, "explore", explorationNow);
  assert.ok(london && typeof london === "object");
  assert.equal(london.pathname, "/hotel-results");
  assert.equal(london.params?.destinationId, "gb-london");
});

test("Explore Hotel handoff preserves maintained textual-only destinations", () => {
  for (const destination of [
    { id: "ci-abidjan", name: "Abidjan" },
    { id: "gm-banjul", name: "Banjul" },
  ]) {
    assert.deepEqual(exploreHotelSearchNavigation(destination, "explore", explorationNow), {
      pathname: "/hotel-results",
      params: { destination: destination.name, ...completeExplorationParams },
    });
  }
});

test("every valid maintained Explore destination creates complete direct Hotel results", () => {
  for (const destination of destinations) {
    const route = exploreHotelSearchNavigation(destination, "explore", explorationNow);
    assert.ok(route && typeof route === "object", destination.id);
    assert.equal(route.pathname, "/hotel-results", destination.id);
    assert.equal(route.params?.checkIn, "2030-01-29", destination.id);
    assert.equal(route.params?.checkOut, "2030-02-05", destination.id);
    assert.equal(route.params?.guests, "2", destination.id);
    assert.equal(route.params?.rooms, "1", destination.id);
    assert.equal(route.params?.sort, "cheapest", destination.id);
    assert.equal(route.params?.intentSource, "explore", destination.id);
    assert.ok(String(route.params?.destination ?? "").trim(), destination.id);
  }
});

test("Saved destination remains non-synthetic and corrupt destinations fail closed", () => {
  assert.deepEqual(
    exploreHotelSearchNavigation({ id: "gb-london", name: "London" }, "saved-destination"),
    {
      pathname: "/hotels",
      params: {
        destinationId: "gb-london",
        destination: "London",
        intentSource: "saved-destination",
      },
    },
  );
  assert.equal(exploreHotelSearchNavigation({ id: "", name: "Paris" }), null);
  assert.equal(exploreHotelSearchNavigation({ id: "fr-paris", name: "" }), null);
  assert.equal(exploreHotelSearchNavigation({ id: "bad", name: "A\u0000B" }, "explore", explorationNow), null);
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
  assert.match(source, /exploreHotelSearchNavigation\(\{ id: destination\.id, name: destination\.name \}\)/);
  assert.doesNotMatch(source, /origin:\s*["']LOS["']|currency:\s*["']USD["']|market:\s*["']NG["']/);
});
