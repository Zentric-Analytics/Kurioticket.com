import assert from "node:assert/strict";
import test from "node:test";
import type { NormalizedFlightResult } from "./types";
import {
  getFlightFromCache,
  rememberFlights,
  toPublicFlight,
} from "./searchCache";

const flight = (id: string, expiresAt: number): NormalizedFlightResult => ({
  id,
  provider: "Duffel",
  providerOfferId: `offer-${id}`,
  providerExpiresAt: expiresAt,
  rawProviderReference: { secret: true },
  airlineName: "Air",
  originAirport: "LHR",
  destinationAirport: "JFK",
  departureTime: "2027-01-01T10:00:00Z",
  arrivalTime: "2027-01-01T18:00:00Z",
  duration: "8h",
  durationMinutes: 480,
  stops: 0,
  layovers: [],
  cabinClass: "economy",
  baggageInfo: "bag",
  refundInfo: "refund",
  price: 1,
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

test("flight cache is capped by provider expiry and skips already-expired offers", () => {
  rememberFlights([flight("short", 15_000), flight("expired", 10_000)], 10_000);
  assert.equal(getFlightFromCache("short", 14_999)?.id, "short");
  assert.equal(getFlightFromCache("short", 15_000), null);
  assert.equal(getFlightFromCache("expired", 10_000), null);
});

test("public flight projection removes all internal provider metadata at runtime", () => {
  const publicFlight = toPublicFlight(flight("public", 15_000));
  assert.equal(publicFlight.id, "public");
  assert.equal(publicFlight.price, 1);
  assert.equal("providerOfferId" in publicFlight, false);
  assert.equal("providerExpiresAt" in publicFlight, false);
  assert.equal("rawProviderReference" in publicFlight, false);
});
