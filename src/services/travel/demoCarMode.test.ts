import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import path from "node:path";
import test, { afterEach } from "node:test";
import { getCarResultsMode } from "@/lib/env";
import type { CarSearchParams } from "@/lib/cars/types";
import { getCarDetails, searchCars } from "@/services/travel/carAggregator";

const originalMode = process.env.CARS_RESULTS_MODE;
const search: CarSearchParams = {
  pickupLocation: "Sample Airport",
  dropoffLocation: "Sample City",
  pickupDate: "2026-08-01",
  pickupTime: "10:00",
  dropoffDate: "2026-08-04",
  dropoffTime: "10:00",
  driverAge: "30",
};

function setMode(value: string | undefined) {
  if (value === undefined) delete process.env.CARS_RESULTS_MODE;
  else process.env.CARS_RESULTS_MODE = value;
}

afterEach(() => setMode(originalMode));

test("Cars mode defaults to demo and only exact live enables live", () => {
  for (const [value, expected] of [
    [undefined, "demo"],
    ["", "demo"],
    ["demo", "demo"],
    ["live", "live"],
    ["DEMO", "demo"],
    ["Demo", "demo"],
    ["LIVE", "demo"],
    ["unexpected", "demo"],
  ] as const) {
    setMode(value);
    assert.equal(getCarResultsMode(), expected);
  }
});

test("default mode returns provider-safe demo inventory", async () => {
  setMode(undefined);
  const result = await searchCars(search);

  assert.equal(result.mode, "demo");
  assert.equal(result.status, "available");
  assert.equal(result.results.length, 11);
  assert.ok(result.results.every((car) => car.isDemo));

  const imageUrls = result.results.map((car) => car.imageUrl);
  assert.equal(imageUrls.length, 11);
  assert.ok(imageUrls.every((imageUrl) => imageUrl?.startsWith("/images/cars/results/")));
  assert.equal(new Set(imageUrls).size, 11);
  await Promise.all(
    result.results.map(async (car) => {
      assert.ok(car.imageUrl);
      assert.equal(car.imageUrl.endsWith(".svg"), false);
      assert.match(car.imageAlt.toLowerCase(), new RegExp(car.modelName.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      const imagePath = path.join(process.cwd(), "public", car.imageUrl);
      await access(imagePath);
    }),
  );
  assert.ok(
    result.results.every((car) =>
      car.offers.every((offer) => !offer.bookingUrl),
    ),
  );
});

test("exact live mode is unavailable and never falls back to demo", async () => {
  setMode("live");
  const result = await searchCars(search);

  assert.equal(result.mode, "live");
  assert.equal(result.status, "unavailable");
  assert.deepEqual(result.results, []);
  assert.equal(result.results.some((car) => car.isDemo), false);
});

test("default mode details require an exact known demo id", async () => {
  setMode(undefined);
  const result = await searchCars(search);
  const knownId = result.results[2].id;

  assert.equal(await getCarDetails("unknown", search), null);
  assert.equal((await getCarDetails(knownId, search))?.id, knownId);
});
