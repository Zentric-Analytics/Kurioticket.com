import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildCarShareHref, parseSharedCarId, prioritizeSharedCar } from "./carResults";
import type { LocationBoundCarSearchParams } from "./types";

const search: LocationBoundCarSearchParams & { returnToDifferentLocation: boolean } = {
  pickupLocation: "Lagos", dropoffLocation: "Abuja", pickupDate: "2099-01-01",
  dropoffDate: "2099-01-03", pickupTime: "10:00", dropoffTime: "12:00",
  driverAge: "30", returnToDifferentLocation: true,
};
test("shared car opens current public results, preserves rental details and does not leak request IDs", () => {
  const input = { ...search, requestId: "private-request", bookingUrl: "https://private.example" };
  const url = new URL(buildCarShareHref("opaque-car:/?&", input), "https://example.test");
  assert.equal(url.pathname, "/cars/results");
  assert.equal(url.searchParams.get("sharedCar"), "opaque-car:/?&");
  for (const [key, value] of Object.entries(search)) {
    assert.equal(url.searchParams.get(key), key === "returnToDifferentLocation" ? "1" : value);
  }
  assert.equal(url.searchParams.has("requestId"), false);
  assert.equal(url.searchParams.has("bookingUrl"), false);
});
test("shared results promote an exact match without changing inventory or fabricating an expired result", () => {
  const cars = [{ id: "first" }, { id: "shared" }, { id: "last" }];
  assert.deepEqual(prioritizeSharedCar(cars, "shared").map(c => c.id), ["shared", "first", "last"]);
  assert.deepEqual(prioritizeSharedCar(cars, "expired"), cars);
  assert.deepEqual(cars.map(c => c.id), ["first", "shared", "last"]);
  assert.equal(parseSharedCarId("shared"), "shared");
  assert.equal(parseSharedCarId(["first", "shared"]), null);
  assert.equal(parseSharedCarId("x".repeat(513)), null);
  assert.equal(parseSharedCarId("bad\nvalue"), null);
});
test("card and existing detail share controls both use the public results builder", () => {
  for (const path of ["src/components/results/CarResultCard.tsx", "src/components/results/CarDetailsClient.tsx"]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /new URL\(buildCarShareHref\(car.id, search\), window.location.origin\)/);
  }
  const results = readFileSync("src/components/results/CarsResultsClient.tsx", "utf8");
  assert.match(results, /prioritizeSharedCar\(ordered, sharedCarId\)/);
  assert.match(results, /The shared car is no longer available/);
});
