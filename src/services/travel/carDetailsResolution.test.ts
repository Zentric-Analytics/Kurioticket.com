import assert from "node:assert/strict";
import test from "node:test";
import type { CarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import { isKayakCarResultId, resolveCarDetails, type CarDetailsDependencies } from "./carAggregator";

const search: CarSearchParams = {
  pickupLocation: "BOS", dropoffLocation: "BOS",
  pickupDate: "2027-02-10", pickupTime: "10:30",
  dropoffDate: "2027-02-13", dropoffTime: "16:00", driverAge: "30",
};

function kayakCar(id: string, modelName = "Provider compact") {
  return {
    id, modelName, inventorySource: "kayak-sandbox", offers: [{ id: `${id}:offer` }],
  } as NormalizedCarResult;
}

function dependencies(overrides: Partial<CarDetailsDependencies> = {}) {
  const calls = { static: 0, searches: 0, exactWrites: 0, cohortWrites: 0 };
  const value: CarDetailsDependencies = {
    getExact: async () => null,
    getCohort: async () => [],
    searchKayak: async () => {
      calls.searches += 1;
      return { provider: "KAYAK sandbox", results: [], status: "success", latencyMs: 1 };
    },
    rememberExact: async () => { calls.exactWrites += 1; },
    rememberCohort: async () => { calls.cohortWrites += 1; },
    buildStatic: () => { calls.static += 1; return []; },
    ...overrides,
  };
  return { calls, value };
}

test("an exact provider-cache hit resolves a KAYAK car without static fallback", async () => {
  const id = "kayak-sandbox:opaque-provider-id:3";
  const expected = kayakCar(id);
  const fixture = dependencies({ getExact: async (vertical, resultId) => {
    assert.equal(vertical, "car");
    assert.equal(resultId, id, "the decoded result ID is used as the cache identity");
    return expected;
  } });
  assert.equal(await resolveCarDetails(id, search, undefined, fixture.value), expected);
  assert.deepEqual(fixture.calls, { static: 0, searches: 0, exactWrites: 0, cohortWrites: 0 });
});

test("a server-owned search cohort recovers the exact selected result after an exact miss", async () => {
  const first = kayakCar("kayak-sandbox:opaque-provider-a:0", "First car");
  const selected = kayakCar("kayak-sandbox:opaque-provider-b:1", "Selected car");
  const fixture = dependencies({ getCohort: async (received) => {
    assert.deepEqual(received, search);
    return [first, selected];
  } });
  assert.equal(await resolveCarDetails(selected.id, search, undefined, fixture.value), selected);
  assert.equal(fixture.calls.searches, 0);
  assert.equal(fixture.calls.static, 0);
});

test("a cache miss repeats the canonical provider search and remembers all results", async () => {
  const selected = kayakCar("kayak-sandbox:opaque-provider-id:7");
  const other = kayakCar("kayak-sandbox:different-provider-id:2");
  const context = { clientIp: "203.0.113.7", userAgent: "mobile-web-test" };
  const fixture = dependencies({ searchKayak: async (receivedSearch, receivedContext) => {
    fixture.calls.searches += 1;
    assert.deepEqual(receivedSearch, search);
    assert.equal(receivedContext, context);
    return { provider: "KAYAK sandbox", results: [other, selected], status: "success", latencyMs: 1 };
  } });
  assert.equal(await resolveCarDetails(selected.id, search, context, fixture.value), selected);
  assert.equal(fixture.calls.searches, 1);
  assert.equal(fixture.calls.exactWrites, 1);
  assert.equal(fixture.calls.cohortWrites, 1);
  assert.equal(fixture.calls.static, 0);
});

test("missing, mismatched, and malformed KAYAK results fail closed", async () => {
  const wanted = "kayak-sandbox:opaque-provider-id:9";
  const fixture = dependencies({
    getExact: async () => kayakCar("kayak-sandbox:another-id:9"),
    getCohort: async () => [{ ...kayakCar(wanted), inventorySource: "kurioticket-static-cars" }],
  });
  assert.equal(await resolveCarDetails(wanted, search, undefined, fixture.value), null);
  assert.equal(fixture.calls.static, 0);
  assert.equal(isKayakCarResultId("kayak-sandbox:"), false);
  assert.equal(isKayakCarResultId("kayak-sandbox:../../private"), false);
  assert.equal(isKayakCarResultId("kayak-sandbox:valid:opaque:4"), true);
  assert.equal(await resolveCarDetails("kayak-sandbox:bad/id", search, undefined, fixture.value), null);
  assert.equal(fixture.calls.searches, 1, "malformed IDs do not trigger another provider request");
});

test("normal static car IDs retain the catalogue-only resolution path", async () => {
  const expected = { id: "static-car-luxury-eclass" } as NormalizedCarResult;
  const fixture = dependencies({ buildStatic: received => {
    fixture.calls.static += 1;
    assert.deepEqual(received, search);
    return [expected];
  } });
  assert.equal(await resolveCarDetails(expected.id, search, undefined, fixture.value), expected);
  assert.deepEqual(fixture.calls, { static: 1, searches: 0, exactWrites: 0, cohortWrites: 0 });
});
