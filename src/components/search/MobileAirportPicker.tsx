"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { MapPin, X } from "lucide-react";

import {
  formatAirportLabel,
  getAirportByCode,
  getLocalizedCityName,
  type AirportOption,
} from "@/data/airports";
import { useLocale } from "@/components/layout/LocaleProvider";
import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
import {
  deriveRecentAirports,
  fetchBackendRecentSearches,
  readRecentSearches,
  type RecentSearchEntry,
} from "@/lib/recent-searches";
import { cn } from "@/lib/utils";

export type MobileAirportPickerField = "origin" | "destination";

type LegacyLabels = {
  done?: string;
  clearOrigin?: string;
  clearDestination?: string;
  searchAirportsAndCities?: string;
  searchAirportsOrCities?: string;
  searchingAirportsAndCities?: string;
  noMatchingAirportsOrCities?: string;
};

type MobileAirportPickerProps = {
  open: boolean;
  field: MobileAirportPickerField;
  title: string;
  inputId: string;
  value: string;
  selectedCode?: string;
  selectedAirport?: AirportOption | null;
  launcherRef?: RefObject<HTMLElement | null>;
  labels?: LegacyLabels;
  locale?: string | null;
  onCommit: (option: AirportOption | null) => void;
  onClose: () => void;
};

function airportCodeFromValue(value: string) {
  const normalized = value.trim().toUpperCase();
  return (
    normalized.match(/^[A-Z]{3}$/)?.[0] ??
    normalized.match(/\(([A-Z]{3})\)\s*$/)?.[1] ??
    ""
  );
}

