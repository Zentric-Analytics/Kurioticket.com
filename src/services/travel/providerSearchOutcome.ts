import type { ProviderResult } from "@/lib/types";

/** Empty is evidence only when a provider actually completed a search. */
export function providerSearchWarnings(providers: ProviderResult<unknown>[], resultCount: number): string[] {
  if (providers.some(provider => provider.status === "failed")) return ["Search is temporarily unavailable. Please try again."];
  if (resultCount === 0 && !providers.some(provider => provider.status === "success")) {
    return [providers.some(provider => provider.errorReason === "unsupported_search" || provider.errorReason === "unsupported_location")
      ? "The available providers cannot search these options. Please change your search."
      : "Search is temporarily unavailable. Please try again."];
  }
  return [];
}
