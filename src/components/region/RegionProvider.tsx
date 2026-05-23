"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { countryCurrencyOptions } from "@/config/regionConfig";
import {
  getStoredCurrency,
  getStoredRegion,
  setStoredCurrency,
  setStoredRegion,
} from "@/lib/preferences/preferences";
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
    return normalizeRegion(getStoredRegion()) ?? initialMode;
  });

  const selectedOption = countryCurrencyOptions.find((option) => option.code === mode) ?? countryCurrencyOptions[0];

  const setMode = (nextMode: RegionMode) => {
    setModeState(nextMode);
    const next = countryCurrencyOptions.find((option) => option.code === nextMode) ?? countryCurrencyOptions[0];
    setStoredRegion(next.code);
    setStoredCurrency(next.currency);
  };

  useEffect(() => {
    setStoredRegion(selectedOption.code as RegionMode);
    setStoredCurrency(selectedOption.currency || getStoredCurrency());
  }, [selectedOption.code, selectedOption.currency]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.info("[preferences]", { region: selectedOption.code, currency: selectedOption.currency, source: "cookie/localStorage/default" });
    }
  }, [selectedOption.code, selectedOption.currency]);

  const value = useMemo(() => ({ mode, setMode, selectedOption, options: countryCurrencyOptions }), [mode, selectedOption]);

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion() {
  const context = useContext(RegionContext);
  if (!context) throw new Error("useRegion must be used within RegionProvider");
  return context;
}
