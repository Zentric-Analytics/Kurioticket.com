import assert from "node:assert/strict";
import test from "node:test";
import {
  getDealsReviewItemsV2,
  getDealsTripPlanV2EstimatedTotal,
} from "./dealsReviewPresentationV2";
import type { DealsTripPlanV2 } from "./dealsTripPlanV2";

const now = 10_000;
const base = (
  mode: DealsTripPlanV2["mode"] = "hotel-flight-car",
): DealsTripPlanV2 => ({
  version: 2,
  mode,
  searchFingerprint: "search",
  productSearchKeys: { hotel: "hotel", flight: "flight", car: "car" },
  createdAt: now,
  updatedAt: now,
  expiresAt: now + 50_000,
  revision: 12,
  opened: {},
  hotel: {
    id: "hotel",
    provider: "Public Hotel",
    name: "Grand Hotel",
    location: "Paris",
    checkIn: "2027-01-01",
    checkOut: "2027-01-03",
    roomType: "deluxe",
    sourcePrice: 500,
    sourceCurrency: "USD",
    resultReceivedAt: now,
  },
  car: {
    id: "car",
    provider: "Public Cars",
    rentalCompany: "Rental Co",
    modelName: "Model",
    categoryLabel: "compact",
    pickupLocation: "CDG",
    returnLocation: "CDG",
    pickupDate: "2027-01-01",
    pickupTime: "10:00",
    dropoffDate: "2027-01-04",
    dropoffTime: "10:00",
    sourcePrice: 150,
    sourceCurrency: "USD",
    resultReceivedAt: now,
    detailsPath: "/cars/car",
  },
  flightJourney: {
    searchKey: "flight",
    tripType: "one-way",
    phase: "confirmed",
    fareBrand: {
      brandOptionKey: "flight-brand-v1:standard",
      fareBrandName: "Standard",
    },
    outbound: {
      itineraryKey: "out",
      direction: "outbound",
      originAirport: "JFK",
      destinationAirport: "CDG",
      departureTime: "2027-01-01T10:00:00Z",
      arrivalTime: "2027-01-01T18:00:00Z",
      duration: "8h",
      durationMinutes: 480,
      stops: 0,
      layovers: [],
      segments: [
        {
          originAirport: "JFK",
          destinationAirport: "CDG",
          departureTime: "2027-01-01T10:00:00Z",
          arrivalTime: "2027-01-01T18:00:00Z",
        },
      ],
    },
    fare: { fareKey: "opaque-fare", cabinClass: "economy" },
    confirmedOffer: {
      provider: "Public Flights",
      airline: "Airline",
      flightNumber: "KT1",
      outboundItineraryKey: "out",
      fareKey: "opaque-fare",
      legs: [
        {
          itineraryKey: "out",
          direction: "outbound",
          originAirport: "JFK",
          destinationAirport: "CDG",
          departureTime: "2027-01-01T10:00:00Z",
          arrivalTime: "2027-01-01T18:00:00Z",
          duration: "8h",
          durationMinutes: 480,
          stops: 0,
          layovers: [],
          segments: [],
        },
      ],
      cabinClass: "economy",
      baggageInfo: "1 bag",
      refundInfo: "Refundable",
      sourcePrice: 400,
      sourceCurrency: "USD",
      offerExpiresAt: now + 40_000,
      selectedAt: now,
      validatedAt: now,
    },
  },
});

test("same-currency total includes exactly all included components", () => {
  assert.equal(
    getDealsTripPlanV2EstimatedTotal(base(), "USD", { USD: 1 }),
    1050,
  );
});

test("mixed currencies convert every component and reject a missing rate", () => {
  const plan = base();
  plan.hotel = { ...plan.hotel!, sourceCurrency: "EUR" };
  assert.equal(
    getDealsTripPlanV2EstimatedTotal(plan, "USD", { USD: 1, EUR: 2 }),
    800,
  );
  assert.equal(getDealsTripPlanV2EstimatedTotal(plan, "USD", { USD: 1 }), null);
});

test("excluded products and source prices remain authoritative", () => {
  const plan = base("hotel-flight");
  assert.equal(getDealsTripPlanV2EstimatedTotal(plan, "USD", { USD: 1 }), 900);
  const items = getDealsReviewItemsV2(plan, "en-US");
  assert.deepEqual(
    items.map((item) => item.product),
    ["hotel", "flight"],
  );
  assert.deepEqual(
    items.map((item) => [item.sourcePrice, item.sourceCurrency]),
    [
      [500, "USD"],
      [400, "USD"],
    ],
  );
});

test("browser presentation never exposes opaque or provider-secret identifiers", () => {
  const plan = base();
  plan.flightJourney!.confirmedOffer = {
    ...plan.flightJourney!.confirmedOffer!,
    fareKey: "off_secret_123",
    outboundItineraryKey: "duffel-off_secret_123",
  };
  const visible = JSON.stringify(getDealsReviewItemsV2(plan, "en-US"));
  assert.doesNotMatch(
    visible,
    /off_secret_123|duffel-off_secret_123|opaque-fare/,
  );
});

test("cards use product-specific certainty and hide synthetic identities", () => {
  const [stay, flight, car] = getDealsReviewItemsV2(base(), "en-US");
  assert.equal(stay.heading, "Stay");
  assert.equal(stay.provenance, undefined);
  assert.equal(stay.priceLabel, "Estimated stay total");
  assert.ok(stay.details.some(({ label }) => label === "Room information"));

  assert.equal(flight.heading, "Flight");
  assert.deepEqual(flight.provenance, {
    label: "Fare source",
    value: "Public Flights",
  });
  assert.equal(flight.priceLabel, "Current revalidated flight offer");
  assert.ok(
    flight.details.some(
      ({ label, value }) => label === "Fare option" && value === "Standard",
    ),
  );
  assert.ok(flight.details.some(({ label }) => label === "Valid until"));

  assert.equal(car.heading, "Car option");
  assert.equal(car.title, "Model or similar");
  assert.equal(car.subtitle, "compact");
  assert.equal(car.provenance, undefined);
  assert.equal(car.priceLabel, "Estimated car total");
  assert.doesNotMatch(JSON.stringify(car), /Rental Co|Public Cars/);
});
