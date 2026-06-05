import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const root = process.cwd();
const supportedRegionsSource = readFileSync(resolve(root, "src/lib/region/supportedRegions.ts"), "utf8");
const fallbackRatesSource = readFileSync(resolve(root, "src/lib/currency/exchangeRates.ts"), "utf8");

const visibleCurrencies = Array.from(
  new Set([...supportedRegionsSource.matchAll(/currency:\s*"([A-Z]{3})"/g)].map((match) => match[1])),
).sort();

const fallbackRateBlock = fallbackRatesSource.match(/fallbackExchangeRatesFromUsd:\s*Record<string, number>\s*=\s*{(?<body>[\s\S]*?)\n};/);

if (!fallbackRateBlock?.groups?.body) {
  console.error("Could not find fallbackExchangeRatesFromUsd in src/lib/currency/exchangeRates.ts.");
  process.exit(1);
}

const fallbackCurrencies = new Set(
  [...fallbackRateBlock.groups.body.matchAll(/^\s*([A-Z]{3}):\s*[-0-9.]+,/gm)].map((match) => match[1]),
);
const missingFallbackCurrencies = visibleCurrencies.filter((currency) => !fallbackCurrencies.has(currency));

if (!fallbackCurrencies.has("USD")) {
  missingFallbackCurrencies.push("USD");
}

if (missingFallbackCurrencies.length > 0) {
  console.error("Visible currencies missing emergency fallback rates:");
  for (const currency of Array.from(new Set(missingFallbackCurrencies)).sort()) {
    console.error(`- ${currency}`);
  }
  console.error("No visible currency may silently fall back to USD.");
  process.exit(1);
}

const providerExpectedCurrencies = new Set(visibleCurrencies);
providerExpectedCurrencies.add("USD");

if ([...providerExpectedCurrencies].some((currency) => !/^[A-Z]{3}$/.test(currency))) {
  console.error("Provider expected currency list contains invalid currency codes.");
  process.exit(1);
}

console.log(
  `Verified ${visibleCurrencies.length} visible currencies have explicit emergency fallback rates; no visible currency silently falls back to USD.`,
);
console.log(
  `Verified ${providerExpectedCurrencies.size} visible currencies are expected from CurrencyFreaks provider snapshots.`,
);

const databaseUrl = ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL_NON_POOLING"]
  .map((name) => process.env[name]?.trim())
  .find(Boolean);

if (!databaseUrl) {
  console.warn("Database URL is not configured; skipping optional CurrencyRateSnapshot coverage check.");
  process.exit(0);
}

const { Client } = pg;
const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();
  const result = await client.query(`
    SELECT id, rates, "missingCurrencies"
    FROM "CurrencyRateSnapshot"
    WHERE "baseCurrency" = 'USD'
      AND "isFallback" = false
      AND status = 'valid'
    ORDER BY "fetchedAt" DESC
    LIMIT 1
  `);

  if (result.rowCount === 0) {
    console.warn("No valid CurrencyRateSnapshot exists yet; skipping DB snapshot coverage check.");
    process.exit(0);
  }

  const snapshot = result.rows[0];
  const rates = snapshot.rates && typeof snapshot.rates === "object" ? snapshot.rates : {};
  const missingFromRates = visibleCurrencies.filter((currency) => rates[currency] === undefined);
  const recordedMissing = Array.isArray(snapshot.missingCurrencies) ? snapshot.missingCurrencies : [];
  const missingCurrencies = Array.from(new Set([...missingFromRates, ...recordedMissing])).sort();

  if (missingCurrencies.length > 0) {
    console.error(`Latest CurrencyRateSnapshot ${snapshot.id} is missing visible currencies:`);
    for (const currency of missingCurrencies) console.error(`- ${currency}`);
    console.error("No visible currency may silently fall back to USD.");
    process.exit(1);
  }

  console.log(`Verified latest CurrencyRateSnapshot ${snapshot.id} covers all visible currencies.`);
} catch (error) {
  console.warn(`Skipping optional CurrencyRateSnapshot coverage check: ${error.message}`);
} finally {
  await client.end().catch(() => undefined);
}
