import assert from "node:assert/strict";
import test from "node:test";
import { buildHotelExplorationHref, buildHotelExplorationSearch } from "./hotelExplorationSearch";

test("exploration search creates one complete deterministic Hotel policy", () => {
  assert.deepEqual(buildHotelExplorationSearch({ destination: " London, United Kingdom ", destinationId: "gb-london", source: "home-popular-stays", now: new Date("2026-09-10T23:59:59-07:00") }), {
    destination: "London, United Kingdom", destinationId: "gb-london", checkIn: "2026-10-09", checkOut: "2026-10-16", guests: "2", rooms: "1", sort: "cheapest", intentSource: "home-popular-stays",
  });
});

test("UTC date arithmetic is stable over month, year, and leap boundaries", () => {
  const cases = [["2026-12-10T00:00:00Z", "2027-01-07", "2027-01-14"], ["2028-02-01T23:30:00-08:00", "2028-03-01", "2028-03-08"], ["2027-01-31T23:30:00+14:00", "2027-02-28", "2027-03-07"]] as const;
  for (const [now, checkIn, checkOut] of cases) {
    const search = buildHotelExplorationSearch({ destination: "Paris", source: "explore", now: new Date(now) });
    assert.equal(search?.checkIn, checkIn); assert.equal(search?.checkOut, checkOut);
  }
});

test("maintained textual destinations remain complete without invented IDs", () => {
  const href = buildHotelExplorationHref({ destination: "Liverpool", source: "home-country-directory", now: new Date("2030-01-01T00:00:00Z") });
  const url = new URL(href!, "https://www.kurioticket.test");
  assert.equal(url.pathname, "/hotels/results"); assert.equal(url.searchParams.get("destination"), "Liverpool"); assert.equal(url.searchParams.has("destinationId"), false);
  for (const field of ["checkIn", "checkOut", "guests", "rooms"]) assert.ok(url.searchParams.get(field));
});

test("invalid destinations and clocks fail closed", () => {
  assert.equal(buildHotelExplorationSearch({ destination: "\u0000", source: "explore" }), null);
  assert.equal(buildHotelExplorationSearch({ destination: "Paris", source: "explore", now: new Date("invalid") }), null);
});
