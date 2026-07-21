#!/usr/bin/env node
import fs from "node:fs";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { checkMarketAssetFirstBatchPackageReadiness } = jiti(
  "../src/data/images/marketAssetFirstBatchPackageReadiness.ts",
);

const [packageStatusPath, fileSuffix] = process.argv.slice(2);

if (!packageStatusPath) {
  throw new Error(
    "Usage: node scripts/check-market-asset-first-batch-package-readiness.mjs <package-status.json> [fileSuffix]",
  );
}

const packageStatus = JSON.parse(fs.readFileSync(packageStatusPath, "utf8"));
const result = checkMarketAssetFirstBatchPackageReadiness(packageStatus, { fileSuffix });

console.log(JSON.stringify(result, null, 2));

if (!result.ready) {
  process.exitCode = 1;
}
