import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const supportedRegionsSource = readFileSync(resolve(root, "src/lib/region/supportedRegions.ts"), "utf8");
const fallbackRatesSource = readFileSync(resolve(root, "src/lib/currency/exchangeRates.ts"), "utf8");

const visibleCurrencies = Array.from(
  new Set([...supportedRegionsSource.matchAll(/currency:\s*"([A-Z]{3})"/g)].map((match) => match[1]))
).sort();

const fallbackRateBlock = fallbackRatesSource.match(/fallbackExchangeRatesFromUsd:\s*Record<string, number>\s*=\s*{(?<body>[\s\S]*?)\n};/);

if (!fallbackRateBlock?.groups?.body) {
  console.error("Could not find fallbackExchangeRatesFromUsd in src/lib/currency/exchangeRates.ts.");
  process.exit(1);
}

const fallbackCurrencies = new Set(
  [...fallbackRateBlock.groups.body.matchAll(/^\s*([A-Z]{3}):\s*[-0-9.]+,/gm)].map((match) => match[1])
);
const missingCurrencies = visibleCurrencies.filter((currency) => !fallbackCurrencies.has(currency));

if (!fallbackCurrencies.has("USD")) {
  missingCurrencies.push("USD");
}

if (missingCurrencies.length > 0) {
  console.error("Visible currencies missing emergency fallback rates:");
  for (const currency of Array.from(new Set(missingCurrencies)).sort()) {
    console.error(`- ${currency}`);
  }
  console.error("No visible currency may silently fall back to USD.");
  process.exit(1);
}

console.log(
  `Verified ${visibleCurrencies.length} visible currencies have explicit emergency fallback rates; no visible currency silently falls back to USD.`
);
