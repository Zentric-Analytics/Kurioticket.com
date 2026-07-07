#!/usr/bin/env node
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { auditMarketAssetApprovals } = jiti("../src/data/images/marketAssetApprovalAudit.ts");

const result = auditMarketAssetApprovals();

console.log("Kurioticket market asset approval audit");
console.log("=======================================");
console.log(`Requirement groups checked: ${result.coverage.length}`);
console.log(`Required approved image count: ${result.totalRequiredImages}`);
console.log(`Approved image count: ${result.totalApprovedImages}`);
console.log(`Missing approved image count: ${result.totalMissingImages}`);
console.log(`Complete requirement groups: ${result.completeRequirements.length}`);
console.log(`Incomplete requirement groups: ${result.incompleteRequirements.length}`);

if (result.incompleteRequirements.length > 0) {
  console.log("\nIncomplete requirements");
  for (const item of result.incompleteRequirements) {
    const requirement = item.requirement;
    console.log(
      `- ${requirement.market} ${requirement.usage}: ${item.approvedCount}/${requirement.requiredCount} approved, missing ${item.missingCount}`,
    );
  }
}

console.log("\nApproval criteria");
console.log("- Correct market, region, and usage.");
console.log("- premium-approved or provider-real registry status.");
console.log("- Commercial license metadata present.");
console.log("- Desktop and mobile crop approvals are true.");
console.log("- Not temporary, Unsplash, Pexels, or replacement-required.");

if (process.env.ENFORCE_MARKET_ASSET_APPROVALS === "true" && !result.isComplete) {
  process.exitCode = 1;
}
