#!/usr/bin/env node
import fs from "node:fs";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { buildMarketAssetHandoffTransferChecklist } = jiti(
  "../src/data/images/marketAssetHandoffTransferChecklist.ts",
);

const [handoffPath] = process.argv.slice(2);

if (!handoffPath) {
  throw new Error("Usage: node scripts/build-market-asset-handoff-transfer-checklist.mjs <handoff.json>");
}

const handoff = JSON.parse(fs.readFileSync(handoffPath, "utf8"));
const checklist = buildMarketAssetHandoffTransferChecklist(handoff);

console.log(JSON.stringify(checklist, null, 2));
