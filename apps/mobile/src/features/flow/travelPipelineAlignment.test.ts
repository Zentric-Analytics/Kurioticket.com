import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mobileApi = readFileSync("src/api/travelApi.ts", "utf8");
const mobileResults = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8") + readFileSync("src/features/search/ApprovedCarResultsScreen.tsx", "utf8") + readFileSync("src/features/search/CarResultCard.tsx", "utf8");
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
  assert.match(mobileResults, /searchPolicy|onViewDeal/);
  assert.match(mobileResults, /provider_unavailable|temporarily unavailable/);
  assert.match(mobileResults, /canonicalResultsWereSilentlyLost/);
  assert.doesNotMatch(mobileResults, /result\.isDemo/);
  assert.doesNotMatch(mobileResults, /provider response did not contain safe, bookable inventory/i);
});

test("deterministic request safeguards remain active", () => {
  assert.match(mobileResults, /plan\.plan\?\.key/);
  assert.match(mobileResults, /AbortController/);
  assert.match(mobileResults, /searchSequence\.current/);
  assert.match(mobileResults, /setRetry/);
  assert.match(mobileResults, /setEditSearchOpen|const edit=/);
});
