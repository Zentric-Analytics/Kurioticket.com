import assert from "node:assert/strict";
import test from "node:test";
import { hasMinimumLocationSearchLetters } from "./locationSearchQuery";

test("requires at least two alphabetic characters", () => {
  for (const value of ["", " ", "L", "L ", "1L", "L1"]) assert.equal(hasMinimumLocationSearchLetters(value), false, value);
  for (const value of ["LA", "L A", "L1A", "LOS", "New York"]) assert.equal(hasMinimumLocationSearchLetters(value), true, value);
});
