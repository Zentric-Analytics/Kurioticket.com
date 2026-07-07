#!/usr/bin/env node
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { auditMarketAssetApprovals } = jiti("../src/data/images/marketAssetApprovalAudit.ts");
const { auditStagedProductionMarketImagePacks } = jiti(
  "../src/data/images/marketImagePacks/stagedProductionPackAudit.ts",
);

const approvalAudit = auditMarketAssetApprovals();
const stagedAudit = auditStagedProductionMarketImagePacks();
const enforceApprovals = process.env.ENFORCE_MARKET_ASSET_APPROVALS === "true";

console.log("Kurioticket market image release readiness");
console.log("==========================================");
console.log("");
console.log("Staged production packs");
console.log(`- Valid: ${stagedAudit.valid ? "yes" : "no"}`);
console.log(`- Packs: ${stagedAudit.stagedPackCount}`);
console.log(`- Images: ${stagedAudit.stagedImageCount}`);

if (stagedAudit.warnings.length > 0) {
  console.log("- Warnings:");
  for (const warning of stagedAudit.warnings) console.log(`  - ${warning}`);
}

console.log("");
console.log("Production asset approvals");
console.log(`- Complete: ${approvalAudit.isComplete ? "yes" : "no"}`);
console.log(`- Requirement groups: ${approvalAudit.coverage.length}`);
console.log(`- Required approved images: ${approvalAudit.totalRequiredImages}`);
console.log(`- Approved images: ${approvalAudit.totalApprovedImages}`);
console.log(`- Missing approved images: ${approvalAudit.totalMissingImages}`);
console.log(`- Incomplete groups: ${approvalAudit.incompleteRequirements.length}`);

if (approvalAudit.incompleteRequirements.length > 0) {
  console.log("- Missing groups:");
  for (const item of approvalAudit.incompleteRequirements) {
    console.log(
      `  - ${item.requirement.market} ${item.requirement.usage}: ${item.approvedCount}/${item.requirement.requiredCount}`,
    );
  }
}

if (!stagedAudit.valid) {
  throw new Error(`Staged market image pack audit failed:\n${stagedAudit.errors.join("\n")}`);
}

if (enforceApprovals && !approvalAudit.isComplete) {
  throw new Error("Production market asset approvals are incomplete.");
}

console.log("");
console.log("Release readiness check completed.");
console.log(
  enforceApprovals
    ? "Approval enforcement is enabled."
    : "Approval enforcement is disabled; missing approvals are reported but not fatal.",
);
