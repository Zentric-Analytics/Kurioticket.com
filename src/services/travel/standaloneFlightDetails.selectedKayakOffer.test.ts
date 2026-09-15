import assert from "node:assert/strict";
import test from "node:test";

import type { FlightSearchParams, NormalizedFlightResult } from "@/lib/types";
import { buildProviderAwareFlightDetails } from "./standaloneFlightDetails";

const search: FlightSearchParams = {
  tripType: "one-way",
  origin: "BOS",
  destination: "JFK",
  departureDate: "2027-02-10",
  adults: 1,
  children: 0,
  infants: 0,
  travelers: 1,
  cabinClass: "economy",
};

const leg = {
  direction: "outbound" as const,
  originAirport: "BOS",
  destinationAirport: "JFK",
  departureTime: "2027-02-10T10:00:00Z",
  arrivalTime: "2027-02-10T11:00:00Z",
  duration: "1h",
  durationMinutes: 60,
  stops: 0,
  layovers: [],
  segments: [{
    originAirport: "BOS",
    destinationAirport: "JFK",
    departureTime: "2027-02-10T10:00:00Z",
    arrivalTime: "2027-02-10T11:00:00Z",
    airlineName: "Test Airline",
    flightNumber: "KT1",
  }],
};

function kayakOffer(
  id: string,
  providerOfferId: string,
  price: number,
  overrides: Partial<NormalizedFlightResult> = {},
): NormalizedFlightResult {
  return {
    id,
    provider: "KAYAK sandbox",
    providerOfferId,
    airlineName: "Test Airline",
    flightNumber: "KT1",
    originAirport: "BOS",
    destinationAirport: "JFK",
    departureTime: "2027-02-10T10:00:00Z",
    arrivalTime: "2027-02-10T11:00:00Z",
    duration: "1h",
    durationMinutes: 60,
    stops: 0,
    layovers: [],
    legs: [leg],
    cabinClass: "Economy",
    fareBrandName: "Provider Saver",
    baggageInfo: "Not supplied by provider",
    refundInfo: "Not supplied by provider",
    fareTerms: [],
    price,
    currency: "USD",
    bookingUrl: "https://affiliates.kayak.com/sandbox-clickout",
    partnerRedirectUrl: "https://affiliates.kayak.com/sandbox-clickout",
    valueScore: 0,
    riskScore: 0,
    comfortScore: 0,
    travelConfidenceScore: 0,
    travelEffortScore: 0,
    recommendationReasons: [],
    badges: [],
    ...overrides,
  };
}

test("KAYAK grouped fares preserve the offer selected from Flight Results as the primary fare", async () => {
  const selected = kayakOffer("kayak-sandbox:selected", "selected-offer", 180);
  const cheaperSibling = kayakOffer("kayak-sandbox:cheaper", "cheaper-offer", 120);

  const details = await buildProviderAwareFlightDetails({
    cachedSelected: selected,
    cachedAlternatives: [selected, cheaperSibling],
    search,
    now: 1,
  });

  assert.equal(details.status, "available");
  if (details.status !== "available") return;

  assert.equal(details.fareChoices.length, 1);
  assert.equal(details.fareChoices[0].selectedOffer, true);
  assert.equal(details.fareChoices[0].offer.id, selected.id);
  assert.equal(details.fareChoices[0].offer.price, selected.price);
  assert.equal(details.flight.id, selected.id);
  assert.equal(details.flight.price, selected.price);
});

test("KAYAK equivalent booking sellers become deals under one supplied fare product", async () => {
  const sellers = [
    kayakOffer("kayak-sandbox:a", "offer-a", 543, { bookingProviderName: "Seller A" }),
    kayakOffer("kayak-sandbox:b", "offer-b", 544, { bookingProviderName: "Seller B" }),
    kayakOffer("kayak-sandbox:c", "offer-c", 590, { bookingProviderName: "Seller C" }),
  ];
  const details = await buildProviderAwareFlightDetails({ cachedSelected: sellers[0], cachedAlternatives: sellers, search, now: 1 });
  assert.equal(details.status, "available");
  if (details.status !== "available") return;
  assert.equal(details.fareChoices.length, 1);
  assert.deepEqual(details.fareChoices[0].deals.map(({ providerName, price }) => [providerName, price]), [
    ["Seller A", 543], ["Seller B", 544], ["Seller C", 590],
  ]);
});

