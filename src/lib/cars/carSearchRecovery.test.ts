import assert from "node:assert/strict";
import test from "node:test";
import { carSearchRecoveryHref } from "./carSearchRecovery";
import { getInitialValues } from "./carsSearchUtils";

const search = {
  pickupLocation: "Heathrow, London (LHR)", pickupDate: "2026-12-14", pickupTime: "10:00",
  dropoffLocation: "Heathrow, London (LHR)", dropoffDate: "2026-12-17", dropoffTime: "16:30",
  driverAge: "35", returnToDifferentLocation: false,
};

test("recovery restores the actual landing form without carrying rejected selection authority", () => {
  const href = carSearchRecoveryHref({ ...search, pickupLocationTarget: { id: "airport:LHR", selectionToken: "expired" },
    dropoffLocationTarget: { id: "airport:LHR", selectionToken: "expired" } } as unknown as Parameters<typeof carSearchRecoveryHref>[0]);
  const url = new URL(href, "https://staging.kurioticket.com");
  assert.equal(url.pathname, "/cars");
  assert.deepEqual(getInitialValues(url.searchParams), { ...search, dropoffLocation: "" });
  assert.equal(href.includes("expired"), false);
  assert.equal(url.searchParams.has("pickupLocationTarget"), false);
  assert.equal(url.searchParams.has("dropoffLocationTarget"), false);
});

test("different-return recovery preserves both locations and encodes labels as data", () => {
  const values = { ...search, pickupLocation: "A & B? city", dropoffLocation: "Gatwick (LGW)", returnToDifferentLocation: true };
  const url = new URL(carSearchRecoveryHref(values), "https://staging.kurioticket.com");
  assert.deepEqual(getInitialValues(url.searchParams), values);
  assert.deepEqual([...url.searchParams.keys()].sort(), ["pickupLocation", "pickupDate", "pickupTime", "dropoffDate", "dropoffTime", "driverAge", "returnToDifferentLocation", "dropoffLocation"].sort());
});
