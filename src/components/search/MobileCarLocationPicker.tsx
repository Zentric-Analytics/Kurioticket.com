"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { CarFront, MapPin, X } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
import {
  searchCarLocationSuggestions,
  type CarLocationSuggestion,
} from "@/lib/cars/carLocationSuggestions";
import { hasMinimumCarLocationSearchLetters } from "@/lib/cars/locationSearchQuery";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  mode: "pickup" | "return";
  inputId: string;
  value: string;
  launcherRef?: RefObject<HTMLElement | null>;
  commitOnSelect?: boolean;
  onClose: () => void;
  onCommit: (value: string, suggestion?: CarLocationSuggestion) => void;
  presentation?: "default" | "carsResultsEdit" | "carsMain";
};

export function formatSelectedCarLocation(item: CarLocationSuggestion) {
  if (item.canonical) return item.canonical.primaryLabel;
  if (item.kind === "airport" && item.airportCode) {
    return `${item.city || item.primaryText} (${item.airportCode})`;
  }
  if (item.kind === "custom") return item.value;
  return item.primaryText;
}

function locationSecondaryText(item: CarLocationSuggestion) {
  if (item.canonical) return item.canonical.supportingLabel;
  return item.kind === "airport" ? item.primaryText : item.secondaryText;
}

