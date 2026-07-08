#!/usr/bin/env node
import fs from "node:fs";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { checkMarketAssetManifestReadiness } = jiti(
  "../src/data/images/marketAssetManifestReadiness.ts",
);

const [manifestPath] = process.argv.slice(2);

if (!manifestPath) {
  throw new Error("Usage: node scripts/check-market-asset-manifest-readiness.mjs <manifest.json>");
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const result = checkMarketAssetManifestReadiness(manifest);

if (result.warnings.length > 0) {
  console.log("Manifest readiness warnings:");
  for (const warning of result.warnings) console.log(`- ${warning}`);
  console.log("");
}

if (!result.ready) {
  throw new Error(`Manifest is not ready for conversion:\n${result.errors.join("\n")}`);
}

console.log("Manifest is ready for conflict checks and conversion.");
