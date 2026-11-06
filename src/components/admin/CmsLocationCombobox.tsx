"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

import type { CmsLocationOption } from "@/lib/adminCmsLocationOptions";
import {
  getCmsAirportSuggestions,
  getCmsCitySuggestions,
  getCmsCountrySuggestions,
  getCmsHotelDestinationSuggestions,
} from "@/lib/adminCmsLocationOptions";

type LocationKind = "city" | "country" | "airport" | "hotel";
type HotelSearchOption = { canonicalId: string; label: string; name: string; country: string; countryCode: string; kind: string; searchValue: string };
type PopoverPlacement = { left: number; top: number; width: number; maxHeight: number };

const inputClass =
  "h-9 w-full rounded-lg border border-slate-300 bg-white px-3 pr-9 text-[13px] font-normal text-[#111827] shadow-[0_1px_0_rgba(15,23,42,0.04)] outline-none transition-colors hover:border-slate-400 focus:border-[#004BB8]/40 focus:ring-2 focus:ring-[#004BB8]/15 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-700";

/**
 * A viewport-anchored menu avoids extending the editor's scrollable document.
 * Flip upwards near the bottom of the window; only the popup scrolls inside it.
 */
function measurePopover(anchor: HTMLInputElement): PopoverPlacement {
  const rect = anchor.getBoundingClientRect();
  const inset = 8;
  const gap = 6;
  const maxMenuHeight = 232;
  const below = Math.max(0, window.innerHeight - rect.bottom - inset - gap);
  const above = Math.max(0, rect.top - inset - gap);
  const upwards = below < 160 && above > below;
  const maxHeight = Math.max(72, Math.min(maxMenuHeight, upwards ? above : below));
  const width = Math.min(Math.max(rect.width, 224), Math.max(160, window.innerWidth - inset * 2));
  const left = Math.max(inset, Math.min(rect.left, window.innerWidth - width - inset));
  const top = upwards ? Math.max(inset, rect.top - maxHeight - gap) : rect.bottom + gap;
  return { left, top, width, maxHeight };
}

