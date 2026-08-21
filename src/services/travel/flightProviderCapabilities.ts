import type { NormalizedFlightResult } from "@/lib/types";
import { isProviderBackedFlightOffer } from "./flightOfferInventory";

export type FlightHandoffCapability =
  | { kind: "none" }
  | {
      kind: "external-deeplink";
      destinationAcquisition: "activation-only";
      destinationValidation: "validateProviderUrl";
      inventoryRequirements: {
        liveSearchItinerary: true;
        explicitOutboundReturnRelationship: true;
        fareOptionIdentity: true;
        bookingAgentIdentity: true;
        serverOnlyProviderIdentity: true;
        browserSafeProjection: true;
      };
    };

export type FlightProviderCapabilities = {
  provider: string;
  exactSelectionRefresh: "exact-offer" | "itinerary-scoped" | "none";
  expirySemantics: "provider-specific";
  externalHandoff: FlightHandoffCapability;
};

const FLIGHT_PROVIDER_CAPABILITIES: readonly FlightProviderCapabilities[] = [
  {
    provider: "Duffel",
    exactSelectionRefresh: "exact-offer",
    expirySemantics: "provider-specific",
    externalHandoff: { kind: "none" },
  },
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function projectFlightHandoffCapability(
  value: unknown,
): FlightHandoffCapability {
  if (!isObject(value) || value.kind === "none") {
    return { kind: "none" };
  }

  if (value.kind !== "external-deeplink") {
    return { kind: "none" };
  }

  const inventoryRequirements = value.inventoryRequirements;
  if (
    value.destinationAcquisition !== "activation-only" ||
    value.destinationValidation !== "validateProviderUrl" ||
    !isObject(inventoryRequirements) ||
    inventoryRequirements.liveSearchItinerary !== true ||
    inventoryRequirements.explicitOutboundReturnRelationship !== true ||
    inventoryRequirements.fareOptionIdentity !== true ||
    inventoryRequirements.bookingAgentIdentity !== true ||
    inventoryRequirements.serverOnlyProviderIdentity !== true ||
    inventoryRequirements.browserSafeProjection !== true
  ) {
    return { kind: "none" };
  }

  return {
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
  };
}

/**
 * Creates a recursively allowlisted snapshot. TypeScript's structural types do
 * not remove undeclared runtime properties, so registry objects must never
 * cross this boundary directly (or through a shallow copy).
 */
export function projectFlightProviderCapabilities(
  source: FlightProviderCapabilities,
): FlightProviderCapabilities {
  const externalHandoff = projectFlightHandoffCapability(
    source.externalHandoff,
  );

  return {
    provider: source.provider,
    exactSelectionRefresh: source.exactSelectionRefresh,
    expirySemantics: source.expirySemantics,
    externalHandoff,
  };
}

export function getFlightProviderCapabilities(
  provider: string,
  providers: readonly FlightProviderCapabilities[] = FLIGHT_PROVIDER_CAPABILITIES,
): FlightProviderCapabilities | null {
  const matched = providers.find(
    (candidate) =>
      candidate.provider.trim().toLowerCase() === provider.trim().toLowerCase(),
  );

  return matched ? projectFlightProviderCapabilities(matched) : null;
}

export function isFlightOfferExternalHandoffCapable(
  result: NormalizedFlightResult,
  providers: readonly FlightProviderCapabilities[] = FLIGHT_PROVIDER_CAPABILITIES,
): boolean {
  if (!isProviderBackedFlightOffer(result)) return false;

  return (
    getFlightProviderCapabilities(result.provider, providers)?.externalHandoff
      .kind === "external-deeplink"
  );
}
