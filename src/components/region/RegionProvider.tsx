"use client";

import { createContext, useContext, useMemo, useState } from "react";

import { getStoredRegion, setStoredCurrency, setStoredRegion } from "@/lib/preferences/preferences";
import { supportedRegions } from "@/lib/region/supportedRegions";

type RegionCode = (typeof supportedRegions)[number]["code"];

type RegionOption = (typeof supportedRegions)[number];

type RegionContextValue = {
  mode: RegionCode;
  setMode: (mode: RegionCode) => void;
  selectedOption: RegionOption;
  detectedOption: RegionOption | null;
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
  const detectedOption = findSupportedRegion(detectedMode) ?? findSupportedRegion(initialMode);
  const [regionState, setRegionState] = useState(() => {
    const storedMode = getStoredRegion();
    const storedOption = findSupportedRegion(storedMode);

    return {
      hasUserSelectedRegion: Boolean(storedOption),
      mode: ((storedOption ?? detectedOption ?? supportedRegions[0]).code) as RegionCode,
    };
  });
  const { mode, hasUserSelectedRegion } = regionState;

  const selectedOption = useMemo(
    () => findSupportedRegion(mode) ?? supportedRegions[0],
    [mode],
  );

  const setMode = (nextMode: RegionCode) => {
    const nextOption = findSupportedRegion(nextMode) ?? supportedRegions[0];
    setRegionState({ mode: nextOption.code as RegionCode, hasUserSelectedRegion: true });
    setStoredRegion(nextOption.code);
    setStoredCurrency(nextOption.currency);
  };

  const value = useMemo(
    () => ({
      mode,
      setMode,
      selectedOption,
      detectedOption,
      hasUserSelectedRegion,
      options: supportedRegions,
    }),
    [mode, selectedOption, detectedOption, hasUserSelectedRegion],
  );

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion() {
  const context = useContext(RegionContext);
  if (!context) throw new Error("useRegion must be used within RegionProvider");
  return context;
}
