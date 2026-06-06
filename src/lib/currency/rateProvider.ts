import { supportedRegions } from "@/lib/region/supportedRegions";
import {
  FX_BASE_CURRENCY,
  STATIC_FALLBACK_SOURCE,
  fallbackExchangeRatesFromUsd,
  getFallbackRatePayload,
  type CurrencyRatePayload,
  type ExchangeRates,
} from "@/lib/currency/exchangeRates";
import {
  getCachedCurrencyRates,
  setCachedCurrencyRates,
} from "@/lib/currency/rateCache";
import { getLatestCurrencyRateSnapshotPayload } from "@/lib/currency/currencyRateSnapshotStore";

const DEFAULT_CACHE_TTL_SECONDS = 12 * 60 * 60;
const PROVIDER_REQUEST_TIMEOUT_MS = 8_000;
const CURRENCYFREAKS_SOURCE = "CurrencyFreaks";

export const visibleCurrencies = Array.from(
  new Set(supportedRegions.map((region) => region.currency.toUpperCase())),
).sort();

export type CurrencyFreaksRateResult = CurrencyRatePayload & {
  rateCount: number;
};

export function getCacheTtlSeconds() {
  const configuredTtl = Number(process.env.FX_RATE_CACHE_TTL_SECONDS);
  return Number.isFinite(configuredTtl) && configuredTtl > 0
    ? Math.floor(configuredTtl)
    : DEFAULT_CACHE_TTL_SECONDS;
}

function getProviderName() {
  return process.env.FX_PROVIDER_NAME?.trim() || CURRENCYFREAKS_SOURCE;
}

function normalizeCurrencyCode(code: string) {
  return code.trim().toUpperCase();
}

function readPositiveRate(value: unknown) {
  const rate = typeof value === "string" ? Number(value) : value;

  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    return null;
  }

  return rate;
}

type CurrencyFreaksResponse = {
  date?: unknown;
  base?: unknown;
  rates?: unknown;
};

function buildCurrencyFreaksUrl({
  providerUrl,
  apiKey,
}: {
  providerUrl: string;
  apiKey: string;
}) {
  const hasPlaceholders = /\{(?:base|apiKey)\}/.test(providerUrl);

  if (hasPlaceholders) {
    return providerUrl
      .replaceAll("{base}", encodeURIComponent(FX_BASE_CURRENCY))
      .replaceAll("{apiKey}", encodeURIComponent(apiKey));
  }

  const url = new URL(providerUrl);
  url.searchParams.set("base", FX_BASE_CURRENCY);
  if (!url.searchParams.has("apikey")) url.searchParams.set("apikey", apiKey);
  return url.toString();
}

function readFetchedAt(data: CurrencyFreaksResponse) {
  if (typeof data.date === "string") {
    const parsed = new Date(data.date);
    if (Number.isFinite(parsed.getTime())) return parsed.toISOString();
  }

  return new Date().toISOString();
}

export function validateVisibleCurrencyCoverage(rates: ExchangeRates) {
  return visibleCurrencies.filter((currency) => rates[currency] === undefined);
}

function buildPayloadFromProviderRates({
  providerRates,
  fetchedAt,
  source,
  cacheTtlSeconds,
}: {
  providerRates: Record<string, unknown>;
  fetchedAt: string;
  source: string;
  cacheTtlSeconds: number;
}): CurrencyFreaksRateResult {
  const rates: ExchangeRates = { [FX_BASE_CURRENCY]: 1 };

  for (const [rawCurrency, rawRate] of Object.entries(providerRates)) {
    const currency = normalizeCurrencyCode(rawCurrency);
    const rate = readPositiveRate(rawRate);

    if (!/^[A-Z]{3}$/.test(currency) || rate === null) continue;
    rates[currency] = rate;
  }

  rates[FX_BASE_CURRENCY] = 1;

  const missingCurrencies = validateVisibleCurrencyCoverage(rates);
  const fetchedAtTime = new Date(fetchedAt).getTime();
  const cacheExpiresAt = Number.isFinite(fetchedAtTime)
    ? new Date(fetchedAtTime + cacheTtlSeconds * 1000).toISOString()
    : new Date(Date.now() + cacheTtlSeconds * 1000).toISOString();

  return {
    base: FX_BASE_CURRENCY,
    rates,
    fetchedAt,
    source,
    isFallback: false,
    missingCurrencies,
    cacheTtlSeconds,
    cacheExpiresAt,
    ratesSource: "provider-sync",
    stale: false,
    rateCount: Object.keys(rates).length,
  };
}

function buildStaticFallbackPayload(
  cacheTtlSeconds: number,
  missingCurrencies: string[] = [],
): CurrencyRatePayload {
  return {
    ...getFallbackRatePayload({ cacheTtlSeconds, missingCurrencies }),
    ratesSource: STATIC_FALLBACK_SOURCE,
    stale: false,
  };
}

export async function fetchCurrencyFreaksRates({
  cacheTtlSeconds = getCacheTtlSeconds(),
}: {
  cacheTtlSeconds?: number;
} = {}): Promise<CurrencyFreaksRateResult> {
  const providerName = getProviderName();
  const providerUrl = process.env.FX_PROVIDER_URL?.trim();
  const apiKey = process.env.FX_PROVIDER_API_KEY?.trim();

  if (providerName !== CURRENCYFREAKS_SOURCE) {
    throw new Error("FX_PROVIDER_NAME must be CurrencyFreaks.");
  }

  if (!providerUrl || !apiKey) {
    throw new Error("CurrencyFreaks provider URL or API key is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    PROVIDER_REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(
      buildCurrencyFreaksUrl({ providerUrl, apiKey }),
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error("CurrencyFreaks request failed.");
    }

    const data = (await response.json()) as CurrencyFreaksResponse;
    const base = typeof data.base === "string" ? normalizeCurrencyCode(data.base) : null;

    if (base !== FX_BASE_CURRENCY || !data.rates || typeof data.rates !== "object") {
      throw new Error("CurrencyFreaks response did not include USD-based rates.");
    }

    return buildPayloadFromProviderRates({
      providerRates: data.rates as Record<string, unknown>,
      fetchedAt: readFetchedAt(data),
      source: CURRENCYFREAKS_SOURCE,
      cacheTtlSeconds,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function getCurrencyRates({ bypassCache = false } = {}) {
  const cacheTtlSeconds = getCacheTtlSeconds();

  if (!bypassCache) {
    const cachedRates = getCachedCurrencyRates();
    if (cachedRates) return cachedRates;
  }

  const snapshotPayload = await getLatestCurrencyRateSnapshotPayload({
    cacheTtlSeconds,
  });

  const payload =
    snapshotPayload ??
    buildStaticFallbackPayload(
      cacheTtlSeconds,
      validateVisibleCurrencyCoverage(fallbackExchangeRatesFromUsd),
    );

  const inMemoryTtlSeconds = payload.ratesSource === "database" ? cacheTtlSeconds : 60;

  return setCachedCurrencyRates(payload, inMemoryTtlSeconds);
}
