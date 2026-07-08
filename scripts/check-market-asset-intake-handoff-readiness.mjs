#!/usr/bin/env node
import fs from "node:fs";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { checkMarketAssetIntakeHandoffReadiness } = jiti(
  "../src/data/images/marketAssetIntakeHandoffReadiness.ts",
);

const [handoffPath] = process.argv.slice(2);

if (!handoffPath) {
  throw new Error("Usage: node scripts/check-market-asset-intake-handoff-readiness.mjs <handoff.json>");
}

const handoff = JSON.parse(fs.readFileSync(handoffPath, "utf8"));
const result = checkMarketAssetIntakeHandoffReadiness(handoff);

console.log(JSON.stringify(result, null, 2));

if (!result.ready) {
  process.exitCode = 1;
}
