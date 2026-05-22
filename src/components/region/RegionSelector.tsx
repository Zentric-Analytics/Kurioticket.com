"use client";

import { Globe2 } from "lucide-react";
import { useRegion } from "@/components/region/RegionProvider";
import type { RegionMode } from "@/config/regionConfig";

const regionLabel: Record<RegionMode, string> = {
  GLOBAL: "Global",
  NG: "Nigeria",
};

export function RegionSelector() {
  const { mode, setMode } = useRegion();

  return (
    <label className="focus-ring inline-flex h-10 items-center gap-2 rounded-full border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 hover:bg-slate-50">
      <Globe2 size={16} />
      <span className="hidden lg:inline">Region:</span>
      <select
        aria-label="Select region"
        value={mode}
        onChange={(event) => setMode(event.target.value as RegionMode)}
        className="bg-transparent text-sm font-bold text-slate-900 outline-none"
      >
        <option value="GLOBAL">{regionLabel.GLOBAL}</option>
        <option value="NG">{regionLabel.NG}</option>
      </select>
    </label>
  );
}
