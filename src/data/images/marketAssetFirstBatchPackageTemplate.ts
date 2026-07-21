import type { MarketAssetFirstBatchPackageReadinessInput } from "./marketAssetFirstBatchPackageReadiness";

export type MarketAssetFirstBatchPackageTemplateOptions = {
  handoff?: boolean;
  status?: boolean;
};

export function buildMarketAssetFirstBatchPackageTemplate(
  options: MarketAssetFirstBatchPackageTemplateOptions = {},
): MarketAssetFirstBatchPackageReadinessInput {
  return {
    handoff: options.handoff ?? false,
    transferChecklist: false,
    transferCompletions: false,
    manifest: false,
    status: options.status ?? false,
  };
}
