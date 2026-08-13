import type { ProviderResult } from "@/lib/types";
import type { DuffelDealsItineraryInventory } from "@/services/travel/providers/duffelProvider";

const EMPTY_CATEGORIES = new Set(["no_inventory", "route_unavailable"]);

export function classifyDealsInventoryProviderFailure(
  provider: ProviderResult<DuffelDealsItineraryInventory>,
) {
  const empty =
    provider.status === "failed" &&
    provider.errorCategory !== undefined &&
    EMPTY_CATEGORIES.has(provider.errorCategory);

  return empty
    ? {
        statusCode: 200,
        body: {
          status: "empty" as const,
          code: "NO_INVENTORY" as const,
          outboundChoices: [],
        },
      }
    : {
        statusCode: 503,
        body: {
          status: "unavailable" as const,
          code: "PROVIDER_TEMPORARILY_UNAVAILABLE" as const,
        },
      };
}

export function logDealsInventoryProviderFailure(
  provider: ProviderResult<DuffelDealsItineraryInventory>,
) {
  console.warn("[deals-v2:flight-inventory] Provider search unavailable", {
    provider: provider.provider,
    status: provider.status,
    errorCategory: provider.errorCategory,
    errorReason: provider.errorReason,
    latencyMs: provider.latencyMs,
    ...(provider.status === "skipped" ? { skippedReason: provider.error } : {}),
  });
}
