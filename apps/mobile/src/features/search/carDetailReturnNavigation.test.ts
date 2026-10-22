import assert from "node:assert/strict";
import test from "node:test";
import { carResultsDismissCount } from "./carDetailReturnNavigation";

test("returns the distance to Cars Results through one, two, or three Details", () => {
  for (const detailCount of [1, 2, 3]) {
    assert.equal(carResultsDismissCount({
      index: detailCount + 1,
      routes: [{ name: "cars" }, { name: "car-results" }, ...Array.from({ length: detailCount }, () => ({ name: "car-details" }))],
    }), detailCount);
  }
});

test("returns null for a Saved or direct Detail entry", () => {
  assert.equal(carResultsDismissCount({ index: 1, routes: [{ name: "saved" }, { name: "car-details" }] }), null);
});

test("chooses the nearest prior Cars Results route", () => {
  assert.equal(carResultsDismissCount({
    index: 4,
    routes: [{ name: "car-results" }, { name: "cars" }, { name: "car-results" }, { name: "something" }, { name: "car-details" }],
  }), 2);
});

test("returns null for absent, empty, and invalid active state", () => {
  assert.equal(carResultsDismissCount(undefined), null);
  assert.equal(carResultsDismissCount({ routes: [] }), null);
  assert.equal(carResultsDismissCount({ index: 0, routes: [{ name: "car-details" }] }), null);
  assert.equal(carResultsDismissCount({ index: 2, routes: [{ name: "car-results" }, { name: "car-details" }] }), null);
});
