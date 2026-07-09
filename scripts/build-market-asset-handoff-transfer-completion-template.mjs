#!/usr/bin/env node
import fs from "node:fs";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { buildMarketAssetHandoffTransferCompletionTemplate } = jiti(
  "../src/data/images/marketAssetHandoffTransferCompletionTemplate.ts",
);

const [checklistPath, completed] = process.argv.slice(2);

if (!checklistPath) {
  throw new Error(
    "Usage: node scripts/build-market-asset-handoff-transfer-completion-template.mjs <checklist.json> [completed]",
  );
}

const checklist = JSON.parse(fs.readFileSync(checklistPath, "utf8"));
const template = buildMarketAssetHandoffTransferCompletionTemplate(checklist, {
  completed: completed === "true" ? true : undefined,
});

console.log(JSON.stringify(template, null, 2));
