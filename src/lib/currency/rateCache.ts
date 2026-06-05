import type { CurrencyRatePayload } from "@/lib/currency/exchangeRates";

type CachedCurrencyRates = {
  payload: CurrencyRatePayload;
  expiresAtMs: number;
};

const globalRateCache = globalThis as typeof globalThis & {
  __kurioticketCurrencyRateCache?: CachedCurrencyRates;
};

export function getCachedCurrencyRates(nowMs = Date.now()) {
  const cached = globalRateCache.__kurioticketCurrencyRateCache;

  if (!cached || cached.expiresAtMs <= nowMs) {
    return null;
  }

  return cached.payload;
}

export function setCachedCurrencyRates(payload: CurrencyRatePayload, ttlSeconds: number, nowMs = Date.now()) {
  globalRateCache.__kurioticketCurrencyRateCache = {
    payload,
    expiresAtMs: nowMs + ttlSeconds * 1000,
  };

  return payload;
}

export function clearCachedCurrencyRates() {
  globalRateCache.__kurioticketCurrencyRateCache = undefined;
}
