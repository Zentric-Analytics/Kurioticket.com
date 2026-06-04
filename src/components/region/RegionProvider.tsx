"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getStoredRegion, setStoredCurrency, setStoredDetectedRegion, setStoredRegion } from "@/lib/preferences/preferences";
import { supportedRegions } from "@/lib/region/supportedRegions";

type RegionCode = (typeof supportedRegions)[number]["code"];

type RegionOption = (typeof supportedRegions)[number];

type RegionContextValue = {
  mode: RegionCode;
  setMode: (mode: RegionCode) => void;
  selectedOption: RegionOption;
  selectedCountryCode: RegionCode | null;
  detectedOption: RegionOption | null;
  detectedCountryCode: RegionCode | null;
  hasUserSelectedRegion: boolean;
  options: typeof supportedRegions;
};

const RegionContext = createContext<RegionContextValue | null>(null);

const findSupportedRegion = (code: string | null | undefined) =>
  supportedRegions.find((option) => option.code === code) ?? null;

export function RegionProvider({
  initialMode,
  detectedMode,
  children,
}: {
  initialMode: string;
  detectedMode?: string | null;
  children: React.ReactNode;
}) {
  const detectedOption = useMemo(
    () => findSupportedRegion(detectedMode) ?? null,
    [detectedMode],
  );
  const initialOption = useMemo(
    () => findSupportedRegion(initialMode) ?? supportedRegions[0],
    [initialMode],
  );
  const [regionState, setRegionState] = useState(() => {
    const storedMode = getStoredRegion();
    const storedOption = findSupportedRegion(storedMode);

    return {
      hasUserSelectedRegion: Boolean(storedOption),
      selectedMode: storedOption?.code as RegionCode | undefined,
    };
  });
  const { selectedMode, hasUserSelectedRegion } = regionState;

  useEffect(() => {
    if (!detectedOption) return;

    setStoredDetectedRegion(detectedOption.code);
  }, [detectedOption]);

  const mode = (
    hasUserSelectedRegion
      ? selectedMode
      : detectedOption?.code ?? initialOption.code
  ) as RegionCode;

  const selectedOption = useMemo(
    () => findSupportedRegion(mode) ?? supportedRegions[0],
    [mode],
  );

  const selectedCountryCode = hasUserSelectedRegion ? selectedOption.code as RegionCode : null;
  const detectedCountryCode = (detectedOption?.code as RegionCode | undefined) ?? null;

  const setMode = (nextMode: RegionCode) => {
    const nextOption = findSupportedRegion(nextMode) ?? supportedRegions[0];
    setRegionState({ selectedMode: nextOption.code as RegionCode, hasUserSelectedRegion: true });
    setStoredRegion(nextOption.code);
    setStoredCurrency(nextOption.currency);
  };

  const value = useMemo(
    () => ({
      mode,
      setMode,
      selectedOption,
      selectedCountryCode,
      detectedOption,
      detectedCountryCode,
      hasUserSelectedRegion,
      options: supportedRegions,
    }),
    [mode, selectedOption, selectedCountryCode, detectedOption, detectedCountryCode, hasUserSelectedRegion],
  );

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion() {
  const context = useContext(RegionContext);
  if (!context) throw new Error("useRegion must be used within RegionProvider");
  return context;
}
