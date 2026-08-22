import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultDealsSearch } from "./dealsSearchParams";
import { parseDealsTripPlan } from "./dealsTripPlanStorage";
import {
  DEALS_TRIP_PLAN_TTL_MS,
  type DealsTripPlanCar,
  type DealsTripPlanHotel,
} from "./dealsTripPlan";
import {
  canonicalizeDealsTripPlanV2,
  createDealsTripPlanV2,
  createDealsTripPlanV2ForRestart,
  getDealsTripPlanV2NextDeadline,
  parseDealsTripPlanV2,
  serializeDealsTripPlanV2,
  type DealsConfirmedFlightOfferV2,
  type DealsFlightItineraryV2,
  type DealsTripPlanV2,
} from "./dealsTripPlanV2";

const now = 10_000;
const search = () => ({
  ...createDefaultDealsSearch(),
  mode: "hotel-flight-car" as const,
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
});
export const outbound: DealsFlightItineraryV2 = {
  itineraryKey: "out-1",
  direction: "outbound",
  originAirport: "LOS",
  destinationAirport: "JFK",
  departureTime: "2027-01-01T10:00:00Z",
  arrivalTime: "2027-01-01T18:00:00Z",
  duration: "8h",
  durationMinutes: 480,
  stops: 0,
  layovers: [],
  segments: [
    {
      originAirport: "LOS",
      destinationAirport: "JFK",
      departureTime: "2027-01-01T10:00:00Z",
      arrivalTime: "2027-01-01T18:00:00Z",
      airlineName: "Air",
      flightNumber: "KT1",
    },
  ],
};
export const inbound: DealsFlightItineraryV2 = {
  ...outbound,
  itineraryKey: "ret-1",
  direction: "return",
  originAirport: "JFK",
  destinationAirport: "LOS",
  departureTime: "2027-01-10T10:00:00Z",
  arrivalTime: "2027-01-10T18:00:00Z",
  segments: [
    {
      originAirport: "JFK",
      destinationAirport: "LOS",
      departureTime: "2027-01-10T10:00:00Z",
      arrivalTime: "2027-01-10T18:00:00Z",
    },
  ],
};
export const hotel: DealsTripPlanHotel = {
  id: "h1",
  provider: "HotelCo",
  name: "Stay",
  location: "NY",
  checkIn: "2027-01-01",
  checkOut: "2027-01-10",
  roomType: "King",
  sourcePrice: 500,
  sourceCurrency: "USD",
  resultReceivedAt: now,
  detailsPath: "/hotels/details/h1",
};
export const car: DealsTripPlanCar = {
  id: "c1",
  provider: "CarCo",
  rentalCompany: "Rent",
  modelName: "Model",
  categoryLabel: "Compact",
  pickupLocation: "JFK",
  returnLocation: "JFK",
  pickupDate: "2027-01-01",
  pickupTime: "10:00",
  dropoffDate: "2027-01-10",
  dropoffTime: "10:00",
  sourcePrice: 100,
  sourceCurrency: "USD",
  resultReceivedAt: now,
  detailsPath:
    "/cars/details/c1?pickupLocation=JFK&dropoffLocation=JFK&pickupDate=2027-01-01&pickupTime=10%3A00&dropoffDate=2027-01-10&dropoffTime=10%3A00&driverAge=30",
};
export const offer: DealsConfirmedFlightOfferV2 = {
  provider: "Duffel",
  airline: "Air",
  flightNumber: "KT1",
  outboundItineraryKey: "out-1",
  returnItineraryKey: "ret-1",
  fareKey: "fare-1",
  legs: [outbound, inbound],
  cabinClass: "economy",
  baggageInfo: "1 bag",
  refundInfo: "Refundable",
  sourcePrice: 900,
  sourceCurrency: "USD",
  selectedAt: now,
  validatedAt: now + 1,
  offerExpiresAt: now + 1_000,
};
export const confirmedPlan = (): DealsTripPlanV2 => {
  const base = createDealsTripPlanV2(search(), now);
  return {
    ...base,
    updatedAt: now + 2,
    revision: 1,
    hotel,
    car,
    opened: { hotel: now, flight: now + 1, car: now + 2 },
    flightJourney: {
      searchKey: base.productSearchKeys.flight,
      tripType: "round-trip",
      phase: "confirmed",
      outbound,
      fareBrand: {
        brandOptionKey: "flight-brand-v1:a",
        fareBrandName: "Flex",
        cabinClass: "economy",
      },
      return: inbound,
      fare: {
        fareKey: "fare-1",
        cabinClass: "economy",
        brand: "Provider fare",
        baggageInfo: "1 bag",
        refundInfo: "Refundable",
      },
      confirmedOffer: offer,
    },
  };
};

