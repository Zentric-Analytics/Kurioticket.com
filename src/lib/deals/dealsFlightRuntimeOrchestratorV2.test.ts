import assert from "node:assert/strict";
import test from "node:test";
import { buildDealsProductSearchKeys } from "./dealsProductSearchKeys";
import { createDefaultDealsSearch } from "./dealsSearchParams";
import { createDealsTripPlanV2 } from "./dealsTripPlanV2";
import { inbound, outbound } from "./dealsTripPlanV2.test";
import { restoreDealsFlightRuntimeV2 } from "./dealsFlightRuntimeOrchestratorV2";
import type { DealsFlightRuntimeV2 } from "./dealsFlightRuntimeStorageV2";

const fare = {
  fareKey: "flight-fare-v3:safe",
  cabinClass: "economy" as const,
  sourcePrice: 250,
  sourceCurrency: "USD",
};
const setup = (tripType: "round-trip" | "one-way" = "round-trip") => {
  const search = createDefaultDealsSearch();
  search.mode = "flight-car";
  search.flightTripType = tripType;
  search.flightOriginCode = "LOS";
  search.flightDestinationCode = "JFK";
  search.flightDepartureDate = "2027-01-01";
  search.flightReturnDate = "2027-01-10";
  const searchKey = buildDealsProductSearchKeys(search).flight;
  const stored: DealsFlightRuntimeV2 = {
    version: 1,
    inventoryToken: "inventory_capability_12345678901234567890",
    sourceSearchKey: searchKey,
    inventoryExpiresAt: "2027-01-01T00:00:00.000Z",
    tripType,
    outboundChoices: [outbound],
    returnChoices: tripType === "round-trip" ? [inbound] : [],
    fareChoices: [fare],
    selectedOutboundKey: outbound.itineraryKey,
    ...(tripType === "round-trip"
      ? { selectedReturnKey: inbound.itineraryKey }
      : {}),
    selectedFareKey: fare.fareKey,
  };
  return { search, searchKey, stored, plan: createDealsTripPlanV2(search) };
};

test("authoritatively restores round-trip outbound, return, fare, and staged plan", async () => {
  const value = setup();
  const calls: unknown[] = [];
  const result = await restoreDealsFlightRuntimeV2({
    stored: value.stored,
    initialPlan: value.plan,
    search: value.search,
    searchKey: value.searchKey,
    getReturns: async (request) => (calls.push(request), [inbound]),
    getFares: async (request) => (calls.push(request), [fare]),
  });
  assert.equal(result.runtime.selectedFareKey, fare.fareKey);
  assert.equal(result.plan.flightJourney?.outbound?.itineraryKey, "out-1");
  assert.equal(result.plan.flightJourney?.return?.itineraryKey, "ret-1");
  assert.equal(result.plan.flightJourney?.fare?.fareKey, fare.fareKey);
  assert.equal(calls.length, 2);
});

test("one-way skips returns and omits returnItineraryKey from fares", async () => {
  const value = setup("one-way");
  let fareRequest: Record<string, unknown> | undefined;
  const result = await restoreDealsFlightRuntimeV2({
    stored: value.stored,
    initialPlan: value.plan,
    search: value.search,
    searchKey: value.searchKey,
    getReturns: async () => assert.fail("return request must be skipped"),
    getFares: async (request) => ((fareRequest = request), [fare]),
  });
  assert.ok(!("returnItineraryKey" in fareRequest!));
  assert.equal(result.plan.flightJourney?.fare?.fareKey, fare.fareKey);
});

test("rejects stored return and downstream fare absent from authoritative lists", async () => {
  const value = setup();
  const result = await restoreDealsFlightRuntimeV2({
    stored: value.stored,
    initialPlan: value.plan,
    search: value.search,
    searchKey: value.searchKey,
    getReturns: async () => [],
    getFares: async () => assert.fail("fares must not load without a return"),
  });
  assert.equal(result.rejectedStage, "return");
  assert.equal(result.runtime.selectedReturnKey, undefined);
  assert.equal(result.runtime.selectedFareKey, undefined);
  assert.equal(result.plan.flightJourney?.phase, "return");
});

test("rejects a forged stored fare after authoritative fare refresh", async () => {
  const value = setup();
  const result = await restoreDealsFlightRuntimeV2({
    stored: value.stored,
    initialPlan: value.plan,
    search: value.search,
    searchKey: value.searchKey,
    getReturns: async () => [inbound],
    getFares: async () => [{ ...fare, fareKey: "flight-fare-v3:new" }],
  });
  assert.equal(result.rejectedStage, "fare");
  assert.equal(result.runtime.selectedFareKey, undefined);
  assert.equal(result.plan.flightJourney?.phase, "fare");
});

test("failed canonical replay fails closed at the affected stage", async () => {
  const value = setup();
  const result = await restoreDealsFlightRuntimeV2({
    stored: value.stored,
    initialPlan: value.plan,
    search: value.search,
    searchKey: value.searchKey,
    getReturns: async () => [inbound],
    getFares: async () => [fare],
    apply: (plan) => ({
      ok: false,
      plan,
      changed: false,
      reason: "invalid-transition",
      nextState: "flight-outbound",
    }),
  });
  assert.equal(result.rejectedStage, "outbound");
  assert.equal(result.runtime.selectedOutboundKey, undefined);
  assert.equal(result.plan.flightJourney?.outbound, undefined);
});

test("runtime restoration has no revalidation, car, review, handoff, or navigation effects", async () => {
  const value = setup("one-way");
  const paths: string[] = [];
  await restoreDealsFlightRuntimeV2({
    stored: value.stored,
    initialPlan: value.plan,
    search: value.search,
    searchKey: value.searchKey,
    getReturns: async () => [],
    getFares: async () => (
      paths.push("/api/deals/v2/flights/inventory/fares"),
      [fare]
    ),
  });
  assert.deepEqual(paths, ["/api/deals/v2/flights/inventory/fares"]);
  for (const forbidden of [
    "revalidate",
    "car",
    "review",
    "handoff",
    "redirect",
  ])
    assert.ok(paths.every((path) => !path.includes(forbidden)));
});
