import assert from "node:assert/strict";
import test from "node:test";
import type { FlightLeg, NormalizedFlightResult } from "@/lib/types";
import {
  buildFlightFareKey,
  buildFlightItineraryKey,
} from "./flightOfferInventory";
import {
  getDealsFlightFareChoicesV2,
  getDealsFlightOutboundChoicesV2,
  getDealsFlightReturnChoicesV2,
  resolveDealsFlightOfferV2,
} from "./dealsFlightInventoryV2";

const leg = (
  direction: "outbound" | "return",
  departureTime: string,
): FlightLeg => ({
  direction,
  originAirport: direction === "outbound" ? "LHR" : "JFK",
  destinationAirport: direction === "outbound" ? "JFK" : "LHR",
  departureTime,
  arrivalTime: departureTime.replace("10:00", "18:00"),
  duration: "8h",
  durationMinutes: 480,
  stops: 0,
  layovers: [],
  segments: [
    {
      originAirport: direction === "outbound" ? "LHR" : "JFK",
      destinationAirport: direction === "outbound" ? "JFK" : "LHR",
      departureTime,
      arrivalTime: departureTime.replace("10:00", "18:00"),
    },
  ],
});
const outbound = leg("outbound", "2027-01-01T10:00:00Z");
const otherOutbound = leg("outbound", "2027-01-01T11:00:00Z");
const returnA = leg("return", "2027-01-08T10:00:00Z");
const returnB = leg("return", "2027-01-09T10:00:00Z");
const offer = (
  providerOfferId: string,
  legs: FlightLeg[],
  price = 700,
  currency = "USD",
): NormalizedFlightResult => ({
  id: `duffel-${providerOfferId}`,
  provider: "Duffel",
  providerOfferId,
  providerExpiresAt: 99_000,
  rawProviderReference: { secret: true },
  airlineName: "Air",
  originAirport: "LHR",
  destinationAirport: "JFK",
  departureTime: legs[0].departureTime,
  arrivalTime: legs[0].arrivalTime,
  duration: "8h",
  durationMinutes: 480,
  stops: 0,
  layovers: [],
  legs,
  cabinClass: "economy",
  baggageInfo: "bag",
  refundInfo: "rules",
  price,
  currency,
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

test("projects the minimum valid provider-backed price onto one outbound choice", () => {
  const expensive = offer("expensive", [outbound, returnA], 920, "NGN");
  const cheapest = offer("cheapest", [outbound, returnB], 640, "NGN");
  const invalidPrice = offer("invalid", [outbound, returnA], Number.NaN, "NGN");
  const notProviderBacked = {
    ...offer("missing-provider", [outbound, returnA], 1, "NGN"),
    providerOfferId: undefined,
  };

  const choices = getDealsFlightOutboundChoicesV2([
    expensive,
    cheapest,
    invalidPrice,
    notProviderBacked,
  ]);
  assert.equal(choices.length, 1);
  assert.equal(choices[0].indicativeFromPrice, 640);
  assert.equal(choices[0].indicativeCurrency, "NGN");
});

test("preserves the winning complete offer currency in the projection", () => {
  const choices = getDealsFlightOutboundChoicesV2([
    offer("one", [outbound], 480, "EUR"),
    offer("two", [outbound], 510, "EUR"),
  ]);
  assert.deepEqual(
    [choices[0].indicativeFromPrice, choices[0].indicativeCurrency],
    [480, "EUR"],
  );
});

test("adapts only compatible complete offers and exposes browser-safe choices", () => {
  const ax1 = offer("off_secret_123", [outbound, returnA]);
  const ax2 = offer("off_secret_456", [outbound, returnA]);
  const ay = offer("off_secret_789", [outbound, returnB]);
  const other = offer("off_secret_other", [otherOutbound, returnA]);
  const results = [ax1, ax2, ay, other];
  assert.equal(getDealsFlightOutboundChoicesV2(results).length, 2);
  assert.equal(
    getDealsFlightReturnChoicesV2(results, buildFlightItineraryKey(outbound))
      .length,
    2,
  );
  const fares = getDealsFlightFareChoicesV2(
    results,
    buildFlightItineraryKey(outbound),
    buildFlightItineraryKey(returnA),
  );
  assert.equal(fares.length, 2);
  assert.equal(JSON.stringify(fares).includes("providerOfferId"), false);
  assert.equal(JSON.stringify(fares).includes("rawProviderReference"), false);
  assert.doesNotMatch(
    JSON.stringify(fares),
    /off_secret_123|duffel-off_secret_123/,
  );
  assert.match(fares[0].fareKey, /^flight-fare-v3:/);
  assert.equal(
    resolveDealsFlightOfferV2(
      results,
      buildFlightItineraryKey(outbound),
      buildFlightItineraryKey(returnA),
      buildFlightFareKey(ax1)!,
    ),
    ax1,
  );
  assert.equal(
    resolveDealsFlightOfferV2(
      results,
      buildFlightItineraryKey(otherOutbound),
      buildFlightItineraryKey(returnB),
      buildFlightFareKey(ax1)!,
    ),
    null,
  );
  assert.equal(
    resolveDealsFlightOfferV2(
      results,
      buildFlightItineraryKey(outbound),
      buildFlightItineraryKey(returnA),
      "flight-fare-v3:forged",
    ),
    null,
  );
});

test("one-way selections cannot resolve round-trip offers", () => {
  const roundTrip = offer("round", [outbound, returnA]);
  assert.equal(
    resolveDealsFlightOfferV2(
      [roundTrip],
      buildFlightItineraryKey(outbound),
      undefined,
      buildFlightFareKey(roundTrip)!,
    ),
    null,
  );
});
