"use client";

import { useEffect, useRef, type RefObject } from "react";

import { X } from "lucide-react";

import { type AirportOption } from "@/data/airports";
import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
import { cn } from "@/lib/utils";

type MobileAirportPickerLabels = {
  clear: string;
  done: string;
  chooseOrigin: string;
  clearOrigin: string;
  clearDestination: string;
  searchAirportsAndCities: string;
  searchAirportsOrCities: string;
  startTypingCityOrAirport: string;
  searchingAirportsAndCities: string;
  noMatchingAirportsOrCities: string;
};

type MobileAirportPickerProps = {
  open: boolean;
  title: string;
  inputId: string;
  value: string;
  suggestions: AirportOption[];
  isLoading: boolean;
  launcherRef?: RefObject<HTMLElement | null>;
  labels: MobileAirportPickerLabels;
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
  labels,
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
            className="focus-ring rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            {labels.clear}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-xl bg-indigo-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
          >
            {labels.done}
          </button>
        </div>
      )}
    >
      <div className="mx-auto w-full max-w-xl space-y-4">
        <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500" htmlFor={inputId}>
            {labels.searchAirportsAndCities}
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={labels.searchAirportsOrCities}
              autoComplete="off"
              className="focus-ring h-14 w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3 ps-4 pe-14 text-base font-semibold text-slate-900 outline-none transition-colors placeholder:font-medium placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/15"
            />
            {value.trim() ? (
              <button
                type="button"
                aria-label={title === labels.chooseOrigin ? labels.clearOrigin : labels.clearDestination}
                onClick={() => {
                  onClear();
                  window.requestAnimationFrame(() => inputRef.current?.focus());
                }}
                className="focus-ring absolute end-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white hover:text-slate-900"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          {query.length < 2 ? (
            <p className="rounded-2xl border border-slate-200/70 bg-white/60 px-4 py-8 text-center text-sm font-medium text-slate-500">
              {labels.startTypingCityOrAirport}
            </p>
          ) : isLoading ? (
            <p className="rounded-2xl border border-slate-200/70 bg-white/60 px-4 py-8 text-center text-sm font-medium text-slate-500">
              {labels.searchingAirportsAndCities}
            </p>
          ) : suggestions.length ? (
            suggestions.map((option) => (
              <button
                key={`${option.code}-${option.airport}-${inputId}`}
                type="button"
                onClick={() => onSelect(option)}
                className={cn(
                  "focus-ring block min-h-[72px] w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3.5 text-start transition-colors",
                  "hover:border-slate-300 hover:bg-white focus-visible:border-indigo-300 focus-visible:bg-white",
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-base font-extrabold leading-5 text-slate-950">
                      {option.city}
                    </span>
                    <span className="mt-1 block text-sm font-medium leading-5 text-slate-600">
                      {option.airport}
                    </span>
                    {option.country ? (
                      <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {option.country}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-1.5 text-sm font-extrabold text-indigo-700">
                    {option.code}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200/70 bg-white/60 px-4 py-8 text-center text-sm font-medium text-slate-500">
              {labels.noMatchingAirportsOrCities}
            </p>
          )}
        </div>
      </div>
    </FlightMobilePickerShell>
  );
}

