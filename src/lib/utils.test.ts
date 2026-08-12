import assert from "node:assert/strict";
import test from "node:test";
import { formatTime, getItineraryLocalHour } from "./utils";

test("preserves written departure and arrival clocks with explicit offsets", () => {
  assert.match(formatTime("2027-02-01T08:30:00+01:00", "en-GB"), /^0?8:30$/);
  assert.match(formatTime("2027-02-01T18:30:00-05:00", "en-GB"), /^18:30$/);
  assert.equal(getItineraryLocalHour("2027-02-01T08:30:00+01:00"), 8);
  assert.equal(getItineraryLocalHour("2027-02-01T12:30:00-08:00"), 12);
  assert.equal(getItineraryLocalHour("2027-02-01T18:30:00-05:00"), 18);
  assert.equal(getItineraryLocalHour("2027-02-01T02:30:00+09:00"), 2);
});
