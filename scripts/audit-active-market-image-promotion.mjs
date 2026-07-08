#!/usr/bin/env node
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { auditActiveProductionPromotionForMarket } = jiti(
  "../src/data/images/marketImagePacks/activeProductionPromotionAudit.ts",
);

const [market] = process.argv.slice(2);

if (!market) {
  throw new Error("Usage: node scripts/audit-active-market-image-promotion.mjs <market>");
}

const result = auditActiveProductionPromotionForMarket(market);

if (result.warnings.length > 0) {
  console.log("Active market image promotion warnings:");
  for (const warning of result.warnings) console.log(`- ${warning}`);
  console.log("");
}

if (!result.valid) {
  throw new Error(`Active market image promotion audit failed:\n${result.errors.join("\n")}`);
}

console.log("Active market image promotion audit passed.");
console.log(`Market: ${result.market}`);
console.log(`Production-promoted entries: ${result.productionEntryCount}`);
