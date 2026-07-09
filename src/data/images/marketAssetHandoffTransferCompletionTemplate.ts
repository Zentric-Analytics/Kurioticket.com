import type { MarketAssetHandoffTransferChecklist } from "./marketAssetHandoffTransferChecklist";
import type { MarketAssetHandoffTransferCompletion } from "./marketAssetHandoffTransferReadiness";

export type MarketAssetHandoffTransferCompletionTemplateOptions = {
  completed?: boolean;
};

export function buildMarketAssetHandoffTransferCompletionTemplate(
  checklist: MarketAssetHandoffTransferChecklist,
  options: MarketAssetHandoffTransferCompletionTemplateOptions = {},
): MarketAssetHandoffTransferCompletion[] {
  const completed = options.completed ?? false;

  return checklist.entries.flatMap((entry) =>
    entry.checklist.map((item) => ({
      id: item.id,
      completed,
    })),
  );
}
