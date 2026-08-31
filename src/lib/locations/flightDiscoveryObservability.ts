import type { ProviderErrorCategory } from "@/lib/types";
import {
  recordDiscoveryQuality,
  setDiscoveryQualitySinkForTests,
  type DiscoveryQualityEvent,
  type DiscoveryQualitySink,
} from "./observability";

export type FlightLocationDiscoveryEvent = DiscoveryQualityEvent;

export function setFlightLocationDiscoverySinkForTests(next: DiscoveryQualitySink | null) {
  setDiscoveryQualitySinkForTests(next);
}

export function recordFlightLocationDiscovery(input: {
  providerStatus: "success" | "failed" | "skipped";
  latencyMs: number;
  resultCount: number;
  usedFallback: boolean;
  errorCategory?: ProviderErrorCategory;
}) {
  void recordDiscoveryQuality({
    product: "flights",
    outcome: input.resultCount === 0 ? "zero-results" : "results",
    provenance: input.usedFallback ? "fallback-catalog" : "live-provider",
    resultCount: input.resultCount,
    latencyMs: input.latencyMs,
    staticCoverage: "reference-only",
    providerOutcome: input.providerStatus,
    errorCategory: input.errorCategory,
    recoveryOutcome: input.resultCount === 0 ? "no-safe-recovery" : input.usedFallback ? "accepted" : "not-offered",
  });
}

export function recordFlightLocationSelection(source: "live-provider" | "owned-catalog", rank: number) {
  void recordDiscoveryQuality({
    product: "flights",
    outcome: "selected",
    provenance: source === "owned-catalog" ? "fallback-catalog" : "live-provider",
    resultCount: 1,
    latencyMs: 0,
    staticCoverage: "reference-only",
    selectionSource: "suggestion",
    selectionRank: Math.max(1, Math.min(25, Math.trunc(rank) + 1)),
  });
}
