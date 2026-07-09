#!/usr/bin/env node
import fs from "node:fs";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { summarizeMarketAssetFirstBatchStatus } = jiti(
  "../src/data/images/marketAssetFirstBatchStatusSummary.ts",
);

const [statusPath, batchId, market] = process.argv.slice(2);
const status = statusPath ? JSON.parse(fs.readFileSync(statusPath, "utf8")) : {};
const summary = summarizeMarketAssetFirstBatchStatus(status, {
  batchId,
  market,
});

console.log(JSON.stringify(summary, null, 2));
