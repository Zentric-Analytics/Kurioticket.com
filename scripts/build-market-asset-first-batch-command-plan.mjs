#!/usr/bin/env node
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { buildMarketAssetFirstBatchCommandPlan } = jiti(
  "../src/data/images/marketAssetFirstBatchCommandPlan.ts",
);

const [batchId, market, createdAt, owner, fileSuffix] = process.argv.slice(2);

const plan = buildMarketAssetFirstBatchCommandPlan({
  batchId,
  market,
  createdAt,
  owner,
  fileSuffix,
});

console.log(JSON.stringify(plan, null, 2));
