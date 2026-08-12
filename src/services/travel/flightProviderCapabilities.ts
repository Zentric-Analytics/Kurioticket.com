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

const DUFFEL_CAPABILITIES = {
  provider: "Duffel",
  exactSelectionRefresh: "exact-offer",
  expirySemantics: "provider-specific",
  externalHandoff: { kind: "none" },
} as const satisfies FlightProviderCapabilities;

const PRODUCTION_FLIGHT_PROVIDER_CAPABILITIES: readonly FlightProviderCapabilities[] =
  [DUFFEL_CAPABILITIES];

const canonicalProvider = (provider: string) => provider.trim().toLowerCase();

/** Resolves server-owned provider behavior; capability data is never a browser projection. */
export function getFlightProviderCapabilities(
  result: Pick<NormalizedFlightResult, "provider">,
  providers: readonly FlightProviderCapabilities[] = PRODUCTION_FLIGHT_PROVIDER_CAPABILITIES,
): FlightProviderCapabilities | null {
  const provider = canonicalProvider(result.provider);
  return (
    providers.find(
      (capabilities) => canonicalProvider(capabilities.provider) === provider,
    ) ?? null
  );
}

/**
 * Gates only whether an exact provider-backed offer may proceed toward a future
 * activation. It deliberately cannot return or accept a destination URL.
 */
export function isFlightOfferExternalHandoffCapable(
  result: NormalizedFlightResult,
  providers?: readonly FlightProviderCapabilities[],
) {
  if (!isProviderBackedFlightOffer(result)) return false;
  return (
    getFlightProviderCapabilities(result, providers)?.externalHandoff.kind ===
    "external-deeplink"
  );
}
