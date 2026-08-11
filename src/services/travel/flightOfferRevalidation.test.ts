import assert from "node:assert/strict";
import test from "node:test";
import type { FlightSearchParams, NormalizedFlightResult } from "@/lib/types";
import {
  buildFlightFareKey,
  buildFlightItineraryKey,
} from "./flightOfferInventory";
import { revalidateFlightOffer } from "./flightOfferRevalidation";

const now = 10_000;
const search: FlightSearchParams = {
  tripType: "one-way",
  origin: "LHR",
  destination: "JFK",
  departureDate: "2027-01-01",
  adults: 1,
  children: 0,
  infants: 0,
  travelers: 1,
  cabinClass: "economy",
};
const outbound = {
  direction: "outbound" as const,
  originAirport: "LHR",
  destinationAirport: "JFK",
  departureTime: "2027-01-01T10:00:00Z",
  arrivalTime: "2027-01-01T18:00:00Z",
  duration: "8h",
  durationMinutes: 480,
  stops: 0,
  layovers: [],
  segments: [
    {
      originAirport: "LHR",
      destinationAirport: "JFK",
      departureTime: "2027-01-01T10:00:00Z",
      arrivalTime: "2027-01-01T18:00:00Z",
    },
  ],
};
const cached: NormalizedFlightResult = {
  id: "duffel-off_secret_123",
  provider: "Duffel",
  providerOfferId: "off_secret_123",
  providerExpiresAt: 20_000,
  airlineName: "Air",
  originAirport: "LHR",
  destinationAirport: "JFK",
  departureTime: outbound.departureTime,
  arrivalTime: outbound.arrivalTime,
  duration: "8h",
  durationMinutes: 480,
  stops: 0,
  layovers: [],
  legs: [outbound],
  cabinClass: "economy",
  baggageInfo: "bag",
  refundInfo: "rules",
  price: 700,
  currency: "USD",
  bookingUrl: "",
  partnerRedirectUrl: "",
  valueScore: 1,
  riskScore: 1,
  comfortScore: 1,
  travelConfidenceScore: 1,
  travelEffortScore: 1,
  recommendationReasons: [],
  badges: [],
};
const input = {
  cachedOffer: cached,
  search,
  outboundItineraryKey: buildFlightItineraryKey(outbound),
  fareKey: buildFlightFareKey(cached)!,
  now,
};
const response = (result: NormalizedFlightResult) => async () => ({
  provider: "Duffel",
  results: [result],
  status: "success" as const,
  latencyMs: 1,
});

test("revalidation confirms an unchanged exact offer without leaking identity", async () => {
  const outcome = await revalidateFlightOffer({
    ...input,
    refreshDuffelOffer: response(cached),
  });
  assert.equal(outcome.status, "confirmed");
  assert.doesNotMatch(
    JSON.stringify(outcome),
    /off_secret_123|duffel-off_secret_123/,
  );
  if (outcome.status === "confirmed")
    assert.equal(outcome.offer.legs.length, 1);
});

test("revalidation maps confirmed provider disappearance separately from operational failures", async () => {
  for (const classification of [
    {
      errorCategory: "no_inventory" as const,
      errorReason: "provider_no_inventory" as const,
    },
    {
      errorCategory: "route_unavailable" as const,
      errorReason: "provider_route_unavailable" as const,
    },
  ]) {
    const outcome = await revalidateFlightOffer({
      ...input,
      refreshDuffelOffer: async () => ({
        provider: "Duffel",
        results: [],
        status: "failed",
        latencyMs: 1,
        ...classification,
      }),
    });
    assert.equal(outcome.status, "unavailable");
  }

  for (const classification of [
    {
      errorCategory: "timeout" as const,
      errorReason: "provider_timeout" as const,
    },
    {
      errorCategory: "network" as const,
      errorReason: "provider_network_error" as const,
    },
    {
      errorCategory: "server" as const,
      errorReason: "provider_server_error" as const,
    },
  ]) {
    const outcome = await revalidateFlightOffer({
      ...input,
      refreshDuffelOffer: async () => ({
        provider: "Duffel",
        results: [],
        status: "failed",
        latencyMs: 1,
        ...classification,
      }),
    });
    assert.equal(outcome.status, "temporary-failure");
  }
});

test("revalidation distinguishes changes, expiry, failures, and mismatches", async () => {
  assert.equal(
    (
      await revalidateFlightOffer({
        ...input,
        refreshDuffelOffer: response({ ...cached, price: 701 }),
      })
    ).status,
    "changed",
  );
  assert.equal(
    (
      await revalidateFlightOffer({
        ...input,
        cachedOffer: { ...cached, providerExpiresAt: now },
      })
    ).status,
    "expired",
  );
  assert.equal(
    (await revalidateFlightOffer({ ...input, fareKey: "forged" })).status,
    "invalid-selection",
  );
  assert.equal(
    (
      await revalidateFlightOffer({
        ...input,
        refreshDuffelOffer: async () => ({
          provider: "Duffel",
          results: [],
          status: "failed",
          latencyMs: 1,
        }),
      })
    ).status,
    "temporary-failure",
  );
  assert.equal(
    (
      await revalidateFlightOffer({
        ...input,
        refreshDuffelOffer: response({
          ...cached,
          legs: [{ ...outbound, departureTime: "2027-01-02T10:00:00Z" }],
        }),
      })
    ).status,
    "invalid-selection",
  );
  assert.equal(
    (
      await revalidateFlightOffer({
        ...input,
        refreshDuffelOffer: response({ ...cached, providerExpiresAt: now }),
      })
    ).status,
    "expired",
  );
});
