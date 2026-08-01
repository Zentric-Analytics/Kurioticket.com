import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { flightSearchParams, type FlightForm } from "./flightSearchModel";
import { buildSearchPlan } from "./travelSearchModel";

test("real flight form route params build a valid flight plan", () => {
  const form = { tripType: "round-trip", from: { code: "JFK", city: "New York", country: "USA" }, to: { code: "LHR", city: "London", country: "United Kingdom" }, departureDate: "2030-01-01", returnDate: "2030-01-08", adults: 1, children: 0, infants: 0, cabin: "Economy" } as FlightForm;
  assert.ok(buildSearchPlan("flight", flightSearchParams(form), new Date("2029-01-01T00:00:00Z")).plan);
});
test("flight results route uses the intended screen and alert precedes cards", () => {
  const route = readFileSync("app/flight-results.tsx", "utf8");
  const screen = readFileSync("src/features/flow/TravelResultsScreen.tsx", "utf8");
  assert.match(route, /TravelResultsScreen product="flight"/);
  assert.ok(screen.indexOf("Track this search") < screen.indexOf("results.map"));
});
