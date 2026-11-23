import assert from "node:assert/strict";
import test from "node:test";

import {
  getRentalLocationClock,
  locationTargetTimeZone,
  pickupHasPassedAtClock,
} from "./rentalLocationClock";

test("New York rental clock rejects a JFK pickup that already passed there", () => {
  const clock = getRentalLocationClock(
    new Date("2026-09-25T08:33:00Z"),
    "America/New_York",
  );
  assert.deepEqual(clock, {
    date: "2026-09-25",
    time: "04:33",
    timeZone: "America/New_York",
  });
  assert.equal(
    pickupHasPassedAtClock("2026-09-25", "04:30", clock!),
    true,
  );
});

test("Los Angeles rental clock preserves a future PAE pickup on the same date", () => {
  const clock = getRentalLocationClock(
    new Date("2026-09-25T07:22:00Z"),
    "America/Los_Angeles",
  );
  assert.deepEqual(clock, {
    date: "2026-09-25",
    time: "00:22",
    timeZone: "America/Los_Angeles",
  });
  assert.equal(
    pickupHasPassedAtClock("2026-09-25", "02:00", clock!),
    false,
  );
});

test("target timezone parsing is safe and invalid zones do not invent a clock", () => {
  assert.equal(
    locationTargetTimeZone(JSON.stringify({ timeZone: "Europe/London" })),
    "Europe/London",
  );
  assert.equal(locationTargetTimeZone("{bad"), undefined);
  assert.equal(getRentalLocationClock(new Date(), "Not/AZone"), null);
});
