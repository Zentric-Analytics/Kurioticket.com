import type { MarketAssetManifest } from "./marketAssetManifest";
import {
  checkMarketAssetManifestReadiness,
  type MarketAssetManifestReadinessResult,
} from "./marketAssetManifestReadiness";
import {
  summarizeMarketAssetManifest,
  type MarketAssetManifestSummary,
} from "./marketAssetManifestSummary";

export type MarketAssetManifestReview = {
  ready: boolean;
  summary: MarketAssetManifestSummary;
  readiness: MarketAssetManifestReadinessResult;
};

export function reviewMarketAssetManifest(manifest: MarketAssetManifest): MarketAssetManifestReview {
  const summary = summarizeMarketAssetManifest(manifest);
  const readiness = checkMarketAssetManifestReadiness(manifest);

  return {
    ready: readiness.ready,
    summary,
    readiness,
  };
}
