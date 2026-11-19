import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const screen = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const lifecycle = screen.slice(screen.indexOf("const [nearbyFares"), screen.indexOf("const flightDateStrip ="));

test("nearby requests have isolated generation, controller registry, and canonical API ownership", () => {
  assert.match(lifecycle, /nearbyFareGeneration = useRef\(0\)/);
  assert.match(lifecycle, /nearbyFareRequests = useRef\(new Map<string, AbortController>\(\)\)/);
  assert.match(lifecycle, /travelApi\.searchFlights\(buildNearbyFarePayload\(payload, date\)/);
  assert.match(lifecycle, /nearbyFareGeneration\.current === generation/);
  assert.match(lifecycle, /controller\.signal\.aborted/);
  assert.doesNotMatch(lifecycle.slice(lifecycle.indexOf("void runNearbyFareQueue")), /setResults|setStatus|activeSearch|searchSequence/);
});

test("selected inventory seeds immediately and neighbors remain progressive", () => {
  assert.match(lifecycle, /selectedResult = selectNearbyFareResult\(results as FlightResult\[\], normalizeFlightPrice\)/);
  assert.match(lifecycle, /date: flightDate, status: "success"/);
  assert.match(lifecycle, /date: flightDate, status: "unavailable"/);
  assert.match(lifecycle, /\?\? \{ date, status: "loading" as const \}/);
  assert.match(lifecycle, /status: "unavailable"[\s\S]*?status: "error"/);
  assert.match(lifecycle, /selectNearbyFareResult\(response\.results as FlightResult\[\], normalizeFlightPrice\)/);
});

test("search changes and blur abort only nearby-owned requests and refocus resumes unresolved work", () => {
  assert.match(screen, /setNearbyFareResume\(\(value\) => value \+ 1\)/);
  assert.match(screen, /nearbyFareRequests\.current\.forEach\(\(controller\) => controller\.abort\("screen-blur"\)\)/);
  assert.match(lifecycle, /controller\.abort\("search-context-changed"\)/);
  assert.match(lifecycle, /return \(\) => \{[\s\S]*?active = false;[\s\S]*?nearbyFareRequests\.current\.forEach/);
  assert.match(lifecycle, /\[currencyState, flightDate, nearbyFareResume,/);
});

test("app background aborts nearby work and returning active resumes only the nearby lifecycle", () => {
  assert.match(screen, /AppState\.addEventListener\("change"/);
  assert.match(screen, /nextState !== "active"/);
  assert.match(screen, /nearbyFareGeneration\.current \+= 1/);
  assert.match(screen, /controller\.abort\("app-background"\)/);
  assert.match(screen, /nearbyFareRequests\.current\.clear\(\)/);
  assert.match(screen, /previousState !== "active"[\s\S]*?setNearbyFareResume/);
});

test("selection preserves round-trip duration while one-way changes departure only", () => {
  assert.match(lifecycle, /payload\.tripType === "round-trip"[\s\S]*?preserveRoundTripDuration/);
  assert.match(lifecycle, /router\.setParams\(\{ departureDate: nextDepartureDate, \.\.\.\(returnDate \? \{ returnDate \} : \{\}\) \}\)/);
});
