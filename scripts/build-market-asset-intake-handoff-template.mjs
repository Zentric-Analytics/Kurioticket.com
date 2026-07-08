#!/usr/bin/env node
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { buildMarketAssetIntakeHandoffTemplate } = jiti(
  "../src/data/images/marketAssetIntakeHandoffTemplate.ts",
);

const [market, batchId, createdAt, owner] = process.argv.slice(2);

if (!market) {
  throw new Error(
    "Usage: node scripts/build-market-asset-intake-handoff-template.mjs <market> [batchId] [createdAt] [owner]",
  );
}

const handoff = buildMarketAssetIntakeHandoffTemplate(market, {
  batchId,
  createdAt,
  owner,
});

console.log(JSON.stringify(handoff, null, 2));
