#!/usr/bin/env node
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { previewStagedProductionPackPromotion } = jiti(
  "../src/data/images/marketImagePacks/stagedProductionPackPromotion.ts",
);

const [batchId, market] = process.argv.slice(2);

if (!batchId || !market) {
  throw new Error(
    "Usage: node scripts/preview-staged-market-image-promotion.mjs <batchId> <market>",
  );
}

const result = previewStagedProductionPackPromotion(batchId, market);

if (result.warnings.length > 0) {
  console.log("Promotion preview warnings:");
  for (const warning of result.warnings) console.log(`- ${warning}`);
  console.log("");
}

if (!result.valid) {
  throw new Error(`Promotion preview failed:\n${result.errors.join("\n")}`);
}

console.log("Staged production pack promotion preview passed.");
console.log(`Batch: ${result.batchId}`);
console.log(`Market: ${result.market}`);
console.log(`Entries: ${result.entries.length}`);
console.log("");
console.log("Promotion-ready entries:");
console.log(JSON.stringify(result.entries, null, 2));
console.log("");
console.log("Preview only: no active market image packs were modified.");
