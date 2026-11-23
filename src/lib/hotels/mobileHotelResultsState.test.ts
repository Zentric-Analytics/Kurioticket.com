import assert from "node:assert/strict";
import test from "node:test";
import { parseMobileHotelResultsState } from "./mobileHotelResultsState";

const state = { minPrice: 100, maxPrice: null, selectedHotelClasses: [4], propertyNameQuery: "Arlo", selectedFilters: { facilities: ["wifi"] }, sort: "topRated", page: 2, scrollY: 890, savedAt: 1000 };

test("return state preserves filters, sort, pagination and scroll with an unbounded upper price", () => {
  assert.deepEqual(parseMobileHotelResultsState(JSON.stringify(state), 2000), state);
});

test("expired, corrupt and invalid return state is ignored", () => {
  for (const value of [{ ...state, savedAt: -2_000_000 }, { ...state, maxPrice: 50 }, { ...state, selectedFilters: { facilities: 4 } }, { ...state, page: -1 }, { ...state, selectedHotelClasses: [7] }]) {
    assert.equal(parseMobileHotelResultsState(JSON.stringify(value), 2000), null);
  }
  assert.equal(parseMobileHotelResultsState("broken", 2000), null);
});
