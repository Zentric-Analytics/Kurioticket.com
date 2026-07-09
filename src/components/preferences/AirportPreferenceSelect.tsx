"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import {
  airports,
  formatAirportLabel,
  getLocalizedAirportCountryName,
  type AirportOption,
} from "@/data/airports";

type AirportPreferenceSelectProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  disabled?: boolean;
  locale?: string | null;
  onChange: (value: string) => void;
};

const inputClassName =
  "focus-ring mt-2 min-h-10 w-full rounded-none border border-slate-300 bg-white px-3 pe-11 text-sm font-semibold text-slate-800 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

const codeToAirport = new Map(
  airports.map((airport) => [airport.code.toUpperCase(), airport]),
);

function getAirportPrimaryLabel(airport: AirportOption, locale?: string | null) {
  return formatAirportLabel(airport, locale);
}

function getAirportSecondaryLabel(
  airport: AirportOption,
  locale?: string | null,
) {
  return [
    airport.airport || airport.name,
    getLocalizedAirportCountryName(airport, locale),
  ]
    .filter(Boolean)
    .join(" · ");
}

function getAirportDisplayLabel(airport: AirportOption, locale?: string | null) {
  const secondary = getAirportSecondaryLabel(airport, locale);
  return secondary
    ? `${getAirportPrimaryLabel(airport, locale)} — ${secondary}`
    : getAirportPrimaryLabel(airport, locale);
}

function getKnownAirport(value: string) {
  return codeToAirport.get(value.trim().toUpperCase()) ?? null;
}

function dedupeSuggestions(suggestions: AirportOption[]) {
  const seen = new Set<string>();
  const deduped: AirportOption[] = [];

  for (const suggestion of suggestions) {
    const code = suggestion.code?.trim().toUpperCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    deduped.push({ ...suggestion, code });
  }

  return deduped;
}

export function AirportPreferenceSelect({
  id,
  name,
  label,
  value,
  disabled = false,
  locale,
  onChange,
}: AirportPreferenceSelectProps) {
  const generatedId = useId();
  const listboxId = `${id}-${generatedId}-listbox`;
  const helpId = `${id}-${generatedId}-help`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<AirportOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const knownAirport = useMemo(() => getKnownAirport(value), [value]);

  function closeDropdown() {
    setIsOpen(false);
    setActiveIndex(-1);
  }

  useEffect(() => {
    if (!isOpen) return undefined;

    const query = inputValue.trim();
    if (query.length < 1) return undefined;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ q: query, context: "origin" });
        if (typeof navigator !== "undefined" && navigator.language) {
          params.set("locale", navigator.language);
        }
        const response = await fetch(`/api/flights/places?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Airport suggestions unavailable.");
        const data = (await response.json()) as { suggestions?: AirportOption[] };
        setSuggestions(dedupeSuggestions(data.suggestions ?? []).slice(0, 8));
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [inputValue, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleDocumentPointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (!root || root.contains(event.target as Node)) return;

      closeDropdown();
    }

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
    };
  }, [isOpen]);

  function selectAirport(airport: AirportOption) {
    onChange(airport.code.toUpperCase());
    setInputValue(getAirportDisplayLabel(airport, locale));
    setSuggestions([]);
    closeDropdown();
  }

  function clearAirport() {
    onChange("");
    setInputValue("");
    setSuggestions([]);
    closeDropdown();
  }

  const savedDisplayValue = knownAirport
    ? getAirportDisplayLabel(knownAirport, locale)
    : value;
  const displayedInputValue = isOpen ? inputValue : savedDisplayValue;
  const showLegacyNote = Boolean(value && !knownAirport);
  const activeOptionId =
    activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <div
      ref={rootRef}
      className="block"
      onBlur={(event) => {
        const nextFocusedElement =
          event.relatedTarget instanceof Node ? event.relatedTarget : null;
        if (event.currentTarget.contains(nextFocusedElement)) return;
        closeDropdown();
      }}
    >
      <label className="text-sm font-semibold leading-5 text-slate-950" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-activedescendant={activeOptionId}
          aria-describedby={showLegacyNote ? helpId : undefined}
          autoComplete="off"
          value={displayedInputValue}
          disabled={disabled}
          placeholder="Search city, airport, or code"
          maxLength={120}
          className={inputClassName}
          onFocus={() => {
            setInputValue(savedDisplayValue);
            setIsOpen(true);
          }}
          onChange={(event) => {
            const nextValue = event.target.value;
            setInputValue(nextValue);
            setIsOpen(true);
            setActiveIndex(-1);
            if (!nextValue.trim()) onChange("");
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((current) =>
                suggestions.length ? (current + 1) % suggestions.length : -1,
              );
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) =>
                suggestions.length
                  ? (current <= 0 ? suggestions.length : current) - 1
                  : -1,
              );
            } else if (event.key === "Enter" && activeIndex >= 0) {
              event.preventDefault();
              const selected = suggestions[activeIndex];
              if (selected) selectAirport(selected);
            } else if (event.key === "Escape") {
              closeDropdown();
            }
          }}
        />
        {value || inputValue ? (
          <button
            type="button"
            aria-label="Clear home airport"
            disabled={disabled}
            onClick={clearAirport}
            className="focus-ring absolute end-2 top-1/2 mt-1 inline-flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {showLegacyNote ? (
        <p id={helpId} className="mt-1.5 text-xs font-medium leading-5 text-slate-500">
          Saved as “{value}”. Search and select an airport to replace it, or clear it for no preference.
        </p>
      ) : null}

      {isOpen && !disabled ? (
        <div className="relative z-20">
          <div
            id={listboxId}
            role="listbox"
            className="absolute mt-2 max-h-72 w-full overflow-auto rounded-none border border-slate-200 bg-white p-1.5 shadow-xl"
          >
            {isLoading ? (
              <p className="px-3 py-2 text-sm font-medium text-slate-500" role="status">
                Searching airports…
              </p>
            ) : suggestions.length ? (
              suggestions.map((airport, index) => (
                <button
                  key={airport.code}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectAirport(airport)}
                  className={`w-full cursor-pointer rounded-none px-3 py-2 text-left transition ${
                    index === activeIndex
                      ? "bg-blue-50 text-[#004BB8]"
                      : "text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-sm font-bold">
                    {getAirportPrimaryLabel(airport, locale)}
                  </span>
                  <span className="block text-xs font-medium text-slate-500">
                    {getAirportSecondaryLabel(airport, locale)}
                  </span>
                </button>
              ))
            ) : displayedInputValue.trim() ? (
              <p className="px-3 py-2 text-sm font-medium text-slate-500">
                No matching airports found.
              </p>
            ) : (
              <p className="px-3 py-2 text-sm font-medium text-slate-500">
                Start typing to search airports.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
