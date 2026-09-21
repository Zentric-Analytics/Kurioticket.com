import assert from "node:assert/strict";
import test from "node:test";
import type { LocationBoundCarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import { buildStaticCarResults } from "./staticCarResults";
import { searchCars } from "./carAggregator";

const search: LocationBoundCarSearchParams = {
  pickupLocation: "London (LHR)", dropoffLocation: "London (LHR)",
  pickupDate: "2099-10-12", pickupTime: "10:00",
  dropoffDate: "2099-10-15", dropoffTime: "10:00", driverAge: "30",
};

const kayakResult = (): NormalizedCarResult => ({
  ...buildStaticCarResults(search)[0],
  id: "kayak-sandbox:provider-car:0",
  inventorySource: "kayak-sandbox",
  offers: [],
});

test("successful KAYAK cars merge unchanged and persist through both details caches", async () => {
  const persisted: Array<{ kind: string; ids: string[] }> = [];
  const providerCar = kayakResult();
  const result = await searchCars(search, { dependencies: {
    searchKayak: async () => ({ provider: "KAYAK sandbox", status: "success", results: [providerCar], latencyMs: 4 }),
    rememberResults: async (_vertical, rows) => { persisted.push({ kind: "exact", ids: rows.map((row) => row.id) }); },
    rememberCohort: async (rows) => { persisted.push({ kind: "cohort", ids: rows.map((row) => row.id) }); },
  }});

  assert.equal(result.results.filter((row) => row.id === providerCar.id).length, 1);
  assert.equal(result.results.at(-1)?.id, providerCar.id);
  assert.deepEqual(persisted, [
    { kind: "exact", ids: [providerCar.id] },
    { kind: "cohort", ids: [providerCar.id] },
  ]);
  assert.ok(result.results.some((row) => row.inventorySource === "kurioticket-static-cars"));
  assert.deepEqual(result.warnings, []);
});

test("a failed KAYAK call leaves normal Cars inventory intact without fabricating cache rows", async () => {
  let persisted = 0;
  const normal = buildStaticCarResults(search);
  const result = await searchCars(search, { dependencies: {
    searchKayak: async () => ({ provider: "KAYAK sandbox", status: "failed", results: [], latencyMs: 8, errorCategory: "network", errorReason: "provider_network_error" }),
    rememberResults: async (_vertical, rows) => { persisted += rows.length; },
    rememberCohort: async (rows) => { persisted += rows.length; },
  }});

  assert.deepEqual(result.results, normal);
  assert.equal(persisted, 0);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.results.some((row) => row.inventorySource === "kayak-sandbox"), false);
});
