import type { MarketAssetFirstBatchStatusInput } from "./marketAssetFirstBatchStatusSummary";

export type MarketAssetFirstBatchStatusTemplateOptions = {
  handoffGenerated?: boolean;
};

export function buildMarketAssetFirstBatchStatusTemplate(
  options: MarketAssetFirstBatchStatusTemplateOptions = {},
): MarketAssetFirstBatchStatusInput {
  return {
    handoffGenerated: options.handoffGenerated ?? false,
    handoffReady: false,
    transferChecklistGenerated: false,
    transferCompletionsGenerated: false,
    manifestGenerated: false,
    transferReady: false,
    manifestReady: false,
    conflictsClear: false,
    converted: false,
  };
}