test("KAYAK unbranded equivalent sellers group without manufacturing a fare family", async () => {
  const selected = kayakOffer("kayak-sandbox:a", "offer-a", 544, { fareBrandName: undefined, bookingProviderName: "Seller A" });
  const sibling = kayakOffer("kayak-sandbox:b", "offer-b", 544, { fareBrandName: undefined, bookingProviderName: "Seller B" });
  const details = await buildProviderAwareFlightDetails({ cachedSelected: selected, cachedAlternatives: [selected, sibling], search, now: 1 });
  assert.equal(details.status, "available");
  if (details.status !== "available") return;
  assert.equal(details.fareChoices.length, 1);
  assert.equal(details.fareChoices[0].label, "Economy");
  assert.equal(details.fareChoices[0].deals.length, 2);
});

test("KAYAK provider-supplied fare families remain distinct even at equal prices", async () => {
  const basic = kayakOffer("kayak-sandbox:basic", "offer-basic", 544, { fareBrandName: "Basic Economy", bookingProviderName: "Seller A" });
  const flexible = kayakOffer("kayak-sandbox:flex", "offer-flex", 544, { fareBrandName: "Flexible Economy", bookingProviderName: "Seller B" });
  const details = await buildProviderAwareFlightDetails({ cachedSelected: basic, cachedAlternatives: [basic, flexible], search, now: 1 });
  assert.equal(details.status, "available");
  if (details.status !== "available") return;
  assert.deepEqual(details.fareChoices.map(({ label }) => label).sort(), ["Basic Economy", "Flexible Economy"]);
});

test("KAYAK material provider terms keep otherwise matching fare products distinct", async () => {
  const included = kayakOffer("kayak-sandbox:included", "offer-included", 544, { bookingProviderName: "Seller A", fareTerms: [{ category: "baggage", semantic: "positive", text: "Carry-on included" }] });
  const restricted = kayakOffer("kayak-sandbox:restricted", "offer-restricted", 544, { bookingProviderName: "Seller B", fareTerms: [{ category: "baggage", semantic: "informational", text: "See supplied baggage details" }] });
  const details = await buildProviderAwareFlightDetails({ cachedSelected: included, cachedAlternatives: [included, restricted], search, now: 1 });
  assert.equal(details.status, "available");
  if (details.status !== "available") return;
  assert.equal(details.fareChoices.length, 2);
});

test("KAYAK grouping retains the selected seller offer instead of choosing a cheaper deal", async () => {
  const cheaper = kayakOffer("kayak-sandbox:a", "offer-a", 543, { bookingProviderName: "Seller A" });
  const selected = kayakOffer("kayak-sandbox:b", "offer-b", 544, { bookingProviderName: "Seller B" });
  const details = await buildProviderAwareFlightDetails({ cachedSelected: selected, cachedAlternatives: [cheaper, selected], search, now: 1 });
  assert.equal(details.status, "available");
  if (details.status !== "available") return;
  assert.equal(details.fareChoices.length, 1);
  assert.equal(details.fareChoices[0].offer.id, selected.id);
  assert.equal(details.fareChoices[0].selectedOffer, true);
  assert.deepEqual(details.fareChoices[0].deals.map(({ offerId }) => offerId), [cheaper.id, selected.id]);
});

test("KAYAK alternatives with another itinerary never enter the selected fare deals", async () => {
  const selected = kayakOffer("kayak-sandbox:a", "offer-a", 543, { bookingProviderName: "Seller A" });
  const other = kayakOffer("kayak-sandbox:other", "offer-other", 500, {
    bookingProviderName: "Other Seller", destinationAirport: "LAX",
    legs: [{ ...leg, destinationAirport: "LAX", segments: [{ ...leg.segments[0], destinationAirport: "LAX" }] }],
  });
  const details = await buildProviderAwareFlightDetails({ cachedSelected: selected, cachedAlternatives: [selected, other], search, now: 1 });
  assert.equal(details.status, "available");
  if (details.status !== "available") return;
  assert.equal(details.fareChoices[0].deals.length, 1);
  assert.equal(details.fareChoices[0].deals[0].offerId, selected.id);
});
