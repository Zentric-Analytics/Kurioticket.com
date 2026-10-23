export type SearchDiagnosticProduct = "FLIGHT" | "HOTEL" | "CAR" | "PACKAGE";

export type SafeProviderIssue = {
  code: "PROVIDER_TIMEOUT" | "RATE_LIMITED" | "AUTH_OR_CONFIG" | "UPSTREAM_UNAVAILABLE" | "PROVIDER_ERROR";
  label: string;
  retryable: boolean | null;
};

export function providerSearchService(product: SearchDiagnosticProduct) {
  if (product === "FLIGHT") return "flight-search";
  if (product === "HOTEL") return "hotel-search";
  if (product === "CAR") return "car-search";
  return "package-search";
}

export function classifyProviderIssue(message: string | null): SafeProviderIssue {
  if (!message) return { code: "PROVIDER_ERROR", label: "Provider error", retryable: null };
  const normalized = message.toLowerCase();
  if (normalized.includes("timeout") || normalized.includes("timed out") || normalized.includes("abort")) {
    return { code: "PROVIDER_TIMEOUT", label: "Provider timeout", retryable: true };
  }
  if (normalized.includes("429") || normalized.includes("rate limit") || normalized.includes("too many")) {
    return { code: "RATE_LIMITED", label: "Rate limited", retryable: true };
  }
  if (
    normalized.includes("401")
    || normalized.includes("403")
    || normalized.includes("unauthor")
    || normalized.includes("forbidden")
    || normalized.includes("credential")
    || normalized.includes("api key")
  ) {
    return { code: "AUTH_OR_CONFIG", label: "Authentication / configuration", retryable: false };
  }
  if (
    normalized.includes("500")
    || normalized.includes("502")
    || normalized.includes("503")
    || normalized.includes("504")
    || normalized.includes("unavailable")
    || normalized.includes("upstream")
  ) {
    return { code: "UPSTREAM_UNAVAILABLE", label: "Upstream unavailable", retryable: true };
  }
  return { code: "PROVIDER_ERROR", label: "Provider error", retryable: null };
}
