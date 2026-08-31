import type { LocationSearchMatch } from "./types";
import type { StaticCoverageLevel, TravelProduct } from "./types";
import type { ProviderErrorCategory } from "@/lib/types";

export const discoveryResultCountBuckets = ["zero", "one", "two-to-five", "six-to-ten", "eleven-plus"] as const;
export const discoveryLatencyBuckets = ["under-100ms", "100-to-299ms", "300-to-999ms", "one-to-three-seconds", "over-three-seconds"] as const;

type ResultCountBucket = (typeof discoveryResultCountBuckets)[number];
type LatencyBucket = (typeof discoveryLatencyBuckets)[number];
type MatchTier = LocationSearchMatch["tier"] | "none";

export type DiscoveryQualityEvent = Readonly<{
  schemaVersion: 1;
  name: "location-discovery-quality";
  product: TravelProduct;
  outcome: "results" | "zero-results" | "selected" | "recovered" | "unsupported" | "unverified-submitted";
  provenance: "live-provider" | "owned-catalog" | "fallback-catalog" | "recent" | "permissive-text";
  resultCountBucket: ResultCountBucket;
  matchTier: MatchTier;
  selectionSource: "suggestion" | "recent" | "recovery" | "typed-text" | "none";
  selectionRankBucket: "first" | "two-to-three" | "four-to-ten" | "eleven-plus" | "none";
  recoveryOutcome: "not-offered" | "offered" | "accepted" | "dismissed" | "no-safe-recovery";
  latencyBucket: LatencyBucket;
  staticCoverage: StaticCoverageLevel;
  providerOutcome: "success" | "failed" | "skipped" | "not-applicable";
  errorCategory: ProviderErrorCategory | "none";
}>;

export type DiscoveryQualitySink = (event: DiscoveryQualityEvent) => void | Promise<void>;

export type DiscoveryQualityInput = {
  product: TravelProduct;
  outcome: DiscoveryQualityEvent["outcome"];
  provenance: DiscoveryQualityEvent["provenance"];
  resultCount: number;
  matchTier?: MatchTier;
  selectionSource?: DiscoveryQualityEvent["selectionSource"];
  selectionRank?: number;
  recoveryOutcome?: DiscoveryQualityEvent["recoveryOutcome"];
  latencyMs: number;
  staticCoverage: StaticCoverageLevel;
  providerOutcome?: DiscoveryQualityEvent["providerOutcome"];
  errorCategory?: ProviderErrorCategory;
};

export function bucketResultCount(value: number): ResultCountBucket {
  const count = Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0));
  if (count === 0) return "zero";
  if (count === 1) return "one";
  if (count <= 5) return "two-to-five";
  if (count <= 10) return "six-to-ten";
  return "eleven-plus";
}

export function bucketLatency(value: number): LatencyBucket {
  const milliseconds = Math.max(0, Number.isFinite(value) ? value : 0);
  if (milliseconds < 100) return "under-100ms";
  if (milliseconds < 300) return "100-to-299ms";
  if (milliseconds < 1_000) return "300-to-999ms";
  if (milliseconds <= 3_000) return "one-to-three-seconds";
  return "over-three-seconds";
}

function bucketSelectionRank(value?: number): DiscoveryQualityEvent["selectionRankBucket"] {
  if (!Number.isFinite(value) || (value ?? 0) < 1) return "none";
  if (value === 1) return "first";
  if ((value ?? 0) <= 3) return "two-to-three";
  if ((value ?? 0) <= 10) return "four-to-ten";
  return "eleven-plus";
}

export function createDiscoveryQualityEvent(input: DiscoveryQualityInput): DiscoveryQualityEvent {
  return Object.freeze({
    schemaVersion: 1,
    name: "location-discovery-quality",
    product: input.product,
    outcome: input.outcome,
    provenance: input.provenance,
    resultCountBucket: bucketResultCount(input.resultCount),
    matchTier: input.matchTier ?? "none",
    selectionSource: input.selectionSource ?? "none",
    selectionRankBucket: bucketSelectionRank(input.selectionRank),
    recoveryOutcome: input.recoveryOutcome ?? "not-offered",
    latencyBucket: bucketLatency(input.latencyMs),
    staticCoverage: input.staticCoverage,
    providerOutcome: input.providerOutcome ?? "not-applicable",
    errorCategory: input.errorCategory ?? "none",
  });
}

/** Best-effort instrumentation: no sink means no work; sink failures never break search. */
export function createDiscoveryQualityInstrumentation(sink?: DiscoveryQualitySink | null) {
  return {
    enabled: Boolean(sink),
    async record(input: DiscoveryQualityInput) {
      if (!sink) return false;
      try {
        await sink(createDiscoveryQualityEvent(input));
        return true;
      } catch {
        return false;
      }
    },
  } as const;
}

let configuredSink: DiscoveryQualitySink | null = null;

/** Test-only injection point. Production has no configured sink. */
export function setDiscoveryQualitySinkForTests(sink: DiscoveryQualitySink | null) {
  configuredSink = sink;
}

export async function recordDiscoveryQuality(input: DiscoveryQualityInput) {
  return createDiscoveryQualityInstrumentation(configuredSink).record(input);
}

