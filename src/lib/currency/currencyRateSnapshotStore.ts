import { Prisma } from "@/generated/prisma/client";

import {
  FX_BASE_CURRENCY,
  type CurrencyRatePayload,
  type ExchangeRates,
} from "@/lib/currency/exchangeRates";
import { getOptionalPrisma } from "@/lib/prisma";
import { supportedRegions } from "@/lib/region/supportedRegions";

const visibleCurrencies = Array.from(
  new Set(supportedRegions.map((region) => region.currency.toUpperCase())),
).sort();

function validateVisibleCurrencyCoverage(rates: ExchangeRates) {
  return visibleCurrencies.filter((currency) => rates[currency] === undefined);
}

function normalizeRates(value: unknown): ExchangeRates | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const rates: ExchangeRates = {};

  for (const [rawCurrency, rawRate] of Object.entries(value)) {
    const currency = rawCurrency.toUpperCase();
    const rate = typeof rawRate === "string" ? Number(rawRate) : rawRate;

    if (!/^[A-Z]{3}$/.test(currency)) continue;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) continue;

    rates[currency] = rate;
  }

  rates[FX_BASE_CURRENCY] = 1;
  return rates;
}

function normalizeMissingCurrencies(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((currency): currency is string => typeof currency === "string")
    .map((currency) => currency.toUpperCase())
    .filter((currency) => /^[A-Z]{3}$/.test(currency))
    .sort();
}

export async function getLatestCurrencyRateSnapshotPayload({
  cacheTtlSeconds,
  now = new Date(),
}: {
  cacheTtlSeconds: number;
  now?: Date;
}): Promise<CurrencyRatePayload | null> {
  const db = getOptionalPrisma();
  if (!db) return null;

  try {
    const snapshot = await db.currencyRateSnapshot.findFirst({
      where: {
        baseCurrency: FX_BASE_CURRENCY,
        isFallback: false,
        status: "valid",
      },
      orderBy: { fetchedAt: "desc" },
    });

    if (!snapshot) return null;

    const rates = normalizeRates(snapshot.rates);
    if (!rates) return null;

    const missingCurrencies = Array.from(
      new Set([
        ...normalizeMissingCurrencies(snapshot.missingCurrencies),
        ...validateVisibleCurrencyCoverage(rates),
      ]),
    ).sort();

    if (missingCurrencies.length > 0) return null;

    const stale = snapshot.expiresAt.getTime() <= now.getTime();

    return {
      base: FX_BASE_CURRENCY,
      rates,
      fetchedAt: snapshot.fetchedAt.toISOString(),
      source: snapshot.source,
      isFallback: false,
      missingCurrencies,
      cacheTtlSeconds,
      cacheExpiresAt: snapshot.expiresAt.toISOString(),
      ratesSource: stale ? "database-stale" : "database",
      stale,
      snapshotId: snapshot.id,
    };
  } catch (error) {
    console.error("[currency-rates] database snapshot read failed", error);
    return null;
  }
}

export async function storeCurrencyRateSnapshot({
  payload,
  status = "valid",
}: {
  payload: CurrencyRatePayload;
  status?: string;
}) {
  const db = getOptionalPrisma();
  if (!db) return null;

  return db.currencyRateSnapshot.create({
    data: {
      baseCurrency: payload.base,
      rates: payload.rates as Prisma.InputJsonValue,
      source: payload.source,
      fetchedAt: new Date(payload.fetchedAt),
      expiresAt: new Date(payload.cacheExpiresAt),
      isFallback: payload.isFallback,
      missingCurrencies: payload.missingCurrencies as Prisma.InputJsonValue,
      rateCount: Object.keys(payload.rates).length,
      status,
    },
  });
}
