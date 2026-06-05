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

const DEFAULT_CACHE_TTL_SECONDS = 12 * 60 * 60;
const PROVIDER_REQUEST_TIMEOUT_MS = 8_000;
const XE_SYMBOL_BATCH_SIZE = 50;
const XE_DIAGNOSTIC_CURRENCIES = new Set(["ANG", "BGN"]);

export const visibleCurrencies = Array.from(
  new Set(supportedRegions.map((region) => region.currency.toUpperCase())),
).sort();

function getCacheTtlSeconds() {
  const configuredTtl = Number(process.env.FX_RATE_CACHE_TTL_SECONDS);
  return Number.isFinite(configuredTtl) && configuredTtl > 0
    ? Math.floor(configuredTtl)
    : DEFAULT_CACHE_TTL_SECONDS;
}

function isXeProvider(providerName: string) {
  return providerName.toUpperCase() === "XE";
}

function getProviderName() {
  const configuredProviderName = process.env.FX_PROVIDER_NAME?.trim();
  if (!configuredProviderName) return "configured-fx-provider";
  return isXeProvider(configuredProviderName) ? "XE" : configuredProviderName;
}

function buildProviderUrl({
  providerUrl,
  symbols,
  apiKey,
  providerName,
}: {
  providerUrl: string;
  symbols: string[];
  apiKey: string;
  providerName: string;
}) {
  const symbolList = symbols.join(",");
  const hasPlaceholders = /\{(?:base|symbols|apiKey)\}/.test(providerUrl);

  if (hasPlaceholders) {
    return providerUrl
      .replaceAll("{base}", encodeURIComponent(FX_BASE_CURRENCY))
      .replaceAll("{symbols}", encodeURIComponent(symbolList))
      .replaceAll("{apiKey}", encodeURIComponent(apiKey));
  }

  const url = new URL(providerUrl);

  if (isXeProvider(providerName)) {
    if (!url.searchParams.has("from"))
      url.searchParams.set("from", FX_BASE_CURRENCY);
    if (!url.searchParams.has("to")) url.searchParams.set("to", symbolList);
    if (!url.searchParams.has("amount")) url.searchParams.set("amount", "1");
    return url.toString();
  }

  if (!url.searchParams.has("base"))
    url.searchParams.set("base", FX_BASE_CURRENCY);
  if (!url.searchParams.has("symbols"))
    url.searchParams.set("symbols", symbolList);
  if (
    !url.searchParams.has("access_key") &&
    !url.searchParams.has("api_key") &&
    !url.searchParams.has("apikey")
  ) {
    url.searchParams.set("api_key", apiKey);
  }

  return url.toString();
}

function chunkSymbols(symbols: string[], batchSize: number) {
  const batches: string[][] = [];

  for (let index = 0; index < symbols.length; index += batchSize) {
    batches.push(symbols.slice(index, index + batchSize));
  }

  return batches;
}

function shouldLogProviderDiagnostics() {
  return process.env.FX_PROVIDER_DIAGNOSTICS === "true";
}

function logXeProviderDiagnostics(
  event: string,
  details: Record<string, string | number | boolean | string[] | null>,
) {
  if (!shouldLogProviderDiagnostics()) return;

  console.info("[currency:xe]", event, details);
}

function getUrlLength(url: string) {
  return url.length;
}

function getProviderSymbols() {
  return visibleCurrencies.filter((currency) => currency !== FX_BASE_CURRENCY);
}

function buildProviderHeaders({
  providerName,
  accountId,
  apiKey,
}: {
  providerName: string;
  accountId?: string;
  apiKey: string;
}) {
  const headers: Record<string, string> = { Accept: "application/json" };

  if (isXeProvider(providerName) && accountId) {
    headers.Authorization = `Basic ${Buffer.from(`${accountId}:${apiKey}`).toString("base64")}`;
  }

  return headers;
}

type XeRateEntry = {
  currency?: unknown;
  quotecurrency?: unknown;
  code?: unknown;
  mid?: unknown;
  rate?: unknown;
  value?: unknown;
  converted?: unknown;
  amount?: unknown;
};

