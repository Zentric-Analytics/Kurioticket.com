import type { AdminSearchRead, AdminSearchDiagnostic, AdminSearchProviderDiagnostic } from "@/services/adminOperationalReadContract";

type SearchLocation = Pick<AdminSearchRead, "product" | "origin" | "destination">;

export function searchDetailProductLabel(product: AdminSearchRead["product"]) {
  return product === "FLIGHT" ? "Flight" : product === "HOTEL" ? "Hotel" : product === "CAR" ? "Car" : "Package";
}

export function searchDetailHeadline(search: SearchLocation): string {
  const { origin, destination, product } = search;
  if (product === "HOTEL") return destination || origin ? "Hotels in " + (destination || origin) : "Hotel search";
  if (origin && destination) return searchDetailProductLabel(product) + " · " + origin + " → " + destination;
  if (product === "CAR") return origin || destination ? "Cars in " + (origin || destination) : "Car search";
  if (destination) return (product === "FLIGHT" ? "Flights" : "Packages") + " to " + destination;
  if (origin) return (product === "FLIGHT" ? "Flights" : "Packages") + " from " + origin;
  return searchDetailProductLabel(product) + " search";
}

export function searchDetailOutcomeLabel(outcome: AdminSearchDiagnostic["outcome"]) {
  return outcome === "SUCCESS" ? "Complete"
    : outcome === "ZERO_RESULTS" ? "No results"
    : outcome === "PARTIAL" ? "Partial"
    : "Failed";
}

export function searchDetailDuration(ms: number | null) {
  return ms === null || !Number.isFinite(ms) || ms < 0 ? "—" : (ms / 1000).toFixed(1) + "s";
}

export function searchDetailIdentityLabel(kind: AdminSearchRead["identity"]["kind"]) {
  return kind === "registered" ? "Registered" : kind === "guest" ? "Guest" : "Unattributed";
}

/** The same classified provider reason belongs in the provider table only. */
export function searchDetailDiagnosisSummary(
  diagnostic: Pick<AdminSearchDiagnostic, "reason" | "providers">,
): string | null {
  const summary = diagnostic.reason.trim();
  if (!summary) return null;
  const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
  return diagnostic.providers.some(provider => normalize(provider.reason) === normalize(summary)) ? null : summary;
}

const providerNextChecks: Readonly<Record<string, string>> = {
  AUTH_OR_CONFIG: "Check the provider integration's authentication and configuration.",
  PROVIDER_TIMEOUT: "Check provider response time and connectivity.",
  RATE_LIMITED: "Review provider rate limits before retrying.",
  UPSTREAM_UNAVAILABLE: "Check provider availability and retry when service recovers.",
  UNSUPPORTED_SEARCH: "Review the requested destination and provider coverage.",
  INVALID_SEARCH: "Review the search criteria and supported values.",
  PROVIDER_DISABLED: "Check whether this provider should be enabled for the search.",
  PROVIDER_ERROR: "Review provider health and recent operational logs.",
};

/** One actionable check per provider and reason category, not per repeated event. */
export function searchDetailNextChecks(
  providers: readonly Pick<AdminSearchProviderDiagnostic, "provider" | "status" | "reasonCode">[],
): Array<{ provider: string; guidance: string }> {
  const checks: Array<{ provider: string; guidance: string }> = [];
  const seen = new Set<string>();
  for (const provider of providers) {
    if (provider.status === "SUCCESS" || !provider.reasonCode) continue;
    const guidance = providerNextChecks[provider.reasonCode];
    if (!guidance) continue;
    const key = provider.provider.trim().toLowerCase() + ":" + provider.reasonCode;
    if (seen.has(key)) continue;
    seen.add(key);
    checks.push({ provider: provider.provider, guidance });
  }
  return checks;
}
