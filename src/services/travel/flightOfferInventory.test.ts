import assert from "node:assert/strict";
import test from "node:test";
import type { FlightLeg, NormalizedFlightResult } from "@/lib/types";
import {
  buildFlightFareKey,
  buildFlightItineraryKey,
  deduplicateFlightOffers,
  getCompatibleFlightReturnOptions,
  getFlightFareOptions,
  getFlightOffersForItinerary,
  getFlightOutboundOptions,
  isFlightProviderOfferUsableAt,
} from "./flightOfferInventory";

const leg = (
  direction: FlightLeg["direction"],
  origin: string,
  destination: string,
  departureTime: string,
  flightNumber: string,
): FlightLeg => ({
  direction,
  originAirport: origin,
  destinationAirport: destination,
  departureTime,
  arrivalTime: departureTime.replace("10:00", "18:00"),
  duration: "8h",
  durationMinutes: 480,
  stops: 0,
  layovers: [],
  segments: [
    {
      originAirport: origin,
      destinationAirport: destination,
      departureTime,
      arrivalTime: departureTime.replace("10:00", "18:00"),
      airlineName: "Air",
      flightNumber,
    },
  ],
});
const A = leg("outbound", "LHR", "JFK", "2027-01-01T10:00:00Z", "A1");
const B = leg("outbound", "LHR", "JFK", "2027-01-01T12:00:00Z", "B1");
const X = leg("return", "JFK", "LHR", "2027-01-08T10:00:00Z", "X1");
const Y = leg("return", "JFK", "LHR", "2027-01-09T10:00:00Z", "Y1");
const result = (
  id: string,
  providerOfferId: string | undefined,
  legs: FlightLeg[],
  price = 700,
): NormalizedFlightResult => ({
  id,
  provider: "Duffel",
  providerOfferId,
  providerExpiresAt: 20_000,
  airlineName: "Air",
  originAirport: legs[0].originAirport,
  destinationAirport: legs[0].destinationAirport,
  departureTime: legs[0].departureTime,
  arrivalTime: legs[0].arrivalTime,
  duration: "8h",
  durationMinutes: 480,
  stops: 0,
  layovers: [],
  legs,
  cabinClass: "economy",
  baggageInfo: `${id} baggage`,
  refundInfo: `${id} conditions`,
  price,
  currency: "EUR",
  bookingUrl: "",
  partnerRedirectUrl: "",
  valueScore: 1,
  riskScore: 1,
  comfortScore: 1,
  travelConfidenceScore: 1,
  travelEffortScore: 1,
  recommendationReasons: [],
  badges: [],
});
const AX1 = result("AX1", "offer-1", [A, X]);
const AY2 = result("AY2", "offer-2", [A, Y]);
const AX3 = result("AX3", "offer-3", [A, X], 850);
const BX4 = result("BX4", "offer-4", [B, X]);

test("deduplicates only exact provider offers and preserves legacy identities", () => {
  const legacy1 = result("legacy-1", undefined, [A]);
  const legacy2 = result("legacy-2", undefined, [A]);
  assert.deepEqual(
    deduplicateFlightOffers([AX1, AY2, AX3, AX1, legacy1, legacy2]).map(
      ({ id }) => id,
    ),
    ["AX1", "AY2", "AX3", "legacy-1", "legacy-2"],
  );
});

test("groups outbound itineraries while retaining all complete offer references", () => {
  assert.equal(buildFlightItineraryKey(A), buildFlightItineraryKey({ ...A }));
  const groups = getFlightOutboundOptions([AX1, AY2, AX3, BX4]);
  assert.deepEqual(
    groups.map((group) => group.compatibleResultIds),
    [["AX1", "AY2", "AX3"], ["BX4"]],
  );
});

test("derives returns only from complete offers compatible with the selected outbound", () => {
  const returnsA = getCompatibleFlightReturnOptions(
    [AX1, AY2, AX3, BX4],
    buildFlightItineraryKey(A),
  );
  assert.deepEqual(
    returnsA.map((option) => option.compatibleResultIds),
    [["AX1", "AX3"], ["AY2"]],
  );
  assert.deepEqual(
    getCompatibleFlightReturnOptions(
      [AX1, AY2, AX3, BX4],
      buildFlightItineraryKey(B),
    )[0].compatibleResultIds,
    ["BX4"],
  );
});

test("filters exact complete itineraries and resolves each actual provider offer as a fare", () => {
  const offers = getFlightOffersForItinerary(
    [AX1, AY2, AX3, BX4],
    buildFlightItineraryKey(A),
    buildFlightItineraryKey(X),
  );
  assert.deepEqual(
    offers.map(({ id }) => id),
    ["AX1", "AX3"],
  );
  const fares = getFlightFareOptions(offers);
  assert.deepEqual(
    fares.map(({ resultId, price, refundInfo }) => ({
      resultId,
      price,
      refundInfo,
    })),
    [
      {
        resultId: "AX1",
        price: 700,
        refundInfo: "AX1 conditions",
      },
      {
        resultId: "AX3",
        price: 850,
        refundInfo: "AX3 conditions",
      },
    ],
  );
  assert.notEqual(buildFlightFareKey(AX1), buildFlightFareKey(AX3));
  assert.equal(buildFlightFareKey(AX1), buildFlightFareKey({ ...AX1 }));
  assert.match(buildFlightFareKey(AX1)!, /^flight-fare-v3:[A-Za-z0-9_-]{43}$/);
  assert.doesNotMatch(buildFlightFareKey(AX1)!, /AX1/);
  assert.doesNotMatch(buildFlightFareKey(AX1)!, /offer-1/);
});

test("opaque fare keys hide the production provider-derived result identity", () => {
  const productionLike = result("duffel-off_secret_123", "off_secret_123", [
    A,
    X,
  ]);
  const other = result("duffel-off_secret_456", "off_secret_456", [A, X]);
  const key = buildFlightFareKey(productionLike)!;
  assert.equal(key, buildFlightFareKey({ ...productionLike }));
  assert.notEqual(key, buildFlightFareKey(other));
  assert.doesNotMatch(key, /off_secret_123|duffel-off_secret_123/);
});

test("one-way matching cannot include round trips", () => {
  const one1 = result("one-1", "one-1", [A]);
  const one2 = result("one-2", "one-2", [A], 800);
  assert.deepEqual(
    getFlightOffersForItinerary(
      [one1, one2, AX1],
      buildFlightItineraryKey(A),
    ).map(({ id }) => id),
    ["one-1", "one-2"],
  );
  assert.equal(
    getFlightFareOptions(
      getFlightOffersForItinerary(
        [one1, one2, AX1],
        buildFlightItineraryKey(A),
      ),
    ).length,
    2,
  );
});

test("provider expiry is usable only strictly after now", () => {
  assert.equal(
    isFlightProviderOfferUsableAt(
      { ...AX1, providerExpiresAt: 10_001 },
      10_000,
    ),
    true,
  );
  assert.equal(
    isFlightProviderOfferUsableAt(
      { ...AX1, providerExpiresAt: 10_000 },
      10_000,
    ),
    false,
  );
  assert.equal(
    isFlightProviderOfferUsableAt({ ...AX1, providerExpiresAt: 9_999 }, 10_000),
    false,
  );
});