async function loadCarLocationSuggestions(
  query: string,
  signal: AbortSignal,
  limit = 8,
) {
  const params = new URLSearchParams({ q: query.trim(), limit: String(limit) });
  try {
    const response = await fetch(`/api/cars/locations?${params.toString()}`, {
      signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Car locations unavailable");
    const payload = (await response.json()) as {
      suggestions?: CarLocationSuggestion[];
    };
    return Array.isArray(payload.suggestions) ? payload.suggestions : [];
  } catch (error) {
    if (signal.aborted || (error as { name?: string }).name === "AbortError") {
      throw error;
    }
    // Keep the existing deterministic catalogue as a graceful fallback. The
    // server discovery route remains authoritative whenever it is reachable.
    return searchCarLocationSuggestions(query.trim(), { limit });
  }
}

function LocationRow({
  item,
  selected = false,
  onSelect,
  nativeCarsAppearance = false,
}: {
  item: CarLocationSuggestion;
  selected?: boolean;
  onSelect: () => void;
  nativeCarsAppearance?: boolean;
}) {
  const primaryText = nativeCarsAppearance
    ? item.primaryText
    : formatSelectedCarLocation(item);
  const secondaryText =
    nativeCarsAppearance && item.airportCode
      ? [item.secondaryText, item.airportCode].filter(Boolean).join(" · ")
      : locationSecondaryText(item);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${primaryText}, ${secondaryText}`}
      role={nativeCarsAppearance ? "option" : undefined}
      aria-selected={nativeCarsAppearance ? selected : undefined}
      aria-pressed={nativeCarsAppearance ? undefined : selected}
      className={cn(
        "focus-ring flex min-h-[80px] w-full items-center gap-3 border-b border-slate-200 px-5 py-3 text-start transition-colors last:border-b-0 hover:bg-slate-50 focus-visible:bg-slate-50",
        nativeCarsAppearance &&
          "min-h-[68px] gap-[10px] border-b-[#E7ECF5] border-l-[3px] border-l-transparent px-2 py-2.5 last:border-b",
        selected && !nativeCarsAppearance && "bg-blue-50/60",
        selected && nativeCarsAppearance && "border-l-[#064CF7] bg-[#F2F6FF]",
      )}
    >
      {nativeCarsAppearance ? (
        <span
          aria-hidden="true"
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-white"
        >
          <CarFront className="h-[22px] w-[22px] text-[#071A48]" />
        </span>
      ) : (
        <MapPin aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-700" />
      )}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[16px] font-semibold leading-5 text-slate-950",
            nativeCarsAppearance && "text-[14px] font-bold leading-[19px] text-[#071A48]",
          )}
        >
          {primaryText}
        </span>
        {secondaryText ? (
          <span
            className={cn(
              "mt-1 block truncate text-[13px] font-medium leading-5 text-slate-500",
              nativeCarsAppearance && "mt-[3px] text-[11px] font-normal leading-4 text-[#56658E]",
            )}
          >
            {secondaryText}
          </span>
        ) : null}
      </span>
      {item.airportCode && !nativeCarsAppearance ? (
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
  inputId,
  value,
  launcherRef,
  commitOnSelect = true,
  onClose,
  onCommit,
  presentation = "default",
}: Props) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRequestRef = useRef(0);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<CarLocationSuggestion | null>(null);
  const [results, setResults] = useState<CarLocationSuggestion[]>([]);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const resultsEdit = presentation === "carsResultsEdit";
  const nativeCarsAppearance = resultsEdit || presentation === "carsMain";

  // Reset retained picker state before the newly-opened portal paints. Doing
  // this in a passive effect (and then again in requestAnimationFrame) leaves
  // the previous query/results visible for a frame and allows the search
  // effect below to launch a request for that stale query.
  useLayoutEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const requestId = ++searchRequestRef.current;
    /* A retained full-screen portal must clear its prior session atomically
       before paint; deferring these updates is the bug this reset prevents. */
    /* eslint-disable react-hooks/set-state-in-effect */
    setQuery("");
    setDraft(null);
    setResults([]);
    setSearchCompleted(false);
    setLoading(!nativeCarsAppearance);
    setError(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    const frame = requestAnimationFrame(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus({ preventScroll: true });
      }
      if (nativeCarsAppearance) return;
      void loadCarLocationSuggestions("", controller.signal, 8)
        .then((items) => {
          if (requestId !== searchRequestRef.current) return;
          setResults(items);
          setSearchCompleted(true);
        })
        .catch(() => {
          if (requestId !== searchRequestRef.current) return;
          setError(true);
          setSearchCompleted(true);
        })
        .finally(() => {
          if (requestId === searchRequestRef.current) setLoading(false);
        });
    });
    return () => {
      searchRequestRef.current += 1;
      controller.abort();
      cancelAnimationFrame(frame);
    };
  }, [open, nativeCarsAppearance, value]);

  useEffect(() => {
    if (!open || draft) return;
    const trimmedQuery = query.trim();
    const eligible = nativeCarsAppearance
      ? hasMinimumCarLocationSearchLetters(query)
      : Boolean(trimmedQuery);
    if (!eligible) return;

    let active = true;
    const controller = new AbortController();
    const requestId = ++searchRequestRef.current;
    const timer = window.setTimeout(
      () => {
        setLoading(true);
        setError(false);
        void loadCarLocationSuggestions(trimmedQuery, controller.signal, 8)
          .then((items) => {
            if (!active || requestId !== searchRequestRef.current) return;
            setResults(items);
            setSearchCompleted(true);
          })
          .catch(() => {
            if (!active || requestId !== searchRequestRef.current) return;
            setResults([]);
            setError(true);
            setSearchCompleted(true);
          })
          .finally(() => {
            if (active && requestId === searchRequestRef.current)
              setLoading(false);
          });
      },
      nativeCarsAppearance ? 180 : 120,
    );
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [draft, open, query, nativeCarsAppearance]);

  const select = (item: CarLocationSuggestion, requestClose: () => void) => {
    searchRequestRef.current += 1;
    if (commitOnSelect) {
      onCommit(item.value, item);
      requestClose();
      return;
    }
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
    setLoading(false);
    setError(false);
    window.requestAnimationFrame(() =>
      inputRef.current?.focus({ preventScroll: true }),
    );
  };

  const commit = (requestClose: () => void) => {
    if (!draft) return;
    onCommit(draft.value, draft);
    requestClose();
  };

  const trimmedQuery = query.trim();
  const eligible = hasMinimumCarLocationSearchLetters(query);
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
          ? text("carsSearch.choosePickupLocation", "Choose pick-up location")
          : text("carsSearch.chooseReturnLocation", "Choose return location")
      }
      titleId={`cars-${mode}-location-title`}
      launcherRef={launcherRef}
      onClose={onClose}
      presentation={presentation}
      surfaceVariant={nativeCarsAppearance ? "white" : "default"}
      contentLayout={nativeCarsAppearance ? "contained" : "scroll"}
      showBackLabel={true}
      showCancelAction={false}
      contentClassName={cn(
        "bg-[#fcfdff] px-4 py-6",
        nativeCarsAppearance && "bg-white px-5 py-3",
      )}
      footer={
        commitOnSelect
          ? undefined
          : (requestClose) => (
              <button
                type="button"
                onClick={() => commit(requestClose)}
                disabled={!draft}
                className="focus-ring h-[52px] w-full rounded-[9px] bg-[#075ee8] text-[16px] font-semibold text-white transition-colors hover:bg-[#004bb8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {text("done", "Done")}
              </button>
            )
      }
    >
      {(requestClose) => (
        <div
          className={cn(
            "mx-auto w-full max-w-xl",
            nativeCarsAppearance && "flex h-full min-h-0 flex-col",
          )}
        >
          <div className={cn("relative", nativeCarsAppearance && "shrink-0")}>
            <MapPin
              aria-hidden="true"
              className="pointer-events-none absolute start-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-700"
            />
            <input
              ref={inputRef}
              id={inputId}
              value={query}
              onChange={(event) => {
                searchRequestRef.current += 1;
                setQuery(event.target.value);
                setDraft(null);
                setResults([]);
                setSearchCompleted(false);
                setLoading(false);
                setError(false);
              }}
              aria-label={placeholder}
              placeholder={placeholder}
              autoComplete="off"
              className={cn(
                "h-[50px] w-full rounded-[10px] border border-slate-300 bg-white py-3 ps-12 pe-12 text-[15px] font-medium text-slate-950 outline-none transition-colors placeholder:text-slate-500 focus:border-[#075ee8] focus:ring-2 focus:ring-[#075ee8]/10",
                nativeCarsAppearance && "h-[52px]",
              )}
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

          <div
            data-car-location-results-viewport={nativeCarsAppearance ? "true" : undefined}
            className={cn(
              nativeCarsAppearance
                ? "mt-3 min-h-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-contain bg-white [-webkit-overflow-scrolling:touch]"
                : "mt-8",
            )}
          >
            {loading ? (
              <p
                className="px-4 py-8 text-center text-sm font-medium text-slate-500"
                aria-live="polite"
              >
                {nativeCarsAppearance
                  ? "Finding locations…"
                  : text(
                      "carsSearch.loadingSuggestions",
                      "Loading suggestions…",
                    )}
              </p>
            ) : error ? (
              <p
                className="px-4 py-8 text-center text-sm font-medium text-slate-500"
                aria-live="polite"
              >
                {nativeCarsAppearance
                  ? "Couldn’t load locations. Please try again."
                  : `${text("carsSearch.suggestionsUnavailable", "Suggestions unavailable.")} ${text("carsSearch.continueTypingManually", "Continue typing manually.")}`}
              </p>
            ) : visibleResults.length ? (
              <div
                role={nativeCarsAppearance ? "listbox" : undefined}
                aria-label={nativeCarsAppearance ? "Car location suggestions" : undefined}
                className={cn(
                  !nativeCarsAppearance &&
                    "overflow-hidden rounded-[11px] border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]",
                )}
              >
                {visibleResults.map((item) => (
                  <LocationRow
                    key={item.id}
                    item={item}
                    selected={draft?.id === item.id}
                    nativeCarsAppearance={nativeCarsAppearance}
                    onSelect={() => select(item, requestClose)}
                  />
                ))}
              </div>
            ) : nativeCarsAppearance && !eligible ? (
              <p className="px-4 py-7 text-center text-sm font-medium text-slate-500">
                Start typing to find a location.
              </p>
            ) : searchCompleted &&
              trimmedQuery &&
              (!nativeCarsAppearance || eligible) ? (
              <p className="px-4 py-8 text-center text-sm font-medium text-slate-500">
                {text(
                  "carsSearch.noMatchingLocations",
                  nativeCarsAppearance
                    ? "No matching locations."
                    : "No matching locations found.",
                )}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </FlightMobilePickerShell>
  );
}
