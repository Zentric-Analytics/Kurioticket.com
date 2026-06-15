"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

import { X } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { HotelMobilePickerShell } from "@/components/search/HotelMobilePickerShell";
import { translations as enTranslations } from "@/lib/i18n/en";
import { cn } from "@/lib/utils";

const mobileDoneButtonClassName =
  "focus-ring min-h-11 rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-6 text-sm font-bold text-white shadow-md shadow-indigo-700/20 transition-colors hover:from-indigo-600 hover:to-violet-500 active:from-indigo-800 active:to-violet-700 disabled:cursor-not-allowed disabled:opacity-50";

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

const hotelDestinationKindTranslationKeys: Record<
  HotelDestinationSuggestion["kind"],
  string
> = {
  city: "hotelDestinationKind.city",
  district: "hotelDestinationKind.district",
  landmark: "hotelDestinationKind.landmark",
  "airport-area": "hotelDestinationKind.airport-area",
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
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const getDestinationKindLabel = (kind: HotelDestinationSuggestion["kind"]) =>
    t(hotelDestinationKindTranslationKeys[kind]) ||
    hotelDestinationKindLabels[kind];
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<HotelDestinationSuggestion[]>(
    [],
  );
  const [suggestionsCountryHint, setSuggestionsCountryHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const activeCountryHint = selectedCountryHint || detectedCountryHint;
  const trimmedQuery = query.trim();
  const visibleSuggestions =
    trimmedQuery.length >= 1 && suggestionsCountryHint === activeCountryHint
      ? suggestions
      : [];

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

    if (trimmedQuery.length < 1) {
      const timeoutId = window.setTimeout(() => {
        setLoading(false);
        setSuggestions([]);
        setSuggestionsCountryHint(activeCountryHint);
        setHighlight(0);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams({ limit: "8", q: trimmedQuery });

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
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    activeCountryHint,
    detectedCountryHint,
    open,
    selectedCountryHint,
    trimmedQuery,
  ]);

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
          className="focus-ring min-h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          {t("clear")}
        </button>
        <button
          type="button"
          onClick={() => applyValue(trimmedQuery)}
          className={mobileDoneButtonClassName}
        >
          {t("done")}
        </button>
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trimmedQuery],
  );

  return (
    <HotelMobilePickerShell
      open={open}
      title={t("chooseDestination")}
      titleId={titleId}
      launcherRef={launcherRef}
      onClose={onClose}
      footer={footer}
      contentClassName="bg-slate-50 px-4 py-5"
    >
      <div className="mx-auto w-full max-w-xl space-y-5">
        <div className="space-y-2">
          <label
            className="block text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500"
            htmlFor={inputId}
          >
            {t("hotelSearchDestinationLabel")}
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" && visibleSuggestions.length) {
                  event.preventDefault();
                  setHighlight(
                    (current) => (current + 1) % visibleSuggestions.length,
                  );
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
                  applyValue(
                    highlightedSuggestion?.searchValue ?? trimmedQuery,
                  );
                }
              }}
              placeholder={t("hotelSearchDestinationPlaceholder")}
              className="focus-ring h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-4 pr-12 text-base font-semibold text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
            />
            {query ? (
              <button
                type="button"
                onClick={clearValue}
                aria-label={t("clearDestination")}
                className="focus-ring absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {loading ? (
            <p className="px-5 py-8 text-center text-sm font-medium leading-6 text-slate-500">
              {t("findingDestinations")}
            </p>
          ) : visibleSuggestions.length ? (
            <div className="divide-y divide-slate-100">
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
                      "focus-ring flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50",
                      highlight === index && "bg-indigo-50",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-base font-black text-slate-950">
                        {suggestion.name}
                      </span>
                      <span className="mt-0.5 block truncate text-sm font-medium text-slate-500">
                        {detail || suggestion.country}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600">
                      {getDestinationKindLabel(suggestion.kind)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="px-5 py-8 text-center text-sm font-medium leading-6 text-slate-500">
              {trimmedQuery
                ? t("noMatchingDestinationsYet")
                : t("searchCityAreaLandmark")}
            </p>
          )}
        </div>
      </div>
    </HotelMobilePickerShell>
  );
}
