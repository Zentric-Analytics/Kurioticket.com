"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getStoredRegion, setStoredCurrency, setStoredRegion } from "@/lib/preferences/preferences";
import { supportedRegions } from "@/lib/region/supportedRegions";

type RegionCode = (typeof supportedRegions)[number]["code"];

type RegionContextValue = {
  mode: RegionCode;
  setMode: (mode: RegionCode) => void;
  selectedOption: (typeof supportedRegions)[number];
  options: typeof supportedRegions;
};

const RegionContext = createContext<RegionContextValue | null>(null);

export function RegionProvider({ initialMode, children }: { initialMode: string; children: React.ReactNode }) {
  const [mode, setModeState] = useState<RegionCode>(() => {
    const storedMode = getStoredRegion();
    const validStoredMode = supportedRegions.some((option) => option.code === storedMode);
    if (validStoredMode) return storedMode as RegionCode;
    if (supportedRegions.some((option) => option.code === initialMode)) return initialMode as RegionCode;
    return supportedRegions[0].code;
  });

  const selectedOption = useMemo(
    () => supportedRegions.find((option) => option.code === mode) ?? supportedRegions[0],
    [mode]
  );

  const setMode = (nextMode: RegionCode) => {
    const nextOption = supportedRegions.find((option) => option.code === nextMode) ?? supportedRegions[0];
    setModeState(nextOption.code as RegionCode);
    setStoredRegion(nextOption.code);
    setStoredCurrency(nextOption.currency);
  };

  useEffect(() => {
    setStoredRegion(selectedOption.code);
    setStoredCurrency(selectedOption.currency);
  }, [selectedOption.code, selectedOption.currency]);

  const value = useMemo(
    () => ({ mode, setMode, selectedOption, options: supportedRegions }),
    [mode, selectedOption]
  );

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion() {
  const context = useContext(RegionContext);
  if (!context) throw new Error("useRegion must be used within RegionProvider");
  return context;
}
