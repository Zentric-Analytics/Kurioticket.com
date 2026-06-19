import assert from "node:assert/strict";
import { test } from "node:test";
import type { FlightSearchParams, NormalizedFlightResult } from "@/lib/types";
import { rememberFlights } from "@/lib/searchCache";
import { POST } from "@/app/api/redirect/route";
import { hasExactProviderHandoff } from "@/services/travel/flightAggregator";
import { normalizeFlightResult } from "@/services/travel/normalizeFlightResult";

const search: FlightSearchParams = {
  tripType: "one-way",
  origin: "JFK",
  destination: "LAX",
  departureDate: "2026-07-10",
  adults: 1,
  children: 0,
  infants: 0,
  travelers: 1,
  cabinClass: "economy",
  currency: "USD",
};

test("Duffel live offer without exact provider URL is not bookable", () => {
  const result = normalizeFlightResult("Duffel", {
    id: "off_123",
    total_amount: "199.00",
    total_currency: "USD",
    owner: { name: "Test Air", iata_code: "TA" },
    slices: [{
      duration: "PT6H",
      segments: [{
        id: "seg_1",
        departing_at: "2026-07-10T08:00:00",
        arriving_at: "2026-07-10T11:00:00",
        origin: { iata_code: "JFK" },
        destination: { iata_code: "LAX" },
        marketing_carrier: { name: "Test Air", iata_code: "TA" },
        marketing_carrier_flight_number: "100",
        passengers: [{ cabin_class: "economy" }],
      }],
    }],
  }, search);

  assert.ok(result);
  assert.equal(result.handoffType, "none");
  assert.equal(result.handoffUrl, undefined);
  assert.equal(result.bookingUrl, "");
  assert.equal(result.partnerRedirectUrl, "");
  assert.equal(hasExactProviderHandoff(result), false);
});

test("generated metasearch route URLs are not synthesized as exact handoffs", () => {
  const result = normalizeFlightResult("Amadeus", {
    id: "ama_123",
    itineraries: [{
      duration: "PT6H",
      segments: [{
        departure: { iataCode: "JFK", at: "2026-07-10T08:00:00" },
        arrival: { iataCode: "LAX", at: "2026-07-10T11:00:00" },
        carrierCode: "AA",
        number: "100",
      }],
    }],
    price: { grandTotal: "220.00", currency: "USD" },
    validatingAirlineCodes: ["AA"],
  }, search);

  assert.ok(result);
  assert.equal(result.handoffType, "none");
  assert.equal(result.partnerRedirectUrl, "");
});

test("flight aggregator handoff predicate accepts only exact safe handoff URLs", () => {
  const base = makeFlight();
  assert.equal(hasExactProviderHandoff({ ...base, handoffType: "none", handoffUrl: undefined }), false);
  assert.equal(hasExactProviderHandoff({ ...base, handoffType: "exact_provider_link", handoffUrl: "javascript:alert(1)" }), false);
  assert.equal(hasExactProviderHandoff({ ...base, handoffType: "exact_provider_link", handoffUrl: "https://www.aviasales.com/search?origin_iata=JFK&destination_iata=LAX&sub_id=duffel-metasearch" }), false);
  assert.equal(hasExactProviderHandoff({ ...base, handoffType: "exact_provider_link", handoffUrl: "https://provider.example/offer/123" }), true);
});

test("redirect rejects flights without exact handoff and ignores legacy booking URLs", async () => {
  const flight = makeFlight({
    id: "redirect-no-handoff",
    bookingUrl: "https://affiliate.example/search?origin=JFK&destination=LAX",
    partnerRedirectUrl: "https://affiliate.example/search?origin=JFK&destination=LAX",
    handoffType: "none",
    handoffUrl: undefined,
  });
  rememberFlights([flight]);

  const response = await POST(new Request("https://kurioticket.test/api/redirect", {
    method: "POST",
    body: JSON.stringify({ id: flight.id, type: "flight" }),
  }));

  assert.equal(response.status, 409);
});

test("redirect returns only verified exact handoff URLs", async () => {
  const flight = makeFlight({
    id: "redirect-exact-handoff",
    bookingUrl: "https://affiliate.example/search?origin=JFK&destination=LAX",
    partnerRedirectUrl: "https://affiliate.example/search?origin=JFK&destination=LAX",
    handoffType: "exact_provider_link",
    handoffUrl: "https://provider.example/exact-offer/abc",
  });
  rememberFlights([flight]);

  const response = await POST(new Request("https://kurioticket.test/api/redirect", {
    method: "POST",
    body: JSON.stringify({ id: flight.id, type: "flight" }),
  }));
  const body = await response.json() as { url?: string };

  assert.equal(response.status, 200);
  assert.equal(body.url, "https://provider.example/exact-offer/abc");
});

function makeFlight(overrides: Partial<NormalizedFlightResult> = {}): NormalizedFlightResult {
  return {
    id: "flight-1",
    provider: "Test Provider",
    airlineName: "Test Air",
    originAirport: "JFK",
    destinationAirport: "LAX",
    departureTime: "2026-07-10T08:00:00",
    arrivalTime: "2026-07-10T11:00:00",
    duration: "3h 0m",
    durationMinutes: 180,
    stops: 0,
    layovers: [],
    cabinClass: "economy",
    baggageInfo: "Baggage details available",
    refundInfo: "Fare rules available",
    price: 199,
    currency: "USD",
    bookingUrl: "",
    partnerRedirectUrl: "",
    handoffType: "none",
    valueScore: 80,
    riskScore: 20,
    comfortScore: 75,
    travelConfidenceScore: 80,
    travelEffortScore: 90,
    recommendationReasons: [],
    badges: [],
    ...overrides,
  };
}
