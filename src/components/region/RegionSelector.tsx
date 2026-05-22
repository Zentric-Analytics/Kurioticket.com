"use client";

import { Globe2 } from "lucide-react";
import { useRegion } from "@/components/region/RegionProvider";
import type { RegionMode } from "@/config/regionConfig";

const regionPreference: Record<RegionMode, { label: string; currency: string }> = {
  GLOBAL: { label: "Global", currency: "USD" },
  NG: { label: "Nigeria", currency: "NGN" },
};

export function RegionSelector() {
  const { mode, setMode } = useRegion();

  return (
    <label className="focus-ring inline-flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50">
      <Globe2 size={16} className="text-slate-600" />
      <span>{regionPreference[mode].label} · {regionPreference[mode].currency}</span>
      <select
        aria-label="Select country and currency"
        value={mode}
        onChange={(event) => setMode(event.target.value as RegionMode)}
        className="min-w-[1rem] bg-transparent text-[0px] outline-none"
      >
        <option value="GLOBAL">Global · USD</option>
        <option value="NG">Nigeria · NGN</option>
      </select>
    </label>
  );
}
