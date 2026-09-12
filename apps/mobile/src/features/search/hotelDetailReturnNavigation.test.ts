import assert from "node:assert/strict";
import test from "node:test";
import {
  hotelResultsDismissCount,
  rebuildHotelStayNavigationState,
} from "./hotelDetailReturnNavigation";

test("dismisses one Detail above Hotel Results", () => {
  assert.equal(
    hotelResultsDismissCount({
      index: 2,
      routes: [
        { name: "hotels" },
        { name: "hotel-results" },
        { name: "hotel-details" },
      ],
    }),
    1,
  );
});

test("dismisses two related Details above Hotel Results", () => {
  assert.equal(
    hotelResultsDismissCount({
      index: 3,
      routes: [
        { name: "hotels" },
        { name: "hotel-results" },
        { name: "hotel-details" },
        { name: "hotel-details" },
      ],
    }),
    2,
  );
});

test("dismisses three related Details above Hotel Results", () => {
  assert.equal(
    hotelResultsDismissCount({
      index: 4,
      routes: [
        { name: "hotels" },
        { name: "hotel-results" },
        { name: "hotel-details" },
        { name: "hotel-details" },
        { name: "hotel-details" },
      ],
    }),
    3,
  );
});

test("returns null when direct entry has no Hotel Results route", () => {
  assert.equal(
    hotelResultsDismissCount({
      routes: [{ name: "saved" }, { name: "hotel-details" }],
    }),
    null,
  );
});

test("chooses the nearest prior Hotel Results route", () => {
  assert.equal(
    hotelResultsDismissCount({
      routes: [
        { name: "hotel-results" },
        { name: "something-else" },
        { name: "hotel-results" },
        { name: "hotel-details" },
      ],
    }),
    1,
  );
});

test("returns null for absent, empty, and invalid active state", () => {
  assert.equal(hotelResultsDismissCount(undefined), null);
  assert.equal(hotelResultsDismissCount({ routes: [] }), null);
  assert.equal(
    hotelResultsDismissCount({ index: 0, routes: [{ name: "hotel-details" }] }),
    null,
  );
  assert.equal(
    hotelResultsDismissCount({
      index: 2,
      routes: [{ name: "hotel-results" }, { name: "hotel-details" }],
    }),
    null,
  );
});

test("stay edits replace stale Results parameters while keeping Details on top", () => {
  const reset = rebuildHotelStayNavigationState(
    {
      index: 2,
      routes: [
        { name: "hotels", key: "home" },
        {
          name: "hotel-results",
          key: "results",
          params: { destination: "New York", checkIn: "2026-09-23", checkOut: "2026-09-30", guests: "1", rooms: "1" },
        },
        {
          name: "hotel-details",
          key: "details",
          params: { result: "old", hotelResultsStack: "1" },
        },
      ],
    },
    { destination: "New York", checkIn: "2026-10-02", checkOut: "2026-10-05", guests: "2", rooms: "1" },
    { result: "refreshed", checkIn: "2026-10-02", checkOut: "2026-10-05", guests: "2", rooms: "1", hotelResultsStack: "1" },
  );

  assert.deepEqual(reset, {
    index: 2,
    routes: [
      { name: "hotels", key: "home" },
      {
        name: "hotel-results",
        key: "results",
        params: { destination: "New York", checkIn: "2026-10-02", checkOut: "2026-10-05", guests: "2", rooms: "1" },
      },
      {
        name: "hotel-details",
        key: "details",
        params: { result: "refreshed", hotelResultsStack: "1", checkIn: "2026-10-02", checkOut: "2026-10-05", guests: "2", rooms: "1" },
      },
    ],
  });
});

test("stay edits remove intermediate related Details routes above Results", () => {
  const reset = rebuildHotelStayNavigationState(
    {
      index: 4,
      routes: [
        { name: "hotels" },
        { name: "hotel-results", params: { checkIn: "old" } },
        { name: "hotel-details", params: { result: "first" } },
        { name: "hotel-details", params: { result: "second" } },
        { name: "hotel-details", params: { result: "current" } },
      ],
    },
    { checkIn: "new" },
    { result: "refreshed" },
  );

  assert.deepEqual(reset, {
    index: 2,
    routes: [
      { name: "hotels" },
      { name: "hotel-results", params: { checkIn: "new" } },
      { name: "hotel-details", params: { result: "refreshed" } },
    ],
  });
});

test("stay navigation reset is unavailable without a prior Hotel Results route", () => {
  assert.equal(
    rebuildHotelStayNavigationState(
      { routes: [{ name: "saved" }, { name: "hotel-details" }] },
      { checkIn: "2026-10-02" },
      { result: "refreshed" },
    ),
    null,
  );
});
