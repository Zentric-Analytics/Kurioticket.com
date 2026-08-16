"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { MapPin, X } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
import {
  searchCarLocationSuggestions,
  type CarLocationSuggestion,
} from "@/lib/cars/carLocationSuggestions";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  mode: "pickup" | "return";
  value: string;
  launcherRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  onCommit: (value: string) => void;
};

export function formatSelectedCarLocation(item: CarLocationSuggestion) {
  if (item.kind === "airport" && item.airportCode) {
    return `${item.city || item.primaryText} (${item.airportCode})`;
  }
  if (item.kind === "custom") return item.value;
  return item.primaryText;
}

function locationSecondaryText(item: CarLocationSuggestion) {
  return item.kind === "airport" ? item.primaryText : item.secondaryText;
}

function LocationRow({
  item,
  selected = false,
  onSelect,
}: {
  item: CarLocationSuggestion;
  selected?: boolean;
  onSelect: () => void;
}) {
  const primaryText = formatSelectedCarLocation(item);
  const secondaryText = locationSecondaryText(item);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${primaryText}, ${secondaryText}`}
      aria-pressed={selected}
      className={cn(
        "focus-ring flex min-h-[80px] w-full items-center gap-3 border-b border-slate-200 px-5 py-3 text-start transition-colors last:border-b-0 hover:bg-slate-50 focus-visible:bg-slate-50",
        selected && "bg-blue-50/60",
      )}
    >
      <MapPin
        aria-hidden="true"
        className="h-5 w-5 shrink-0 text-slate-700"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-semibold leading-5 text-slate-950">
          {primaryText}
        </span>
        {secondaryText ? (
          <span className="mt-1 block truncate text-[13px] font-medium leading-5 text-slate-500">
            {secondaryText}
          </span>
        ) : null}
      </span>
      {item.airportCode ? (
        <span className="shrink-0 ps-2 text-[15px] font-medium text-slate-600">
          {item.airportCode}
        </span>
      ) : null}
    </button>
  );
}

export function MobileCarLocationPicker({
  open,
  mode,
  value,
  launcherRef,
  onClose,
  onCommit,
}: Props) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRequestRef = useRef(0);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<CarLocationSuggestion | null>(null);
  const [results, setResults] = useState<CarLocationSuggestion[]>([]);
  const [searchCompleted, setSearchCompleted] = useState(false);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      searchRequestRef.current += 1;
      setQuery("");
      setDraft(null);
      setResults([]);
      setSearchCompleted(false);
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, value]);

  useEffect(() => {
    if (!open || draft) return;
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    let active = true;
    const requestId = ++searchRequestRef.current;
    const timer = window.setTimeout(() => {
      void searchCarLocationSuggestions(trimmedQuery, { limit: 8 }).then(
        (items) => {
          if (!active || requestId !== searchRequestRef.current) return;
          setResults(items);
          setSearchCompleted(true);
        },
      );
    }, 120);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [draft, open, query]);

  const select = (item: CarLocationSuggestion) => {
    searchRequestRef.current += 1;
    setDraft(item);
    setQuery(formatSelectedCarLocation(item));
    setResults([item]);
    setSearchCompleted(true);
  };

  const clear = () => {
    searchRequestRef.current += 1;
    setQuery("");
    setDraft(null);
    setResults([]);
    setSearchCompleted(false);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const commit = (requestClose: () => void) => {
    if (!draft) return;
    onCommit(draft.value);
    requestClose();
  };

  const trimmedQuery = query.trim();
  const visibleResults = draft ? [draft] : results;
  const text = (key: string, fallback: string) => t[key] ?? fallback;
  const placeholder = text(
    "carsSearch.pickupLocationPlaceholder",
    "Airport, city, or address",
  );

  return (
    <FlightMobilePickerShell
      open={open}
      title={
        mode === "pickup"
          ? text("carsSearch.pickupLocationLabel", "Pickup location")
          : text("carsResults.returnLocationLabel", "Return location")
      }
      titleId={`cars-${mode}-location-title`}
      launcherRef={launcherRef}
      onClose={onClose}
      showBackLabel={true}
      showCancelAction={false}
      contentClassName="bg-[#fcfdff] px-4 py-6"
      footer={(requestClose) => (
        <button
          type="button"
          onClick={() => commit(requestClose)}
          disabled={!draft}
          className="focus-ring h-[52px] w-full rounded-[9px] bg-[#075ee8] text-[16px] font-semibold text-white transition-colors hover:bg-[#004bb8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {text("done", "Done")}
        </button>
      )}
    >
      <div className="mx-auto w-full max-w-xl">
        <div className="relative">
          <MapPin
            aria-hidden="true"
            className="pointer-events-none absolute start-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-700"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              searchRequestRef.current += 1;
              setQuery(event.target.value);
              setDraft(null);
              setResults([]);
              setSearchCompleted(false);
            }}
            aria-label={placeholder}
            placeholder={placeholder}
            autoComplete="off"
            className="h-[50px] w-full rounded-[10px] border border-slate-300 bg-white py-3 ps-12 pe-12 text-[15px] font-medium text-slate-950 outline-none transition-colors placeholder:text-slate-500 focus:border-[#075ee8] focus:ring-2 focus:ring-[#075ee8]/10"
          />
          <button
            type="button"
            aria-label={text("carsSearch.clearLocation", "Clear location")}
            onClick={clear}
            className="focus-ring absolute end-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50"
          >
            <X className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-8">
          {visibleResults.length ? (
            <div className="overflow-hidden rounded-[11px] border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
              {visibleResults.map((item) => (
                <LocationRow
                  key={item.id}
                  item={item}
                  selected={draft?.id === item.id}
                  onSelect={() => select(item)}
                />
              ))}
            </div>
          ) : searchCompleted && trimmedQuery ? (
            <p className="px-4 py-8 text-center text-sm font-medium text-slate-500">
              {text(
                "carsSearch.noMatchingLocations",
                "No matching locations found.",
              )}
            </p>
          ) : null}
        </div>
      </div>
    </FlightMobilePickerShell>
  );
}
