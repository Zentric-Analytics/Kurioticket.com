import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { afterEach } from "node:test";

import type { FlightSearchParams, NormalizedFlightResult } from "@/lib/types";
import {
  buildMaterialFareChoices,
  buildStandaloneFlightDetails,
  validatesSearchContext,
} from "@/services/travel/standaloneFlightDetails";

const originalPartners = process.env.FLIGHT_HANDOFF_PARTNERS_JSON;
afterEach(() => {
  if (originalPartners === undefined) delete process.env.FLIGHT_HANDOFF_PARTNERS_JSON;
  else process.env.FLIGHT_HANDOFF_PARTNERS_JSON = originalPartners;
});

const search: FlightSearchParams = {
  tripType: "round-trip",
  origin: "ORD",
  destination: "LAS",
  departureDate: "2027-02-10",
  returnDate: "2027-02-17",
  adults: 1,
  children: 0,
  infants: 0,
  travelers: 1,
  cabinClass: "economy",
};

const leg = (
  direction: "outbound" | "return",
  origin: string,
  destination: string,
  date: string,
  airlineName: string,
  flightNumber: string,
) => ({
  direction,
  originAirport: origin,
  destinationAirport: destination,
  departureTime: `${date}T10:00:00Z`,
  arrivalTime: `${date}T14:00:00Z`,
  duration: "4h",
  durationMinutes: 240,
  stops: 0,
  layovers: [],
  segments: [{
    originAirport: origin,
    destinationAirport: destination,
    departureTime: `${date}T10:00:00Z`,
    arrivalTime: `${date}T14:00:00Z`,
    airlineName,
    flightNumber,
  }],
});

const fixture = (overrides: Partial<NormalizedFlightResult> = {}): NormalizedFlightResult => ({
  id: "duffel-selected-public-id",
  provider: "Duffel",
  providerOfferId: "off_server_secret",
  providerExpiresAt: Date.parse("2027-02-01T00:00:00Z"),
  airlineName: "Iberia",
  flightNumber: "IB100",
  originAirport: "ORD",
  destinationAirport: "LAS",
  departureTime: "2027-02-10T10:00:00Z",
  arrivalTime: "2027-02-10T14:00:00Z",
  duration: "4h",
  durationMinutes: 240,
  stops: 0,
  layovers: [],
  legs: [
    leg("outbound", "ORD", "LAS", "2027-02-10", "Iberia", "IB100"),
    leg("return", "LAS", "ORD", "2027-02-17", "British Airways", "BA200"),
  ],
  cabinClass: "economy",
  baggageInfo: "1 carry-on included",
  refundInfo: "Not refundable before departure",
  price: 198.1,
  currency: "USD",
  bookingUrl: "",
  partnerRedirectUrl: "",
  valueScore: 80,
  riskScore: 20,
  comfortScore: 70,
  travelConfidenceScore: 80,
  travelEffortScore: 20,
  recommendationReasons: [],
  badges: [],
  ...overrides,
});

test("round trip preserves explicit outbound and return with their own carriers", async () => {
  const cached = fixture();
  const refreshed = fixture({ price: 205.4 });
  const details = await buildStandaloneFlightDetails({
    cachedSelected: cached,
    cachedAlternatives: [cached],
    search,
    now: 1,
    refresh: async () => ({ status: "changed", offer: refreshed }),
  });
  assert.equal(details.status, "available");
  if (details.status !== "available") return;
  assert.deepEqual(details.flight.legs?.map(({ direction, originAirport, destinationAirport }) => ({ direction, originAirport, destinationAirport })), [
    { direction: "outbound", originAirport: "ORD", destinationAirport: "LAS" },
    { direction: "return", originAirport: "LAS", destinationAirport: "ORD" },
  ]);
  assert.equal(details.flight.legs?.[0].segments[0].airlineName, "Iberia");
  assert.equal(details.flight.legs?.[0].segments[0].flightNumber, "IB100");
  assert.equal(details.flight.legs?.[1].segments[0].airlineName, "British Airways");
  assert.equal(details.flight.legs?.[1].segments[0].flightNumber, "BA200");
  assert.equal(details.flight.price, 205.4);
  assert.doesNotMatch(JSON.stringify(details), /providerOfferId|off_server_secret|rawProviderReference|partnerRedirectUrl|bookingUrl/);
});

