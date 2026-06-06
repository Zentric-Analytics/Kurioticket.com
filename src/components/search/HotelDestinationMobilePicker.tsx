"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

import { X } from "lucide-react";

import { HotelMobilePickerShell } from "@/components/search/HotelMobilePickerShell";
import { cn } from "@/lib/utils";

export type HotelDestinationSuggestion = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  region?: string;
  kind: "city" | "district" | "landmark" | "airport-area";
  searchValue: string;
};

type HotelDestinationsApiResponse = {
  suggestions?: HotelDestinationSuggestion[];
  source?: "curated-destinations";
};

export const hotelDestinationKindLabels: Record<
  HotelDestinationSuggestion["kind"],
  string
> = {
  city: "City",
  district: "Area",
  landmark: "Landmark",
  "airport-area": "Airport area",
};

type HotelDestinationMobilePickerProps = {
  open: boolean;
  value: string;
  titleId: string;
  inputId: string;
  launcherRef?: RefObject<HTMLElement | null>;
  selectedCountryHint?: string;
  detectedCountryHint?: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onClear?: () => void;
};

export function HotelDestinationMobilePicker({
  open,
  value,
  titleId,
  inputId,
  launcherRef,
  selectedCountryHint = "",
  detectedCountryHint = "",
  onChange,
  onClose,
  onClear,
}: HotelDestinationMobilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<HotelDestinationSuggestion[]>([]);
  const [suggestionsCountryHint, setSuggestionsCountryHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const activeCountryHint = selectedCountryHint || detectedCountryHint;
  const trimmedQuery = query.trim();
  const visibleSuggestions =
    suggestionsCountryHint === activeCountryHint ? suggestions : [];

  useEffect(() => {
    if (!open) return;

    const frameId = window.requestAnimationFrame(() => {
      setQuery(value);
      setHighlight(0);
      inputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      async () => {
        setLoading(true);

        try {
          const params = new URLSearchParams({ limit: "8" });

          if (trimmedQuery.length >= 1) params.set("q", trimmedQuery);
          if (selectedCountryHint) params.set("countryCode", selectedCountryHint);
          if (detectedCountryHint) {
            params.set("detectedCountryCode", detectedCountryHint);
          }
          if (typeof navigator !== "undefined" && navigator.language) {
            params.set("locale", navigator.language);
          }

          const response = await fetch(
            `/api/hotels/destinations?${params.toString()}`,
            { signal: controller.signal, cache: "no-store" },
          );

          if (!response.ok) {
            throw new Error("Failed to load hotel destination suggestions");
          }

          const payload = (await response.json()) as HotelDestinationsApiResponse;
          const nextSuggestions = Array.isArray(payload.suggestions)
            ? payload.suggestions
                .filter((suggestion) =>
                  Boolean(
                    suggestion?.id &&
                      suggestion?.name &&
                      suggestion?.country &&
                      suggestion?.searchValue,
                  ),
                )
                .slice(0, 8)
            : [];

          setSuggestions(nextSuggestions);
          setSuggestionsCountryHint(activeCountryHint);
          setHighlight(0);
        } catch {
          if (!controller.signal.aborted) {
            setSuggestions([]);
            setSuggestionsCountryHint(activeCountryHint);
          }
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      trimmedQuery.length >= 1 ? 180 : 0,
    );

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeCountryHint, detectedCountryHint, open, selectedCountryHint, trimmedQuery]);

  const applyValue = (nextValue: string) => {
    onChange(nextValue);
    onClose();
  };

  const clearValue = () => {
    setQuery("");
    setSuggestions([]);
    setSuggestionsCountryHint(activeCountryHint);
    setHighlight(0);
    onClear?.();
    onChange("");
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const footer = useMemo(
    () => (
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={clearValue}
          className="focus-ring rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => applyValue(trimmedQuery)}
          className="focus-ring rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Done
        </button>
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trimmedQuery],
  );

  return (
    <HotelMobilePickerShell
      open={open}
      title="Choose destination"
      titleId={titleId}
      launcherRef={launcherRef}
      onClose={onClose}
      footer={footer}
    >
      <div className="mx-auto w-full max-w-xl space-y-4">
        <label className="block rounded-2xl border border-indigo-200 bg-white p-3 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Destination
          </span>
          <span className="relative block">
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" && visibleSuggestions.length) {
                  event.preventDefault();
                  setHighlight((current) => (current + 1) % visibleSuggestions.length);
                }
                if (event.key === "ArrowUp" && visibleSuggestions.length) {
                  event.preventDefault();
                  setHighlight(
                    (current) =>
                      (current - 1 + visibleSuggestions.length) %
                      visibleSuggestions.length,
                  );
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  const highlightedSuggestion = visibleSuggestions[highlight];
                  applyValue(highlightedSuggestion?.searchValue ?? trimmedQuery);
                }
              }}
              placeholder="City, area, or landmark"
              className="focus-ring h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pr-10 text-[16px] font-semibold text-slate-950 outline-none placeholder:text-slate-400"
            />
            {query ? (
              <button
                type="button"
                onClick={clearValue}
                aria-label="Clear destination"
                className="focus-ring absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </span>
        </label>

        <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <p className="px-2 pb-2 pt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Suggestions
          </p>
          {loading ? (
            <div className="rounded-xl bg-slate-50 px-3 py-4 text-sm font-semibold text-slate-500">
              Finding destinations…
            </div>
          ) : visibleSuggestions.length ? (
            <div className="space-y-1">
              {visibleSuggestions.map((suggestion, index) => {
                const detail = [suggestion.region, suggestion.country]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => applyValue(suggestion.searchValue)}
                    className={cn(
                      "focus-ring flex w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                      highlight === index ? "bg-indigo-50" : "hover:bg-slate-50",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-base font-black text-slate-950">
                        {suggestion.name}
                      </span>
                      <span className="mt-0.5 block truncate text-sm font-medium text-slate-600">
                        {detail || suggestion.country}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                      {hotelDestinationKindLabels[suggestion.kind]}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 px-3 py-4 text-sm font-semibold text-slate-500">
              {trimmedQuery
                ? "No matching destinations yet."
                : "Start typing or choose a provider-backed suggestion."}
            </div>
          )}
        </div>
      </div>
    </HotelMobilePickerShell>
  );
}
