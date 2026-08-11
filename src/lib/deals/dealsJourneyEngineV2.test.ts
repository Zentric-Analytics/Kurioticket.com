import assert from "node:assert/strict";
import test from "node:test";
import {
  createDefaultDealsSearch,
  type DealsSearch,
} from "./dealsSearchParams";
import {
  applyDealsJourneyEventV2,
  getRequiredDealsJourneyStateV2,
} from "./dealsJourneyEngineV2";
import { createDealsTripPlanV2, type DealsTripPlanV2 } from "./dealsTripPlanV2";
import { car, hotel, inbound, offer, outbound } from "./dealsTripPlanV2.test";

const at = 10_100;
const makeSearch = (patch: Partial<DealsSearch> = {}): DealsSearch => ({
  ...createDefaultDealsSearch(),
  mode: "hotel-flight-car",
  flightOriginCode: "LOS",
  flightDestinationCode: "JFK",
  flightDepartureDate: "2027-01-01",
  flightReturnDate: "2027-01-10",
  hotelDestination: "New York",
  hotelCheckIn: "2027-01-01",
  hotelCheckOut: "2027-01-10",
  carPickupLocation: "JFK",
  carPickupDate: "2027-01-01",
  carReturnDate: "2027-01-10",
  ...patch,
});
const apply = (
  plan: DealsTripPlanV2,
  search: DealsSearch,
  event: Omit<
    Parameters<typeof applyDealsJourneyEventV2>[2],
    "expectedRevision"
  >,
  now = at,
) =>
  applyDealsJourneyEventV2(
    plan,
    search,
    { ...event, expectedRevision: plan.revision } as Parameters<
      typeof applyDealsJourneyEventV2
    >[2],
    now,
  );
const accepted = (result: ReturnType<typeof applyDealsJourneyEventV2>) => {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.reason);
  return result.plan;
};
const completeFlight = (
  plan: DealsTripPlanV2,
  search: DealsSearch,
  start = at,
) => {
  let next = accepted(
    apply(
      plan,
      search,
      { type: "FLIGHT_OUTBOUND_SELECTED", itinerary: outbound },
      start,
    ),
  );
  if (search.flightTripType === "round-trip")
    next = accepted(
      apply(
        next,
        search,
        { type: "FLIGHT_RETURN_SELECTED", itinerary: inbound },
        start + 1,
      ),
    );
  next = accepted(
    apply(
      next,
      search,
      {
        type: "FLIGHT_FARE_SELECTED",
        fare: { fareKey: "fare-1", cabinClass: "economy" },
      },
      start + 2,
    ),
  );
  next = accepted(
    apply(next, search, { type: "FLIGHT_REVALIDATION_STARTED" }, start + 3),
  );
  const selectedOffer =
    search.flightTripType === "round-trip"
      ? offer
      : { ...offer, returnItineraryKey: undefined, legs: [outbound] };
  return accepted(
    apply(
      next,
      search,
      {
        type: "FLIGHT_REVALIDATION_SUCCEEDED",
        offer: {
          ...selectedOffer,
          validatedAt: start + 3,
          providerExpiresAt: start + 1_000,
        },
      },
      start + 4,
    ),
  );
};

