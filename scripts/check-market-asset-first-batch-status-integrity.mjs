#!/usr/bin/env node
import fs from "node:fs";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { checkMarketAssetFirstBatchStatusIntegrity } = jiti(
  "../src/data/images/marketAssetFirstBatchStatusIntegrity.ts",
);

const [statusPath] = process.argv.slice(2);

if (!statusPath) {
  throw new Error("Usage: node scripts/check-market-asset-first-batch-status-integrity.mjs <status.json>");
}

const status = JSON.parse(fs.readFileSync(statusPath, "utf8"));
const result = checkMarketAssetFirstBatchStatusIntegrity(status);

console.log(JSON.stringify(result, null, 2));

if (!result.valid) {
  process.exitCode = 1;
}
