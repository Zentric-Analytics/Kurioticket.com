"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useRegion } from "@/components/region/RegionProvider";

export function CountryCurrencySelector() {
  const { mode, setMode, selectedOption, options } = useRegion();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const visibleOptions = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      return options;
    }

    return options.filter((option) => {
      return (
        option.country.toLowerCase().includes(q) ||
        option.currency.toLowerCase().includes(q)
      );
    });
  }, [options, query]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-900 shadow-sm"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{selectedOption.currency}</span>

        <ChevronDown size={14} className="text-slate-500" />
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/45"
            onClick={() => setOpen(false)}
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-label="Select your currency and country"
            className="fixed inset-x-4 top-[max(80px,8vh)] z-50 mx-auto max-h-[84vh] w-[min(980px,96vw)] overflow-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl md:inset-x-0 md:p-7"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  Select your currency and country
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Choose how prices are displayed. Language preference is
                  managed separately.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <Search size={16} className="text-slate-500" />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search country or currency"
                className="w-full border-0 bg-transparent text-sm outline-none"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {visibleOptions.map((option) => {
                const isActive = option.code === mode;

                return (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => {
                      setMode(option.code);
                      setOpen(false);
                    }}
                    className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                      isActive
                        ? "border-violet-300 bg-violet-50"
                        : "border-slate-200 hover:border-violet-300 hover:bg-violet-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">
                        {option.country}
                      </span>

                      {isActive ? (
                        <Check
                          size={16}
                          className="text-violet-600"
                        />
                      ) : null}
                    </div>

                    <div className="mt-1 text-xs font-semibold text-slate-500">
                      {option.currency}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}