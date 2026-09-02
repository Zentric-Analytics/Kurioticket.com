import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/results/useSavedCar.ts", "utf8");

test("web Cars use account-backed save state with authentication and rollback", () => {
  assert.match(source, /useSession/);
  assert.match(source, /fetchBackendSavedCars/);
  assert.match(source, /saveBackendCar/);
  assert.match(source, /deleteBackendCar/);
  assert.match(source, /setSavedItem\(previous\)/);
  assert.match(source, /signIn/);
  assert.doesNotMatch(source, /saved-items-local|localStorage/);
});

test("saved Car payload preserves canonical result and complete search context", () => {
  for (const field of ["pickupLocation", "dropoffLocation", "pickupDate", "pickupTime", "dropoffDate", "dropoffTime", "driverAge"]) {
    assert.match(source, new RegExp(`${field}: search\\.${field}`));
  }
  assert.match(source, /payload: \{ result: car, searchParams: search \}/);
});
