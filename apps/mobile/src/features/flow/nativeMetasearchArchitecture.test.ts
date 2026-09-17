import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const api = readFileSync("src/api/travelApi.ts", "utf8");
const results = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const cars = readFileSync("src/features/search/ApprovedCarResultsScreen.tsx", "utf8");
const carCard = readFileSync("src/features/search/CarResultCard.tsx", "utf8");
const carProviderPresentation = readFileSync("src/features/search/nativeCarProviderPresentation.ts", "utf8");

test("native uses only canonical server search APIs for all provider inventory", () => {
  assert.match(api, /searchFlights:[\s\S]*"\/api\/flights\/search"/);
  assert.match(api, /searchHotels:[\s\S]*"\/api\/hotels\/search"/);
  assert.match(api, /searchCars:[\s\S]*"\/api\/cars\/search"/);
  assert.doesNotMatch(api, /api\/sandbox\/kayak|KAYAK_SANDBOX_API_KEY/);
});

test("native keeps provider classification for unified metasearch while Cars omit authored sandbox status copy", () => {
  assert.match(results, /KAYAK sandbox · Simulated · Not bookable/);
  assert.match(results, /filterAndSortFlights\(/);
  assert.match(results, /filterHotels\(results as HotelResult\[\], hotelFilters/);
  assert.match(cars, /filterCarResults\(results,filters\)/);
  assert.match(carCard, /const sandbox = isKayakSandboxCar\(result\)/);
  assert.doesNotMatch(carCard, /KAYAK sandbox · Simulated · Not bookable/);
  assert.match(carProviderPresentation, /result\.searchPolicy\.source === "kayak-sandbox"/);
  assert.match(carProviderPresentation, /result\.inventorySource === "kayak-sandbox"/);
});
