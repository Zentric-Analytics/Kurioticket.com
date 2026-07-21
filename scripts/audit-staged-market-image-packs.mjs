#!/usr/bin/env node
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { auditStagedProductionMarketImagePacks } = jiti(
  "../src/data/images/marketImagePacks/stagedProductionPackAudit.ts",
);

const result = auditStagedProductionMarketImagePacks();

if (result.warnings.length > 0) {
  console.log("Staged market image pack warnings:");
  for (const warning of result.warnings) {
    console.log(`- ${warning}`);
  }
  console.log("");
}

if (!result.valid) {
  throw new Error(`Staged market image pack audit failed:\n${result.errors.join("\n")}`);
}

console.log("Staged market image pack audit passed.");
console.log(`Staged packs: ${result.stagedPackCount}`);
console.log(`Staged images: ${result.stagedImageCount}`);
