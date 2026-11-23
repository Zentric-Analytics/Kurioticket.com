import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const text = (path: string) => readFileSync(path, "utf8");
const flight = text("src/components/results/FlightResultsClient.tsx");
const hotel = text("src/components/results/HotelResultsClient.tsx");
const car = text("src/components/results/CarInventoryLoader.tsx");
const flightDetail = text("src/components/results/FlightDetailsClient.tsx");
const hotelDetail = text("src/components/results/HotelDetailsClient.tsx");
const carDetail = text("src/components/results/CarDetailsClient.tsx");
const carPage = text("src/app/cars/details/[id]/page.tsx");
const carResults = text("src/components/results/CarsResultsClient.tsx");

test("Back from all three detail pages is recognized without a new search action", () => {
  assert.match(flightDetail, /useResultsReturnIntent\("flight", resultsHref\)/);
  assert.match(hotelDetail, /useResultsReturnIntent\("hotel", mode === "guided" \? "" : resultsHref\)/);
  assert.match(carDetail, /useResultsReturnIntent\("car", resultsHref\)/);
});

test("flight returning without a valid snapshot never enters the provider request", () => {
  const guard = flight.indexOf("if (!shouldBypassSnapshot && returnIntentRef.current?.returning");
  const fetch = flight.indexOf('fetch("/api/flights/search"', guard);
  assert.ok(guard > 0 && guard < fetch);
  assert.match(flight.slice(guard, fetch), /setError\("Your previous flight results have expired/);
  assert.match(flight.slice(guard, fetch), /setJourneyResponse\(null\)/);
  assert.match(flight.slice(guard, fetch), /return;/);
  assert.match(flight, /if \(!refreshingStaleSnapshot\) \{\s*mainInventoryReadyRef\.current = true;\s*return;/);
  assert.match(flight, /onClick=\{retryMainInventorySearch\}/);
});

test("hotel return uses the exact previous snapshot and original request ID", () => {
  const guard = hotel.indexOf("if (returning && !snapshot)");
  const fetch = hotel.indexOf('fetch("/api/hotels/search"', guard);
  assert.ok(guard > 0 && guard < fetch);
  assert.match(hotel.slice(guard, fetch), /setJourneyResponse\(null\)/);
  assert.match(hotel.slice(guard, fetch), /setError\("Your previous hotel results have expired/);
  assert.match(hotel.slice(guard, fetch), /return \(\) =>/);
  assert.match(hotel, /const snapshot = \(restored \|\| returning\) && retryKey === 0/);
  assert.match(hotel, /requestId: journeyRequestId\(data\.requestId\)/);
  assert.match(hotel, /saveMobileHotelResultsState\(bodySearchKey/);
  assert.match(hotel, /setPropertyNameQuery\(restored\.propertyNameQuery\)/);
});

test("car return reuses existing results and request ID rather than sending another POST", () => {
  const guard = car.indexOf("if (returnIntentRef.current.returning && attempt === 0)");
  const fetch = car.indexOf('fetch("/api/cars/search"', guard);
  assert.ok(guard > 0 && guard < fetch);
  assert.match(car.slice(guard, fetch), /readCarResultsReturn\(key\)/);
  assert.match(car.slice(guard, fetch), /setRequestId\(snapshot\.requestId\)/);
  assert.match(car.slice(guard, fetch), /setResults\(snapshot\.results\)/);
  assert.match(car.slice(guard, fetch), /return \(\) => window\.clearTimeout\(timer\)/);
  assert.match(car, /rememberCarResultsReturn\(key, data\.results, id\)/);
  assert.match(car, /data-cars-return-expired/);
  assert.match(car, /setAttempt\(value => value \+ 1\)/);
});

test("car filter/sort navigation remains on the same results URL without starting a search", () => {
  assert.match(carResults, /url\.searchParams\.set\("filters", selection\)/);
  assert.match(carResults, /url\.searchParams\.set\("sort", sort\)/);
  assert.match(carPage, /returnParams\.set\("filters", returnFilters\)/);
  assert.match(carPage, /returnParams\.set\("sort", returnSort\)/);
  assert.match(carResults, /rememberResultsScroll\("car", window\.scrollY\)/);
});

test("optional navigation restore does not modify the server SearchHistory or consent logic", () => {
  const flightRoute = text("src/app/api/flights/search/handler.ts");
  const carRoute = text("src/app/api/cars/search/route.ts");
  const hotelRoute = text("src/app/api/hotels/search/route.ts");
  assert.match(flightRoute, /logSearchHistory\(\{/);
  assert.match(carRoute, /logSearchHistory\(\{/);
  assert.match(hotelRoute, /logSearchHistory\(\{/);
});
