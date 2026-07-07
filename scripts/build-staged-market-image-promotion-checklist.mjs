#!/usr/bin/env node
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { buildStagedProductionPromotionChecklist } = jiti(
  "../src/data/images/marketImagePacks/stagedProductionPromotionChecklist.ts",
);

const [batchId, market] = process.argv.slice(2);

if (!batchId || !market) {
  throw new Error(
    "Usage: node scripts/build-staged-market-image-promotion-checklist.mjs <batchId> <market>",
  );
}

const checklist = buildStagedProductionPromotionChecklist(batchId, market);

if (checklist.warnings.length > 0) {
  console.log("Promotion checklist warnings:");
  for (const warning of checklist.warnings) console.log(`- ${warning}`);
  console.log("");
}

if (!checklist.valid) {
  throw new Error(`Promotion checklist failed:\n${checklist.errors.join("\n")}`);
}

console.log("Staged market image promotion checklist");
console.log(`Batch: ${checklist.batchId}`);
console.log(`Market: ${checklist.market}`);
console.log(`Entries to promote: ${checklist.entriesToPromote}`);
console.log(`Target files: ${checklist.targetFiles.join(", ")}`);
console.log("");
console.log("Checklist:");
for (const item of checklist.items) {
  const status = item.complete ? "[x]" : "[ ]";
  const required = item.required ? "required" : "optional";
  console.log(`${status} ${item.label} (${required})`);
}
console.log("");
console.log("Post-promotion commands:");
for (const command of checklist.postPromotionCommands) console.log(`- ${command}`);
