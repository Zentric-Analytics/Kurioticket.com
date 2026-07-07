#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { convertMarketAssetManifestToRegistryEntries } = jiti(
  "../src/data/images/marketAssetManifestConverter.ts",
);

const manifestPath = process.argv[2];

if (!manifestPath) {
  throw new Error("Usage: node scripts/convert-market-asset-manifest.mjs <manifest.json>");
}

const absoluteManifestPath = resolve(process.cwd(), manifestPath);
const manifestContent = await readFile(absoluteManifestPath, "utf8");
const manifest = JSON.parse(manifestContent);
const result = convertMarketAssetManifestToRegistryEntries(manifest);

if (!result.valid) {
  throw new Error(`Market asset manifest is invalid:\n${result.errors.join("\n")}`);
}

console.log("Market asset manifest converted successfully.");
console.log(`Entries: ${result.entries.length}`);
console.log("");
console.log("Registry-ready entries:");
console.log(JSON.stringify(result.entries, null, 2));
console.log("");
console.log("Dry run only: no registry files were modified.");
