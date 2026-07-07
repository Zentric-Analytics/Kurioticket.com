#!/usr/bin/env node
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { planStagedProductionPackPromotionTargets } = jiti(
  "../src/data/images/marketImagePacks/stagedProductionPackPromotionTargets.ts",
);

const [batchId, market] = process.argv.slice(2);

if (!batchId || !market) {
  throw new Error(
    "Usage: node scripts/plan-staged-market-image-promotion-targets.mjs <batchId> <market>",
  );
}

const result = planStagedProductionPackPromotionTargets(batchId, market);

if (result.warnings.length > 0) {
  console.log("Promotion target planning warnings:");
  for (const warning of result.warnings) console.log(`- ${warning}`);
  console.log("");
}

if (!result.valid) {
  throw new Error(`Promotion target planning failed:\n${result.errors.join("\n")}`);
}

console.log("Staged market image promotion target plan");
console.log(`Batch: ${result.batchId}`);
console.log(`Market: ${result.market}`);
console.log("");

for (const target of result.targets) {
  console.log(`Target file: ${target.targetFile}`);
  console.log(`Reason: ${target.reason}`);
  console.log(`Entries: ${target.entries.length}`);
  console.log(JSON.stringify(target.entries, null, 2));
  console.log("");
}

console.log("Plan only: no active market image packs were modified.");
