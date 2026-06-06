"use client";

import { useEffect, useRef, type RefObject } from "react";

import { X } from "lucide-react";

import { type AirportOption } from "@/data/airports";
import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
import { cn } from "@/lib/utils";

type MobileAirportPickerProps = {
  open: boolean;
  title: "Choose origin" | "Choose destination";
  inputId: string;
  value: string;
  suggestions: AirportOption[];
  isLoading: boolean;
  launcherRef?: RefObject<HTMLElement | null>;
  onChange: (value: string) => void;
  onClear: () => void;
  onSelect: (option: AirportOption) => void;
  onClose: () => void;
};

export function MobileAirportPicker({
  open,
  title,
  inputId,
  value,
  suggestions,
  isLoading,
  launcherRef,
  onChange,
  onClear,
  onSelect,
  onClose,
}: MobileAirportPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = `${inputId}-title`;
  const query = value.trim();

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const focusId = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 80);

    return () => window.clearTimeout(focusId);
  }, [open]);

  if (!open) return null;

  return (
    <FlightMobilePickerShell
      open={open}
      title={title}
      titleId={titleId}
      launcherRef={launcherRef}
      onClose={onClose}
      footer={(
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onClear();
              window.requestAnimationFrame(() => inputRef.current?.focus());
            }}
            className="focus-ring rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-xl bg-indigo-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
          >
            Done
          </button>
        </div>
      )}
    >
      <div className="mx-auto w-full max-w-xl space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500" htmlFor={inputId}>
            Search airports and cities
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="Search airports or cities"
              autoComplete="off"
              className="focus-ring h-16 w-full rounded-2xl border border-slate-300 bg-white py-3 pl-4 pr-14 text-lg font-semibold text-slate-900 outline-none transition-colors placeholder:font-medium placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
            {value.trim() ? (
              <button
                type="button"
                aria-label={title === "Choose origin" ? "Clear origin" : "Clear destination"}
                onClick={() => {
                  onClear();
                  window.requestAnimationFrame(() => inputRef.current?.focus());
                }}
                className="focus-ring absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {query.length < 2 ? (
            <p className="px-3 py-10 text-center text-sm font-semibold text-slate-500">
              Start typing a city or airport name to see suggestions.
            </p>
          ) : isLoading ? (
            <p className="px-3 py-10 text-center text-sm font-semibold text-slate-500">
              Searching airports and cities…
            </p>
          ) : suggestions.length ? (
            <div className="divide-y divide-slate-100">
              {suggestions.map((option) => (
                <button
                  key={`${option.code}-${option.airport}-${inputId}`}
                  type="button"
                  onClick={() => onSelect(option)}
                  className={cn(
                    "focus-ring block w-full rounded-xl px-4 py-4 text-left transition-colors",
                    "hover:bg-slate-50 focus-visible:bg-slate-50",
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-base font-black leading-5 text-slate-950">
                        {option.city}
                      </span>
                      <span className="mt-1 block text-sm font-semibold leading-5 text-slate-700">
                        {option.airport}
                      </span>
                      {option.country ? (
                        <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {option.country}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-black text-indigo-700">
                      {option.code}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-3 py-10 text-center text-sm font-semibold text-slate-500">
              No matching airports or cities
            </p>
          )}
        </div>
      </div>
    </FlightMobilePickerShell>
  );
}

