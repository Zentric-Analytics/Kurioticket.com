#!/usr/bin/env node
import fs from "node:fs";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { checkMarketAssetHandoffTransferReadiness } = jiti(
  "../src/data/images/marketAssetHandoffTransferReadiness.ts",
);

const [checklistPath, completionsPath] = process.argv.slice(2);

if (!checklistPath || !completionsPath) {
  throw new Error(
    "Usage: node scripts/check-market-asset-handoff-transfer-readiness.mjs <checklist.json> <completions.json>",
  );
}

const checklist = JSON.parse(fs.readFileSync(checklistPath, "utf8"));
const completions = JSON.parse(fs.readFileSync(completionsPath, "utf8"));
const result = checkMarketAssetHandoffTransferReadiness(checklist, completions);

console.log(JSON.stringify(result, null, 2));

if (!result.ready) {
  process.exitCode = 1;
}
