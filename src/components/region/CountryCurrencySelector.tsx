"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useRegion } from "@/components/region/RegionProvider";

export function CountryCurrencySelector() {
  const { mode, setMode, selectedOption, options } = useRegion();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{selectedOption.currency}</span>
        <ChevronDown size={14} className="text-slate-600" />
      </button>

      {open ? (
        <div className="absolute right-0 top-14 z-50 min-w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          {options.map((option) => {
            const isActive = option.code === mode;
            return (
              <button
                key={option.code}
                type="button"
                onClick={() => {
                  setMode(option.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
                  isActive ? "bg-violet-50 text-violet-800" : "hover:bg-slate-50"
                }`}
              >
                <span>{option.country}</span>
                <span className="font-semibold">{option.currency}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
