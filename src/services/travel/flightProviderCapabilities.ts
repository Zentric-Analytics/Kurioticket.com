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

/**
 * Creates a recursively allowlisted snapshot. TypeScript's structural types do
 * not remove undeclared runtime properties, so registry objects must never
 * cross this boundary directly (or through a shallow copy).
 */
export function projectFlightProviderCapabilities(
  source: FlightProviderCapabilities,
): FlightProviderCapabilities {
  const externalHandoff: FlightHandoffCapability =
    source.externalHandoff.kind === "none"
      ? { kind: "none" }
      : {
          kind: "external-deeplink",
          destinationAcquisition: source.externalHandoff.destinationAcquisition,
          destinationValidation: source.externalHandoff.destinationValidation,
          inventoryRequirements: {
            liveSearchItinerary:
              source.externalHandoff.inventoryRequirements.liveSearchItinerary,
            explicitOutboundReturnRelationship:
              source.externalHandoff.inventoryRequirements
                .explicitOutboundReturnRelationship,
            fareOptionIdentity:
              source.externalHandoff.inventoryRequirements.fareOptionIdentity,
            bookingAgentIdentity:
              source.externalHandoff.inventoryRequirements.bookingAgentIdentity,
            serverOnlyProviderIdentity:
              source.externalHandoff.inventoryRequirements
                .serverOnlyProviderIdentity,
            browserSafeProjection:
              source.externalHandoff.inventoryRequirements
                .browserSafeProjection,
          },
        };

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
