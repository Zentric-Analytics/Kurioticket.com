import type { MarketAssetHandoffTransferChecklist } from "./marketAssetHandoffTransferChecklist";

export type MarketAssetHandoffTransferCompletion = {
  id: string;
  completed: boolean;
};

export type MarketAssetHandoffTransferReadinessResult = {
  ready: boolean;
  totalChecks: number;
  completedChecks: number;
  remainingChecks: number;
  missingCheckIds: string[];
};

export function checkMarketAssetHandoffTransferReadiness(
  checklist: MarketAssetHandoffTransferChecklist,
  completions: MarketAssetHandoffTransferCompletion[] = [],
): MarketAssetHandoffTransferReadinessResult {
  const completedIds = new Set(
    completions.filter((completion) => completion.completed).map((completion) => completion.id),
  );
  const requiredCheckIds = checklist.entries.flatMap((entry) =>
    entry.checklist.map((item) => item.id),
  );
  const missingCheckIds = requiredCheckIds.filter((id) => !completedIds.has(id));

  return {
    ready: missingCheckIds.length === 0,
    totalChecks: requiredCheckIds.length,
    completedChecks: requiredCheckIds.length - missingCheckIds.length,
    remainingChecks: missingCheckIds.length,
    missingCheckIds,
  };
}