test("creation is v2 revision zero with a fixed TTL and parser separation", () => {
  const plan = createDealsTripPlanV2(search(), now);
  assert.equal(plan.version, 2);
  assert.equal(plan.revision, 0);
  assert.equal(plan.expiresAt - plan.createdAt, DEALS_TRIP_PLAN_TTL_MS);
  assert.equal(parseDealsTripPlan(JSON.stringify(plan)), null);
  assert.equal(
    parseDealsTripPlanV2(JSON.stringify({ ...plan, version: 1 })),
    null,
  );
});

test("canonicalizes only valid round-trip fare-brand and dormant brand phase", () => {
  const base = createDealsTripPlanV2(search(), now);
  const valid = {
    ...base,
    flightJourney: {
      ...base.flightJourney!,
      phase: "return",
      outbound,
      fareBrand: {
        brandOptionKey: "flight-brand-v1:opaque",
        fareBrandName: "Flex",
        cabinClass: "economy",
      },
    },
  };
  assert.ok(canonicalizeDealsTripPlanV2(valid));
  assert.equal(
    canonicalizeDealsTripPlanV2({
      ...valid,
      flightJourney: { ...valid.flightJourney, tripType: "one-way" },
    }),
    null,
  );
  assert.equal(
    canonicalizeDealsTripPlanV2({
      ...valid,
      flightJourney: {
        ...valid.flightJourney,
        fareBrand: { ...valid.flightJourney.fareBrand, brandOptionKey: "bad" },
      },
    }),
    null,
  );
  assert.ok(
    canonicalizeDealsTripPlanV2({
      ...base,
      flightJourney: { ...base.flightJourney!, phase: "brand", outbound },
    }),
  );
  assert.equal(
    canonicalizeDealsTripPlanV2({
      ...base,
      flightJourney: {
        ...base.flightJourney!,
        phase: "brand",
        outbound,
        return: inbound,
      },
    }),
    null,
  );
});

test("next lifecycle deadline orders plan, hotel, flight offer, and car", () => {
  const base = confirmedPlan();
  const cases = [
    ["plan", { expiresAt: now + 100 }],
    [
      "hotel",
      {
        expiresAt: now + 900,
        hotel: {
          ...hotel,
          resultReceivedAt: now - DEALS_TRIP_PLAN_TTL_MS + 200,
        },
      },
    ],
    [
      "flight-offer",
      {
        expiresAt: now + 900,
        hotel: { ...hotel, resultReceivedAt: now },
        flightJourney: {
          ...base.flightJourney!,
          confirmedOffer: { ...offer, offerExpiresAt: now + 300 },
        },
      },
    ],
    [
      "car",
      {
        expiresAt: now + 900,
        hotel: { ...hotel, resultReceivedAt: now },
        flightJourney: {
          ...base.flightJourney!,
          confirmedOffer: { ...offer, offerExpiresAt: now + 800 },
        },
        car: { ...car, resultReceivedAt: now - DEALS_TRIP_PLAN_TTL_MS + 400 },
      },
    ],
  ] as const;
  for (const [kind, patch] of cases)
    assert.equal(
      getDealsTripPlanV2NextDeadline({ ...base, ...patch }).kind,
      kind,
    );
});

test("next lifecycle deadline retains an already-passed boundary", () => {
  const plan = { ...confirmedPlan(), expiresAt: now - 1 };
  assert.deepEqual(getDealsTripPlanV2NextDeadline(plan), {
    kind: "plan",
    expiresAt: now - 1,
  });
});

