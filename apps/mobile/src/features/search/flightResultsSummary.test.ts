import assert from "node:assert/strict";
import test from "node:test";
import { flightResultsSummary } from "./flightResultsSummary";

test("flight results summary mirrors the mobile Web route and metadata hierarchy", () => {
  assert.deepEqual(flightResultsSummary({
    origin: "sfo",
    destination: "lax",
    tripType: "round-trip",
    departureDate: "2026-09-10",
    returnDate: "2026-09-12",
    adults: 1,
    children: 0,
    infants: 0,
    cabinClass: "economy",
  }, "en-us"), {
    route: "SFO → LAX",
    secondaryLine: "Round-trip · Thu, Sep 10, 2026 – Sat, Sep 12, 2026 · 1 traveler · Economy",
  });
});

test("flight results summary preserves one-way and multi-traveler context", () => {
  const summary = flightResultsSummary({
    origin: "cdg",
    destination: "jfk",
    tripType: "one-way",
    departureDate: "2026-10-01",
    adults: 2,
    children: 1,
    cabinClass: "business",
  }, "en-us");
  assert.equal(summary.route, "CDG → JFK");
  assert.match(summary.secondaryLine, /^One-way · Thu, Oct 1, 2026 · 3 travelers · Business$/);
});
