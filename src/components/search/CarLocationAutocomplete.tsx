"use client";

import { ChangeEvent, KeyboardEvent, RefObject, useEffect, useId, useRef, useState } from "react";
import { Building2, LocateFixed, MapPin, Plane } from "lucide-react";

import type { CarLocationSuggestion, CarLocationSuggestionKind } from "@/lib/cars/carLocationSuggestions";

type Strings = {
  locationSuggestions: string;
  popularLocations: string;
  loadingSuggestions: string;
  noMatchingLocations: string;
  suggestionsUnavailable: string;
  continueTypingManually: string;
  useTypedLocation: string;
  unverifiedTypedLocation: string;
  airport: string;
  city: string;
  area: string;
  customLocation: string;
};

type Props = {
  id: string;
  name?: string;
  value: string;
  onValueChange: (value: string) => void;
  onSelect?: (suggestion: CarLocationSuggestion) => void;
  placeholder: string;
  disabled?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  inputClassName?: string;
  presentation: "desktop" | "mobile";
  countryHint?: string;
  strings: Strings;
  onRequestClose?: () => void;
};

type ApiResponse = { suggestions?: CarLocationSuggestion[]; source?: "local-fallback" };

const kindIcon: Record<CarLocationSuggestionKind, typeof MapPin> = {
  airport: Plane,
  city: Building2,
  area: MapPin,
  custom: LocateFixed,
};

export function CarLocationAutocomplete({
  id,
  name,
  value,
  onValueChange,
  onSelect,
  placeholder,
  disabled,
  inputRef,
  inputClassName = "",
  presentation,
  countryHint,
  strings,
  onRequestClose,
}: Props) {
  const reactId = useId().replace(/:/g, "");
  const listboxId = `${id}-${reactId}-listbox`;
  const fallbackRef = useRef<HTMLInputElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const activeInputRef = inputRef ?? fallbackRef;
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<CarLocationSuggestion[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open || disabled) return;
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError(false);
      const params = new URLSearchParams({ q: value, limit: "8" });
      if (countryHint && /^[A-Za-z]{2}$/.test(countryHint)) params.set("country", countryHint.toUpperCase());
      fetch(`/api/cars/locations?${params.toString()}`, { signal: controller.signal, cache: "no-store" })
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Location suggestions unavailable"))))
        .then((data: ApiResponse) => {
          if (requestId !== requestIdRef.current) return;
          setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
          setHighlightedIndex(-1);
        })
        .catch((fetchError: unknown) => {
          if ((fetchError as { name?: string }).name === "AbortError" || requestId !== requestIdRef.current) return;
          setSuggestions([]);
          setError(true);
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setLoading(false);
        });
    }, 240);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [countryHint, disabled, open, value]);

  useEffect(() => {
    if (!open || presentation !== "desktop") return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, presentation]);

  const close = () => {
    setOpen(false);
    setHighlightedIndex(-1);
    onRequestClose?.();
  };

  const selectSuggestion = (suggestion: CarLocationSuggestion) => {
    onValueChange(suggestion.value);
    onSelect?.(suggestion);
    close();
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    onValueChange(event.target.value);
    setOpen(true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((current) => Math.min(suggestions.length - 1, current + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) => Math.max(0, current === -1 ? suggestions.length - 1 : current - 1));
    } else if (event.key === "Enter" && open && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
      event.preventDefault();
      selectSuggestion(suggestions[highlightedIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Home" && open) {
      event.preventDefault();
      setHighlightedIndex(0);
    } else if (event.key === "End" && open) {
      event.preventDefault();
      setHighlightedIndex(suggestions.length - 1);
    }
  };

  const activeId = open && highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined;
  const label = value.trim() ? strings.locationSuggestions : strings.popularLocations;
  const panelClass = presentation === "desktop"
    ? "absolute left-0 right-0 top-full z-[320] mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-950/12 ring-1 ring-slate-950/5"
    : "mt-4 max-h-[48vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm";

  return (
    <div ref={wrapperRef} className="relative" data-cars-desktop-popover={presentation === "desktop" ? "locations" : undefined}>
      <input
        ref={activeInputRef}
        id={id}
        name={name}
        type="text"
        value={value}
        onChange={onChange}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={inputClassName}
        autoComplete="off"
        disabled={disabled}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeId}
      />

      {open ? (
        <div className={panelClass} data-cars-desktop-popover={presentation === "desktop" ? "locations" : undefined}>
          <div className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</div>
          {loading ? <p className="px-3 py-3 text-sm font-semibold text-slate-600" aria-live="polite">{strings.loadingSuggestions}</p> : null}
          {error ? <p className="px-3 py-3 text-sm font-semibold text-slate-600" aria-live="polite">{strings.suggestionsUnavailable} {strings.continueTypingManually}</p> : null}
          {!loading && !error && suggestions.length === 0 ? <p className="px-3 py-3 text-sm font-semibold text-slate-600" aria-live="polite">{strings.noMatchingLocations} {strings.continueTypingManually}</p> : null}
          <div role="listbox" id={listboxId} aria-label={label}>
            {suggestions.map((suggestion, index) => {
              const Icon = kindIcon[suggestion.kind];
              const selected = index === highlightedIndex;
              const typeLabel = suggestion.kind === "airport" ? strings.airport : suggestion.kind === "city" ? strings.city : suggestion.kind === "area" ? strings.area : strings.customLocation;
              return (
                <button
                  key={suggestion.id}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectSuggestion(suggestion)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition ${selected ? "bg-[#004BB8]/10 text-slate-950" : "text-slate-900 hover:bg-[#004BB8]/8"}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#004BB8]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{suggestion.kind === "custom" ? `${strings.useTypedLocation}: ${suggestion.value}` : suggestion.primaryText}</span>
                    <span className="block truncate text-xs font-semibold text-slate-500">{suggestion.kind === "custom" ? strings.unverifiedTypedLocation : suggestion.secondaryText}</span>
                  </span>
                  {suggestion.airportCode ? <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{suggestion.airportCode}</span> : null}
                  <span className="shrink-0 rounded-full border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-500">{typeLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
