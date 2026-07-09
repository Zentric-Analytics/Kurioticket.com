import type { MarketAssetIntakeHandoff } from "./marketAssetIntakeHandoffTemplate";

export type MarketAssetHandoffTransferChecklistItem = {
  id: string;
  label: string;
};

export type MarketAssetHandoffTransferChecklistEntry = {
  itemId: string;
  intendedSlot: string;
  checklist: MarketAssetHandoffTransferChecklistItem[];
};

export type MarketAssetHandoffTransferChecklist = {
  batchId: string;
  market: string;
  totalItems: number;
  entries: MarketAssetHandoffTransferChecklistEntry[];
};

export function buildMarketAssetHandoffTransferChecklist(
  handoff: MarketAssetIntakeHandoff,
): MarketAssetHandoffTransferChecklist {
  return {
    batchId: handoff.batchId,
    market: handoff.market,
    totalItems: handoff.items.length,
    entries: handoff.items.map((item) => ({
      itemId: item.id,
      intendedSlot: item.intendedSlot,
      checklist: buildChecklistItems(item.id),
    })),
  };
}

function buildChecklistItems(itemId: string): MarketAssetHandoffTransferChecklistItem[] {
  return [
    {
      id: `${itemId}:source-path`,
      label: "Copy sourceAssetPath into manifest sourceFilePath.",
    },
    {
      id: `${itemId}:source-url`,
      label: "Copy purchaseOrSourceUrl into manifest sourcePage.",
    },
    {
      id: `${itemId}:license`,
      label: "Copy licenseType and licenseNotes into manifest license fields.",
    },
    {
      id: `${itemId}:alt-text`,
      label: "Copy approved altText into manifest alt.",
    },
    {
      id: `${itemId}:dimensions`,
      label: "Copy real dimensions into manifest dimensions and verify they are not 0 x 0.",
    },
    {
      id: `${itemId}:crop-notes`,
      label: "Combine desktopCropNotes and mobileCropNotes into manifest cropNotes.",
    },
    {
      id: `${itemId}:approval`,
      label: "Copy reviewer and approvedAt into manifest reviewer and approvedAt.",
    },
    {
      id: `${itemId}:flags`,
      label: "Set desktopApproved and mobileApproved to true only after both crops are approved.",
    },
  ];
}