export function MobileAirportOptionRow({
  airport,
  selected,
  locale,
  onSelect,
}: {
  airport: AirportOption;
  selected: boolean;
  locale?: string | null;
  onSelect: () => void;
}) {
  const city = getLocalizedCityName(airport.city, locale);
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${city}, ${airport.airport}, ${airport.code}`}
      onClick={onSelect}
      className={cn(
        "focus-ring flex min-h-[80px] w-full items-center gap-3 border-b border-slate-200 px-5 py-3 text-start transition-colors last:border-b-0 hover:bg-slate-50 focus-visible:bg-slate-50",
        selected && "bg-blue-50/60",
      )}
    >
      <MapPin className="h-5 w-5 shrink-0 text-slate-700" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-semibold leading-5 text-slate-950">
          {city} ({airport.code})
        </span>
        <span className="mt-1 block truncate text-[13px] font-medium leading-5 text-slate-500">
          {airport.airport}
        </span>
      </span>
      <span className="shrink-0 ps-2 text-[15px] font-medium text-slate-600">
        {airport.code}
      </span>
    </button>
  );
}

export function MobileAirportPicker({
  open,
  field,
  title,
  inputId,
  value,
  selectedCode,
  selectedAirport,
  launcherRef,
  labels,
  locale,
  onCommit,
  onClose,
}: MobileAirportPickerProps) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<AirportOption | null>(null);
  const [suggestions, setSuggestions] = useState<AirportOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentEntries, setRecentEntries] = useState<RecentSearchEntry[]>([]);
  const titleId = `${inputId}-title`;
  const normalizedQuery = query.trim();
  const recentAirports = useMemo(
    () => deriveRecentAirports(recentEntries, 3),
    [recentEntries],
  );

  /* The picker is portalled and retained by several consumers. Resetting its
     draft when the shell opens is intentional synchronization with that event. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    const initial =
      selectedAirport ??
      getAirportByCode(selectedCode || airportCodeFromValue(value));
    setDraft(initial);
    setQuery("");
    setSuggestions([]);
    setLoading(false);
    const local = readRecentSearches();
    setRecentEntries(local);
    const controller = new AbortController();
    void fetchBackendRecentSearches(controller.signal).then((result) => {
      if (!result.ok || !result.items) return;
      const merged = [...local, ...result.items].filter(
        (entry, index, all) =>
          all.findIndex((candidate) => candidate.id === entry.id) === index,
      );
      setRecentEntries(merged);
    });
    const focusId = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => {
      controller.abort();
      window.clearTimeout(focusId);
    };
  }, [open, selectedAirport, selectedCode, value]);

  useEffect(() => {
    if (!open || normalizedQuery.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: normalizedQuery, context: field });
        const response = await fetch(`/api/flights/places?${params}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Airport lookup failed");
        const payload = (await response.json()) as { suggestions?: AirportOption[] };
        setSuggestions(payload.suggestions?.slice(0, 8) ?? []);
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [field, normalizedQuery, open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!open) return null;

  const selectDraft = (option: AirportOption) => {
    setDraft(option);
    setQuery(formatAirportLabel(option, locale));
  };
  const commit = (requestClose: () => void) => {
    onCommit(draft);
    requestClose();
  };
  const list = normalizedQuery.length < 2 ? recentAirports : suggestions;

  return (
    <FlightMobilePickerShell
      open={open}
      title={title}
      titleId={titleId}
      dialogId={`${inputId}-dialog`}
      launcherRef={launcherRef}
      onClose={onClose}
      contentClassName="bg-[#fcfdff] px-4 py-6"
      footer={(requestClose) => (
        <button
          type="button"
          onClick={() => commit(requestClose)}
          className="focus-ring h-[52px] w-full rounded-[9px] bg-[#075ee8] text-[16px] font-semibold text-white transition-colors hover:bg-[#004bb8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {labels?.done || t.done}
        </button>
      )}
    >
      <div className="mx-auto w-full max-w-xl">
        <div className="relative">
          <MapPin
            className="pointer-events-none absolute start-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-700"
            aria-hidden="true"
          />
          <label className="sr-only" htmlFor={inputId}>
            {labels?.searchAirportsAndCities || t.searchAirportsAndCities}
          </label>
          <input
            ref={inputRef}
            id={inputId}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setDraft(null);
            }}
            placeholder={
              labels?.searchAirportsAndCities ||
              labels?.searchAirportsOrCities ||
              t.searchAirportsAndCities
            }
            autoComplete="off"
            className="h-[50px] w-full rounded-[10px] border border-slate-300 bg-white py-3 ps-12 pe-12 text-[15px] font-medium text-slate-950 outline-none transition-colors placeholder:text-slate-500 focus:border-[#075ee8] focus:ring-2 focus:ring-[#075ee8]/10"
          />
          <button
            type="button"
            aria-label={
              field === "origin"
                ? labels?.clearOrigin || t.clearOrigin
                : labels?.clearDestination || t.clearDestination
            }
            onClick={() => {
              setQuery("");
              setDraft(null);
              setSuggestions([]);
              window.requestAnimationFrame(() => inputRef.current?.focus());
            }}
            className="focus-ring absolute end-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50"
          >
            <X className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-8">
          {normalizedQuery.length < 2 && recentAirports.length ? (
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              {t["recentSearches.title"]}
            </h3>
          ) : null}
          {loading ? (
            <p className="px-4 py-8 text-center text-sm font-medium text-slate-500">
              {labels?.searchingAirportsAndCities || t.searchingAirportsAndCities}
            </p>
          ) : list.length ? (
            <div className="overflow-hidden rounded-[11px] border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
              {list.map((airport) => (
                <MobileAirportOptionRow
                  key={airport.code}
                  airport={airport}
                  selected={draft?.code === airport.code}
                  locale={locale}
                  onSelect={() => selectDraft(airport)}
                />
              ))}
            </div>
          ) : normalizedQuery.length >= 2 ? (
            <p className="px-4 py-8 text-center text-sm font-medium text-slate-500">
              {labels?.noMatchingAirportsOrCities || t.noMatchingAirportsOrCities}
            </p>
          ) : null}
        </div>
      </div>
    </FlightMobilePickerShell>
  );
}
