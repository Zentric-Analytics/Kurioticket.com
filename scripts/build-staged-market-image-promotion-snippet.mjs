#!/usr/bin/env node
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { buildStagedProductionPromotionSnippet } = jiti(
  "../src/data/images/marketImagePacks/stagedProductionPromotionSnippet.ts",
);

const [batchId, market] = process.argv.slice(2);

if (!batchId || !market) {
  throw new Error(
    "Usage: node scripts/build-staged-market-image-promotion-snippet.mjs <batchId> <market>",
  );
}

const result = buildStagedProductionPromotionSnippet(batchId, market);

if (result.warnings.length > 0) {
  console.log("Promotion snippet warnings:");
  for (const warning of result.warnings) console.log(`- ${warning}`);
  console.log("");
}

if (!result.valid) {
  throw new Error(`Promotion snippet failed:\n${result.errors.join("\n")}`);
}

console.log("Staged market image promotion snippet");
console.log(`Batch: ${result.batchId}`);
console.log(`Market: ${result.market}`);
console.log(`Target files: ${result.targetFiles.join(", ")}`);
console.log(`Entries to promote: ${result.entriesToPromote}`);
console.log("");
console.log("Snippet:");
console.log(result.snippet);
console.log("");
console.log("Snippet only: no active market image packs were modified.");