test("all four modes derive their initial product-order state", () => {
  for (const [mode, state] of [
    ["hotel-flight", "hotel"],
    ["flight-car", "flight-outbound"],
    ["hotel-car", "hotel"],
    ["hotel-flight-car", "hotel"],
  ] as const)
    assert.equal(
      getRequiredDealsJourneyStateV2(
        createDealsTripPlanV2(makeSearch({ mode }), at),
        at,
      ),
      state,
    );
});
test("hotel is a flight prerequisite and matching revision is accepted", () => {
  const search = makeSearch(),
    plan = createDealsTripPlanV2(search, 10_000);
  const rejected = apply(plan, search, {
    type: "FLIGHT_OUTBOUND_SELECTED",
    itinerary: outbound,
  });
  assert.equal(rejected.ok, false);
  const selected = apply(plan, search, { type: "HOTEL_CONFIRMED", hotel });
  assert.equal(selected.ok, true);
  assert.equal(selected.changed, true);
  assert.equal(selected.plan.revision, 1);
});
test("round-trip requires return; one-way goes directly to fare", () => {
  for (const tripType of ["round-trip", "one-way"] as const) {
    const search = makeSearch({ mode: "flight-car", flightTripType: tripType }),
      plan = accepted(
        apply(createDealsTripPlanV2(search, 10_000), search, {
          type: "FLIGHT_OUTBOUND_SELECTED",
          itinerary: outbound,
        }),
      );
    assert.equal(
      getRequiredDealsJourneyStateV2(plan, at),
      tripType === "round-trip" ? "flight-return" : "flight-fare",
    );
  }
});
test("fare cannot be bypassed before revalidation", () => {
  const search = makeSearch({ mode: "flight-car" });
  let plan = accepted(
    apply(createDealsTripPlanV2(search, 10_000), search, {
      type: "FLIGHT_OUTBOUND_SELECTED",
      itinerary: outbound,
    }),
  );
  plan = accepted(
    apply(plan, search, { type: "FLIGHT_RETURN_SELECTED", itinerary: inbound }),
  );
  const rejected = apply(plan, search, { type: "FLIGHT_REVALIDATION_STARTED" });
  assert.equal(rejected.ok, false);
  if (!rejected.ok) assert.equal(rejected.reason, "invalid-transition");
  plan = accepted(
    apply(plan, search, {
      type: "FLIGHT_FARE_SELECTED",
      fare: { fareKey: "fare-1", cabinClass: "economy" },
    }),
  );
  assert.equal(
    apply(plan, search, { type: "FLIGHT_REVALIDATION_STARTED" }).ok,
    true,
  );
});
test("confirmation enforces fare, itinerary identities, and fresh provider time", () => {
  const search = makeSearch({ mode: "flight-car" });
  let plan = createDealsTripPlanV2(search, 10_000);
  plan = accepted(
    apply(plan, search, {
      type: "FLIGHT_OUTBOUND_SELECTED",
      itinerary: outbound,
    }),
  );
  plan = accepted(
    apply(plan, search, { type: "FLIGHT_RETURN_SELECTED", itinerary: inbound }),
  );
  plan = accepted(
    apply(plan, search, {
      type: "FLIGHT_FARE_SELECTED",
      fare: { fareKey: "fare-1", cabinClass: "economy" },
    }),
  );
  plan = accepted(apply(plan, search, { type: "FLIGHT_REVALIDATION_STARTED" }));
  for (const patch of [
    { fareKey: undefined },
    { fareKey: "wrong" },
    { outboundItineraryKey: "wrong" },
    { returnItineraryKey: "wrong" },
    { providerExpiresAt: at },
  ]) {
    const result = apply(plan, search, {
      type: "FLIGHT_REVALIDATION_SUCCEEDED",
      offer: { ...offer, ...patch, validatedAt: at - 1 },
    });
    assert.equal(result.ok, false);
  }
  const result = apply(plan, search, {
    type: "FLIGHT_REVALIDATION_SUCCEEDED",
    offer: { ...offer, validatedAt: at - 1, providerExpiresAt: at + 100 },
  });
  assert.equal(result.ok, true);
});
test("provider expiry never counts as a complete flight and recovery resets only flight", () => {
  const search = makeSearch(),
    base = createDealsTripPlanV2(search, 10_000);
  let plan = accepted(apply(base, search, { type: "HOTEL_CONFIRMED", hotel }));
  plan = completeFlight(plan, search);
  const expired = {
    ...plan,
    flightJourney: {
      ...plan.flightJourney!,
      confirmedOffer: {
        ...plan.flightJourney!.confirmedOffer!,
        providerExpiresAt: at + 200,
      },
    },
  };
  assert.equal(
    getRequiredDealsJourneyStateV2(expired, at + 200),
    "flight-fare",
  );
  const withCar = { ...plan, car };
  const reset = accepted(
    apply(withCar, search, { type: "FLIGHT_OFFER_EXPIRED" }, at + 10),
  );
  assert.equal(reset.hotel?.id, hotel.id);
  assert.equal(reset.car?.id, car.id);
  assert.equal(reset.flightJourney?.phase, "outbound");
  assert.equal(reset.flightJourney?.outbound, undefined);
});
test("car requires all upstream products; completed modes reach review and handoff", () => {
  for (const mode of ["flight-car", "hotel-car", "hotel-flight-car"] as const) {
    const search = makeSearch({ mode });
    let plan = createDealsTripPlanV2(search, 10_000);
    assert.equal(apply(plan, search, { type: "CAR_CONFIRMED", car }).ok, false);
    if (mode !== "flight-car")
      plan = accepted(apply(plan, search, { type: "HOTEL_CONFIRMED", hotel }));
    if (mode !== "hotel-car") plan = completeFlight(plan, search, at + 10);
    plan = accepted(
      apply(plan, search, { type: "CAR_CONFIRMED", car }, at + 20),
    );
    assert.equal(getRequiredDealsJourneyStateV2(plan, at + 20), "review");
    const handoff = apply(
      plan,
      search,
      { type: "REVIEW_CONTINUE_REQUESTED" },
      at + 20,
    );
    assert.equal(handoff.ok, true);
    assert.equal(handoff.nextState, "handoff");
    assert.equal(handoff.changed, false);
    assert.equal(handoff.plan.revision, plan.revision);
  }
});
test("revision, context, non-monotonic time, and incomplete review reject cleanly", () => {
  const search = makeSearch(),
    plan = createDealsTripPlanV2(search, 10_000);
  const stale = applyDealsJourneyEventV2(
    plan,
    search,
    { type: "HOTEL_CONFIRMED", hotel, expectedRevision: 2 },
    at,
  );
  assert.equal(stale.ok, false);
  if (!stale.ok) assert.equal(stale.reason, "stale-revision");
  const mismatch = applyDealsJourneyEventV2(
    plan,
    { ...search, hotelRooms: 2 },
    { type: "HOTEL_CONFIRMED", hotel, expectedRevision: 0 },
    at,
  );
  assert.equal(mismatch.ok, false);
  if (!mismatch.ok) assert.equal(mismatch.reason, "search-context-mismatch");
  const backwards = apply(
    plan,
    search,
    { type: "HOTEL_CONFIRMED", hotel },
    9_999,
  );
  assert.equal(backwards.ok, false);
  const review = apply(plan, search, { type: "REVIEW_CONTINUE_REQUESTED" });
  assert.equal(review.ok, false);
  if (!review.ok) assert.equal(review.reason, "not-ready");
});
test("materially identical selections and flight stages are idempotent", () => {
  const search = makeSearch(),
    start = createDealsTripPlanV2(search, 10_000);
  let plan = accepted(apply(start, search, { type: "HOTEL_CONFIRMED", hotel }));
  let result = apply(plan, search, { type: "HOTEL_CONFIRMED", hotel });
  assert.equal(result.changed, false);
  plan = accepted(
    apply(plan, search, {
      type: "FLIGHT_OUTBOUND_SELECTED",
      itinerary: outbound,
    }),
  );
  result = apply(plan, search, {
    type: "FLIGHT_OUTBOUND_SELECTED",
    itinerary: outbound,
  });
  assert.equal(result.changed, false);
  plan = accepted(
    apply(plan, search, { type: "FLIGHT_RETURN_SELECTED", itinerary: inbound }),
  );
  result = apply(plan, search, {
    type: "FLIGHT_RETURN_SELECTED",
    itinerary: inbound,
  });
  assert.equal(result.changed, false);
  plan = accepted(
    apply(plan, search, {
      type: "FLIGHT_FARE_SELECTED",
      fare: { fareKey: "fare-1", cabinClass: "economy" },
    }),
  );
  result = apply(plan, search, {
    type: "FLIGHT_FARE_SELECTED",
    fare: { fareKey: "fare-1", cabinClass: "economy" },
  });
  assert.equal(result.changed, false);
});

