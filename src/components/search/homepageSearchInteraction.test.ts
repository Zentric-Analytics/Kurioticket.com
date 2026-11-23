import assert from "node:assert/strict";
import test from "node:test";

import {
  committedHomepageTripType,
  isHomepageTripType,
  nextHomepageTripType,
} from "./homepageSearchInteraction";

test("trip-type keyboard navigation reaches exactly one adjacent mode", () => {
  assert.equal(nextHomepageTripType("round-trip", 1), "one-way");
  assert.equal(nextHomepageTripType("one-way", 1), "multi-city");
  assert.equal(nextHomepageTripType("multi-city", 1), "round-trip");
  assert.equal(nextHomepageTripType("round-trip", -1), "multi-city");
});

test("pointer activation commits only the control that owned pointerdown", () => {
  assert.equal(committedHomepageTripType("one-way", "one-way"), "one-way");
  assert.equal(committedHomepageTripType("one-way", "multi-city"), null);
  assert.equal(committedHomepageTripType(null, "round-trip"), "round-trip");
});

test("trip-type data attributes reject unknown modes", () => {
  assert.equal(isHomepageTripType("round-trip"), true);
  assert.equal(isHomepageTripType("one-way"), true);
  assert.equal(isHomepageTripType("multi-city"), true);
  assert.equal(isHomepageTripType("hotels"), false);
});
