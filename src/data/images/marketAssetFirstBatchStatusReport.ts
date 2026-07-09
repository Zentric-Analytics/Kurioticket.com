import { checkMarketAssetFirstBatchStatusIntegrity } from "./marketAssetFirstBatchStatusIntegrity";
import {
  summarizeMarketAssetFirstBatchStatus,
  type MarketAssetFirstBatchStatusInput,
  type MarketAssetFirstBatchStatusSummary,
} from "./marketAssetFirstBatchStatusSummary";

export type MarketAssetFirstBatchStatusReport = {
  integrity: ReturnType<typeof checkMarketAssetFirstBatchStatusIntegrity>;
  summary: MarketAssetFirstBatchStatusSummary;
  trusted: boolean;
};

export type MarketAssetFirstBatchStatusReportOptions = {
  batchId?: string;
  market?: string;
};

export function buildMarketAssetFirstBatchStatusReport(
  status: MarketAssetFirstBatchStatusInput,
  options: MarketAssetFirstBatchStatusReportOptions = {},
): MarketAssetFirstBatchStatusReport {
  const integrity = checkMarketAssetFirstBatchStatusIntegrity(status);
  const summary = summarizeMarketAssetFirstBatchStatus(status, options);

  return {
    integrity,
    summary,
    trusted: integrity.valid,
  };
}
