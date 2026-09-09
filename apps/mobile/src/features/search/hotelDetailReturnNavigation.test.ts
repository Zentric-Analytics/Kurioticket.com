import assert from "node:assert/strict";
import test from "node:test";
import { hotelResultsDismissCount } from "./hotelDetailReturnNavigation";

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
