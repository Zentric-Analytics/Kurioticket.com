#!/usr/bin/env node
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { buildMarketAssetFirstBatchStatusTemplate } = jiti(
  "../src/data/images/marketAssetFirstBatchStatusTemplate.ts",
);

const [handoffGenerated] = process.argv.slice(2);
const template = buildMarketAssetFirstBatchStatusTemplate({
  handoffGenerated: handoffGenerated === "true" ? true : undefined,
});

console.log(JSON.stringify(template, null, 2));
