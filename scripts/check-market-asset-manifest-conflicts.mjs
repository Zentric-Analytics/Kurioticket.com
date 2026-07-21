#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { checkMarketAssetManifestConflicts } = jiti(
  "../src/data/images/marketAssetManifestConflictCheck.ts",
);

const manifestPath = process.argv[2];

if (!manifestPath) {
  throw new Error("Usage: node scripts/check-market-asset-manifest-conflicts.mjs <manifest.json>");
}

const manifestContent = await readFile(resolve(process.cwd(), manifestPath), "utf8");
const manifest = JSON.parse(manifestContent);
const result = checkMarketAssetManifestConflicts(manifest);

if (result.warnings.length > 0) {
  console.log("Manifest warnings:");
  for (const warning of result.warnings) {
    console.log(`- ${warning}`);
  }
  console.log("");
}

if (!result.valid) {
  throw new Error(`Market asset manifest has conflicts:\n${result.errors.join("\n")}`);
}

console.log("Market asset manifest conflict check passed.");