export function CmsLocationCombobox({
  label,
  kind,
  value,
  countryCode = "",
  hotelOptions = [],
  selectedValue,
  onChange,
  onSelect,
  disabled = false,
  className = "",
}: {
  label: string;
  kind: LocationKind;
  value: string;
  countryCode?: string;
  hotelOptions?: readonly HotelSearchOption[];
  selectedValue?: string;
  onChange: (value: string) => void;
  onSelect?: (option: CmsLocationOption) => void;
  disabled?: boolean;
  className?: string;
}) {
  const inputId = useId();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<PopoverPlacement | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const options =
    kind === "hotel"
      ? getCmsHotelDestinationSuggestions(hotelOptions, value)
      : kind === "airport"
      ? getCmsAirportSuggestions(value)
      : kind === "country"
        ? getCmsCountrySuggestions(value)
        : getCmsCitySuggestions(value, countryCode);
  const normalized = value.trim().toLocaleLowerCase();
  const exactCountry = kind === "country" && options.some(
    (option) => option.title.toLocaleLowerCase() === normalized,
  );

  function show() {
    if (disabled || !inputRef.current) return;
    setPlacement(measurePopover(inputRef.current));
    setOpen(true);
    setActiveIndex(-1);
  }

  function dismiss() {
    setOpen(false);
    setActiveIndex(-1);
  }

  function pick(option: CmsLocationOption) {
    onChange(option.value);
    onSelect?.(option);
    dismiss();
    inputRef.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (!open) return;
    const dismissOutside = (event: PointerEvent | FocusEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!rootRef.current?.contains(target) && !listRef.current?.contains(target)) dismiss();
    };
    const dismissOnScroll = (event: Event) => {
      // Scrolling inside the suggestion list must not affect the main page.
      if (event.target instanceof Node && listRef.current?.contains(event.target)) return;
      dismiss();
    };
    document.addEventListener("pointerdown", dismissOutside, true);
    document.addEventListener("focusin", dismissOutside, true);
    document.addEventListener("scroll", dismissOnScroll, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside, true);
      document.removeEventListener("focusin", dismissOutside, true);
      document.removeEventListener("scroll", dismissOnScroll, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const list = listRef.current;
    const option = list?.querySelector<HTMLElement>('[data-cms-option-index="' + activeIndex + '"]');
    if (!list || !option) return;
    // Adjust only the menu's own scrollTop, without moving the document.
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, [activeIndex, open]);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        dismiss();
      }
      return;
    }
    if (event.key === "Tab") {
      dismiss();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) show();
      if (options.length === 0) return;
      setActiveIndex((current) => event.key === "ArrowDown"
        ? (current + 1) % options.length
        : current <= 0 ? options.length - 1 : current - 1);
      return;
    }
    if ((event.key === "Home" || event.key === "End") && open && options.length) {
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : options.length - 1);
      return;
    }
    if (event.key === "Enter" && open && activeIndex >= 0 && options[activeIndex]) {
      event.preventDefault();
      pick(options[activeIndex]);
    }
  }

  function toggleOnPointerDown(event: ReactPointerEvent<HTMLInputElement>) {
    // First click focuses and opens the field. Clicking that same focused box
    // again closes the menu; a third click reopens it without losing the caret.
    if (document.activeElement === event.currentTarget) {
      if (open) dismiss();
      else show();
    }
  }

  return (
    <div ref={rootRef} className={"relative min-w-0 " + className}>
      <label className="block min-h-5 whitespace-nowrap text-[13px] font-medium leading-5 text-[#475569]" htmlFor={inputId}>
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open && activeIndex >= 0 && options[activeIndex] ? listId + "-" + activeIndex : undefined}
          autoComplete="off"
          className={inputClass}
          value={value}
          disabled={disabled}
          placeholder={kind === "hotel" ? "Search canonical destination" : kind === "airport" ? "Search airport or IATA" : kind === "country" ? "Search country" : "Search city"}
          onPointerDown={toggleOnPointerDown}
          onFocus={() => { if (!open) show(); }}
          onChange={(event) => {
            const next = event.target.value;
            onChange(kind === "airport" ? next.toUpperCase() : next);
            setActiveIndex(-1);
            if (!open) show();
          }}
          onKeyDown={onKeyDown}
        />
        <ChevronDown
          aria-hidden="true"
          className={"pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-transform duration-150 " + (open ? "rotate-180" : "")}
        />
      </div>
      {open && placement && !disabled ? createPortal(
        <div
          id={listId}
          ref={listRef}
          role="listbox"
          aria-label={label + " suggestions"}
          style={{ top: placement.top, left: placement.left, width: placement.width, maxHeight: placement.maxHeight }}
          className="fixed z-[100] overflow-y-auto overscroll-contain rounded-lg border border-[#D8E1EC] bg-white p-1.5 shadow-[0_10px_28px_-12px_rgba(2,6,23,0.25)] [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent]"
        >
          {options.length > 0 ? options.map((option, index) => (
            <button
              id={listId + "-" + index}
              data-cms-option-index={index}
              key={option.value + (option.countryCode ?? "")}
              type="button"
              tabIndex={-1}
              role="option"
              aria-selected={option.value.toLocaleLowerCase() === (selectedValue ?? value).toLocaleLowerCase()}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => pick(option)}
              className={"flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] transition-colors " +
                (index === activeIndex ? "bg-[#F1F7FF] " : "hover:bg-[#F8FAFC] ") +
                (option.value.toLocaleLowerCase() === (selectedValue ?? value).toLocaleLowerCase() ? "font-medium text-[#004BB8]" : "font-normal text-[#020617]")}
            >
              <span className="min-w-0 flex-1">
                <span className="block leading-5">{option.title}</span>
                {option.description ? <span className="mt-0.5 block text-[11px] leading-4 text-[#64748B]">{option.description}</span> : null}
              </span>
              {option.value.toLocaleLowerCase() === (selectedValue ?? value).toLocaleLowerCase() ? (
                <Check size={15} aria-hidden="true" className="shrink-0 text-[#004BB8]" />
              ) : null}
            </button>
          )) : (
            <p className="px-3 py-2 text-[12px] leading-5 text-slate-500">
              {kind === "airport"
                ? "No airport found. Enter a valid three-letter IATA code manually."
                : kind === "hotel" ? "No matching canonical destination. Select one of the listed entries to save." : "No matching " + kind + ". You can keep typing a custom value."}
            </p>
          )}
          {kind === "country" && value.trim() && !exactCountry ? (
            <p className="border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-500">
              Choose a country to fill its country code automatically.
            </p>
          ) : null}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
