"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FX_BASE_CURRENCY,
  fallbackExchangeRatesFromUsd,
  getFallbackRatePayload,
  type CurrencyRatePayload,
} from "@/lib/currency/exchangeRates";

type CurrencyRatesContextValue = CurrencyRatePayload & {
  isLoading: boolean;
  error: string | null;
};

const initialFallbackPayload = getFallbackRatePayload();

const CurrencyRatesContext = createContext<CurrencyRatesContextValue>({
  ...initialFallbackPayload,
  isLoading: true,
  error: null,
});

function sanitizePayload(payload: Partial<CurrencyRatePayload>): CurrencyRatePayload {
  const rates = payload.rates && typeof payload.rates === "object" ? payload.rates : fallbackExchangeRatesFromUsd;

  return {
    base: payload.base === FX_BASE_CURRENCY ? payload.base : FX_BASE_CURRENCY,
    rates,
    fetchedAt: typeof payload.fetchedAt === "string" ? payload.fetchedAt : new Date().toISOString(),
    source: typeof payload.source === "string" ? payload.source : initialFallbackPayload.source,
    isFallback: Boolean(payload.isFallback),
    missingCurrencies: Array.isArray(payload.missingCurrencies) ? payload.missingCurrencies : [],
    cacheTtlSeconds: typeof payload.cacheTtlSeconds === "number" ? payload.cacheTtlSeconds : 0,
    cacheExpiresAt: typeof payload.cacheExpiresAt === "string" ? payload.cacheExpiresAt : initialFallbackPayload.cacheExpiresAt,
  };
}

export function CurrencyRatesProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<CurrencyRatePayload>(initialFallbackPayload);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/currency/rates")
      .then(async (response) => {
        const data = (await response.json()) as Partial<CurrencyRatePayload>;
        if (!response.ok) throw new Error("Currency rates unavailable.");
        return sanitizePayload(data);
      })
      .then((nextPayload) => {
        if (!isMounted) return;
        setPayload(nextPayload);
        setError(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setPayload(initialFallbackPayload);
        setError("Currency rates unavailable; emergency fallback estimates are being used.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      ...payload,
      isLoading,
      error,
    }),
    [payload, isLoading, error]
  );

  return <CurrencyRatesContext.Provider value={value}>{children}</CurrencyRatesContext.Provider>;
}

export function useCurrencyRates() {
  return useContext(CurrencyRatesContext);
}
