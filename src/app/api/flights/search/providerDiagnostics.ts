import type { ProviderResult } from "@/lib/types";

type ProviderIdentifiedResult = { provider: string };

export function logNativeFlightProviderDiagnostics(input: {
  requestId: string;
  mobilePlatform: "android" | "ios" | null;
  kayakClientIpPresent: boolean;
  userAgentPresent: boolean;
  providerStatuses: ProviderResult<unknown>[];
  finalResults: ProviderIdentifiedResult[];
}) {
  if (!input.mobilePlatform) return;

  console.info("[flight-search:provider-diagnostics]", {
    requestId: input.requestId,
    mobilePlatform: input.mobilePlatform,
    kayakClientIpPresent: input.kayakClientIpPresent,
    userAgentPresent: input.userAgentPresent,
    providers: input.providerStatuses.map((provider) => ({
      provider: provider.provider,
      status: provider.status,
      resultCount: provider.results.length,
      latencyMs: provider.latencyMs,
      errorCategory: provider.errorCategory,
      errorReason: provider.errorReason,
    })),
    finalResultCount: input.finalResults.length,
    finalKayakResultCount: input.finalResults.filter(
      (result) => result.provider === "KAYAK sandbox",
    ).length,
  });
}
