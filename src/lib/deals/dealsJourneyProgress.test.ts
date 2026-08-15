import assert from "node:assert/strict";
import test from "node:test";
import {
  createDealsJourneyProgress,
  getDealsJourneyStepIds,
  getGuidedDealsJourneyProgress,
  getHandoffReadyDealsJourneyProgress,
  getDealsJourneyProgressV2,
} from "./dealsJourneyProgress";
import { createDealsTripPlan } from "./dealsTripPlan";
import { getIncludedProductList } from "./dealsSearchParams";

test("every mode has only selected products in canonical order", () => {
  assert.deepEqual(getDealsJourneyStepIds("hotel-flight"), [
    "hotel",
    "flight",
    "review",
  ]);
  assert.deepEqual(getDealsJourneyStepIds("hotel-flight-car"), [
    "hotel",
    "flight",
    "car",
    "review",
  ]);
  assert.deepEqual(getDealsJourneyStepIds("flight-car"), [
    "flight",
    "car",
    "review",
  ]);
  assert.deepEqual(getDealsJourneyStepIds("hotel-car"), [
    "hotel",
    "car",
    "review",
  ]);
});

test("V2 progress follows restored Flight substates and product transitions", () => {
  const now = 1_000_000;
  const outbound = {
    itineraryKey: "out",
    direction: "outbound" as const,
    originAirport: "LHR",
    destinationAirport: "JFK",
    departureTime: "2027-01-01T10:00:00Z",
    arrivalTime: "2027-01-01T18:00:00Z",
    duration: "8h",
    durationMinutes: 480,
    stops: 0,
    layovers: [],
    segments: [],
  };
  const base = {
    version: 2 as const,
    mode: "flight-car" as const,
    searchFingerprint: "fingerprint",
    productSearchKeys: { flight: "flight", car: "car" },
    createdAt: now,
    updatedAt: now,
    expiresAt: now + 60_000,
    revision: 1,
    opened: {},
  };
  const progress = (flightJourney: Record<string, unknown>, car?: object) =>
    getDealsJourneyProgressV2(
      { ...base, flightJourney, ...(car ? { car } : {}) } as never,
      now,
    );
  const current = (value: ReturnType<typeof progress>) =>
    value.steps.find((step) => step.status === "current");

  assert.deepEqual(
    current(progress({ tripType: "round-trip", phase: "outbound" })),
    {
      id: "flight",
      status: "current",
      substate: "choose-outbound",
    },
  );
  assert.equal(
    current(progress({ tripType: "round-trip", phase: "brand", outbound }))
      ?.substate,
    "choose-fare-brand",
  );
  assert.equal(
    current(
      progress({
        tripType: "round-trip",
        phase: "return",
        outbound,
        fareBrand: { brandOptionKey: "b", fareBrandName: "Flex" },
      }),
    )?.substate,
    "choose-return",
  );
  assert.equal(
    current(progress({ tripType: "one-way", phase: "fare", outbound }))
      ?.substate,
    "choose-final-fare",
  );
  assert.equal(
    current(
      progress({
        tripType: "one-way",
        phase: "revalidating",
        outbound,
        fare: { fareKey: "fare", cabinClass: "economy" },
      }),
    )?.substate,
    "verify-flight",
  );

  const fare = { fareKey: "fare", cabinClass: "economy" as const };
  const confirmedOffer = {
    provider: "provider",
    airline: "Airline",
    outboundItineraryKey: "out",
    fareKey: "fare",
    legs: [outbound],
    cabinClass: "economy" as const,
    sourcePrice: 100,
    sourceCurrency: "USD",
    offerExpiresAt: now + 30_000,
    selectedAt: now - 2,
    validatedAt: now - 1,
  };
  const confirmed = {
    tripType: "one-way",
    phase: "confirmed",
    outbound,
    fare,
    confirmedOffer,
  };
  assert.equal(current(progress(confirmed))?.id, "car");
  assert.equal(
    current(progress(confirmed, { resultReceivedAt: now }))?.id,
    "review",
  );
});
test("progress derives indexes and default completed, current, and upcoming states", () => {
  const value = createDealsJourneyProgress("hotel-flight-car", {
    hotel: { status: "completed" },
    flight: { status: "current", substate: "choose-outbound" },
  });
  assert.equal(value.currentStepIndex, 2);
  assert.equal(value.total, 4);
  assert.deepEqual(
    value.steps.map((step) => step.status),
    ["completed", "current", "upcoming", "upcoming"],
  );
});
test("needs-attention and summaries survive while excluded product status is normalized away", () => {
  const value = createDealsJourneyProgress("hotel-car", {
    flight: { status: "current" },
    hotel: { status: "needs-attention", summary: "Choose another room" },
  });
  assert.deepEqual(
    value.steps.map((step) => step.id),
    ["hotel", "car", "review"],
  );
  assert.equal(value.steps[0].status, "needs-attention");
  assert.equal(value.steps[0].summary, "Choose another room");
});
for (const mode of [
  "hotel-flight",
  "flight-car",
  "hotel-flight-car",
  "hotel-car",
] as const) {
  test(`${mode} guided Review is current before handoff`, () => {
    const value = getGuidedDealsJourneyProgress("review", mode, {
      hotel: {} as never,
      flight: {} as never,
      car: {} as never,
    });
    assert.equal(value.steps.at(-1)?.id, "review");
    assert.equal(value.steps.at(-1)?.status, "current");
    assert.equal(value.steps.at(-1)?.substate, "review-trip");
    assert.equal(value.currentStepIndex, value.steps.length);
  });

  test(`${mode} guided handoff completes products and Review`, () => {
    const plan = createDealsTripPlan({
      mode,
      searchFingerprint: "x",
      resultsPath: "/packages/results",
    });
    const value = getHandoffReadyDealsJourneyProgress(plan, "guided");
    assert.ok(value.steps.every((step) => step.status === "completed"));
    assert.equal(value.steps.at(-1)?.id, "review");
    assert.equal(value.steps.at(-1)?.status, "completed");
    assert.equal(
      value.steps.some((step) => step.status === "current"),
      false,
    );
    assert.equal(value.currentStepIndex, null);
  });

  test(`${mode} legacy handoff keeps product-only progress`, () => {
    const plan = createDealsTripPlan({
      mode,
      searchFingerprint: "x",
      resultsPath: "/packages/results",
    });
    const value = getHandoffReadyDealsJourneyProgress(plan);
    assert.deepEqual(
      value.steps.map((step) => step.id),
      [...getIncludedProductList(mode)],
    );
    assert.ok(value.steps.every((step) => step.status === "completed"));
    assert.equal(
      value.steps.some((step) => step.id === "review"),
      false,
    );
    assert.equal(
      value.steps.some((step) => step.status === "current"),
      false,
    );
    assert.equal(value.currentStepIndex, null);
  });
}
test("active product and Review progress retains 1-based current indexes", () => {
  for (const [id, currentStepIndex] of [
    ["hotel", 1],
    ["flight", 2],
    ["car", 3],
    ["review", 4],
  ] as const) {
    const value = createDealsJourneyProgress("hotel-flight-car", {
      [id]: { status: "current" },
    });
    assert.equal(value.currentStepIndex, currentStepIndex);
    assert.equal(value.steps[currentStepIndex - 1]?.id, id);
  }
});
test("guided results and details stages use truthful progress labels", () => {
  for (const [stage, expected] of [
    ["hotel-results", "choose-property"],
    ["hotel-details", "choose-room"],
    ["flight-results", "choose-outbound"],
    ["flight-details", "review-flight"],
    ["car-results", "choose-car"],
    ["car-details", "review-car"],
  ] as const) {
    const progress = getGuidedDealsJourneyProgress(
      stage,
      "hotel-flight-car",
      null,
    );
    assert.equal(
      progress.steps.find((step) => step.status === "current")?.substate,
      expected,
    );
  }
});
test("one-way and round-trip flight details never claim return selection", () => {
  for (const mode of ["flight-car", "hotel-flight-car"] as const)
    assert.equal(
      getGuidedDealsJourneyProgress("flight-details", mode, null).steps.find(
        (step) => step.id === "flight",
      )?.substate,
      "review-flight",
    );
});
