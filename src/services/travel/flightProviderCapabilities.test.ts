import assert from "node:assert/strict";
import test from "node:test";
import type { NormalizedFlightResult } from "@/lib/types";
import {
  getFlightProviderCapabilities,
  isFlightOfferExternalHandoffCapable,
  type FlightProviderCapabilities,
} from "./flightProviderCapabilities";

const offer = (provider: string): NormalizedFlightResult => ({
  id: "duffel-off_secret_123",
  provider,
  providerOfferId: "off_secret_123",
  providerExpiresAt: Date.now() + 60_000,
  rawProviderReference: { inventoryToken: "inventory-secret-token" },
  airlineName: "Air",
  originAirport: "LHR",
  destinationAirport: "JFK",
  departureTime: "2027-01-01T10:00:00Z",
  arrivalTime: "2027-01-01T18:00:00Z",
  duration: "8h",
  durationMinutes: 480,
  stops: 0,
  layovers: [],
  legs: [],
  cabinClass: "economy",
  baggageInfo: "bag",
  refundInfo: "rules",
  price: 100,
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

const capableTestProvider = {
  provider: "Synthetic Click-out Test Provider",
  exactSelectionRefresh: "itinerary-scoped",
  expirySemantics: "provider-specific",
  externalHandoff: {
    kind: "external-deeplink",
    destinationAcquisition: "activation-only",
    destinationValidation: "validateProviderUrl",
    inventoryRequirements: {
      liveSearchItinerary: true,
      explicitOutboundReturnRelationship: true,
      fareOptionIdentity: true,
      bookingAgentIdentity: true,
      serverOnlyProviderIdentity: true,
      browserSafeProjection: true,
    },
  },
} as const satisfies FlightProviderCapabilities;

test("Duffel has exact refresh but no external Handoff capability", () => {
  const duffelOffer = offer("Duffel");
  assert.deepEqual(
    getFlightProviderCapabilities(duffelOffer)?.externalHandoff,
    { kind: "none" },
  );
  assert.equal(
    getFlightProviderCapabilities(duffelOffer)?.exactSelectionRefresh,
    "exact-offer",
  );
  assert.equal(isFlightOfferExternalHandoffCapable(duffelOffer), false);
});

test("an explicitly capable test-only provider passes the pure gate", () => {
  const syntheticOffer = offer(capableTestProvider.provider);
  assert.equal(
    isFlightOfferExternalHandoffCapable(syntheticOffer, [capableTestProvider]),
    true,
  );
  assert.equal(
    getFlightProviderCapabilities(syntheticOffer, [capableTestProvider])
      ?.externalHandoff.kind,
    "external-deeplink",
  );
});

test("capability resolution carries no offer identity, inventory secret, or URL", () => {
  const serialized = JSON.stringify(
    getFlightProviderCapabilities(offer("Duffel")),
  );
  for (const secret of [
    "off_secret_123",
    "duffel-off_secret_123",
    "inventory-secret-token",
  ]) {
    assert.equal(serialized.includes(secret), false);
  }
  assert.equal(serialized.includes("http"), false);
  assert.equal(serialized.includes("bookingUrl"), false);
  assert.equal(serialized.includes("partnerRedirectUrl"), false);
});

test("unknown and non-exact offers fail closed", () => {
  assert.equal(isFlightOfferExternalHandoffCapable(offer("Unknown")), false);
  assert.equal(
    isFlightOfferExternalHandoffCapable(
      { ...offer(capableTestProvider.provider), providerOfferId: undefined },
      [capableTestProvider],
    ),
    false,
  );
});
