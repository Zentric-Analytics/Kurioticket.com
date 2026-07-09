export type MarketAssetFirstBatchCommandPlan = {
  batchId: string;
  market: string;
  files: {
    handoff: string;
    transferChecklist: string;
    transferCompletions: string;
    manifest: string;
  };
  commands: {
    buildHandoff: string;
    checkHandoffReadiness: string;
    buildTransferChecklist: string;
    buildTransferCompletions: string;
    buildManifest: string;
    checkTransferReadiness: string;
    reviewManifest: string;
    checkConflicts: string;
    convertManifest: string;
  };
};

export type MarketAssetFirstBatchCommandPlanOptions = {
  batchId?: string;
  market?: string;
  createdAt?: string;
  owner?: string;
  fileSuffix?: string;
};

export function buildMarketAssetFirstBatchCommandPlan(
  options: MarketAssetFirstBatchCommandPlanOptions = {},
): MarketAssetFirstBatchCommandPlan {
  const batchId = options.batchId ?? "market-assets-2026-07-us-001";
  const market = options.market ?? "US";
  const createdAt = options.createdAt ?? "2026-07-08";
  const owner = options.owner ?? "Design ops";
  const fileSuffix = options.fileSuffix ?? "us-001";
  const files = {
    handoff: `intake-handoff-${fileSuffix}.json`,
    transferChecklist: `transfer-checklist-${fileSuffix}.json`,
    transferCompletions: `transfer-completions-${fileSuffix}.json`,
    manifest: `manifest-${fileSuffix}.json`,
  };

  return {
    batchId,
    market,
    files,
    commands: {
      buildHandoff: `node scripts/build-market-asset-intake-handoff-template.mjs ${market} ${batchId} ${createdAt} "${owner}" > ${files.handoff}`,
      checkHandoffReadiness: `node scripts/check-market-asset-intake-handoff-readiness.mjs ${files.handoff}`,
      buildTransferChecklist: `node scripts/build-market-asset-handoff-transfer-checklist.mjs ${files.handoff} > ${files.transferChecklist}`,
      buildTransferCompletions: `node scripts/build-market-asset-handoff-transfer-completion-template.mjs ${files.transferChecklist} > ${files.transferCompletions}`,
      buildManifest: `node scripts/build-market-asset-batch-template.mjs ${market} ${batchId} ${createdAt} > ${files.manifest}`,
      checkTransferReadiness: `node scripts/check-market-asset-handoff-transfer-readiness.mjs ${files.transferChecklist} ${files.transferCompletions}`,
      reviewManifest: `node scripts/review-market-asset-manifest.mjs ${files.manifest}`,
      checkConflicts: `node scripts/check-market-asset-manifest-conflicts.mjs ${files.manifest}`,
      convertManifest: `node scripts/convert-market-asset-manifest.mjs ${files.manifest}`,
    },
  };
}
