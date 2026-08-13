import type { ProviderResult } from "@/lib/types";
import type { DuffelDealsItineraryInventory } from "@/services/travel/providers/duffelProvider";

const EMPTY_CATEGORIES = new Set(["no_inventory", "route_unavailable"]);
const TRANSIENT_CATEGORIES = new Set(["timeout", "network", "server"]);

export function classifyDealsInventoryProviderFailure(
  provider: ProviderResult<DuffelDealsItineraryInventory>,
) {
  const empty =
    provider.status === "failed" &&
    provider.errorCategory !== undefined &&
    EMPTY_CATEGORIES.has(provider.errorCategory);

  if (empty)
    return {
      statusCode: 200,
      body: {
        status: "empty" as const,
        code: "NO_INVENTORY" as const,
        outboundChoices: [],
      },
    };

  const configuration =
    provider.status === "skipped" || provider.errorCategory === "auth";
  return {
    statusCode: 503,
    body: {
      status: "unavailable" as const,
      code: configuration
        ? ("PROVIDER_CONFIGURATION_UNAVAILABLE" as const)
        : TRANSIENT_CATEGORIES.has(provider.errorCategory ?? "")
          ? ("PROVIDER_TEMPORARILY_UNAVAILABLE" as const)
          : ("PROVIDER_RESPONSE_UNUSABLE" as const),
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
    ...(provider.diagnostic
      ? {
          diagnosticCode: provider.diagnostic.code,
          diagnosticCounts: provider.diagnostic.counts,
        }
      : {}),
  });
}
