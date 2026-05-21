"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { REGION_COOKIE_KEY, REGION_STORAGE_KEY, regionConfig, type RegionMode } from "@/config/regionConfig";
import { normalizeRegion } from "@/lib/region/detectRegion";

type RegionContextValue = {
  mode: RegionMode;
  setMode: (mode: RegionMode) => void;
  flags: (typeof regionConfig)[RegionMode];
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

  const value = useMemo(
    () => ({ mode, setMode, flags: regionConfig[mode] }),
    [mode],
  );

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion() {
  const context = useContext(RegionContext);
  if (!context) throw new Error("useRegion must be used within RegionProvider");
  return context;
}
