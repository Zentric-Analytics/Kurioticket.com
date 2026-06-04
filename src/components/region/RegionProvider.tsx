"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import {
  getStoredCurrency,
  getStoredRegion,
  setStoredCurrency,
  setStoredRegion,
} from "@/lib/preferences/preferences";
import { isSupportedDisplayCurrency } from "@/lib/currency/exchangeRates";
import {
  supportedCurrencies,
  supportedRegions,
  type SupportedRegion,
} from "@/lib/region/supportedRegions";

type RegionCode = (typeof supportedRegions)[number]["code"];
type CurrencyCode = (typeof supportedCurrencies)[number]["code"];
type RegionOption = SupportedRegion;
type SelectedRegionOption = SupportedRegion & { currency: CurrencyCode };

type RegionContextValue = {
  mode: RegionCode;
  setMode: (mode: RegionCode) => void;
  selectedCurrency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  selectedOption: SelectedRegionOption;
  detectedOption: RegionOption | null;
  hasUserSelectedRegion: boolean;
  options: typeof supportedRegions;
  currencies: typeof supportedCurrencies;
};

const RegionContext = createContext<RegionContextValue | null>(null);

const fallbackRegion = supportedRegions.find((option) => option.code === "US") ?? supportedRegions[0];
const fallbackCurrency = "USD" as CurrencyCode;

const findSupportedRegion = (code: string | null | undefined) =>
  supportedRegions.find((option) => option.code === code?.toUpperCase()) ?? null;

const findSupportedCurrency = (currency: string | null | undefined) => {
  const normalizedCurrency = currency?.toUpperCase();

  if (!normalizedCurrency || !isSupportedDisplayCurrency(normalizedCurrency)) {
    return null;
  }

  return supportedCurrencies.find((option) => option.code === normalizedCurrency)?.code ?? null;
};

export function RegionProvider({
  initialMode,
  detectedMode,
  children,
}: {
  initialMode: string;
  detectedMode?: string | null;
  children: React.ReactNode;
}) {
  const detectedOption = findSupportedRegion(detectedMode) ?? findSupportedRegion(initialMode);
  const [regionState, setRegionState] = useState(() => {
    const storedMode = getStoredRegion();
    const storedOption = findSupportedRegion(storedMode);
    const selectedRegion = storedOption ?? detectedOption ?? fallbackRegion;
    const storedCurrency = findSupportedCurrency(getStoredCurrency());

    const seededCurrency = (storedCurrency ?? selectedRegion.currency ?? fallbackCurrency) as CurrencyCode;

    return {
      currency: seededCurrency,
      hasExplicitCurrency: Boolean(storedCurrency),
      hasUserSelectedRegion: Boolean(storedOption),
      mode: selectedRegion.code as RegionCode,
    };
  });
  const { mode, hasUserSelectedRegion, currency } = regionState;

  const selectedCountry = useMemo(
    () => findSupportedRegion(mode) ?? fallbackRegion,
    [mode],
  );

  const selectedOption = useMemo(
    () => ({
      ...selectedCountry,
      currency,
    }),
    [currency, selectedCountry],
  );

  const setMode = useCallback((nextMode: RegionCode) => {
    const nextOption = findSupportedRegion(nextMode) ?? fallbackRegion;

    setRegionState((currentState) => {
      const nextCurrency = currentState.hasExplicitCurrency
        ? currentState.currency
        : (nextOption.currency as CurrencyCode);

      return {
        ...currentState,
        currency: nextCurrency,
        hasUserSelectedRegion: true,
        mode: nextOption.code as RegionCode,
      };
    });

    setStoredRegion(nextOption.code);
  }, []);

  const setCurrency = useCallback((nextCurrency: CurrencyCode) => {
    const supportedCurrency = findSupportedCurrency(nextCurrency) ?? fallbackCurrency;

    setRegionState((currentState) => ({
      ...currentState,
      currency: supportedCurrency,
      hasExplicitCurrency: true,
    }));

    setStoredCurrency(supportedCurrency);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      selectedCurrency: currency,
      setCurrency,
      selectedOption,
      detectedOption,
      hasUserSelectedRegion,
      options: supportedRegions,
      currencies: supportedCurrencies,
    }),
    [mode, currency, setCurrency, setMode, selectedOption, detectedOption, hasUserSelectedRegion],
  );

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion() {
  const context = useContext(RegionContext);
  if (!context) throw new Error("useRegion must be used within RegionProvider");
  return context;
}
