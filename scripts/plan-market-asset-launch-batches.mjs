#!/usr/bin/env node
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { buildMarketAssetLaunchBatchPlan } = jiti(
  "../src/data/images/marketAssetLaunchBatchPlan.ts",
);

const [market, createdAt = "YYYY-MM-DD", launchAssetTarget] = process.argv.slice(2);

if (!market) {
  throw new Error(
    "Usage: node scripts/plan-market-asset-launch-batches.mjs <market> [createdAt] [launchAssetTarget]",
  );
}

const plan = buildMarketAssetLaunchBatchPlan(market, {
  createdAt,
  launchAssetTarget: launchAssetTarget ? Number(launchAssetTarget) : undefined,
});

console.log(JSON.stringify(plan, null, 2));
