"use client";

import { useEffect, useRef, type RefObject } from "react";

import { ArrowLeft, X } from "lucide-react";

import { type AirportOption } from "@/data/airports";
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

    const launcherElement = launcherRef?.current;
    const bodyElement = document.body;
    const rootElement = document.documentElement;
    const scrollY = window.scrollY;
    const previousBodyStyles = {
      left: bodyElement.style.left,
      overflow: bodyElement.style.overflow,
      position: bodyElement.style.position,
      right: bodyElement.style.right,
      top: bodyElement.style.top,
      width: bodyElement.style.width,
    };
    const previousRootStyles = {
      overflow: rootElement.style.overflow,
      overscrollBehavior: rootElement.style.overscrollBehavior,
    };

    bodyElement.style.left = "0";
    bodyElement.style.overflow = "hidden";
    bodyElement.style.position = "fixed";
    bodyElement.style.right = "0";
    bodyElement.style.top = `-${scrollY}px`;
    bodyElement.style.width = "100%";
    rootElement.style.overflow = "hidden";
    rootElement.style.overscrollBehavior = "none";

    const focusId = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);

    return () => {
      window.clearTimeout(focusId);
      bodyElement.style.left = previousBodyStyles.left;
      bodyElement.style.overflow = previousBodyStyles.overflow;
      bodyElement.style.position = previousBodyStyles.position;
      bodyElement.style.right = previousBodyStyles.right;
      bodyElement.style.top = previousBodyStyles.top;
      bodyElement.style.width = previousBodyStyles.width;
      rootElement.style.overflow = previousRootStyles.overflow;
      rootElement.style.overscrollBehavior = previousRootStyles.overscrollBehavior;
      window.scrollTo(0, scrollY);
      window.requestAnimationFrame(() => launcherElement?.focus());
    };
  }, [launcherRef, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10020] sm:hidden">
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onClose();
          }
        }}
        className="absolute inset-0 flex h-[100dvh] min-h-0 w-full max-w-full flex-col overflow-hidden bg-white pt-[env(safe-area-inset-top)] shadow-[0_-20px_60px_rgba(15,23,42,0.22)]"
      >
        <div className="shrink-0 border-b border-slate-200 px-4 pb-3 pt-3">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </button>
            <h2 id={titleId} className="min-w-0 truncate text-lg font-black text-slate-950">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="focus-ring min-h-10 rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>

          <label className="sr-only" htmlFor={inputId}>
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
              className="focus-ring h-14 w-full rounded-2xl border border-slate-300 bg-white py-3 pl-4 pr-14 text-lg font-semibold text-slate-900 outline-none transition-colors placeholder:font-medium placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
            {value.trim() ? (
              <button
                type="button"
                aria-label={title === "Choose origin" ? "Clear origin" : "Clear destination"}
                onClick={() => {
                  onClear();
                  window.requestAnimationFrame(() => inputRef.current?.focus());
                }}
                className="focus-ring absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 px-4 py-4">
          <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {query.length < 2 ? (
              <p className="px-3 py-10 text-center text-sm font-semibold text-slate-500">
                Start typing a city or airport name to see suggestions.
              </p>
            ) : isLoading ? (
              <p className="px-3 py-10 text-center text-sm font-semibold text-slate-500">
                Searching airports and cities…
              </p>
            ) : suggestions.length ? (
              suggestions.map((option) => (
                <button
                  key={`${option.code}-${option.airport}-${inputId}`}
                  type="button"
                  onClick={() => onSelect(option)}
                  className={cn(
                    "focus-ring mb-1 block w-full rounded-xl px-4 py-3 text-left transition-colors last:mb-0",
                    "hover:bg-slate-50 focus-visible:bg-slate-50",
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-base font-semibold text-slate-950">
                        {option.city} ({option.code})
                      </span>
                      <span className="block text-sm leading-6 text-slate-600">
                        {option.airport}
                        {option.country ? ` · ${option.country}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                      {option.code}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-10 text-center text-sm font-semibold text-slate-500">
                No matching airports or cities
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3">
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
        </div>
      </div>
    </div>
  );
}

