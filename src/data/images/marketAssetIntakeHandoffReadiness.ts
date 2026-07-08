import type {
  MarketAssetIntakeHandoff,
  MarketAssetIntakeHandoffItem,
} from "./marketAssetIntakeHandoffTemplate";

export type MarketAssetIntakeHandoffReadinessResult = {
  ready: boolean;
  errors: string[];
  warnings: string[];
};

const todoPattern = /\bTODO\b/i;
const placeholderDate = "YYYY-MM-DD";

export function checkMarketAssetIntakeHandoffReadiness(
  handoff: MarketAssetIntakeHandoff,
): MarketAssetIntakeHandoffReadinessResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  checkRequiredString("batchId", handoff.batchId, errors);
  checkRequiredString("owner", handoff.owner, errors);

  if (handoff.createdAt === placeholderDate) {
    errors.push("createdAt must be replaced with a real date before handoff approval.");
  }

  handoff.items.forEach((item, index) => {
    checkHandoffItem(`items[${index}]`, item, errors, warnings);
  });

  return {
    ready: errors.length === 0,
    errors,
    warnings,
  };
}

function checkHandoffItem(
  label: string,
  item: MarketAssetIntakeHandoffItem,
  errors: string[],
  warnings: string[],
) {
  const requiredFields: Array<[string, string | undefined]> = [
    ["id", item.id],
    ["usage", item.usage],
    ["intendedSlot", item.intendedSlot],
    ["sourceAssetPath", item.sourceAssetPath],
    ["purchaseOrSourceUrl", item.purchaseOrSourceUrl],
    ["licenseType", item.licenseType],
    ["licenseNotes", item.licenseNotes],
    ["altText", item.altText],
    ["dimensions", item.dimensions],
    ["desktopCropNotes", item.desktopCropNotes],
    ["mobileCropNotes", item.mobileCropNotes],
    ["reviewer", item.reviewer],
    ["approvedAt", item.approvedAt],
  ];

  for (const [field, value] of requiredFields) {
    checkRequiredString(`${label}.${field}`, value, errors);
  }

  if (item.approvedAt === placeholderDate) {
    errors.push(`${label}.approvedAt must be replaced with a real approval date.`);
  }

  if (!item.readyForManifest) {
    errors.push(`${label}.readyForManifest must be true before manifest transfer.`);
  }

  if (!item.notes) {
    warnings.push(`${label}.notes is missing; add intake context if useful.`);
  }
}

function checkRequiredString(label: string, value: string | undefined, errors: string[]) {
  if (!value) {
    errors.push(`${label} is required before handoff approval.`);
    return;
  }

  if (todoPattern.test(value)) {
    errors.push(`${label} still contains a TODO placeholder.`);
  }
}
