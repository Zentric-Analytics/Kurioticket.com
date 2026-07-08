#!/usr/bin/env node
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { buildMarketAssetBatchTemplate, isProductionAssetIntakeMarket } = jiti(
  "../src/data/images/marketAssetBatchTemplate.ts",
);

const [market, batchId, createdAt] = process.argv.slice(2);

if (!market) {
  throw new Error("Usage: node scripts/build-market-asset-batch-template.mjs <market> [batchId] [createdAt]");
}

const normalizedMarket = market.toUpperCase();

if (!isProductionAssetIntakeMarket(normalizedMarket)) {
  throw new Error(`${normalizedMarket} is not configured as a production asset intake market.`);
}

const template = buildMarketAssetBatchTemplate(normalizedMarket, {
  batchId,
  createdAt,
});

console.log(JSON.stringify(template, null, 2));
console.log("");
console.log("Template only: replace every TODO and crop approval before validating or converting this manifest.");
