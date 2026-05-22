"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { REGION_COOKIE_KEY, REGION_STORAGE_KEY, countryCurrencyOptions } from "@/config/regionConfig";
import { normalizeRegion, type RegionMode } from "@/lib/region/detectRegion";

type RegionContextValue = {
  mode: RegionMode;
  setMode: (mode: RegionMode) => void;
  selectedOption: (typeof countryCurrencyOptions)[number];
  options: typeof countryCurrencyOptions;
};

const RegionContext = createContext<RegionContextValue | null>(null);

export function RegionProvider({ initialMode, children }: { initialMode: RegionMode; children: React.ReactNode }) {
  const [mode, setModeState] = useState<RegionMode>(() => {
    if (typeof window === "undefined") return initialMode;
    return normalizeRegion(window.localStorage.getItem(REGION_STORAGE_KEY)) || initialMode;
  });

  const setMode = (nextMode: RegionMode) => {
    setModeState(nextMode);
    window.localStorage.setItem(REGION_STORAGE_KEY, nextMode);
    document.cookie = `${REGION_COOKIE_KEY}=${nextMode}; path=/; max-age=31536000; samesite=lax`;
  };

  const selectedOption = countryCurrencyOptions.find((option) => option.code === mode) ?? countryCurrencyOptions[0];

  const value = useMemo(() => ({ mode, setMode, selectedOption, options: countryCurrencyOptions }), [mode, selectedOption]);

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion() {
  const context = useContext(RegionContext);
  if (!context) throw new Error("useRegion must be used within RegionProvider");
  return context;
}
