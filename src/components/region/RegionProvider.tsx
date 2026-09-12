"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { isSupportedDisplayCurrency } from "@/lib/currency/exchangeRates";
import {
  getStoredCurrency,
  getStoredRegion,
  setStoredCurrency,
  setStoredDetectedRegion,
  setStoredRegion,
} from "@/lib/preferences/preferences";
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
  selectedCountryCode: RegionCode | null;
  detectedOption: RegionOption | null;
  detectedCountryCode: RegionCode | null;
  hasUserSelectedRegion: boolean;
  options: typeof supportedRegions;
  currencies: typeof supportedCurrencies;
};

const RegionContext = createContext<RegionContextValue | null>(null);

const fallbackRegion =
  supportedRegions.find((option) => option.code === "US") ?? supportedRegions[0];

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
  children?: ReactNode;
}) {
  const detectedOption = useMemo(
    () => findSupportedRegion(detectedMode) ?? null,
    [detectedMode],
  );

  const initialOption = useMemo(
    () => findSupportedRegion(initialMode) ?? fallbackRegion,
    [initialMode],
  );

  const [regionState, setRegionState] = useState(() => {
    // First browser render must match the server, which cannot read local storage.
    const selectedRegion = detectedOption ?? initialOption ?? fallbackRegion;
    const seededCurrency = (selectedRegion.currency ?? fallbackCurrency) as CurrencyCode;

    return {
      currency: seededCurrency,
      hasExplicitCurrency: false,
      hasUserSelectedRegion: false,
      selectedMode: undefined as RegionCode | undefined,
    };
  });

  const { selectedMode, hasUserSelectedRegion, hasExplicitCurrency, currency } = regionState;

  useEffect(() => {
    const storedOption = findSupportedRegion(getStoredRegion());
    const storedCurrency = findSupportedCurrency(getStoredCurrency());
    if (!storedOption && !storedCurrency) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setRegionState((current) => ({
        currency: current.hasExplicitCurrency ? current.currency : storedCurrency ?? (storedOption?.currency as CurrencyCode | undefined) ?? current.currency,
        hasExplicitCurrency: current.hasExplicitCurrency || Boolean(storedCurrency),
        hasUserSelectedRegion: current.hasUserSelectedRegion || Boolean(storedOption),
        selectedMode: current.hasUserSelectedRegion ? current.selectedMode : storedOption?.code as RegionCode | undefined,
      }));
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!detectedOption) return;

    setStoredDetectedRegion(detectedOption.code);
  }, [detectedOption]);

  const mode = (
    hasUserSelectedRegion
      ? selectedMode ?? initialOption.code
      : detectedOption?.code ?? initialOption.code
  ) as RegionCode;

  const selectedCountry = useMemo(
    () => findSupportedRegion(mode) ?? fallbackRegion,
    [mode],
  );

  const selectedCurrency = (
    hasExplicitCurrency
      ? currency
      : selectedCountry.currency ?? fallbackCurrency
  ) as CurrencyCode;

  const selectedOption = useMemo(
    () => ({
      ...selectedCountry,
      currency: selectedCurrency,
    }),
    [selectedCountry, selectedCurrency],
  );

  const selectedCountryCode = hasUserSelectedRegion ? (selectedOption.code as RegionCode) : null;
  const detectedCountryCode = (detectedOption?.code as RegionCode | undefined) ?? null;

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
        selectedMode: nextOption.code as RegionCode,
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
      selectedCurrency,
      setCurrency,
      selectedOption,
      selectedCountryCode,
      detectedOption,
      detectedCountryCode,
      hasUserSelectedRegion,
      options: supportedRegions,
      currencies: supportedCurrencies,
    }),
    [
      mode,
      setMode,
      selectedCurrency,
      setCurrency,
      selectedOption,
      selectedCountryCode,
      detectedOption,
      detectedCountryCode,
      hasUserSelectedRegion,
    ],
  );

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion() {
  const context = useContext(RegionContext);

  if (!context) {
    throw new Error("useRegion must be used within RegionProvider");
  }

  return context;
}
