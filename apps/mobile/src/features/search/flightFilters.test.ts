import assert from "node:assert/strict";
import test from "node:test";
import type { FlightResult } from "../../api/travelApi";
import {
  activeFlightFilterCount,
  emptyFlightFilters,
  filterAndSortFlights,
  flightSortQuickLabel,
  flightFilterOptions,
  flightFacetCounts,
  isPriceFilteringAvailable,
  matchingFlightCount,
  flightFilterDurationMinutes,
  flightStopBucket,
  resolveFlightPriceComparisonContext,
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
    currency: "USD",
    valueScore,
    durationMinutes: 120,
  }) as FlightResult;

const loaded = [
  flight("nonstop-american", "American", 0, "08:00", 300, 9),
  flight("one-british", "British Airways", 1, "14:00", 100, 5),
  flight("two-american", "American", 2, "20:00", 200, 7),
];

test("derives loaded options and hides unsupported optional sections", () => {
  const options = flightFilterOptions(loaded);
  assert.deepEqual(options.stops, ["nonstop", "one", "twoPlus"]);
  assert.deepEqual(options.airlines, ["American", "British Airways"]);
  assert.deepEqual(options.takeoffTimes, ["morning", "afternoon", "evening"]);
  assert.equal(options.showAirports, false);
  assert.equal(options.baggage, false);
  assert.equal(options.refundable, false);
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
    ["night", "night", "morning", "morning", "afternoon", "afternoon", "evening", "evening", "night", "night"],
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
  const filters: FlightFilters = { ...emptyFlightFilters(), stops: ["nonstop"], airlines: ["American"] };
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
  const filtered = filterAndSortFlights(loaded, { ...emptyFlightFilters(), stops: ["nonstop"], airlines: ["British Airways"] }, "best");
  assert.equal(filtered.length, 0);
  assert.equal(activeFlightFilterCount({ ...emptyFlightFilters(), stops: ["nonstop"], airlines: ["British Airways"] }), 2);
  const cleared = emptyFlightFilters();
  assert.equal(activeFlightFilterCount(cleared), 0);
  assert.equal(filterAndSortFlights(loaded, cleared, "best").length, loaded.length);
});

const detailed = [
  { ...loaded[0], originAirport: "JFK", destinationAirport: "LHR", arrivalTime: "2026-09-01T16:00:00+01:00", durationMinutes: 480, fareTerms: [{ category: "baggage", semantic: "positive", text: "Included" }] },
  { ...loaded[1], originAirport: "EWR", destinationAirport: "LGW", arrivalTime: "2026-09-01T22:00:00+01:00", durationMinutes: 600, fareTerms: [{ category: "refund", semantic: "positive", text: "Refundable" }] },
  { ...loaded[2], originAirport: "JFK", destinationAirport: "LGW", arrivalTime: "2026-09-02T03:00:00+01:00", durationMinutes: 720 },
] as FlightResult[];
const ids = (filters: FlightFilters, sort: Parameters<typeof filterAndSortFlights>[2] = "best") => filterAndSortFlights(detailed, filters, sort).map((x) => x.id);

