import { planStagedProductionPackPromotionTargets } from "./stagedProductionPackPromotionTargets";
import type { StagedProductionMarketImagePack } from "./stagedProductionPacks";

export type StagedPromotionChecklistItem = {
  label: string;
  complete: boolean;
  required: boolean;
};

export type StagedPromotionChecklist = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  batchId: string;
  market: string;
  targetFiles: string[];
  entriesToPromote: number;
  items: StagedPromotionChecklistItem[];
  postPromotionCommands: string[];
};

export function buildStagedProductionPromotionChecklist(
  batchId: string,
  market: string,
  stagedPacks?: StagedProductionMarketImagePack[],
): StagedPromotionChecklist {
  const plan = planStagedProductionPackPromotionTargets(batchId, market, stagedPacks);
  const targetFiles = plan.targets.map((target) => target.targetFile);
  const entriesToPromote = plan.targets.reduce(
    (count, target) => count + target.entries.length,
    0,
  );
  const hasTargets = targetFiles.length > 0 && entriesToPromote > 0;

  return {
    valid: plan.valid && hasTargets,
    errors: hasTargets ? plan.errors : [...plan.errors, "No promotion target entries were found."],
    warnings: plan.warnings,
    batchId,
    market,
    targetFiles,
    entriesToPromote,
    items: [
      {
        label: "Staged pack audit passed.",
        complete: plan.valid,
        required: true,
      },
      {
        label: "Promotion target file identified.",
        complete: targetFiles.length > 0,
        required: true,
      },
      {
        label: "Promotion entries are available for review.",
        complete: entriesToPromote > 0,
        required: true,
      },
      {
        label: "Product/design owner approved public-surface promotion.",
        complete: false,
        required: true,
      },
      {
        label: "Entries copied into the printed target file.",
        complete: false,
        required: true,
      },
      {
        label: "Post-promotion audits passed.",
        complete: false,
        required: true,
      },
    ],
    postPromotionCommands: [
      "npm run audit:market-images",
      "node scripts/audit-market-asset-approvals.mjs",
      "node scripts/check-market-image-release-readiness.mjs",
    ],
  };
}
