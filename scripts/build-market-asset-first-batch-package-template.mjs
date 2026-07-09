#!/usr/bin/env node
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { buildMarketAssetFirstBatchPackageTemplate } = jiti(
  "../src/data/images/marketAssetFirstBatchPackageTemplate.ts",
);

const [handoff, status] = process.argv.slice(2);

const template = buildMarketAssetFirstBatchPackageTemplate({
  handoff: handoff === "true" ? true : undefined,
  status: status === "true" ? true : undefined,
});

console.log(JSON.stringify(template, null, 2));