test("default filters preserve every result and never mutate the source", () => {
  const before = detailed.slice();
  assert.equal(ids(emptyFlightFilters()).length, detailed.length);
  assert.deepEqual(detailed, before);
});
test("price and structured duration ranges filter independently", () => {
  assert.deepEqual(ids({ ...emptyFlightFilters(), price: { min: 150, max: 250 } }), ["two-american"]);
  assert.deepEqual(ids({ ...emptyFlightFilters(), duration: { min: 550, max: 650 } }), ["one-british"]);
});
test("takeoff and landing bands read their respective structured timestamps", () => {
  assert.deepEqual(ids({ ...emptyFlightFilters(), times: ["morning"] }), ["nonstop-american"]);
  assert.deepEqual(ids({ ...emptyFlightFilters(), timeField: "landing", times: ["night"] }), ["two-american", "one-british"]);
});
test("all three stop buckets use the shared result model", () => {
  assert.deepEqual(ids({ ...emptyFlightFilters(), stops: ["nonstop"] }), ["nonstop-american"]);
  assert.deepEqual(ids({ ...emptyFlightFilters(), stops: ["one"] }), ["one-british"]);
  assert.deepEqual(ids({ ...emptyFlightFilters(), stops: ["twoPlus"] }), ["two-american"]);
});
test("airport selections use actual route codes", () => {
  assert.deepEqual(ids({ ...emptyFlightFilters(), fromAirports: ["EWR"] }), ["one-british"]);
  assert.deepEqual(ids({ ...emptyFlightFilters(), toAirports: ["LHR"] }), ["nonstop-american"]);
});
test("amenities require positive structured provider fare terms", () => {
  assert.deepEqual(ids({ ...emptyFlightFilters(), baggageIncluded: true }), ["nonstop-american"]);
  assert.deepEqual(ids({ ...emptyFlightFilters(), refundable: true }), ["one-british"]);
  assert.equal(flightFilterOptions(detailed).baggage, true);
  assert.equal(flightFilterOptions(detailed).refundable, true);
});
test("meaningful count counts each selection, each changed range once, and not default ranges", () => {
  const options = flightFilterOptions(detailed);
  assert.equal(activeFlightFilterCount({ ...emptyFlightFilters(), price: options.price, duration: options.duration }, options), 0);
  assert.equal(activeFlightFilterCount({ ...emptyFlightFilters(), price: { min: 150, max: 300 }, stops: ["nonstop"], airlines: ["American", "British Airways"], baggageIncluded: true }, options), 5);
});
test("preview and facet counts use draft filters without mutating loaded results", () => {
  const before = detailed.slice();
  const draft = { ...emptyFlightFilters(), airlines: ["American"] };
  assert.equal(matchingFlightCount(detailed, draft), 2);
  const counts = flightFacetCounts(detailed, draft);
  assert.deepEqual(counts.stops, { nonstop: 1, one: 0, twoPlus: 1 });
  assert.deepEqual(counts.airlines, { American: 2, "British Airways": 1 });
  assert.deepEqual(counts.fromAirports, { EWR: 0, JFK: 2 });
  assert.deepEqual(counts.toAirports, { LGW: 1, LHR: 1 });
  assert.deepEqual(detailed, before);
});
test("facet counts retain other draft categories but replace their own category", () => {
  const draft: FlightFilters = { ...emptyFlightFilters(), stops: ["nonstop"], airlines: ["American"] };
  const counts = flightFacetCounts(detailed, draft);
  assert.deepEqual(counts.stops, { nonstop: 1, one: 0, twoPlus: 1 });
  assert.deepEqual(counts.airlines, { American: 1, "British Airways": 0 });
});
test("filters compose before the selected sort and missing optional data is safe", () => {
  assert.deepEqual(ids({ ...emptyFlightFilters(), toAirports: ["LGW"] }, "price"), ["one-british", "two-american"]);
  assert.doesNotThrow(() => flightFilterOptions([{ ...loaded[0], arrivalTime: undefined, fareTerms: undefined } as unknown as FlightResult]));
});

test("price options use same-currency fares without conversion", () => {
  const fares = loaded.map((result, index) => ({ ...result, currency: "USD", price: 100 + index * 50 }));
  const options = flightFilterOptions(fares, resolveFlightPriceComparisonContext(fares, "USD", (result) => result.price));
  assert.deepEqual(options.price, { min: 100, max: 200 });
  assert.equal(options.priceCurrency, "USD");
});

test("price options use complete normalized values for mixed currencies", () => {
  const fares = [
    { ...loaded[0], currency: "USD", price: 100 },
    { ...loaded[1], currency: "GBP", price: 100 },
  ];
  const context = resolveFlightPriceComparisonContext(fares, "USD", (result) => result.currency === "GBP" ? 125 : 100);
  const options = flightFilterOptions(fares, context);
  assert.deepEqual(options.price, { min: 100, max: 125 });
  assert.equal(options.priceCurrency, "USD");
});

test("price options hide mixed currencies when normalization is unavailable or incomplete", () => {
  const fares = [
    { ...loaded[0], currency: "USD", price: 100 },
    { ...loaded[1], currency: "GBP", price: 90 },
  ];
  assert.equal(flightFilterOptions(fares).price, null);
  assert.equal(flightFilterOptions(fares, resolveFlightPriceComparisonContext(fares, "USD", (result) => result.currency === "USD" ? 100 : null)).price, null);
});

test("price filtering requires resolved currency context and a comparable extent", () => {
  const sameFares = loaded.map((result) => ({ ...result, currency: "USD" }));
  const sameCurrency = flightFilterOptions(sameFares, resolveFlightPriceComparisonContext(sameFares, "USD", (result) => result.price));
  assert.equal(isPriceFilteringAvailable(sameCurrency, false), false);
  assert.equal(isPriceFilteringAvailable(sameCurrency, true), true);
  const mixed = [
    { ...loaded[0], currency: "USD", price: 100 },
    { ...loaded[1], currency: "GBP", price: 90 },
  ];
  assert.equal(isPriceFilteringAvailable(flightFilterOptions(mixed), true), false);
  const normalized = flightFilterOptions(mixed, resolveFlightPriceComparisonContext(mixed, "USD", (result) => result.currency === "GBP" ? 115 : 100));
  assert.equal(isPriceFilteringAvailable(normalized, true), true);
});

test("restored full price and duration extents are inactive", () => {
  const options = flightFilterOptions(loaded, resolveFlightPriceComparisonContext(loaded, "USD", (result) => result.price));
  assert.ok(options.price);
  assert.ok(options.duration);
  assert.equal(activeFlightFilterCount({ ...emptyFlightFilters(), price: { ...options.price! } }, options), 0);
  assert.equal(activeFlightFilterCount({ ...emptyFlightFilters(), duration: { ...options.duration! } }, options), 0);
});