type ProviderResponse = {
  base?: unknown;
  base_code?: unknown;
  from?: unknown;
  amount?: unknown;
  rates?: unknown;
  conversion_rates?: unknown;
  to?: unknown;
  time_last_update_utc?: unknown;
  time_last_update_unix?: unknown;
  date?: unknown;
  timestamp?: unknown;
  error?: unknown;
  errors?: unknown;
  warning?: unknown;
  warnings?: unknown;
};

function readProviderBase(data: ProviderResponse) {
  const base = data.base ?? data.base_code ?? data.from;
  return typeof base === "string" ? base.toUpperCase() : null;
}

function readPositiveRate(value: unknown) {
  const rate = typeof value === "string" ? Number(value) : value;

  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    return null;
  }

  return rate;
}

function readXeRateEntry(entry: XeRateEntry) {
  const currency = entry.currency ?? entry.quotecurrency ?? entry.code;
  const rate = readPositiveRate(
    entry.mid ?? entry.rate ?? entry.value ?? entry.converted ?? entry.amount,
  );

  if (typeof currency !== "string" || !rate) {
    return null;
  }

  return [currency.toUpperCase(), rate] as const;
}

function readXeProviderRates(data: ProviderResponse) {
  if (
    readProviderBase(data) !== FX_BASE_CURRENCY ||
    readPositiveRate(data.amount) !== 1 ||
    !Array.isArray(data.to)
  )
    return null;

  const rates: Record<string, number> = {};

  for (const entry of data.to) {
    if (!entry || typeof entry !== "object") return null;

    const parsedEntry = readXeRateEntry(entry as XeRateEntry);
    if (!parsedEntry) return null;

    const [currency, rate] = parsedEntry;
    rates[currency] = rate;
  }

  return rates;
}

function readXeDiagnosticEntryDetails(data: ProviderResponse) {
  if (!Array.isArray(data.to)) {
    return { rawCurrencies: [], rawFields: [] };
  }

  const rawCurrencies: string[] = [];
  const rawFields: string[] = [];

  for (const entry of data.to) {
    if (!entry || typeof entry !== "object") continue;

    const xeEntry = entry as XeRateEntry;
    const currency = xeEntry.currency ?? xeEntry.quotecurrency ?? xeEntry.code;

    if (typeof currency !== "string") continue;

    const normalizedCurrency = currency.toUpperCase();

    if (!XE_DIAGNOSTIC_CURRENCIES.has(normalizedCurrency)) continue;

    rawCurrencies.push(normalizedCurrency);
    rawFields.push(
      `${normalizedCurrency}:${Object.keys(entry).sort().join("|")}`,
    );
  }

  return { rawCurrencies, rawFields };
}

function readProviderIssueFields(data: ProviderResponse) {
  return [
    data.error !== undefined ? "error" : null,
    data.errors !== undefined ? "errors" : null,
    data.warning !== undefined ? "warning" : null,
    data.warnings !== undefined ? "warnings" : null,
  ].filter((field): field is string => Boolean(field));
}

function readProviderRates(data: ProviderResponse, providerName: string) {
  const providerBase = readProviderBase(data);
  if (providerBase && providerBase !== FX_BASE_CURRENCY) return null;
  if (isXeProvider(providerName)) return readXeProviderRates(data);
  if (data.rates && typeof data.rates === "object")
    return data.rates as Record<string, unknown>;
  if (data.conversion_rates && typeof data.conversion_rates === "object") {
    return data.conversion_rates as Record<string, unknown>;
  }
  return null;
}

