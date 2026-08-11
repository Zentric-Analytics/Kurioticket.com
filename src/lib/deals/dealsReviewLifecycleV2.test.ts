import assert from "node:assert/strict";
import test from "node:test";
import { DEALS_TRIP_PLAN_TTL_MS } from "./dealsTripPlan";
import {
  buildDealsReviewSnapshotV2,
  evaluateDealsReviewLifecycleV2,
  isCurrentDealsReviewSnapshotV2,
} from "./dealsReviewLifecycleV2";
import type { DealsTripPlanV2 } from "./dealsTripPlanV2";
import { car, hotel, offer } from "./dealsTripPlanV2.test";

const now = 100_000;
const plan = (patch: Partial<DealsTripPlanV2> = {}): DealsTripPlanV2 => ({
  version: 2,
  mode: "hotel-flight-car",
  searchFingerprint: "search-a",
  productSearchKeys: { hotel: "h", flight: "f", car: "c" },
  createdAt: 1,
  updatedAt: 90_000,
  expiresAt: now + 50_000,
  revision: 12,
  hotel: { ...hotel, resultReceivedAt: now - 1_000 },
  car: { ...car, resultReceivedAt: now - 1_000 },
  flightJourney: {
    searchKey: "f",
    tripType: "round-trip",
    phase: "confirmed",
    outbound: offer.legs[0],
    return: offer.legs[1],
    fare: { fareKey: offer.fareKey, cabinClass: offer.cabinClass },
    confirmedOffer: {
      ...offer,
      validatedAt: now - 1_000,
      offerExpiresAt: now + 20_000,
    },
  },
  opened: {},
  ...patch,
});

test("snapshot matching requires exact revision and fingerprint", () => {
  const current = plan();
  assert.equal(
    isCurrentDealsReviewSnapshotV2(
      current,
      buildDealsReviewSnapshotV2(current),
    ),
    true,
  );
  assert.equal(
    isCurrentDealsReviewSnapshotV2(current, {
      revision: 13,
      searchFingerprint: "search-a",
    }),
    false,
  );
  assert.equal(
    isCurrentDealsReviewSnapshotV2(current, {
      revision: 12,
      searchFingerprint: "search-b",
    }),
    false,
  );
});

test("stale Flight and Car timers cannot mutate or recover revision 13", () => {
  const current = plan({ revision: 13 });
  const old = { revision: 12, searchFingerprint: "search-a" };
  for (const expired of [
    plan({
      flightJourney: {
        ...plan().flightJourney!,
        confirmedOffer: { ...offer, offerExpiresAt: now - 1 },
      },
    }),
    plan({ car: { ...car, resultReceivedAt: now - DEALS_TRIP_PLAN_TTL_MS } }),
  ]) {
    void expired; // The queued timer's captured plan is deliberately irrelevant.
    assert.deepEqual(evaluateDealsReviewLifecycleV2(current, old, now), {
      status: "stale",
    });
    assert.equal(current.revision, 13);
    assert.ok(current.flightJourney?.confirmedOffer);
    assert.ok(current.car);
  }
});

test("matching expired Flight requests canonical Flight recovery", () => {
  const current = plan({
    flightJourney: {
      ...plan().flightJourney!,
      confirmedOffer: { ...offer, validatedAt: now - 10, offerExpiresAt: now },
    },
  });
  assert.equal(
    evaluateDealsReviewLifecycleV2(
      current,
      buildDealsReviewSnapshotV2(current),
      now,
    ).status,
    "expired",
  );
  assert.equal(
    (
      evaluateDealsReviewLifecycleV2(
        current,
        buildDealsReviewSnapshotV2(current),
        now,
      ) as { kind: string }
    ).kind,
    "flight-offer",
  );
});

test("matching expired Car requests Car recovery without changing the plan", () => {
  const current = plan({
    car: { ...car, resultReceivedAt: now - DEALS_TRIP_PLAN_TTL_MS },
  });
  const outcome = evaluateDealsReviewLifecycleV2(
    current,
    buildDealsReviewSnapshotV2(current),
    now,
  );
  assert.deepEqual(outcome, { status: "expired", kind: "car", plan: current });
});

test("confirm-time evaluation fails closed for hard plan expiry", () => {
  const current = plan({ expiresAt: now });
  assert.equal(
    (
      evaluateDealsReviewLifecycleV2(
        current,
        buildDealsReviewSnapshotV2(current),
        now,
      ) as { kind: string }
    ).kind,
    "plan",
  );
});

test("confirm-time evaluation fails closed for Hotel expiry", () => {
  const current = plan({
    hotel: { ...hotel, resultReceivedAt: now - DEALS_TRIP_PLAN_TTL_MS },
  });
  assert.equal(
    (
      evaluateDealsReviewLifecycleV2(
        current,
        buildDealsReviewSnapshotV2(current),
        now,
      ) as { kind: string }
    ).kind,
    "hotel",
  );
});

test("fresh Review is ready for parent REVIEW_CONTINUE_REQUESTED", () => {
  const current = plan();
  assert.deepEqual(
    evaluateDealsReviewLifecycleV2(
      current,
      buildDealsReviewSnapshotV2(current),
      now,
    ),
    { status: "review-ready", plan: current },
  );
});

test("an old confirm handler cannot approve a newer revision", () => {
  const current = plan({ revision: 13 });
  assert.deepEqual(
    evaluateDealsReviewLifecycleV2(
      current,
      { revision: 12, searchFingerprint: current.searchFingerprint },
      now,
    ),
    { status: "stale" },
  );
});
