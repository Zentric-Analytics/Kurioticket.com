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
  resultId: "r1",
  provider: "Duffel",
  providerOfferId: "off-1",
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
  providerExpiresAt: now + 1_000,
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
        rawProviderReference: { secret: "x" },
        authorization: "secret",
      },
    },
  };
  const canonical = canonicalizeDealsTripPlanV2(raw);
  assert.ok(canonical);
  assert.doesNotMatch(
    JSON.stringify(canonical),
    /rawProvider|authorization|secret/,
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
