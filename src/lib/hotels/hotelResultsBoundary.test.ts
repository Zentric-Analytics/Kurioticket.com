import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { earliestCurrentHotelCalendarDate, hotelSearchSchema, isHotelTodayOrFutureDate } from "../validation";
import { resolveHotelResultsRoute } from "./hotelResultsRoute";
import { buildHotelExplorationSearch } from "./hotelExplorationSearch";

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

test("Hotel server dates remain eligible only while current in a global civil timezone", () => {
  const beforeGlobalBoundary = new Date("2026-09-05T06:30:00Z");
  assert.equal(earliestCurrentHotelCalendarDate(beforeGlobalBoundary), "2026-09-04");
  assert.equal(isHotelTodayOrFutureDate("2026-09-04", beforeGlobalBoundary), true);
  assert.equal(isHotelTodayOrFutureDate("2026-09-03", beforeGlobalBoundary), false);
  assert.equal(isHotelTodayOrFutureDate("2026-09-05", beforeGlobalBoundary), true);
  assert.equal(isHotelTodayOrFutureDate("2026-02-30", beforeGlobalBoundary), false);
  assert.equal(isHotelTodayOrFutureDate("not-a-date", beforeGlobalBoundary), false);

  const afterGlobalBoundary = new Date("2026-09-05T12:30:00Z");
  assert.equal(earliestCurrentHotelCalendarDate(afterGlobalBoundary), "2026-09-05");
  assert.equal(isHotelTodayOrFutureDate("2026-09-04", afterGlobalBoundary), false);
});

test("Hotel owns its timezone-safe schema refinement without changing Flight date validation", () => {
  const validation = readFileSync(new URL("../validation.ts", import.meta.url), "utf8");
  assert.match(validation, /checkIn: hotelFutureDate/);
  assert.match(validation, /checkOut: hotelFutureDate/);
  assert.match(validation, /departureDate: futureDate\.optional\(\)/);
});

test("incomplete web Hotel results redirect before the API-owning client mounts", () => {
  assert.match(resultsPage, /resolveHotelResultsRoute/);
  assert.match(resultsPage, /if \(!route\.resultsReady\) redirect\(route\.recoveryHref\)/);
  assert.ok(resultsPage.indexOf("resolveHotelResultsRoute") < resultsPage.indexOf("<HotelResultsClient />"));
  assert.match(resultsClient, /fetch\("\/api\/hotels\/search"/);
});

test("web Hotel results require explicit destination, dates, guests, and rooms", () => {
  const complete = { destination: "London", checkIn: "2030-04-01", checkOut: "2030-04-03", guests: "2", rooms: "1" };
  for (const missing of ["destination", "checkIn", "checkOut", "guests", "rooms"] as const) {
    const input = { ...complete, [missing]: undefined };
    const route = resolveHotelResultsRoute(input);
    assert.equal(route.resultsReady, false, missing);
    if (!route.resultsReady) assert.match(route.recoveryHref, /^\/hotels(?:\?|$)/);
  }
  assert.equal(resolveHotelResultsRoute(complete).resultsReady, true);
});

test("complete curated exploration crosses the same strict results boundary", () => {
  const search = buildHotelExplorationSearch({ destination: "London", destinationId: "gb-london", source: "home-popular-stays", now: new Date("2030-01-01T00:00:00Z") });
  assert.ok(search);
  assert.equal(resolveHotelResultsRoute(search!).resultsReady, true);
});

test("web Hotel results reject malformed and out-of-range explicit occupancy", () => {
  const base = { destination: "London", checkIn: "2030-04-01", checkOut: "2030-04-03", guests: "2", rooms: "1" };
  for (const occupancy of [
    { guests: "abc" }, { rooms: "abc" }, { guests: "0" }, { rooms: "0" },
    { guests: "-1" }, { rooms: "-1" }, { guests: "13" }, { rooms: "7" },
  ]) {
    assert.equal(resolveHotelResultsRoute({ ...base, ...occupancy }).resultsReady, false, JSON.stringify(occupancy));
  }
});

test("incomplete web Hotel recovery preserves visible legitimate destination and dates", () => {
  const route = resolveHotelResultsRoute({ destinationId: "gb-london", destination: "London", checkIn: "2030-04-01", checkOut: "2030-04-03" });
  assert.equal(route.resultsReady, false);
  if (route.resultsReady) return;
  const recovery = new URL(route.recoveryHref, "https://www.kurioticket.test");
  assert.equal(recovery.pathname, "/hotels");
  assert.equal(recovery.searchParams.get("destinationId"), "gb-london");
  assert.equal(recovery.searchParams.get("destination"), "London");
  assert.equal(recovery.searchParams.get("checkIn"), "2030-04-01");
  assert.equal(recovery.searchParams.get("checkOut"), "2030-04-03");
  assert.equal(recovery.searchParams.has("guests"), false);
  assert.equal(recovery.searchParams.has("rooms"), false);
});

test("incomplete native Hotel results replace history before ApprovedResultsScreen mounts", () => {
  const nativeBoundary = readFileSync(new URL("../../../apps/mobile/src/features/flow/TravelResultsScreen.tsx", import.meta.url), "utf8");
  assert.match(nativeBoundary, /router\.replace\(\{ pathname: "\/hotels"/);
  for (const field of ["destinationId", "destination", "checkIn", "checkOut", "guests", "rooms"]) {
    assert.match(nativeBoundary, new RegExp(`${field}: one\\(params\\.${field}\\)`));
  }
  assert.ok(nativeBoundary.indexOf('if (product === "hotel" && !hotelPlan?.plan) return null') < nativeBoundary.indexOf("<ApprovedResultsScreen product={product}"));
});

test("discovery intent hydrates each Hotel form without issuing a search", () => {
  assert.match(webHotelForm, /useState\(initialDestination \|\| searchParams\.get\("destination"\) \|\| ""\)/);
  assert.doesNotMatch(webHotelForm, /fetch\("\/api\/hotels\/search"/);
  assert.match(nativeHotelForm, /initializeHotelForm\(params\)/);
  assert.match(nativeHotelForm, /router\[submitNavigation\]\(\{ pathname: "\/hotel-results"/);
  assert.doesNotMatch(nativeHotelForm, /travelApi\.searchHotels/);
});
