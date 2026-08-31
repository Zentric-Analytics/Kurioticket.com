export type FlightLocationDiscoveryEvent = {
  name: "flight_location_discovery" | "flight_location_selection";
  outcome: "live" | "fallback" | "zero-result" | "selected";
  providerStatus?: "success" | "failed" | "skipped";
  latencyBucket?: "under-250ms" | "250-999ms" | "1-3s" | "over-3s";
  resultCountBucket?: "0" | "1-3" | "4-8" | "9+";
  source?: "live-provider" | "owned-catalog";
  rank?: number;
  errorCategory?: ProviderErrorCategory;
};

type FlightLocationDiscoverySink = (event: FlightLocationDiscoveryEvent) => void;
let sink: FlightLocationDiscoverySink | null = null;

export function setFlightLocationDiscoverySinkForTests(next: FlightLocationDiscoverySink | null) {
  sink = next;
}

const latencyBucket = (latencyMs: number): FlightLocationDiscoveryEvent["latencyBucket"] =>
  latencyMs < 250 ? "under-250ms" : latencyMs < 1_000 ? "250-999ms" : latencyMs <= 3_000 ? "1-3s" : "over-3s";
const resultCountBucket = (count: number): FlightLocationDiscoveryEvent["resultCountBucket"] =>
  count === 0 ? "0" : count <= 3 ? "1-3" : count <= 8 ? "4-8" : "9+";

export function recordFlightLocationDiscovery(input: {
  providerStatus: "success" | "failed" | "skipped";
  latencyMs: number;
  resultCount: number;
  usedFallback: boolean;
  errorCategory?: FlightLocationDiscoveryEvent["errorCategory"];
}) {
  sink?.({
    name: "flight_location_discovery",
    outcome: input.resultCount === 0 ? "zero-result" : input.usedFallback ? "fallback" : "live",
    providerStatus: input.providerStatus,
    latencyBucket: latencyBucket(input.latencyMs),
    resultCountBucket: resultCountBucket(input.resultCount),
    errorCategory: input.errorCategory,
  });
}

export function recordFlightLocationSelection(source: "live-provider" | "owned-catalog", rank: number) {
  sink?.({ name: "flight_location_selection", outcome: "selected", source, rank: Math.max(0, Math.min(24, Math.trunc(rank))) });
}
import type { ProviderErrorCategory } from "@/lib/types";
