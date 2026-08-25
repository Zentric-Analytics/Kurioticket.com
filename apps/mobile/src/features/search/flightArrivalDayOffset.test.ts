import assert from "node:assert/strict";
import test from "node:test";
import { arrivalDayOffsetAccessibility, flightArrivalDayOffset } from "./flightArrivalDayOffset";

test("derives positive offsets from provider-local calendar dates", () => {
  assert.equal(flightArrivalDayOffset("2026-09-10T18:00:00+01:00", "2026-09-10T23:00:00-04:00"), null);
  assert.equal(flightArrivalDayOffset("2026-09-10T22:00:00+01:00", "2026-09-11T06:30:00-04:00"), 1);
  assert.equal(flightArrivalDayOffset("2026-09-10T18:00:00Z", "2026-09-12T07:00:00Z"), 2);
  assert.equal(flightArrivalDayOffset("2026-09-10T18:00", "2026-09-13T18:00"), 3);
});

test("does not infer an offset from clock values", () => {
  assert.equal(flightArrivalDayOffset("2026-09-10T08:00:00", "2026-09-11T08:00:00"), 1);
  assert.equal(flightArrivalDayOffset("2026-09-10T22:00:00", "2026-09-10T06:00:00"), null);
});

test("conservatively hides missing, malformed, impossible, and negative dates", () => {
  assert.equal(flightArrivalDayOffset(undefined, "2026-09-11T06:30:00"), null);
  assert.equal(flightArrivalDayOffset("2026-09-10T22:00:00", undefined), null);
  assert.equal(flightArrivalDayOffset("not-a-date", "2026-09-11T06:30:00"), null);
  assert.equal(flightArrivalDayOffset("2026-02-30T10:00:00", "2026-03-01T10:00:00"), null);
  assert.equal(flightArrivalDayOffset("2026-09-11T10:00:00", "2026-09-10T10:00:00"), null);
});

test("provides semantic accessibility wording only for positive offsets", () => {
  assert.equal(arrivalDayOffsetAccessibility(1), "arrives next day");
  assert.equal(arrivalDayOffsetAccessibility(2), "arrives 2 days later");
  assert.equal(arrivalDayOffsetAccessibility(3), "arrives 3 days later");
  assert.equal(arrivalDayOffsetAccessibility(null), null);
});
