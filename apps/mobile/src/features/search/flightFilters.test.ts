import assert from "node:assert/strict";
import test from "node:test";
import type { FlightResult } from "../../api/travelApi";
import {
  activeFlightFilterCount,
  emptyFlightFilters,
  filterAndSortFlights,
  flightSortQuickLabel,
  flightFilterOptions,
  timeBucket,
  type FlightFilters,
} from "./flightFilters";

const flight = (
  id: string,
  airlineName: string,
  stops: number,
  hour: string,
  price: number,
  valueScore: number,
) =>
  ({
    id,
    airlineName,
    stops,
    departureTime: `2026-09-01T${hour}:00`,
    price,
    valueScore,
    durationMinutes: 120,
  }) as FlightResult;

const loaded = [
  flight("nonstop-american", "American", 0, "08:00", 300, 9),
  flight("one-british", "British Airways", 1, "14:00", 100, 5),
  flight("two-american", "American", 2, "20:00", 200, 7),
];

test("derives only stop, airline, and departure-time options present in loaded results", () => {
  assert.deepEqual(flightFilterOptions(loaded), {
    stops: ["nonstop", "one", "twoPlus"],
    airlines: ["American", "British Airways"],
    times: ["morning", "afternoon", "evening"],
  });
});

test("Nonstop returns only the nonstop result", () => {
  const filters: FlightFilters = { ...emptyFlightFilters(), stops: ["nonstop"] };
  assert.deepEqual(filterAndSortFlights(loaded, filters, "best").map((x) => x.id), ["nonstop-american"]);
});

test("airlines support one or multiple selections", () => {
  assert.deepEqual(
    filterAndSortFlights(loaded, { ...emptyFlightFilters(), airlines: ["British Airways"] }, "best").map((x) => x.id),
    ["one-british"],
  );
  assert.deepEqual(
    filterAndSortFlights(loaded, { ...emptyFlightFilters(), airlines: ["American", "British Airways"] }, "best").map((x) => x.id),
    ["nonstop-american", "two-american", "one-british"],
  );
});

test("historical time bands include every boundary", () => {
  assert.deepEqual(
    ["00:00", "04:59", "05:00", "11:59", "12:00", "16:59", "17:00", "20:59", "21:00", "23:59"].map(
      (hour) => timeBucket(`2026-09-01T${hour}:00`),
    ),
    ["afternoon", "afternoon", "morning", "morning", "afternoon", "afternoon", "evening", "evening", "night", "night"],
  );
  assert.equal(timeBucket("not-a-provider-timestamp"), undefined);
});

test("each departure time band filters the loaded set", () => {
  const times = [
    flight("morning", "A", 0, "05:00", 4, 4),
    flight("afternoon", "A", 0, "12:00", 3, 3),
    flight("evening", "A", 0, "17:00", 2, 2),
    flight("night", "A", 0, "21:00", 1, 1),
  ];
  for (const bucket of ["morning", "afternoon", "evening", "night"] as const) {
    assert.deepEqual(filterAndSortFlights(times, { ...emptyFlightFilters(), times: [bucket] }, "best").map((x) => x.id), [bucket]);
  }
});

test("combined categories use intersection semantics", () => {
  const filters: FlightFilters = { stops: ["nonstop"], airlines: ["American"], times: [] };
  assert.deepEqual(filterAndSortFlights(loaded, filters, "best").map((x) => x.id), ["nonstop-american"]);
});

test("price sorting composes with filters without mutating loaded results", () => {
  const before = loaded.slice();
  const visible = filterAndSortFlights(loaded, { ...emptyFlightFilters(), airlines: ["American"] }, "price");
  assert.deepEqual(visible.map((x) => x.id), ["two-american", "nonstop-american"]);
  assert.deepEqual(loaded, before);
});

test("Recommended restores the existing default ranking after selecting another sort", () => {
  assert.deepEqual(filterAndSortFlights(loaded, emptyFlightFilters(), "price").map((x) => x.id), ["one-british", "two-american", "nonstop-american"]);
  assert.deepEqual(filterAndSortFlights(loaded, emptyFlightFilters(), "best").map((x) => x.id), ["nonstop-american", "two-american", "one-british"]);
});

test("Cheapest uses normalized comparable prices and keeps missing prices last", () => {
  const prices = [
    { ...loaded[0], id: "usd", currency: "USD", price: 100 },
    { ...loaded[1], id: "gbp", currency: "GBP", price: 90 },
    { ...loaded[2], id: "missing", currency: "EUR", price: Number.NaN },
  ];
  const normalized = new Map([["usd", 100], ["gbp", 115]]);
  assert.deepEqual(
    filterAndSortFlights(prices, emptyFlightFilters(), "price", (result) => normalized.get(result.id) ?? null).map((x) => x.id),
    ["usd", "gbp", "missing"],
  );
});

test("Fastest uses total itinerary duration and handles missing values", () => {
  const durations = [
    { ...loaded[0], id: "long", durationMinutes: 500 },
    { ...loaded[1], id: "fast", durationMinutes: 75 },
    { ...loaded[2], id: "missing", durationMinutes: Number.NaN },
  ];
  assert.deepEqual(filterAndSortFlights(durations, emptyFlightFilters(), "duration").map((x) => x.id), ["fast", "long", "missing"]);
});

test("departure sorts use structured timestamps including date and timezone", () => {
  const departures = [
    { ...loaded[0], id: "later-date", departureTime: "2026-09-02T01:00:00+02:00" },
    { ...loaded[1], id: "earlier-instant", departureTime: "2026-09-01T22:30:00Z" },
    { ...loaded[2], id: "invalid", departureTime: "not-a-timestamp" },
  ];
  assert.deepEqual(filterAndSortFlights(departures, emptyFlightFilters(), "departure-asc").map((x) => x.id), ["earlier-instant", "later-date", "invalid"]);
  assert.deepEqual(filterAndSortFlights(departures, emptyFlightFilters(), "departure-desc").map((x) => x.id), ["later-date", "earlier-instant", "invalid"]);
});

test("equal sort values preserve loaded result order deterministically", () => {
  const equal = loaded.map((result) => ({ ...result, price: 100, durationMinutes: 60, departureTime: "2026-09-01T08:00:00Z" }));
  for (const sort of ["price", "duration", "departure-asc", "departure-desc"] as const) {
    assert.deepEqual(filterAndSortFlights(equal, emptyFlightFilters(), sort).map((x) => x.id), loaded.map((x) => x.id));
  }
});

test("sort quick-control labels reflect exactly one active mode", () => {
  assert.equal(flightSortQuickLabel("best"), "Sort");
  assert.equal(flightSortQuickLabel("price"), "Cheapest");
  assert.equal(flightSortQuickLabel("duration"), "Fastest");
  assert.equal(flightSortQuickLabel("departure-asc"), "Earliest departure");
  assert.equal(flightSortQuickLabel("departure-desc"), "Latest departure");
});

test("clearing filters restores all loaded results and visible count", () => {
  const filtered = filterAndSortFlights(loaded, { stops: ["nonstop"], airlines: ["British Airways"], times: [] }, "best");
  assert.equal(filtered.length, 0);
  assert.equal(activeFlightFilterCount({ stops: ["nonstop"], airlines: ["British Airways"], times: [] }), 2);
  const cleared = emptyFlightFilters();
  assert.equal(activeFlightFilterCount(cleared), 0);
  assert.equal(filterAndSortFlights(loaded, cleared, "best").length, loaded.length);
});
