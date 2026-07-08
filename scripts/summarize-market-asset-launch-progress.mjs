#!/usr/bin/env node
import fs from "node:fs";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { buildMarketAssetPriorityLaunchQueue } = jiti(
  "../src/data/images/marketAssetPriorityLaunchQueue.ts",
);
const { summarizeMarketAssetLaunchProgress } = jiti(
  "../src/data/images/marketAssetLaunchProgress.ts",
);

const [createdAt = "YYYY-MM-DD", launchAssetTarget, progressPath, markets] = process.argv.slice(2);

const queue = buildMarketAssetPriorityLaunchQueue({
  createdAt,
  launchAssetTarget: launchAssetTarget ? Number(launchAssetTarget) : undefined,
  markets: markets ? markets.split(",") : undefined,
});
const progress = progressPath ? JSON.parse(fs.readFileSync(progressPath, "utf8")) : [];

console.log(JSON.stringify(summarizeMarketAssetLaunchProgress(queue, progress), null, 2));
