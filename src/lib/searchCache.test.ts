import assert from "node:assert/strict";
import test from "node:test";
import type { FlightSearchParams, NormalizedFlightResult } from "./types";
import {
  getFlightFromCache,
  getFlightSearchFromCache,
  rememberFlights,
  toFlightDetailsOffer,
  toPublicFlight,
} from "./searchCache";

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

test("flight details projection also keeps server-owned handoff URLs private", () => {
  const details = toFlightDetailsOffer({
    ...flight("details", 15_000),
    bookingUrl: "https://private.example/book",
    partnerRedirectUrl: "https://private.example/redirect",
  });
  assert.equal("bookingUrl" in details, false);
  assert.equal("partnerRedirectUrl" in details, false);
  assert.equal("providerOfferId" in details, false);
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

test("flight cache binds an immutable server-owned passenger composition to each result", () => {
  const selected = flight("canonical-search", 20_000);
  rememberFlights([selected], 10_000, search);
  search.adults = 6;
  search.travelers = 6;
  assert.deepEqual(getFlightSearchFromCache(selected.id, 10_001), {
    ...search,
    adults: 1,
    travelers: 1,
  });
  const returned = getFlightSearchFromCache(selected.id, 10_001)!;
  returned.adults = 9;
  assert.equal(getFlightSearchFromCache(selected.id, 10_001)?.adults, 1);
});

test("re-caching without search authority cannot retain stale passenger context", () => {
  const selected = flight("cleared-search", 20_000);
  rememberFlights([selected], 10_000, { ...search, adults: 1, travelers: 1 });
  rememberFlights([selected], 10_001);
  assert.equal(getFlightSearchFromCache(selected.id, 10_002), null);
});
