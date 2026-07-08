#!/usr/bin/env node
import fs from "node:fs";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { summarizeMarketAssetManifest } = jiti("../src/data/images/marketAssetManifestSummary.ts");

const [manifestPath] = process.argv.slice(2);

if (!manifestPath) {
  throw new Error("Usage: node scripts/summarize-market-asset-manifest.mjs <manifest.json>");
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const summary = summarizeMarketAssetManifest(manifest);

console.log(JSON.stringify(summary, null, 2));
