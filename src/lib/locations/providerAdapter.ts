import type { CanonicalLocation, TravelProduct } from "./types";

export type LocationProviderRequest = { query: string; locale?: string; countryCode?: string; limit: number };
export type LocationProviderResult = {
  locations: CanonicalLocation[];
  source: "owned-catalog" | "live-provider" | "fallback";
  isLiveAvailability: boolean;
};

export interface LocationProviderAdapter {
  readonly id: string;
  readonly products: readonly TravelProduct[];
  suggest(request: LocationProviderRequest, signal?: AbortSignal): Promise<LocationProviderResult>;
}
