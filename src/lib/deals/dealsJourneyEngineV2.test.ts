import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultDealsSearch } from "./dealsSearchParams";
import {
  applyDealsJourneyEventV2,
  getRequiredDealsJourneyStateV2,
} from "./dealsJourneyEngineV2";
import {
  createDealsTripPlanV2,
  type DealsFlightItineraryV2,
  type DealsConfirmedFlightOfferV2,
} from "./dealsTripPlanV2";
const now = 1000,
  search = () =>
    Object.assign(createDefaultDealsSearch(), {
      mode: "flight-car" as const,
      flightTripType: "round-trip" as const,
    });
const leg = (
  direction: "outbound" | "return",
  key = direction,
): DealsFlightItineraryV2 => ({
  itineraryKey: key,
  direction,
  originAirport: "LOS",
  destinationAirport: "LAX",
  departureTime: "2027-01-01T00:00:00Z",
  arrivalTime: "2027-01-01T10:00:00Z",
  duration: "10h",
  durationMinutes: 600,
  stops: 0,
  layovers: [],
  segments: [
    {
      originAirport: "LOS",
      destinationAirport: "LAX",
      departureTime: "2027-01-01T00:00:00Z",
      arrivalTime: "2027-01-01T10:00:00Z",
      durationMinutes: 600,
    },
  ],
});
const offer = (expires = 5000): DealsConfirmedFlightOfferV2 => ({
  resultId: "r",
  provider: "Duffel",
  providerOfferId: "offer",
  airline: "Air",
  outboundItineraryKey: "outbound",
  returnItineraryKey: "return",
  legs: [leg("outbound"), leg("return")],
  cabinClass: "economy",
  sourcePrice: 100,
  sourceCurrency: "USD",
  providerExpiresAt: expires,
  selectedAt: now,
  validatedAt: now,
});
test("round-trip progresses through semantic states to review and handoff", () => {
  const s = search();
  let p = createDealsTripPlanV2(s, now);
  assert.equal(getRequiredDealsJourneyStateV2(p, s, now), "flight-outbound");
  for (const event of [
    { type: "FLIGHT_OUTBOUND_SELECTED", itinerary: leg("outbound") },
    { type: "FLIGHT_RETURN_SELECTED", itinerary: leg("return") },
    { type: "FLIGHT_REVALIDATION_STARTED" },
    { type: "FLIGHT_REVALIDATION_SUCCEEDED", offer: offer() },
  ] as const) {
    const r = applyDealsJourneyEventV2(
      p,
      { ...event, expectedRevision: p.revision },
      s,
      now + 1,
    );
    assert.equal(r.ok, true);
    p = r.plan;
  }
  assert.equal(getRequiredDealsJourneyStateV2(p, s, now + 2), "car");
  const car = {
    id: "c",
    provider: "P",
    rentalCompany: "R",
    modelName: "M",
    categoryLabel: "C",
    pickupLocation: "LAX",
    returnLocation: "LAX",
    pickupDate: "2027-01-01",
    pickupTime: "10:00",
    dropoffDate: "2027-01-02",
    dropoffTime: "10:00",
    sourcePrice: 10,
    sourceCurrency: "USD",
    resultReceivedAt: now,
    detailsPath: "/cars/details/c",
  };
  const r = applyDealsJourneyEventV2(
    p,
    { type: "CAR_CONFIRMED", car, expectedRevision: p.revision },
    s,
    now + 2,
  );
  assert.equal(r.ok, true);
  assert.equal(r.nextState, "review");
  assert.equal(
    applyDealsJourneyEventV2(
      r.plan,
      { type: "REVIEW_CONTINUE_REQUESTED" },
      s,
      now + 2,
    ).nextState,
    "handoff",
  );
});
test("stale revisions are controlled and matching revisions mutate once", () => {
  const s = search(),
    p = { ...createDealsTripPlanV2(s, now), revision: 6 };
  const stale = applyDealsJourneyEventV2(
    p,
    {
      type: "FLIGHT_OUTBOUND_SELECTED",
      itinerary: leg("outbound"),
      expectedRevision: 5,
    },
    s,
    now + 1,
  );
  assert.equal(stale.ok, false);
  assert.equal(stale.ok ? "" : stale.reason, "stale-revision");
  assert.strictEqual(stale.plan, p);
  const good = applyDealsJourneyEventV2(
    p,
    {
      type: "FLIGHT_OUTBOUND_SELECTED",
      itinerary: leg("outbound"),
      expectedRevision: 6,
    },
    s,
    now + 1,
  );
  assert.equal(good.plan.revision, 7);
});
test("reconciliation invalidates only changed product identities and no-ops identical search", () => {
  const s = search(),
    p = createDealsTripPlanV2(s, now);
  const same = applyDealsJourneyEventV2(
    p,
    { type: "SEARCH_RECONCILED", expectedRevision: 0 },
    s,
    now + 1,
  );
  assert.equal(same.changed, false);
  const changed = { ...s, flightCabinClass: "first" as const };
  const result = applyDealsJourneyEventV2(
    { ...p, car: { id: "c" } as never },
    { type: "SEARCH_RECONCILED", expectedRevision: 0 },
    changed,
    now + 1,
  );
  assert.equal(result.plan.flightJourney?.phase, "outbound");
  assert.equal(result.plan.car?.id, "c");
  assert.equal(result.plan.revision, 1);
});
test("expired provider offer prevents review and recovery resets flight only", () => {
  const s = search(),
    p = {
      ...createDealsTripPlanV2(s, now),
      flightJourney: {
        ...createDealsTripPlanV2(s, now).flightJourney!,
        phase: "confirmed" as const,
        outbound: leg("outbound"),
        return: leg("return"),
        confirmedOffer: offer(now),
      },
    };
  assert.equal(getRequiredDealsJourneyStateV2(p, s, now), "flight-fare");
  const r = applyDealsJourneyEventV2(
    p,
    { type: "FLIGHT_OFFER_EXPIRED", expectedRevision: 0 },
    s,
    now - 1,
  );
  assert.equal(r.plan.flightJourney?.outbound, undefined);
});
