import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDealsReviewSnapshotV2,
  evaluateDealsReviewLifecycleV2,
} from "./dealsReviewLifecycleV2";
import {
  installDealsCurrentPlanV2,
  isDealsFlightInventoryBlockedByHotelV2,
} from "./dealsFlightJourneyControllerV2";
import {
  createDealsTripPlanV2,
  createDealsTripPlanV2ForRestart,
} from "./dealsTripPlanV2";
import { confirmedPlan, hotel } from "./dealsTripPlanV2.test";
import { createDefaultDealsSearch } from "./dealsSearchParams";
import { DEALS_TRIP_PLAN_TTL_MS } from "./dealsTripPlan";

test("install makes revision 13 canonical before exposing it to React", () => {
  const revision12 = { ...confirmedPlan(), revision: 12 };
  const revision13 = { ...revision12, revision: 13 };
  const planRef = { current: revision12 };
  let exposedRevision = 12;

  installDealsCurrentPlanV2(
    planRef,
    (next) => {
      assert.equal(planRef.current.revision, 13);
      exposedRevision = next.revision;
    },
    revision13,
  );

  assert.equal(exposedRevision, 13);
});

test("queued revision-12 deadline observes synchronously installed revision 13", () => {
  const revision12 = { ...confirmedPlan(), revision: 12 };
  const snapshot = buildDealsReviewSnapshotV2(revision12);
  const planRef = { current: revision12 };
  let lifecycleMutations = 0;
  const oldDeadline = () => {
    const outcome = evaluateDealsReviewLifecycleV2(
      planRef.current,
      snapshot,
      revision12.updatedAt,
    );
    if (outcome.status !== "stale") lifecycleMutations += 1;
    return outcome;
  };

  installDealsCurrentPlanV2(planRef, () => undefined, {
    ...revision12,
    revision: 13,
  });

  assert.deepEqual(oldDeadline(), { status: "stale" });
  assert.equal(lifecycleMutations, 0);
});

test("old revision-12 Confirm cannot dispatch or approve after revision 13 installs", () => {
  const revision12 = { ...confirmedPlan(), revision: 12 };
  const snapshot = buildDealsReviewSnapshotV2(revision12);
  const planRef = { current: revision12 };
  let continueRequests = 0;
  let approvals = 0;
  const oldConfirm = () => {
    const outcome = evaluateDealsReviewLifecycleV2(
      planRef.current,
      snapshot,
      revision12.updatedAt,
    );
    if (outcome.status === "stale") return "stale";
    continueRequests += 1;
    approvals += 1;
    return "confirmed";
  };

  installDealsCurrentPlanV2(planRef, () => undefined, {
    ...revision12,
    revision: 13,
  });

  assert.equal(oldConfirm(), "stale");
  assert.equal(continueRequests, 0);
  assert.equal(approvals, 0);
});

test("Hotel package modes block inventory after a stale-Hotel restart", () => {
  for (const mode of ["hotel-flight", "hotel-flight-car"] as const) {
    const search = { ...createDefaultDealsSearch(), mode };
    const stale = {
      ...createDealsTripPlanV2(search, 10_000),
      hotel: {
        ...hotel,
        resultReceivedAt: 10_000 - DEALS_TRIP_PLAN_TTL_MS,
      },
    };
    const restarted = createDealsTripPlanV2ForRestart(search, stale, 10_000);
    let inventoryRequests = 0;
    if (!isDealsFlightInventoryBlockedByHotelV2(mode, restarted))
      inventoryRequests += 1;
    assert.equal(restarted.hotel, undefined);
    assert.equal(inventoryRequests, 0);
  }
});

test("fresh Hotels permit both package modes while flight-car needs no Hotel", () => {
  for (const mode of ["hotel-flight", "hotel-flight-car"] as const) {
    const search = { ...createDefaultDealsSearch(), mode };
    const upstream = {
      ...createDealsTripPlanV2(search, 10_000),
      hotel,
    };
    const restarted = createDealsTripPlanV2ForRestart(search, upstream, 10_100);
    assert.equal(restarted.hotel?.id, hotel.id);
    assert.equal(
      isDealsFlightInventoryBlockedByHotelV2(mode, restarted),
      false,
    );
  }
  const flightCar = {
    ...confirmedPlan(),
    mode: "flight-car" as const,
    hotel: undefined,
  };
  assert.equal(
    isDealsFlightInventoryBlockedByHotelV2("flight-car", flightCar),
    false,
  );
});