test("reconciliation ignores excluded hidden inputs and preserves opened on no-op", () => {
  for (const [mode, patch] of [
    ["hotel-flight", { carPickupTime: "12:00" }],
    ["flight-car", { hotelRooms: 2 }],
    ["hotel-car", { flightCabinClass: "business" as const }],
  ] as const) {
    const search = makeSearch({ mode }),
      plan = {
        ...createDealsTripPlanV2(search, 10_000),
        updatedAt: 10_001,
        opened: { flight: 10_001 },
      };
    const result = apply(
      plan,
      { ...search, ...patch },
      { type: "SEARCH_RECONCILED" },
      at,
    );
    assert.equal(result.ok, true);
    assert.equal(result.changed, false);
    assert.equal(result.plan, plan);
    assert.deepEqual(result.plan.opened, plan.opened);
  }
});
test("reconciliation invalidates only changed active products", () => {
  const search = makeSearch(),
    base = createDealsTripPlanV2(search, 10_000);
  const populated = {
    ...base,
    updatedAt: 10_001,
    revision: 2,
    hotel,
    car,
    opened: { hotel: 10_001 },
    flightJourney: { ...base.flightJourney!, outbound },
  };
  for (const [patch, missing] of [
    [{ flightCabinClass: "business" as const }, "flight"],
    [{ hotelRooms: 2 }, "hotel"],
    [{ carPickupTime: "12:00" }, "car"],
  ] as const) {
    const result = apply(
      populated,
      { ...search, ...patch },
      { type: "SEARCH_RECONCILED" },
    );
    assert.equal(result.ok, true);
    assert.equal(result.changed, true);
    assert.equal(result.plan.revision, populated.revision + 1);
    assert.deepEqual(result.plan.opened, {});
    assert.equal(
      missing === "hotel"
        ? result.plan.hotel
        : missing === "car"
          ? result.plan.car
          : result.plan.flightJourney?.outbound,
      undefined,
    );
  }
});
test("mode transitions preserve unchanged included products and original lifetime", () => {
  const search = makeSearch({ mode: "hotel-flight" }),
    base = createDealsTripPlanV2(search, 10_000);
  const populated = {
    ...base,
    updatedAt: 10_001,
    revision: 2,
    hotel,
    flightJourney: { ...base.flightJourney!, outbound },
    opened: { hotel: 10_001 },
  };
  const added = accepted(
    apply(
      populated,
      { ...search, mode: "hotel-flight-car" },
      { type: "SEARCH_RECONCILED" },
    ),
  );
  assert.deepEqual(added.hotel, hotel);
  assert.deepEqual(added.flightJourney, populated.flightJourney);
  assert.equal(added.car, undefined);
  assert.equal(added.createdAt, populated.createdAt);
  assert.equal(added.expiresAt, populated.expiresAt);
  const removed = accepted(
    apply(
      { ...added, car },
      { ...search, mode: "hotel-flight" },
      { type: "SEARCH_RECONCILED" },
      at + 1,
    ),
  );
  assert.deepEqual(removed.hotel, hotel);
  assert.deepEqual(removed.flightJourney, populated.flightJourney);
  assert.equal(removed.car, undefined);
});
test("adding Hotel to flight-car preserves Flight/Car but makes Hotel required", () => {
  const search = makeSearch({ mode: "flight-car" }),
    base = createDealsTripPlanV2(search, 10_000);
  const populated = {
    ...base,
    updatedAt: 10_001,
    flightJourney: { ...base.flightJourney!, outbound },
    car,
  };
  const result = accepted(
    apply(
      populated,
      { ...search, mode: "hotel-flight-car" },
      { type: "SEARCH_RECONCILED" },
    ),
  );
  assert.deepEqual(result.flightJourney, populated.flightJourney);
  assert.deepEqual(result.car, car);
  assert.equal(result.hotel, undefined);
  assert.equal(getRequiredDealsJourneyStateV2(result, at), "hotel");
});