test("defensive predicate ignores malformed numeric ranges rather than comparing NaN, infinity, crossing, or negative duration", () => {
  for (const filters of [
    { ...emptyFlightFilters(), price: { min: Number.NaN, max: 200 } },
    { ...emptyFlightFilters(), price: { min: 300, max: 100 } },
    { ...emptyFlightFilters(), duration: { min: -1, max: Number.POSITIVE_INFINITY } },
  ]) assert.equal(matchingFlightCount(loaded, filters), loaded.length);
});

const roundTrip = (id: string, outboundStops: number, returnStops: number, outboundDuration = 480, returnDuration = 720) => ({
  ...flight(id, "Round Trip Air", outboundStops, "08:00", 100, 1),
  arrivalTime: "2026-09-01T12:00:00Z",
  legs: [
    { direction: "outbound", stops: outboundStops, durationMinutes: outboundDuration, departureTime: "2026-09-01T08:00:00Z", arrivalTime: "2026-09-01T12:00:00Z" },
    { direction: "return", stops: returnStops, durationMinutes: returnDuration, departureTime: "2026-09-08T22:00:00Z", arrivalTime: "2026-09-09T02:00:00Z" },
  ],
}) as FlightResult;

test("round-trip stops use the worst authoritative journey leg", () => {
  const outboundNonstopReturnOne = roundTrip("zero-one", 0, 1);
  const bothNonstop = roundTrip("zero-zero", 0, 0);
  const outboundOneReturnTwo = roundTrip("one-two", 1, 2);
  assert.equal(flightStopBucket(outboundNonstopReturnOne), "one");
  assert.equal(matchingFlightCount([outboundNonstopReturnOne], { ...emptyFlightFilters(), stops: ["nonstop"] }), 0);
  assert.equal(matchingFlightCount([outboundNonstopReturnOne], { ...emptyFlightFilters(), stops: ["one"] }), 1);
  assert.equal(flightStopBucket(bothNonstop), "nonstop");
  assert.equal(flightStopBucket(outboundOneReturnTwo), "twoPlus");
  assert.equal(flightStopBucket(flight("one-way", "A", 1, "08:00", 100, 1)), "one");
});

test("round-trip duration is the longest leg and one-way duration is unchanged", () => {
  const result = roundTrip("duration", 0, 0, 480, 720);
  assert.equal(flightFilterDurationMinutes(result), 720);
  assert.equal(matchingFlightCount([result], { ...emptyFlightFilters(), duration: { min: 0, max: 600 } }), 0);
  assert.equal(matchingFlightCount([result], { ...emptyFlightFilters(), duration: { min: 0, max: 720 } }), 1);
  assert.equal(flightFilterDurationMinutes(flight("one-way", "A", 0, "08:00", 100, 1)), 120);
});

test("time filtering and option derivation are explicitly outbound scoped", () => {
  const result = roundTrip("times", 0, 0);
  const options = flightFilterOptions([result]);
  assert.deepEqual(options.takeoffTimes, ["morning"]);
  assert.equal(matchingFlightCount([result], { ...emptyFlightFilters(), times: ["morning"] }), 1);
  assert.equal(matchingFlightCount([result], { ...emptyFlightFilters(), times: ["night"] }), 0);
});

test("one price context drives normalized, raw fallback, and unavailable mixed-currency filtering", () => {
  const usd = [{ ...loaded[0], price: 100, currency: "USD" }, { ...loaded[1], price: 200, currency: "USD" }];
  const normalized = resolveFlightPriceComparisonContext(usd, "NGN", (result) => result.price * 1500)!;
  assert.equal(normalized.identity, "normalized:NGN");
  assert.deepEqual(flightFilterOptions(usd, normalized).price, { min: 150000, max: 300000 });
  assert.equal(matchingFlightCount(usd, { ...emptyFlightFilters(), price: { min: 200000, max: 350000 } }, normalized.valueForResult), 1);

  const rawFallback = resolveFlightPriceComparisonContext(usd, "NGN", () => null)!;
  assert.equal(rawFallback.identity, "raw:USD");
  assert.equal(flightFilterOptions(usd, rawFallback).priceCurrency, "USD");
  assert.equal(matchingFlightCount(usd, { ...emptyFlightFilters(), price: { min: 150, max: 250 } }, rawFallback.valueForResult), 1);

  const mixed = [usd[0], { ...usd[1], currency: "GBP" }];
  const mixedNormalized = resolveFlightPriceComparisonContext(mixed, "NGN", (result) => result.currency === "USD" ? 150000 : 400000)!;
  assert.deepEqual(flightFilterOptions(mixed, mixedNormalized).price, { min: 150000, max: 400000 });
  assert.equal(resolveFlightPriceComparisonContext(mixed, "NGN", () => null), null);
  assert.equal(flightFilterOptions(mixed, null).price, null);
});
