import assert from "node:assert/strict";
import test from "node:test";

import type { NormalizedFlightResult } from "@/lib/types";
import { rememberFlights } from "@/lib/searchCache";
import { GET } from "./route";

const cached = (): NormalizedFlightResult => ({
  id: "details-invalid-context-fixture",
  provider: "Duffel",
  providerOfferId: "off_server_only",
  providerExpiresAt: Date.now() + 60_000,
  airlineName: "Iberia",
  originAirport: "ORD",
  destinationAirport: "LAS",
  departureTime: "2027-02-10T10:00:00Z",
  arrivalTime: "2027-02-10T14:00:00Z",
  duration: "4h",
  durationMinutes: 240,
  stops: 0,
  layovers: [],
  legs: [],
  cabinClass: "economy",
  baggageInfo: "Baggage details not supplied by the provider",
  refundInfo: "Change and refund rules not supplied by the provider",
  price: 205,
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
});

test("flight details requires a Kurioticket result id", async () => {
  const response = await GET(new Request("https://kurioticket.test/api/flights/details"));
  assert.equal(response.status, 400);
});

test("flight details fails closed for an unknown cached identity", async () => {
  const response = await GET(new Request("https://kurioticket.test/api/flights/details?id=unknown"));
  assert.equal(response.status, 404);
});

test("flight details fails closed without server-owned search context", async () => {
  const flight = cached();
  rememberFlights([flight]);
  const response = await GET(new Request(`https://kurioticket.test/api/flights/details?id=${flight.id}&adults=6&children=0&infants=0&travelers=6`));
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    status: "unavailable",
    error: "This flight search context is no longer available. Please search again.",
  });
});

test("Flight Details never treats browser passenger parameters as authority", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("./route.ts", import.meta.url), "utf8"),
  );
  assert.match(source, /getFlightSearchFromCache\(id\)/);
  assert.doesNotMatch(source, /parseFlightDetailsSearch\(searchParams\)/);
});

