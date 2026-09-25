import assert from "node:assert/strict";
import test from "node:test";

import { validateCarsForm, type CarsFormValues } from "./carsSearchUtils";

const values = (overrides: Partial<CarsFormValues> = {}): CarsFormValues => ({
  pickupLocation: "JFK",
  pickupDate: "2026-09-24",
  pickupTime: "10:00",
  dropoffDate: "2026-09-25",
  dropoffTime: "10:00",
  driverAge: "18-70",
  returnToDifferentLocation: false,
  dropoffLocation: "",
  ...overrides,
});

test("rejects an expired pickup time when pickup is today", () => {
  const errors = validateCarsForm(
    values({ pickupTime: "08:30" }),
    "2026-09-24",
    "09:00",
  );

  assert.equal(errors.pickupTime, "carsSearch.error.pickupTimePast");
});

test("keeps a later same-day pickup time valid", () => {
  const errors = validateCarsForm(
    values({ pickupTime: "09:30" }),
    "2026-09-24",
    "09:00",
  );

  assert.equal(errors.pickupTime, undefined);
});

test("does not apply the current clock time to a future pickup date", () => {
  const errors = validateCarsForm(
    values({ pickupDate: "2026-09-25", pickupTime: "01:00" }),
    "2026-09-24",
    "23:30",
  );

  assert.equal(errors.pickupTime, undefined);
});

test("preserves callers that only provide date-level validation context", () => {
  const errors = validateCarsForm(
    values({ pickupTime: "01:00" }),
    "2026-09-24",
  );

  assert.equal(errors.pickupTime, undefined);
});


test("rental timezone overrides the device clock for same-day JFK validation", () => {
  const errors = validateCarsForm(
    values({
      pickupDate: "2026-09-25",
      pickupTime: "04:30",
      dropoffDate: "2026-09-27",
      pickupLocationTarget: JSON.stringify({
        timeZone: "America/New_York",
      }),
    }),
    "2026-09-25",
    "01:33",
    new Date("2026-09-25T08:33:00Z"),
  );

  assert.equal(errors.pickupTime, "carsSearch.error.pickupTimePast");
});

test("rental timezone does not reject a PAE pickup that is still future locally", () => {
  const errors = validateCarsForm(
    values({
      pickupDate: "2026-09-25",
      pickupTime: "02:00",
      dropoffDate: "2026-09-27",
      pickupLocationTarget: JSON.stringify({
        timeZone: "America/Los_Angeles",
      }),
    }),
    "2026-09-25",
    "03:22",
    new Date("2026-09-25T07:22:00Z"),
  );

  assert.equal(errors.pickupTime, undefined);
});

test("rental-local calendar day wins across the UTC date boundary", () => {
  const errors = validateCarsForm(
    values({
      pickupDate: "2026-09-24",
      pickupTime: "23:45",
      dropoffDate: "2026-09-25",
      pickupLocationTarget: JSON.stringify({
        timeZone: "America/Los_Angeles",
      }),
    }),
    "2026-09-25",
    "06:30",
    new Date("2026-09-25T06:30:00Z"),
  );

  assert.equal(errors.pickupDate, undefined);
  assert.equal(errors.pickupTime, undefined);
});
