#!/usr/bin/env node
import fs from "node:fs";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { reviewMarketAssetManifest } = jiti("../src/data/images/marketAssetManifestReview.ts");

const [manifestPath] = process.argv.slice(2);

if (!manifestPath) {
  throw new Error("Usage: node scripts/review-market-asset-manifest.mjs <manifest.json>");
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const review = reviewMarketAssetManifest(manifest);

console.log(JSON.stringify(review, null, 2));

if (!review.ready) {
  process.exitCode = 1;
}
