"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import { airlineAliases, airlines, type AirlineOption } from "@/data/airlines";

type AirlinePreferenceMultiSelectProps = {
  id: string;
  name: string;
  label: string;
  values: string[];
  disabled?: boolean;
  helpText?: string;
  onChange: (values: string[]) => void;
};

const MAX_SELECTED_AIRLINES = 10;

const inputContainerClassName =
  "mt-2 flex min-h-10 w-full flex-wrap items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 transition focus-within:border-[#004BB8] focus-within:ring-2 focus-within:ring-blue-100";

const inputClassName =
  "min-w-[12rem] flex-[1_0_12rem] border-0 bg-transparent p-0 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-500";

const codeToAirline = new Map(
  airlines.map((airline) => [airline.code.toUpperCase(), airline]),
);

const normalizedNameToCode = new Map(
  airlines.map((airline) => [normalizeLookupValue(airline.name), airline.code]),
);

function normalizeLookupValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeSavedValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const code = trimmed.toUpperCase();
  if (codeToAirline.has(code)) return code;

  const lookupValue = normalizeLookupValue(trimmed);
  return (
    normalizedNameToCode.get(lookupValue) ??
    airlineAliases[lookupValue] ??
    trimmed
  );
}

function normalizeSavedValues(values: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const nextValue = normalizeSavedValue(value);
    const dedupeKey = codeToAirline.has(nextValue.toUpperCase())
      ? nextValue.toUpperCase()
      : normalizeLookupValue(nextValue);

    if (!nextValue || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    normalized.push(
      codeToAirline.has(nextValue.toUpperCase())
        ? nextValue.toUpperCase()
        : nextValue,
    );
  }

  return normalized.slice(0, MAX_SELECTED_AIRLINES);
}

function getAirlineLabel(value: string) {
  const airline = codeToAirline.get(value.trim().toUpperCase());
  return airline ? `${airline.name} (${airline.code})` : value;
}

function filterAirlines(query: string, selectedValues: string[]) {
  const normalizedQuery = normalizeLookupValue(query);
  const selectedCodes = new Set(
    selectedValues
      .map((value) => value.trim().toUpperCase())
      .filter((value) => codeToAirline.has(value)),
  );

  return airlines
    .filter((airline) => !selectedCodes.has(airline.code.toUpperCase()))
    .filter((airline) => {
      if (!normalizedQuery) return true;
      return (
        normalizeLookupValue(airline.name).includes(normalizedQuery) ||
        airline.code.toLowerCase().includes(normalizedQuery)
      );
    })
    .slice(0, 8);
}

export function AirlinePreferenceMultiSelect({
  id,
  name,
  label,
  values,
  disabled = false,
  helpText = "Search by airline name or IATA code. Choose up to 10 airlines.",
  onChange,
}: AirlinePreferenceMultiSelectProps) {
  const generatedId = useId();
  const listboxId = `${id}-${generatedId}-listbox`;
  const helpId = `${id}-${generatedId}-help`;
  const statusId = `${id}-${generatedId}-status`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const normalizedValues = useMemo(
    () => normalizeSavedValues(values),
    [values],
  );
  const isAtLimit = normalizedValues.length >= MAX_SELECTED_AIRLINES;
  const suggestions = useMemo(
    () => filterAirlines(query, normalizedValues),
    [query, normalizedValues],
  );
  const activeOptionId =
    activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  useEffect(() => {
    if (JSON.stringify(normalizedValues) !== JSON.stringify(values)) {
      onChange(normalizedValues);
    }
  }, [normalizedValues, onChange, values]);

  function closeDropdown() {
    setIsOpen(false);
    setActiveIndex(-1);
  }

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

  function selectAirline(airline: AirlineOption) {
    if (disabled || isAtLimit) return;
    const code = airline.code.toUpperCase();
    if (normalizedValues.some((value) => value.trim().toUpperCase() === code))
      return;

    onChange([...normalizedValues, code].slice(0, MAX_SELECTED_AIRLINES));
    setQuery("");
    closeDropdown();
  }

  function removeValue(valueToRemove: string) {
    onChange(normalizedValues.filter((value) => value !== valueToRemove));
  }

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
      <label
        className="text-sm font-semibold leading-5 text-slate-950"
        htmlFor={id}
      >
        {label}
      </label>

      <input type="hidden" name={name} value={normalizedValues.join(",")} />
      <div
        className={`${inputContainerClassName} ${
          disabled || isAtLimit ? "bg-slate-100 text-slate-500" : ""
        }`}
      >
        {normalizedValues.map((value) => {
          const isKnown = codeToAirline.has(value.trim().toUpperCase());
          return (
            <span
              key={value}
              className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold ${
                isKnown
                  ? "border-blue-100 bg-blue-50 text-[#004BB8]"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <span className="truncate">{getAirlineLabel(value)}</span>
              <button
                type="button"
                aria-label={`Remove ${getAirlineLabel(value)}`}
                disabled={disabled}
                onClick={() => removeValue(value)}
                className="focus-ring rounded-full p-0.5 transition hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </span>
          );
        })}
        <input
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-activedescendant={activeOptionId}
          aria-describedby={isOpen ? statusId : `${helpId} ${statusId}`}
          autoComplete="off"
          value={query}
          disabled={disabled || isAtLimit}
          placeholder={
            isAtLimit
              ? "Maximum of 10 airlines selected"
              : "Search airline or code"
          }
          maxLength={80}
          className={inputClassName}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
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
              if (selected) selectAirline(selected);
            } else if (event.key === "Escape") {
              closeDropdown();
            }
          }}
        />
      </div>
      {!isOpen ? (
        <p
          id={helpId}
          className="mt-1.5 text-xs font-medium leading-5 text-slate-500"
        >
          {helpText}
        </p>
      ) : null}
      <p
        id={statusId}
        className="mt-1 text-xs font-semibold leading-5 text-slate-500"
      >
        {normalizedValues.length}/{MAX_SELECTED_AIRLINES} selected
      </p>

      {isOpen && !disabled && !isAtLimit ? (
        <div className="relative z-20">
          <div
            id={listboxId}
            role="listbox"
            className="absolute mt-2 max-h-44 w-full overflow-auto overflow-x-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl sm:max-h-72"
          >
            {suggestions.length ? (
              suggestions.map((airline, index) => (
                <button
                  key={airline.code}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectAirline(airline)}
                  className={`w-full rounded-xl px-3 py-2 text-left transition ${
                    index === activeIndex
                      ? "bg-blue-50 text-[#004BB8]"
                      : "text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-sm font-bold">
                    {airline.name}
                  </span>
                  <span className="block text-xs font-medium text-slate-500">
                    {airline.code}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-sm font-medium text-slate-500">
                {query.trim()
                  ? "No matching airlines found."
                  : "Start typing to search airlines."}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
