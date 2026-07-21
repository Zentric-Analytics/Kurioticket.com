#!/usr/bin/env node
import fs from "node:fs";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { buildMarketAssetFirstBatchStatusReport } = jiti(
  "../src/data/images/marketAssetFirstBatchStatusReport.ts",
);

const [statusPath, batchId, market] = process.argv.slice(2);

if (!statusPath) {
  throw new Error("Usage: node scripts/build-market-asset-first-batch-status-report.mjs <status.json> [batchId] [market]");
}

const status = JSON.parse(fs.readFileSync(statusPath, "utf8"));
const report = buildMarketAssetFirstBatchStatusReport(status, { batchId, market });

console.log(JSON.stringify(report, null, 2));

if (!report.trusted) {
  process.exitCode = 1;
}