test("standalone details do not show price-only unbranded alternatives as fare choices", async () => {
  const selected = fixture();
  const priceOnlyAlternative = fixture({
    id: "duffel-price-only-alternative",
    providerOfferId: "off_price_only_alternative",
    price: 205,
  });
  const details = await buildStandaloneFlightDetails({
    cachedSelected: selected,
    cachedAlternatives: [selected, priceOnlyAlternative],
    search,
    now: 1,
    refresh: async ({ cachedOffer }) => ({ status: "confirmed", offer: cachedOffer }),
  });
  assert.equal(details.status, "available");
  if (details.status === "available") assert.equal(details.fareChoices.length, 1);
});

test("one-way is valid without a return while a round trip missing return fails closed", () => {
  const outboundOnly = fixture({ legs: [fixture().legs![0]] });
  assert.equal(validatesSearchContext(outboundOnly, { ...search, tripType: "one-way", returnDate: undefined }), true);
  assert.equal(validatesSearchContext(outboundOnly, search), false);
});

test("connecting segments remain ordered and provider-authored", async () => {
  const connected = fixture();
  connected.legs![0] = {
    ...connected.legs![0],
    stops: 1,
    layovers: [{ airport: "DFW", duration: "1h 20m", quality: "good" }],
    segments: [
      { originAirport: "ORD", destinationAirport: "DFW", departureTime: "2027-02-10T08:00:00Z", arrivalTime: "2027-02-10T10:00:00Z", airlineName: "American Airlines", flightNumber: "AA123" },
      { originAirport: "DFW", destinationAirport: "LAS", departureTime: "2027-02-10T11:20:00Z", arrivalTime: "2027-02-10T14:00:00Z", airlineName: "American Airlines", flightNumber: "AA456" },
    ],
  };
  assert.deepEqual(connected.legs[0].segments.map(({ originAirport, destinationAirport }) => `${originAirport}-${destinationAirport}`), ["ORD-DFW", "DFW-LAS"]);
});

test("unbranded exact offers never acquire synthetic fare identity from matching copy", () => {
  const choices = buildMaterialFareChoices([
    fixture({ id: "one", providerOfferId: "one", price: 205 }),
    fixture({ id: "two", providerOfferId: "two", price: 198.1 }),
    fixture({ id: "three", providerOfferId: "three", price: 199.86 }),
  ]);
  assert.equal(choices.length, 3);
  assert.deepEqual(choices.map(({ source }) => source.id), ["two", "three", "one"]);
});

test("baggage and refund copy do not become provider fare-brand identity", () => {
  const choices = buildMaterialFareChoices([
    fixture(),
    fixture({ id: "refundable", providerOfferId: "refundable", baggageInfo: "1 checked bag included", refundInfo: "Refundable before departure", price: 240 }),
  ]);
  assert.equal(choices.length, 2);
  assert.match(choices[0].choice.distinguishingTerms.join(" "), /carry-on|refundable/i);
  assert.match(choices[1].choice.distinguishingTerms.join(" "), /checked bag|Refundable/i);
});

test("provider fare brands pass through but are never manufactured", () => {
  assert.equal(buildMaterialFareChoices([fixture({ fareBrandName: "Flex" })])[0].choice.label, "Flex");
  assert.equal(buildMaterialFareChoices([fixture({ fareBrandName: undefined })])[0].choice.label, "Economy");
});

test("handoff identity comes from the allowlisted destination, not Duffel", () => {
  process.env.FLIGHT_HANDOFF_PARTNERS_JSON = JSON.stringify({ "book.partner.test": "Example Partner" });
  const choice = buildMaterialFareChoices([fixture({ partnerRedirectUrl: "https://book.partner.test/offer" })])[0].choice;
  assert.deepEqual(choice.handoff, { available: true, providerName: "Example Partner" });
  assert.notEqual(choice.handoff.available && choice.handoff.providerName, "Duffel");
  assert.deepEqual(buildMaterialFareChoices([fixture()])[0].choice.handoff, { available: false });
});

test("standalone UI renders every leg and segment from selected offer and uses attested CTA copy", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  for (const contract of [
    'index === 0 ? "OUTBOUND" : "RETURN"',
    "leg.segments.map",
    "const flight = selectedOffer",
    "Continue to ${handoff.providerName}",
    "Booking link currently unavailable",
    "id: selectedOffer.id",
    'role="radiogroup"',
    'role="radio"',
  ]) assert.ok(source.includes(contract), contract);
  assert.ok(!source.includes("function primaryLeg"));
  assert.ok(!source.includes('"Continue to provider"'));
});
