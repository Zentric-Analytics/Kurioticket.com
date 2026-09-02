import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { hotelSearchSchema } from "../validation";

const resultsPage = readFileSync(new URL("../../app/hotels/results/page.tsx", import.meta.url), "utf8");
const resultsClient = readFileSync(new URL("../../components/results/HotelResultsClient.tsx", import.meta.url), "utf8");
const webHotelForm = readFileSync(new URL("../../components/search/HotelSearchBar.tsx", import.meta.url), "utf8");
const nativeHotelForm = readFileSync(new URL("../../../apps/mobile/src/features/flow/HotelSearchPanel.tsx", import.meta.url), "utf8");

test("server and native Hotel readiness require the same material search context", () => {
  assert.equal(hotelSearchSchema.safeParse({ destination: "London" }).success, false);
  assert.equal(hotelSearchSchema.safeParse({ destination: "London", checkIn: "2030-10-12", checkOut: "2030-10-16", guests: 2, rooms: 1 }).success, true);
  const nativeModel = readFileSync(new URL("../../../apps/mobile/src/features/flow/travelSearchModel.ts", import.meta.url), "utf8");
  assert.match(nativeModel, /!checkIn \|\| !checkOut \|\| !guestsValue \|\| !roomsValue/);
});

test("incomplete web Hotel results redirect before the API-owning client mounts", () => {
  assert.match(resultsPage, /hotelSearchSchema\.safeParse\(input\)/);
  assert.match(resultsPage, /redirect\(Object\.keys\(recoverable\)\.length \? `\/hotels\?/);
  assert.ok(resultsPage.indexOf("hotelSearchSchema.safeParse(input)") < resultsPage.indexOf("<HotelResultsClient />"));
  assert.match(resultsClient, /fetch\("\/api\/hotels\/search"/);
});

test("incomplete native Hotel results replace history before ApprovedResultsScreen mounts", () => {
  const nativeBoundary = readFileSync(new URL("../../../apps/mobile/src/features/flow/TravelResultsScreen.tsx", import.meta.url), "utf8");
  assert.match(nativeBoundary, /router\.replace\(\{ pathname: "\/hotels"/);
  assert.ok(nativeBoundary.indexOf('if (product === "hotel" && !hotelPlan?.plan) return null') < nativeBoundary.indexOf("<ApprovedResultsScreen product={product}"));
});

test("discovery intent hydrates each Hotel form without issuing a search", () => {
  assert.match(webHotelForm, /useState\(initialDestination \|\| searchParams\.get\("destination"\) \|\| ""\)/);
  assert.doesNotMatch(webHotelForm, /fetch\("\/api\/hotels\/search"/);
  assert.match(nativeHotelForm, /initializeHotelForm\(params\)/);
  assert.match(nativeHotelForm, /router\[submitNavigation\]\(\{ pathname: "\/hotel-results"/);
  assert.doesNotMatch(nativeHotelForm, /travelApi\.searchHotels/);
});