function readFetchedAt(data: ProviderResponse) {
  if (typeof data.time_last_update_utc === "string") {
    const parsed = new Date(data.time_last_update_utc);
    if (Number.isFinite(parsed.getTime())) return parsed.toISOString();
  }

  if (typeof data.time_last_update_unix === "number") {
    return new Date(data.time_last_update_unix * 1000).toISOString();
  }

  if (typeof data.timestamp === "number") {
    return new Date(data.timestamp * 1000).toISOString();
  }

  if (typeof data.timestamp === "string") {
    const parsed = new Date(data.timestamp);
    if (Number.isFinite(parsed.getTime())) return parsed.toISOString();
  }

  if (typeof data.date === "string") {
    const parsed = new Date(data.date);
    if (Number.isFinite(parsed.getTime())) return parsed.toISOString();
  }

  return new Date().toISOString();
}

function buildPayloadFromRates({
  providerRates,
  fetchedAt,
  source,
  cacheTtlSeconds,
}: {
  providerRates: Record<string, unknown>;
  fetchedAt: string;
  source: string;
  cacheTtlSeconds: number;
}): CurrencyRatePayload {
  const rates: ExchangeRates = { [FX_BASE_CURRENCY]: 1 };
  const missingCurrencies: string[] = [];

  for (const currency of visibleCurrencies) {
    if (currency === FX_BASE_CURRENCY) {
      rates[currency] = 1;
      continue;
    }

    const providerRate = providerRates[currency];
    if (
      typeof providerRate === "number" &&
      Number.isFinite(providerRate) &&
      providerRate > 0
    ) {
      rates[currency] = providerRate;
      continue;
    }

    const fallbackRate = fallbackExchangeRatesFromUsd[currency];
    if (typeof fallbackRate === "number") {
      rates[currency] = fallbackRate;
    }
    missingCurrencies.push(currency);
  }

  const fetchedAtTime = new Date(fetchedAt).getTime();
  const cacheExpiresAt = Number.isFinite(fetchedAtTime)
    ? new Date(fetchedAtTime + cacheTtlSeconds * 1000).toISOString()
    : new Date(Date.now() + cacheTtlSeconds * 1000).toISOString();

  return {
    base: FX_BASE_CURRENCY,
    rates,
    fetchedAt,
    source:
      missingCurrencies.length > 0
        ? `${source}+${STATIC_FALLBACK_SOURCE}`
        : source,
    isFallback: missingCurrencies.length > 0,
    missingCurrencies,
    cacheTtlSeconds,
    cacheExpiresAt,
  };
}

function buildFallbackPayload(
  cacheTtlSeconds: number,
  missingCurrencies: string[] = [],
) {
  const payload = getFallbackRatePayload({
    cacheTtlSeconds,
    missingCurrencies,
  });
  return {
    ...payload,
    rates: Object.fromEntries(
      visibleCurrencies.map((currency) => [
        currency,
        fallbackExchangeRatesFromUsd[currency],
      ]),
    ),
  } satisfies CurrencyRatePayload;
}

