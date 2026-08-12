import assert from "node:assert/strict";
import test from "node:test";
import type { NormalizedFlightResult } from "@/lib/types";
import {
  getFlightProviderCapabilities,
  isFlightOfferExternalHandoffCapable,
  projectFlightHandoffCapability,
  type FlightProviderCapabilities,
} from "./flightProviderCapabilities";

const capableProvider = () =>
  ({
    provider: "Synthetic",
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
  }) satisfies FlightProviderCapabilities;

const offer = (
  provider: string,
  providerOfferId: string | undefined = "off_secret_123",
): NormalizedFlightResult => ({
  id: "flight",
  provider,
  providerOfferId,
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
  refundInfo: "terms",
  price: 700,
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

test("registers Duffel without external handoff capability", () => {
  assert.deepEqual(getFlightProviderCapabilities("Duffel"), {
    provider: "Duffel",
    exactSelectionRefresh: "exact-offer",
    expirySemantics: "provider-specific",
    externalHandoff: { kind: "none" },
  });
  assert.equal(isFlightOfferExternalHandoffCapable(offer("Duffel")), false);
});

test("deeply projects injected capabilities and drops poisoned runtime fields", () => {
  const poisonedProvider = {
    ...capableProvider(),
    apiKey: "secret-api-key",
    destinationUrl: "https://secret.example/checkout",
    inventoryToken: "inventory-secret-token",
    providerOfferId: "duffel-off_secret_123",
    externalHandoff: {
      ...capableProvider().externalHandoff,
      destinationUrl: "https://secret.example/checkout",
      secret: "nested-secret",
      rawProviderReference: "raw-secret",
      inventoryRequirements: {
        ...capableProvider().externalHandoff.inventoryRequirements,
        secret: "nested-secret",
        bookingUrl: "https://secret.example/booking",
        partnerRedirectUrl: "https://secret.example/redirect",
      },
    },
  } satisfies FlightProviderCapabilities;

  const result = getFlightProviderCapabilities("Synthetic", [poisonedProvider]);

  assert.ok(result);
  assert.notEqual(result, poisonedProvider);
  assert.notEqual(result.externalHandoff, poisonedProvider.externalHandoff);
  assert.equal(result.externalHandoff.kind, "external-deeplink");
  assert.notEqual(
    result.externalHandoff.inventoryRequirements,
    poisonedProvider.externalHandoff.inventoryRequirements,
  );
  assert.deepEqual(result, capableProvider());

  const serialized = JSON.stringify(result);
  for (const forbidden of [
    "apiKey",
    "secret-api-key",
    "destinationUrl",
    "secret.example",
    "inventoryToken",
    "inventory-secret-token",
    "providerOfferId",
    "duffel-off_secret_123",
    "secret",
    "nested-secret",
    "rawProviderReference",
    "bookingUrl",
    "partnerRedirectUrl",
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test("returns a mutation-isolated capability snapshot", () => {
  const injected = capableProvider();
  const result = getFlightProviderCapabilities("Synthetic", [injected]);
  assert.ok(result);

  injected.provider = "Mutated";
  Object.assign(injected.externalHandoff, {
    destinationAcquisition: "mutated",
  });
  Object.assign(injected.externalHandoff.inventoryRequirements, {
    liveSearchItinerary: false,
  });
  Object.assign(injected.externalHandoff, { destinationUrl: "secret" });
  Object.assign(injected.externalHandoff.inventoryRequirements, {
    secret: "changed",
  });

  assert.deepEqual(result, capableProvider());
});

test("allows only provider-backed offers from an explicitly capable provider", () => {
  const providers = [capableProvider()];
  assert.equal(
    isFlightOfferExternalHandoffCapable(offer("Synthetic"), providers),
    true,
  );
  assert.equal(
    isFlightOfferExternalHandoffCapable(offer("Unknown"), providers),
    false,
  );
  assert.equal(
    isFlightOfferExternalHandoffCapable(offer("Synthetic", ""), providers),
    false,
  );
});

test("fails closed without throwing for unknown handoff discriminants", () => {
  for (const kind of [
    "external-deeplink-v2",
    "provider-checkout",
    "unknown",
    "",
    123,
    null,
    undefined,
  ]) {
    const externalHandoff = {
      kind,
      secret: "nested-secret",
      apiKey: "secret-api-key",
      inventoryToken: "inventory-secret-token",
      providerOfferId: "off_secret_123",
      destinationUrl: "https://secret.example/checkout",
    };
    const provider = {
      ...capableProvider(),
      externalHandoff,
    } as unknown as FlightProviderCapabilities;

    assert.doesNotThrow(() => projectFlightHandoffCapability(externalHandoff));
    assert.deepEqual(projectFlightHandoffCapability(externalHandoff), {
      kind: "none",
    });
    assert.deepEqual(getFlightProviderCapabilities("Synthetic", [provider]), {
      provider: "Synthetic",
      exactSelectionRefresh: "itinerary-scoped",
      expirySemantics: "provider-specific",
      externalHandoff: { kind: "none" },
    });
    assert.equal(
      isFlightOfferExternalHandoffCapable(offer("Synthetic"), [provider]),
      false,
    );
    assert.equal(
      JSON.stringify(
        getFlightProviderCapabilities("Synthetic", [provider]),
      ).includes("secret"),
      false,
    );
  }
});

test("fails closed without throwing when externalHandoff is missing", () => {
  for (const externalHandoff of [undefined, null]) {
    const provider = {
      ...capableProvider(),
      externalHandoff,
    } as unknown as FlightProviderCapabilities;

    assert.doesNotThrow(() =>
      getFlightProviderCapabilities("Synthetic", [provider]),
    );
    assert.equal(
      isFlightOfferExternalHandoffCapable(offer("Synthetic"), [provider]),
      false,
    );
  }
});

test("fails closed without throwing for malformed external deeplink data", () => {
  const inventoryRequirements =
    capableProvider().externalHandoff.inventoryRequirements;
  const malformedValues: unknown[] = [
    { kind: "external-deeplink" },
    { kind: "external-deeplink", inventoryRequirements: null },
    {
      kind: "external-deeplink",
      destinationAcquisition: "wrong",
      destinationValidation: "validateProviderUrl",
      inventoryRequirements,
    },
    {
      kind: "external-deeplink",
      destinationAcquisition: "activation-only",
      destinationValidation: "something-else",
      inventoryRequirements,
    },
    {
      kind: "external-deeplink",
      destinationAcquisition: "activation-only",
      destinationValidation: "validateProviderUrl",
      inventoryRequirements: {
        ...inventoryRequirements,
        liveSearchItinerary: false,
      },
    },
  ];

  for (const externalHandoff of malformedValues) {
    const provider = {
      ...capableProvider(),
      externalHandoff,
    } as unknown as FlightProviderCapabilities;

    assert.doesNotThrow(() => projectFlightHandoffCapability(externalHandoff));
    assert.deepEqual(projectFlightHandoffCapability(externalHandoff), {
      kind: "none",
    });
    assert.doesNotThrow(() =>
      isFlightOfferExternalHandoffCapable(offer("Synthetic"), [provider]),
    );
    assert.equal(
      isFlightOfferExternalHandoffCapable(offer("Synthetic"), [provider]),
      false,
    );
  }
});
