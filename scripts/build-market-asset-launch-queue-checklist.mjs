#!/usr/bin/env node
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { buildMarketAssetPriorityLaunchQueue } = jiti(
  "../src/data/images/marketAssetPriorityLaunchQueue.ts",
);
const { buildMarketAssetLaunchQueueChecklist } = jiti(
  "../src/data/images/marketAssetLaunchQueueChecklist.ts",
);

const [createdAt = "YYYY-MM-DD", launchAssetTarget, markets] = process.argv.slice(2);

const queue = buildMarketAssetPriorityLaunchQueue({
  createdAt,
  launchAssetTarget: launchAssetTarget ? Number(launchAssetTarget) : undefined,
  markets: markets ? markets.split(",") : undefined,
});
const checklist = buildMarketAssetLaunchQueueChecklist(queue);

console.log(JSON.stringify(checklist, null, 2));
