import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultDealsSearch } from "./dealsSearchParams";
import {
  restoreDealsFlightRuntimeV2,
  shouldRenderDownstreamEmpty,
  type DownstreamLoadState,
} from "./dealsFlightRuntimeOrchestratorV2";
import type { DealsFlightRuntimeV2 } from "./dealsFlightRuntimeStorageV2";
import { createDealsTripPlanV2 } from "./dealsTripPlanV2";
import { inbound, outbound } from "./dealsTripPlanV2.test";

const fare = {
  fareKey: "flight-fare-v3:safe",
  cabinClass: "economy" as const,
  sourcePrice: 100,
  sourceCurrency: "USD",
};
const search = {
  ...createDefaultDealsSearch(),
  mode: "flight-car" as const,
  flightTripType: "round-trip" as const,
  flightOriginCode: outbound.originAirport,
  flightDestinationCode: outbound.destinationAirport,
  flightDepartureDate: outbound.departureTime.slice(0, 10),
  flightReturnDate: inbound.departureTime.slice(0, 10),
};
const fresh = createDealsTripPlanV2(search);
const stored = (tripType: "round-trip" | "one-way" = "round-trip") =>
  ({
    version: 1,
    inventoryToken: "inventory_capability_12345678901234567890",
    sourceSearchKey: fresh.productSearchKeys.flight,
    inventoryExpiresAt: "2099-01-01T00:00:00.000Z",
    tripType,
    outboundChoices: [outbound],
    returnChoices: tripType === "round-trip" ? [inbound] : [],
    fareChoices: [fare],
    selectedOutboundKey: outbound.itineraryKey,
    ...(tripType === "round-trip"
      ? { selectedReturnKey: inbound.itineraryKey }
      : {}),
    selectedFareKey: fare.fareKey,
  }) satisfies DealsFlightRuntimeV2;

test("restores a round trip through fresh returns, fares, and canonical events", async () => {
  let returns = 0;
  let fares = 0;
  const result = await restoreDealsFlightRuntimeV2({
    stored: stored(),
    freshPlan: fresh,
    search,
    searchKey: fresh.productSearchKeys.flight,
    requests: {
      getReturns: async () => (returns++, [inbound]),
      getFares: async () => (fares++, [fare]),
    },
  });
  assert.equal(returns, 1);
  assert.equal(fares, 1);
  assert.equal(result.runtime.selectedFareKey, fare.fareKey);
  assert.equal(result.plan.flightJourney?.fare?.fareKey, fare.fareKey);
});

test("one-way restoration skips returns and omits returnItineraryKey", async () => {
  const oneWaySearch = { ...search, flightTripType: "one-way" as const };
  const oneWayPlan = createDealsTripPlanV2(oneWaySearch);
  let request: Record<string, unknown> | undefined;
  const result = await restoreDealsFlightRuntimeV2({
    stored: {
      ...stored("one-way"),
      sourceSearchKey: oneWayPlan.productSearchKeys.flight,
    },
    freshPlan: oneWayPlan,
    search: oneWaySearch,
    searchKey: oneWayPlan.productSearchKeys.flight,
    requests: {
      getReturns: async () => assert.fail("returns must not be requested"),
      getFares: async (value) => ((request = value), [fare]),
    },
  });
  assert.equal("returnItineraryKey" in request!, false);
  assert.equal(result.runtime.selectedFareKey, fare.fareKey);
});

test("rejects a stale stored return before requesting fares", async () => {
  let fares = 0;
  const result = await restoreDealsFlightRuntimeV2({
    stored: stored(),
    freshPlan: fresh,
    search,
    searchKey: fresh.productSearchKeys.flight,
    requests: {
      getReturns: async () => [],
      getFares: async () => (fares++, [fare]),
    },
  });
  assert.equal(fares, 0);
  assert.equal(result.runtime.selectedOutboundKey, outbound.itineraryKey);
  assert.equal(result.runtime.selectedReturnKey, undefined);
  assert.equal(result.returnState, "empty");
});

test("failed outbound replay clears every staged selection", async () => {
  const forged = { ...outbound, direction: "return" as const };
  const result = await restoreDealsFlightRuntimeV2({
    stored: {
      ...stored(),
      outboundChoices: [forged],
      selectedOutboundKey: forged.itineraryKey,
    },
    freshPlan: fresh,
    search,
    searchKey: fresh.productSearchKeys.flight,
    requests: {
      getReturns: async () => assert.fail("must not request returns"),
      getFares: async () => assert.fail("must not request fares"),
    },
  });
  assert.equal(result.runtime.selectedOutboundKey, undefined);
  assert.deepEqual(result.plan, fresh);
});

test("downstream state distinguishes failures from successful empty responses", () => {
  const error: DownstreamLoadState = "error";
  const empty: DownstreamLoadState = "empty";
  assert.notEqual(error, empty);
});

for (const [stage, failure] of [
  ["return", "NETWORK_FAILURE"],
  ["return", "PROVIDER_TEMPORARILY_UNAVAILABLE"],
  ["return", "INVALID_SELECTION"],
  ["fare", "NETWORK_FAILURE"],
  ["fare", "PROVIDER_TEMPORARILY_UNAVAILABLE"],
] as const)
  test(`${stage} ${failure} never renders authoritative empty copy`, () => {
    assert.equal(shouldRenderDownstreamEmpty("error", 0), false);
  });

for (const stage of ["return", "fare"] as const)
  test(`successful zero ${stage} choices renders authoritative empty copy`, () => {
    assert.equal(shouldRenderDownstreamEmpty("empty", 0), true);
  });
