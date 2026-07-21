#!/usr/bin/env node
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { buildMarketAssetPriorityLaunchQueue } = jiti(
  "../src/data/images/marketAssetPriorityLaunchQueue.ts",
);
const { buildMarketAssetLaunchProgressTemplate } = jiti(
  "../src/data/images/marketAssetLaunchProgressTemplate.ts",
);

const [createdAt = "YYYY-MM-DD", launchAssetTarget, markets, initialStatus] = process.argv.slice(2);

const queue = buildMarketAssetPriorityLaunchQueue({
  createdAt,
  launchAssetTarget: launchAssetTarget ? Number(launchAssetTarget) : undefined,
  markets: markets ? markets.split(",") : undefined,
});
const template = buildMarketAssetLaunchProgressTemplate(queue, {
  initialStatus: initialStatus || undefined,
});

console.log(JSON.stringify(template, null, 2));
