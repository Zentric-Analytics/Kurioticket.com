import assert from "node:assert/strict";
import test from "node:test";

import { kayakFlightCardModel } from "@/components/results/kayakCardModels";
import type { FlightSearchParams } from "@/lib/types";
import { normalizeSandboxOffers } from "./kayakSandbox";
import { buildProviderAwareFlightDetails } from "./standaloneFlightDetails";

const click = "https://affiliates.kayak.com/sandbox-clickout";
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

function baseFlightData() {
  return {
    currency: "USD",
    priceMode: "total",
    providers: {
      A: { displayName: "Seller A" },
      B: { displayName: "Seller B" },
    },
    airlines: { AA: { displayName: "Test Airline" } },
    legs: { l: { segments: [{ id: "s1" }, { id: "s2" }], duration: 120 } },
    segments: {
      s1: {
        origin: "BOS",
        destination: "ORD",
        departureTime: "2027-02-10T10:00:00Z",
        arrivalTime: "2027-02-10T11:00:00Z",
        airline: "AA",
        flightNumber: "1",
      },
      s2: {
        origin: "ORD",
        destination: "JFK",
        departureTime: "2027-02-10T11:30:00Z",
        arrivalTime: "2027-02-10T12:30:00Z",
        airline: "AA",
        flightNumber: "2",
      },
    },
  };
}

test("KAYAK mixed-cabin details stay attached to their matching segment fare", () => {
  const [offer] = normalizeSandboxOffers("flights", {
    ...baseFlightData(),
    results: [{
      id: "mixed",
      legs: [{ id: "l" }],
      bookingOptions: [{
        type: "regular",
        providerCode: "A",
        displayPrice: { price: 300 },
        bookingUrl: click,
        fareFamily: { displayName: "Mixed Saver" },
        segmentFares: [
          { segmentId: "s1", cabin: { displayName: "Economy" } },
          { segmentId: "s2", cabin: { displayName: "Business" } },
        ],
      }],
    }],
  });

  assert.equal(offer.flightCabin, "Economy / Business");
  assert.equal(offer.flightLegs?.[0]?.segments[0]?.cabinDetails?.cabinClass, "Economy");
  assert.equal(offer.flightLegs?.[0]?.segments[1]?.cabinDetails?.cabinClass, "Business");
});

test("KAYAK later baggage terms retain whether the bag is carry-on or checked", () => {
  const [offer] = normalizeSandboxOffers("flights", {
    ...baseFlightData(),
    results: [{
      id: "bags",
      legs: [{ id: "l" }],
      bookingOptions: [{
        type: "regular",
        providerCode: "A",
        displayPrice: { price: 300 },
        bookingUrl: click,
        fees: {
          checkedBag: [{
            bagNumber: "second",
            restriction: "notIncluded",
            price: { price: 50, currency: "USD" },
          }],
        },
      }],
    }],
  });

  assert.equal(offer.flightFareTerms?.[0]?.text, "second checked bag not included · USD 50.00");
});

async function groupedFareChoices(options: Array<Record<string, unknown>>) {
  const normalized = normalizeSandboxOffers("flights", {
    ...baseFlightData(),
    results: [{ id: "grouped", legs: [{ id: "l" }], bookingOptions: options }],
  }).map((offer) => kayakFlightCardModel(offer)!).filter(Boolean);

  const details = await buildProviderAwareFlightDetails({
    cachedSelected: normalized[0],
    cachedAlternatives: normalized,
    search,
    now: 1,
  });
  assert.equal(details.status, "available");
  if (details.status !== "available") throw new Error("expected available KAYAK details");
  return details.fareChoices;
}

const sharedOption = {
  type: "regular",
  displayPrice: { price: 500 },
  bookingUrl: click,
  fareFamily: { displayName: "Economy Saver" },
  segmentFares: [
    { segmentId: "s1", cabin: { displayName: "Economy" } },
    { segmentId: "s2", cabin: { displayName: "Economy" } },
  ],
  fees: { carryOnBag: [{ bagNumber: "first", restriction: "included" }] },
};

test("KAYAK sellers with different change or refund conditions do not share one fare choice", async () => {
  const choices = await groupedFareChoices([
    { ...sharedOption, providerCode: "A", conditions: { change: { restriction: "allowed" }, refund: { restriction: "allowed" } } },
    { ...sharedOption, providerCode: "B", conditions: { change: { restriction: "notAllowed" }, refund: { restriction: "notAllowed" } } },
  ]);

  assert.equal(choices.length, 2);
});

test("KAYAK sellers with different optional services do not share one fare choice", async () => {
  const choices = await groupedFareChoices([
    { ...sharedOption, providerCode: "A", optionalServices: [{ type: "seat", displayName: "Preferred seat", optional: true, price: { price: 20, currency: "USD" } }] },
    { ...sharedOption, providerCode: "B", optionalServices: [{ type: "seat", displayName: "Preferred seat", optional: true, price: { price: 40, currency: "USD" } }] },
  ]);

  assert.equal(choices.length, 2);
});