async function fetchJsonFromProvider({
  url,
  headers,
  signal,
}: {
  url: string;
  headers: Record<string, string>;
  signal: AbortSignal;
}) {
  const response = await fetch(url, {
    headers,
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as ProviderResponse;
}

async function fetchXeProviderRates({
  providerUrl,
  apiKey,
  accountId,
  cacheTtlSeconds,
}: {
  providerUrl: string;
  apiKey: string;
  accountId: string;
  cacheTtlSeconds: number;
}) {
  const symbols = getProviderSymbols();
  const batches = chunkSymbols(symbols, XE_SYMBOL_BATCH_SIZE);
  const headers = buildProviderHeaders({
    providerName: "XE",
    accountId,
    apiKey,
  });
  const mergedRates: Record<string, unknown> = {};
  let fetchedAt = new Date().toISOString();

  logXeProviderDiagnostics("request-plan", {
    symbolCount: symbols.length,
    batchCount: batches.length,
    batchSize: XE_SYMBOL_BATCH_SIZE,
    includesANG: symbols.includes("ANG"),
    includesBGN: symbols.includes("BGN"),
  });

  for (const [batchIndex, batchSymbols] of batches.entries()) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      PROVIDER_REQUEST_TIMEOUT_MS,
    );
    const batchUrl = buildProviderUrl({
      providerUrl,
      symbols: batchSymbols,
      apiKey,
      providerName: "XE",
    });

    logXeProviderDiagnostics("request-batch", {
      batchNumber: batchIndex + 1,
      symbolCount: batchSymbols.length,
      urlLength: getUrlLength(batchUrl),
      includesANG: batchSymbols.includes("ANG"),
      includesBGN: batchSymbols.includes("BGN"),
    });

    try {
      const data = await fetchJsonFromProvider({
        url: batchUrl,
        headers,
        signal: controller.signal,
      });

      if (!data) {
        return buildFallbackPayload(cacheTtlSeconds, batchSymbols);
      }

      const rawDiagnosticDetails = readXeDiagnosticEntryDetails(data);
      const providerIssueFields = readProviderIssueFields(data);
      const providerRates = readProviderRates(data, "XE");

      if (!providerRates) {
        logXeProviderDiagnostics("parser-rejected-batch", {
          batchNumber: batchIndex + 1,
          rawDiagnosticCurrencies: rawDiagnosticDetails.rawCurrencies,
          rawDiagnosticFields: rawDiagnosticDetails.rawFields,
          providerIssueFields,
        });

        return buildFallbackPayload(cacheTtlSeconds, batchSymbols);
      }

      const returnedCurrencies = Object.keys(providerRates);
      const diagnosticCurrencies = returnedCurrencies.filter((currency) =>
        XE_DIAGNOSTIC_CURRENCIES.has(currency),
      );

      logXeProviderDiagnostics("response-batch", {
        batchNumber: batchIndex + 1,
        returnedCurrencyCount: returnedCurrencies.length,
        rawDiagnosticCurrencies: rawDiagnosticDetails.rawCurrencies,
        rawDiagnosticFields: rawDiagnosticDetails.rawFields,
        parsedDiagnosticCurrencies: diagnosticCurrencies,
        providerIssueFields,
      });

      Object.assign(mergedRates, providerRates);
      fetchedAt = readFetchedAt(data);
    } catch {
      return buildFallbackPayload(cacheTtlSeconds, batchSymbols);
    } finally {
      clearTimeout(timeout);
    }
  }

  return buildPayloadFromRates({
    providerRates: mergedRates,
    fetchedAt,
    source: "XE",
    cacheTtlSeconds,
  });
}

async function fetchProviderRates(cacheTtlSeconds: number) {
  const providerUrl = process.env.FX_PROVIDER_URL?.trim();
  const apiKey = process.env.FX_PROVIDER_API_KEY?.trim();
  const accountId = process.env.FX_PROVIDER_ACCOUNT_ID?.trim();
  const providerName = getProviderName();

  if (!providerUrl || !apiKey || (isXeProvider(providerName) && !accountId)) {
    return buildFallbackPayload(cacheTtlSeconds);
  }

  if (isXeProvider(providerName)) {
    return fetchXeProviderRates({
      providerUrl,
      apiKey,
      accountId: accountId as string,
      cacheTtlSeconds,
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    PROVIDER_REQUEST_TIMEOUT_MS,
  );

  try {
    const data = await fetchJsonFromProvider({
      url: buildProviderUrl({
        providerUrl,
        symbols: getProviderSymbols(),
        apiKey,
        providerName,
      }),
      headers: buildProviderHeaders({ providerName, accountId, apiKey }),
      signal: controller.signal,
    });

    if (!data) {
      return buildFallbackPayload(cacheTtlSeconds);
    }

    const providerRates = readProviderRates(data, providerName);

    if (!providerRates) {
      return buildFallbackPayload(cacheTtlSeconds);
    }

    return buildPayloadFromRates({
      providerRates,
      fetchedAt: readFetchedAt(data),
      source: providerName,
      cacheTtlSeconds,
    });
  } catch {
    return buildFallbackPayload(cacheTtlSeconds);
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

  const payload = await fetchProviderRates(cacheTtlSeconds);
  return setCachedCurrencyRates(payload, cacheTtlSeconds);
}
