import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mobileApi = readFileSync("src/api/travelApi.ts", "utf8");
const mobileResults = readFileSync("src/features/flow/TravelResultsScreen.tsx", "utf8");
const desktopFlights = readFileSync("../../src/components/results/FlightResultsClient.tsx", "utf8");
const desktopHotels = readFileSync("../../src/components/results/HotelResultsClient.tsx", "utf8");
const desktopCars = readFileSync("../../src/app/cars/results/page.tsx", "utf8");

test("Android and website use the shared travel search pipeline", () => {
  assert.match(mobileApi, /"\/api\/flights\/search"/);
  assert.match(mobileApi, /"\/api\/hotels\/search"/);
  assert.match(mobileApi, /"\/api\/cars\/search"/);
  assert.match(desktopFlights, /fetch\("\/api\/flights\/search"/);
  assert.match(desktopHotels, /fetch\("\/api\/hotels\/search"/);
  assert.match(desktopCars, /searchCars\(values\)/);
});

test("Android renders server-owned policy without restoring mobile inventory policy", () => {
  assert.match(mobileApi, /TravelSearchResponse<PublicFlightResult>/);
  assert.match(mobileApi, /TravelSearchResponse<PublicHotelResult>/);
  assert.match(mobileApi, /TravelSearchResponse<NormalizedCarResult>/);
  assert.match(mobileResults, /result\.searchPolicy\.action/);
  assert.match(mobileResults, /response\.status === "unavailable"/);
  assert.doesNotMatch(mobileResults, /result\.isDemo/);
  assert.doesNotMatch(mobileResults, /provider response did not contain safe, bookable inventory/i);
});

test("deterministic request safeguards remain active", () => {
  assert.match(mobileResults, /executionKey/);
  assert.match(mobileResults, /AbortController/);
  assert.match(mobileResults, /sequence\.current/);
  assert.match(mobileResults, /setRetry/);
  assert.match(mobileResults, /Edit search/);
});
