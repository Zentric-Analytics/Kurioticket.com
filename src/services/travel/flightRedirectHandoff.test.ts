import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import type { NormalizedFlightResult } from "@/lib/types";
import { revalidateFlightRedirectHandoff } from "./flightRedirectHandoff";

const originalPartners = process.env.FLIGHT_HANDOFF_PARTNERS_JSON;
afterEach(() => {
  if (originalPartners === undefined) delete process.env.FLIGHT_HANDOFF_PARTNERS_JSON;
  else process.env.FLIGHT_HANDOFF_PARTNERS_JSON = originalPartners;
});

const offer = (): NormalizedFlightResult => ({
  id: "public-result",
  provider: "Duffel",
  providerOfferId: "server-secret",
  providerExpiresAt: 20_000,
  airlineName: "Iberia",
  originAirport: "MAD",
  destinationAirport: "LIS",
  departureTime: "2027-01-01T10:00:00Z",
  arrivalTime: "2027-01-01T11:00:00Z",
  duration: "1h",
  durationMinutes: 60,
  stops: 0,
  layovers: [],
  legs: [{
    direction: "outbound",
    originAirport: "MAD",
    destinationAirport: "LIS",
    departureTime: "2027-01-01T10:00:00Z",
    arrivalTime: "2027-01-01T11:00:00Z",
    duration: "1h",
    durationMinutes: 60,
    stops: 0,
    layovers: [],
    segments: [{ originAirport: "MAD", destinationAirport: "LIS", departureTime: "2027-01-01T10:00:00Z", arrivalTime: "2027-01-01T11:00:00Z", airlineName: "Iberia", flightNumber: "IB100" }],
  }],
  cabinClass: "economy",
  baggageInfo: "1 carry-on included",
  refundInfo: "Not refundable before departure",
  price: 200,
  currency: "EUR",
  bookingUrl: "",
  partnerRedirectUrl: "https://book.partner.test/offer",
  valueScore: 1,
  riskScore: 1,
  comfortScore: 1,
  travelConfidenceScore: 1,
  travelEffortScore: 1,
  recommendationReasons: [],
  badges: [],
});

test("final handoff blocks an offer that changed after review", async () => {
  const outcome = await revalidateFlightRedirectHandoff({
    cachedOffer: offer(),
    now: 10_000,
    refresh: async () => ({ status: "changed", offer: { ...offer(), price: 220 } }),
  });
  assert.deepEqual(outcome, { status: "changed" });
});

test("final handoff blocks expired or unavailable offers", async () => {
  for (const status of ["expired", "unavailable"] as const) {
    const outcome = await revalidateFlightRedirectHandoff({
      cachedOffer: offer(),
      now: 10_000,
      refresh: async () => ({ status }),
    });
    assert.deepEqual(outcome, { status: "unavailable" });
  }
});

test("final handoff requires a server-allowlisted destination name", async () => {
  const refreshed = offer();
  assert.deepEqual(await revalidateFlightRedirectHandoff({
    cachedOffer: refreshed,
    now: 10_000,
    refresh: async () => ({ status: "confirmed", offer: refreshed }),
  }), { status: "unavailable" });

  process.env.FLIGHT_HANDOFF_PARTNERS_JSON = JSON.stringify({ "book.partner.test": "Example Partner" });
  const ready = await revalidateFlightRedirectHandoff({
    cachedOffer: refreshed,
    now: 10_000,
    refresh: async () => ({ status: "confirmed", offer: refreshed }),
  });
  assert.equal(ready.status, "ready");
  if (ready.status === "ready") {
    assert.equal(ready.handoff.providerName, "Example Partner");
    assert.equal(ready.handoff.url.hostname, "book.partner.test");
  }
});