test("restart carries only a fresh Hotel from the same search context", () => {
  const current = confirmedPlan();
  assert.equal(
    createDealsTripPlanV2ForRestart(search(), current, now + 100).hotel?.id,
    hotel.id,
  );
  assert.equal(
    createDealsTripPlanV2ForRestart(
      search(),
      {
        ...current,
        hotel: {
          ...hotel,
          resultReceivedAt: now - DEALS_TRIP_PLAN_TTL_MS,
        },
      },
      now,
    ).hotel,
    undefined,
  );
  assert.equal(
    createDealsTripPlanV2ForRestart(
      search(),
      { ...current, searchFingerprint: "different" },
      now,
    ).hotel,
    undefined,
  );
});
test("deep canonical round trip preserves opened, fare, and offer metadata", () => {
  const plan = confirmedPlan(),
    parsed = parseDealsTripPlanV2(serializeDealsTripPlanV2(plan));
  assert.deepEqual(parsed, plan);
  assert.equal(parsed?.flightJourney?.confirmedOffer?.flightNumber, "KT1");
  assert.equal(parsed?.flightJourney?.confirmedOffer?.baggageInfo, "1 bag");
  assert.equal(parsed?.flightJourney?.confirmedOffer?.refundInfo, "Refundable");
});
test("canonicalization strips unknown provider blobs", () => {
  const raw = {
    ...confirmedPlan(),
    flightJourney: {
      ...confirmedPlan().flightJourney!,
      confirmedOffer: {
        ...offer,
        resultId: "duffel-off_secret_123",
        providerOfferId: "off_secret_123",
        rawProviderReference: { secret: "x" },
        authorization: "secret",
      },
    },
  };
  const canonical = canonicalizeDealsTripPlanV2(raw);
  assert.ok(canonical);
  assert.doesNotMatch(
    serializeDealsTripPlanV2(canonical),
    /rawProvider|authorization|off_secret_123|duffel-off_secret_123/,
  );
});
test("schema, timestamps, optional fields, and paths are strict", () => {
  const base = confirmedPlan();
  for (const bad of [
    { ...base, version: 3 },
    { ...base, revision: -1 },
    { ...base, updatedAt: now - 1 },
    { ...base, expiresAt: base.createdAt + DEALS_TRIP_PLAN_TTL_MS + 1 },
    { ...base, opened: { flight: now + 3 } },
    { ...base, hotel: { ...hotel, roomType: 3 } },
    { ...base, hotel: { ...hotel, detailsPath: "https://evil.test" } },
    { ...base, car: { ...car, detailsPath: "/bad" } },
    { ...base, hotel: { ...hotel, resultReceivedAt: now + 3 } },
    { ...base, flightJourney: { ...base.flightJourney!, phase: "outbound" } },
  ])
    assert.equal(canonicalizeDealsTripPlanV2(bad), null);
});
test("persisted confirmed offers must match outbound, return, fare, and timestamps", () => {
  const base = confirmedPlan();
  const mutate = (patch: object) => ({
    ...base,
    flightJourney: {
      ...base.flightJourney!,
      confirmedOffer: { ...offer, ...patch },
    },
  });
  for (const bad of [
    mutate({ outboundItineraryKey: "wrong" }),
    mutate({ returnItineraryKey: "wrong" }),
    mutate({ fareKey: "wrong" }),
    mutate({ fareKey: undefined }),
    mutate({ selectedAt: now + 2, validatedAt: now + 1 }),
    mutate({ validatedAt: now + 1_000 }),
  ])
    assert.equal(canonicalizeDealsTripPlanV2(bad), null);
  const oneWay = {
    ...base,
    mode: "hotel-flight" as const,
    car: undefined,
    opened: {},
    flightJourney: {
      ...base.flightJourney!,
      tripType: "one-way" as const,
      return: undefined,
      confirmedOffer: { ...offer, legs: [outbound] },
    },
  };
  assert.equal(canonicalizeDealsTripPlanV2(oneWay), null);
});

test("confirmed validation cannot postdate the durable plan update", () => {
  const validAtBoundary = confirmedPlan();
  validAtBoundary.flightJourney!.confirmedOffer!.validatedAt =
    validAtBoundary.updatedAt;
  assert.ok(canonicalizeDealsTripPlanV2(validAtBoundary));

  const invalid = {
    ...validAtBoundary,
    flightJourney: {
      ...validAtBoundary.flightJourney!,
      confirmedOffer: {
        ...validAtBoundary.flightJourney!.confirmedOffer!,
        validatedAt: validAtBoundary.updatedAt + 1,
      },
    },
  };
  assert.equal(canonicalizeDealsTripPlanV2(invalid), null);
  assert.equal(parseDealsTripPlanV2(JSON.stringify(invalid)), null);
  assert.throws(
    () => serializeDealsTripPlanV2(invalid),
    new TypeError("Invalid Deals trip plan v2"),
  );
});
