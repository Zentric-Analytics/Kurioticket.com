"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import type { CmsLocationOption } from "@/lib/adminCmsLocationOptions";
import {
  getCmsAirportSuggestions,
  getCmsCitySuggestions,
  getCmsCountrySuggestions,
} from "@/lib/adminCmsLocationOptions";

type LocationKind = "city" | "country" | "airport";

const inputClass =
  "h-9 w-full rounded-lg border border-slate-300 bg-white px-3 pr-9 text-[13px] font-normal text-[#111827] shadow-[0_1px_0_rgba(15,23,42,0.04)] outline-none transition-colors hover:border-slate-400 focus:border-[#004BB8]/40 focus:ring-2 focus:ring-[#004BB8]/15 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-700";

export function CmsLocationCombobox({
  label,
  kind,
  value,
  countryCode = "",
  onChange,
  onSelect,
  disabled = false,
  className = "",
}: {
  label: string;
  kind: LocationKind;
  value: string;
  countryCode?: string;
  onChange: (value: string) => void;
  onSelect?: (option: CmsLocationOption) => void;
  disabled?: boolean;
  className?: string;
}) {
  const inputId = useId();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);

  // Until the user starts typing, show their original saved value without
  // overwriting it. Focus can show suggestions but never mutates the CMS draft.
  const search = editing ? query : value;
  const options =
    kind === "airport"
      ? getCmsAirportSuggestions(search)
      : kind === "country"
        ? getCmsCountrySuggestions(search)
        : getCmsCitySuggestions(search, countryCode);
  const normalized = search.trim().toLocaleLowerCase();
  const exactCountry = kind === "country" && options.some(
    (option) => option.title.toLocaleLowerCase() === normalized,
  );

  function pick(option: CmsLocationOption) {
    onChange(option.value);
    onSelect?.(option);
    setQuery("");
    setEditing(false);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => current < options.length - 1 ? current + 1 : 0);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => current <= 0 ? Math.max(0, options.length - 1) : current - 1);
      return;
    }
    if (event.key === "Enter" && open && activeIndex >= 0 && options[activeIndex]) {
      event.preventDefault();
      pick(options[activeIndex]);
    }
  }

  return (
    <div
      className={"relative min-w-0 " + className}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setActiveIndex(-1);
        }
      }}
    >
      <label className="block text-[13px] font-medium text-[#475569]" htmlFor={inputId}>
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={inputId}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open && activeIndex >= 0 && options[activeIndex] ? listId + "-" + activeIndex : undefined}
          autoComplete="off"
          className={inputClass}
          value={value}
          disabled={disabled}
          placeholder={kind === "airport" ? "Search airport or IATA" : kind === "country" ? "Search country" : "Search city"}
          onChange={(event) => {
            const next = event.target.value;
            onChange(kind === "airport" ? next.toUpperCase() : next);
            setQuery(next);
            setEditing(true);
            setActiveIndex(-1);
            setOpen(true);
          }}
          onFocus={() => {
            setQuery(value);
            setEditing(true);
            setActiveIndex(-1);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>
      {open && !disabled ? (
        <div
          id={listId}
          role="listbox"
          aria-label={label + " suggestions"}
          className="absolute z-30 mt-1 max-h-56 w-full min-w-[min(100%,14rem)] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
        >
          {options.length > 0 ? options.map((option, index) => (
            <button
              id={listId + "-" + index}
              key={option.value + (option.countryCode ?? "")}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(option)}
              className={"flex w-full items-start gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-slate-50 focus:bg-slate-50 " + (index === activeIndex ? "bg-blue-50/60" : "")}
            >
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-slate-900">{option.title}</span>
                {option.description ? <span className="block text-[11px] leading-4 text-slate-500">{option.description}</span> : null}
              </span>
              {option.value.toLocaleLowerCase() === value.toLocaleLowerCase() ? (
                <Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#004BB8]" />
              ) : null}
            </button>
          )) : (
            <p className="px-3 py-2 text-[12px] leading-5 text-slate-500">
              {kind === "airport"
                ? "No airport found. Enter a valid three-letter IATA code manually."
                : "No matching " + kind + ". You can keep typing a custom value."}
            </p>
          )}
          {kind === "country" && search.trim() && !exactCountry ? (
            <p className="border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-500">Choose a country to fill its country code automatically.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
