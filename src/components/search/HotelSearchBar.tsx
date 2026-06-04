"use client";

import { type FormEvent, type KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ChevronDown,
  Minus,
  PencilLine,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { useRouteProgress } from "@/components/layout/RouteProgress";
import { useRegion } from "@/components/region/RegionProvider";
import { cn } from "@/lib/utils";

const parseIsoDate = (value: string) => {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;

  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const todayLocal = () => startOfLocalDay(new Date());

const isBeforeToday = (date: Date) =>
  startOfLocalDay(date).getTime() < todayLocal().getTime();

const addMonths = (date: Date, offset: number) =>
  new Date(date.getFullYear(), date.getMonth() + offset, 1);

const currentMonthStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

type MonthCell = {
  date: Date;
  isCurrentMonth: boolean;
};

const buildMonthCells = (monthDate: Date): MonthCell[] => {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startOffset = firstDay.getDay();
  const startDate = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1 - startOffset,
  );

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() + index,
    );

    return {
      date,
      isCurrentMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
};

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatShortDate = (value: string) => {
  if (!value) return "";

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
};

const clampCount = (value: string, min: number, max: number) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
};

const normalizeGuestCount = (value: string | number | undefined) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (Number.isNaN(parsed)) return 1;
  return Math.max(1, Math.min(12, parsed));
};

type HotelDestinationSuggestion = {
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

const normalizeCountryHint = (value: string | null | undefined) => {
  const countryCode = value?.trim().toUpperCase() || "";
  if (countryCode === "EU") return countryCode;
  return /^[A-Z]{2}$/.test(countryCode) ? countryCode : "";
};

const destinationKindLabels: Record<HotelDestinationSuggestion["kind"], string> = {
  city: "City",
  district: "Area",
  landmark: "Landmark",
  "airport-area": "Airport area",
};

export type HotelSearchBarProps = {
  initialDestination?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: string | number;
  initialRooms?: string | number;
  initialSort?: string | null;
  introLabel?: string;
  errorRole?: "alert" | "status";
  compact?: boolean;
  onOpenFilters?: () => void;
  className?: string;
};

export function HotelSearchBar({
  initialDestination = "",
  initialCheckIn = "",
  initialCheckOut = "",
  initialGuests = 1,
  initialRooms = "1",
  initialSort = null,
  introLabel = "Compare hotel options",
  errorRole,
  compact = false,
  onOpenFilters,
  className,
}: HotelSearchBarProps) {
  const router = useRouter();
  const { start: startRouteProgress } = useRouteProgress();
  const { selectedOption, detectedOption, hasUserSelectedRegion } = useRegion();
  const [destination, setDestination] = useState(initialDestination);
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [hotelAdultCount, setHotelAdultCount] = useState(() =>
    normalizeGuestCount(initialGuests),
  );
  const [hotelChildCount, setHotelChildCount] = useState(0);
  const [rooms, setRooms] = useState(String(initialRooms || "1"));
  const [hotelPetFriendly, setHotelPetFriendly] = useState(false);
  const [error, setError] = useState("");
  const [datesOpen, setDatesOpen] = useState(false);
  const [guestsRoomsOpen, setGuestsRoomsOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [destinationSuggestions, setDestinationSuggestions] = useState<HotelDestinationSuggestion[]>([]);
  const [destinationSuggestionsCountryHint, setDestinationSuggestionsCountryHint] = useState("");
  const [destinationSuggestionsOpen, setDestinationSuggestionsOpen] = useState(false);
  const [destinationSuggestionsLoading, setDestinationSuggestionsLoading] = useState(false);
  const [destinationHighlight, setDestinationHighlight] = useState(0);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const destinationWrapperRef = useRef<HTMLLabelElement>(null);
  const datesWrapperRef = useRef<HTMLDivElement>(null);
  const guestsRoomsWrapperRef = useRef<HTMLDivElement>(null);
  const [hotelVisibleMonthDate, setHotelVisibleMonthDate] = useState(() => {
    const parsedCheckIn = parseIsoDate(initialCheckIn);
    if (parsedCheckIn) {
      return new Date(parsedCheckIn.getFullYear(), parsedCheckIn.getMonth(), 1);
    }

    return currentMonthStart();
  });

  const dateSummary = useMemo(() => {
    const formattedCheckIn = formatShortDate(checkIn);
    const formattedCheckOut = formatShortDate(checkOut);

    if (!formattedCheckIn) {
      return "Check-in — Check-out";
    }

    if (formattedCheckOut) {
      return `${formattedCheckIn} — ${formattedCheckOut}`;
    }

    return formattedCheckIn;
  }, [checkIn, checkOut]);

  const totalHotelGuests = hotelAdultCount + hotelChildCount;

  const guestsRoomsSummary = useMemo(() => {
    const normalizedGuests = Math.max(1, Math.min(12, totalHotelGuests));
    const normalizedRooms = clampCount(rooms, 1, 6);

    return `${normalizedGuests} ${normalizedGuests === 1 ? "guest" : "guests"}, ${normalizedRooms} ${normalizedRooms === 1 ? "room" : "rooms"}`;
  }, [rooms, totalHotelGuests]);

  const mobileSearchSummary = useMemo(() => {
    const trimmedDestination = destination.trim() || "Destination";
    return `${trimmedDestination} · ${dateSummary} · ${guestsRoomsSummary}`;
  }, [dateSummary, destination, guestsRoomsSummary]);

  const checkInParsed = parseIsoDate(checkIn);
  const checkOutParsed = parseIsoDate(checkOut);
  const normalizedRooms = String(clampCount(rooms, 1, 6));
  const selectedCountryHint = hasUserSelectedRegion ? normalizeCountryHint(selectedOption.code) : "";
  const detectedCountryHint = normalizeCountryHint(detectedOption?.code);
  const activeCountryHint = selectedCountryHint || detectedCountryHint;
  const destinationQuery = destination.trim();
  const visibleDestinationSuggestions =
    destinationSuggestionsCountryHint === activeCountryHint ? destinationSuggestions : [];
  const shouldShowDestinationSuggestions =
    destinationSuggestionsOpen &&
    (destinationSuggestionsLoading || visibleDestinationSuggestions.length > 0 || destinationQuery.length >= 1);

  const hasActiveHotelSearch =
    destination.trim() !== "" ||
    checkIn !== "" ||
    checkOut !== "" ||
    hotelAdultCount !== 1 ||
    hotelChildCount !== 0 ||
    normalizedRooms !== "1" ||
    hotelPetFriendly ||
    error !== "";

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) return;

      if (!destinationWrapperRef.current?.contains(target)) {
        setDestinationSuggestionsOpen(false);
      }

      if (datesOpen && !datesWrapperRef.current?.contains(target)) {
        setDatesOpen(false);
      }

      if (guestsRoomsOpen && !guestsRoomsWrapperRef.current?.contains(target)) {
        setGuestsRoomsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      setDestinationSuggestionsOpen(false);
      setDatesOpen(false);
      setGuestsRoomsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [datesOpen, guestsRoomsOpen]);

  useEffect(() => {
    if (!destinationSuggestionsOpen) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setDestinationSuggestionsLoading(true);

      try {
        const params = new URLSearchParams({
          limit: "8",
        });

        if (destinationQuery.length >= 1) {
          params.set("q", destinationQuery);
        }

        if (selectedCountryHint) {
          params.set("countryCode", selectedCountryHint);
        }

        if (detectedCountryHint) {
          params.set("detectedCountryCode", detectedCountryHint);
        }

        if (typeof navigator !== "undefined" && navigator.language) {
          params.set("locale", navigator.language);
        }

        const response = await fetch(`/api/hotels/destinations?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load hotel destination suggestions");
        }

        const payload = (await response.json()) as HotelDestinationsApiResponse;
        const suggestions = Array.isArray(payload.suggestions)
          ? payload.suggestions
              .filter((suggestion) =>
                Boolean(suggestion?.id && suggestion?.name && suggestion?.country && suggestion?.searchValue),
              )
              .slice(0, 8)
          : [];

        setDestinationSuggestions(suggestions);
        setDestinationSuggestionsCountryHint(activeCountryHint);
        setDestinationHighlight(0);
      } catch {
        if (!controller.signal.aborted) {
          setDestinationSuggestions([]);
          setDestinationSuggestionsCountryHint(activeCountryHint);
        }
      } finally {
        if (!controller.signal.aborted) {
          setDestinationSuggestionsLoading(false);
        }
      }
    }, destinationQuery.length >= 1 ? 180 : 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeCountryHint, destinationQuery, destinationSuggestionsOpen, selectedCountryHint, detectedCountryHint]);


  const selectDestinationSuggestion = (suggestion: HotelDestinationSuggestion) => {
    setDestination(suggestion.searchValue);
    setDestinationSuggestionsOpen(false);
    setDestinationHighlight(0);
    setError("");
    window.requestAnimationFrame(() => destinationInputRef.current?.focus());
  };

  const handleDestinationKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setDestinationSuggestionsOpen(false);
      return;
    }

    if (!visibleDestinationSuggestions.length) {
      if (event.key === "ArrowDown") {
        setDestinationSuggestionsOpen(true);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setDestinationSuggestionsOpen(true);
      setDestinationHighlight((current) => (current + 1) % visibleDestinationSuggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setDestinationSuggestionsOpen(true);
      setDestinationHighlight(
        (current) => (current - 1 + visibleDestinationSuggestions.length) % visibleDestinationSuggestions.length,
      );
      return;
    }

    if (event.key === "Enter" && destinationSuggestionsOpen) {
      const highlightedSuggestion = visibleDestinationSuggestions[destinationHighlight];
      if (!highlightedSuggestion) return;

      event.preventDefault();
      selectDestinationSuggestion(highlightedSuggestion);
    }
  };

  const handleClearDestination = () => {
    setDestination("");
    setDestinationSuggestions([]);
    setDestinationSuggestionsCountryHint(activeCountryHint);
    setDestinationSuggestionsOpen(true);
    setDestinationHighlight(0);
    setError("");
    destinationInputRef.current?.focus();
  };

  const handleResetSearch = () => {
    setDestination("");
    setCheckIn("");
    setCheckOut("");
    setHotelAdultCount(1);
    setHotelChildCount(0);
    setRooms("1");
    setHotelPetFriendly(false);
    setError("");
    setDatesOpen(false);
    setGuestsRoomsOpen(false);
    setMobileSearchOpen(false);
    setDestinationSuggestions([]);
    setDestinationSuggestionsCountryHint(activeCountryHint);
    setDestinationSuggestionsOpen(false);
    setDestinationHighlight(0);
    setHotelVisibleMonthDate(currentMonthStart());
  };

  const handleToggleDates = () => {
    setDatesOpen((prev) => {
      const nextOpen = !prev;

      if (nextOpen) {
        setGuestsRoomsOpen(false);
      }

      return nextOpen;
    });
  };

  const handleToggleGuestsRooms = () => {
    setGuestsRoomsOpen((prev) => {
      const nextOpen = !prev;

      if (nextOpen) {
        setDatesOpen(false);
      }

      return nextOpen;
    });
  };

  const handleSelectHotelDate = (date: Date) => {
    if (isBeforeToday(date)) {
      return;
    }

    const selectedIso = toIsoDate(date);

    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(selectedIso);
      setCheckOut("");
      return;
    }

    if (selectedIso <= checkIn) {
      setCheckIn(selectedIso);
      setCheckOut("");
      return;
    }

    setCheckOut(selectedIso);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const trimmedDestination = destination.trim();
    const parsedRooms = Number.parseInt(rooms, 10);
    const normalizedGuests = Math.max(1, Math.min(12, totalHotelGuests));
    const normalizedRooms = Number.isNaN(parsedRooms)
      ? 1
      : Math.max(1, Math.min(6, parsedRooms));

    if (!trimmedDestination) {
      setError("Please enter a destination.");
      return;
    }

    setDestinationSuggestionsOpen(false);

    if (!checkIn) {
      setError("Please select a check-in date.");
      return;
    }

    if (!checkOut) {
      setError("Please select a check-out date.");
      return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      setError("Check-out must be after check-in.");
      return;
    }

    if (normalizedGuests < 1 || normalizedGuests > 12) {
      setError("Please select between 1 and 12 guests.");
      return;
    }

    if (normalizedRooms < 1 || normalizedRooms > 6) {
      setError("Please select between 1 and 6 rooms.");
      return;
    }

    const params = new URLSearchParams({
      destination: trimmedDestination,
      checkIn,
      checkOut,
      guests: String(normalizedGuests),
      rooms: String(normalizedRooms),
    });

    if (initialSort) {
      params.set("sort", initialSort);
    }

    setRooms(String(normalizedRooms));
    setError("");
    setMobileSearchOpen(false);
    setIsSubmitting(true);
    startRouteProgress();
    router.push(`/hotels/results?${params.toString()}`);
  };

  const fieldClassName = cn(
    "relative rounded-xl border border-slate-300 bg-white transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40",
    compact
      ? "min-h-[46px] px-2 py-0.5 sm:min-h-[54px] sm:px-3 sm:py-1.5 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0"
      : "min-h-[54px] px-3 py-1.5 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0",
  );
  const valueControlClassName = cn(
    "focus-ring w-full rounded-md border-0 bg-transparent px-0 outline-none transition-colors",
    compact
      ? "h-6 text-[15px] font-semibold text-slate-950 placeholder:text-slate-400 sm:h-8 sm:text-[16px] md:text-sm"
      : "h-8 text-[16px] text-slate-900 md:text-sm",
  );
  const fieldLabelClassName = cn(
    "block font-semibold uppercase",
    compact
      ? "text-[10px] leading-4 tracking-[0.08em] text-slate-500 sm:mb-1 sm:text-xs sm:tracking-wide sm:text-slate-600"
      : "mb-1 text-xs leading-4 tracking-wide text-slate-600",
  );

  return (
    <section
      className={cn(
        "mx-auto w-full",
        compact ? "max-w-full sm:max-w-5xl" : "max-w-[1040px] space-y-3",
        className,
      )}
    >
      {compact ? (
        <div className={cn("sm:hidden", mobileSearchOpen && "hidden")}>
          {onOpenFilters ? (
            <div className="mx-auto flex w-full max-w-3xl min-w-0 items-center gap-2 overflow-hidden">
              <button
                type="button"
                aria-label="Open filters"
                onClick={onOpenFilters}
                className="focus-ring inline-flex h-[52px] w-[56px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-1.5 text-[10px] font-semibold text-slate-800 shadow-[0_8px_18px_rgba(15,23,42,0.07)] transition hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="flex flex-col items-center justify-center gap-0.5">
                  <SlidersHorizontal size={15} />
                  <span>Filters</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMobileSearchOpen(true)}
                className="focus-ring flex h-[58px] min-w-0 max-w-full flex-1 items-center justify-between gap-2 overflow-hidden rounded-xl border border-slate-200 bg-white px-3 py-0 text-left shadow-[0_8px_18px_rgba(15,23,42,0.07)] transition hover:border-slate-300 hover:shadow-[0_10px_22px_rgba(15,23,42,0.09)]"
              >
                <span className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
                  <span className="block truncate text-[15px] font-semibold leading-5 text-slate-950">
                    {destination.trim() || "Destination"}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-medium leading-4 text-slate-600">
                    {dateSummary} · {guestsRoomsSummary}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
                >
                  <PencilLine size={16} />
                </span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-left shadow-[0_8px_18px_rgba(15,23,42,0.07)]"
            >
              <span className="block truncate text-sm font-semibold text-slate-950">
                {mobileSearchSummary}
              </span>
            </button>
          )}
        </div>
      ) : (
        <p className="px-1 text-sm font-medium text-slate-600">{introLabel}</p>
      )}
      <form
        onSubmit={handleSubmit}
        className={cn(
          compact ? "space-y-2 sm:block" : "space-y-4",
          compact && (mobileSearchOpen ? "block" : "hidden"),
        )}
        noValidate
      >
        {compact ? (
          <div className="flex items-center justify-between sm:hidden">
            <span className="text-sm font-semibold text-slate-500">
              Edit search
            </span>
            <button
              type="button"
              aria-label="Close search form"
              onClick={() => setMobileSearchOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-medium leading-none text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            >
              ×
            </button>
          </div>
        ) : null}
        <div
          className="overflow-visible rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_10px_28px_rgba(15,23,42,0.10)]"
        >
          <div
            className={cn(
              "grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:gap-0",
              compact
                ? "lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1.45fr)_minmax(0,1.2fr)_112px]"
                : "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,1.15fr)_104px]",
            )}
          >
            <label ref={destinationWrapperRef} className={cn(fieldClassName, "lg:rounded-l-xl")}>
              <span className={fieldLabelClassName}>Destination</span>
              <span className="relative block">
                <input
                  ref={destinationInputRef}
                  type="text"
                  value={destination}
                  onChange={(event) => {
                    setDestination(event.target.value);
                    setDestinationSuggestionsOpen(true);
                    setDestinationHighlight(0);
                    setError("");
                  }}
                  onFocus={() => setDestinationSuggestionsOpen(true)}
                  onKeyDown={handleDestinationKeyDown}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={shouldShowDestinationSuggestions}
                  aria-controls="hotel-destination-suggestions"
                  aria-activedescendant={
                    shouldShowDestinationSuggestions && visibleDestinationSuggestions[destinationHighlight]
                      ? `hotel-destination-suggestion-${visibleDestinationSuggestions[destinationHighlight].id}`
                      : undefined
                  }
                  placeholder="City, area, or landmark"
                  className={cn(
                    valueControlClassName,
                    "pr-9 placeholder:text-slate-400",
                  )}
                  required
                />
                {destination ? (
                  <button
                    type="button"
                    onClick={handleClearDestination}
                    onMouseDown={(event) => event.preventDefault()}
                    aria-label="Clear destination"
                    className="focus-ring absolute right-0 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </span>
              {shouldShowDestinationSuggestions ? (
                <div
                  id="hotel-destination-suggestions"
                  role="listbox"
                  aria-label="Hotel destination suggestions"
                  className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-[min(68vh,360px)] w-[calc(100vw-24px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_42px_rgba(15,23,42,0.18)] sm:w-[min(92vw,420px)] lg:w-[min(42vw,440px)]"
                >
                  {destinationSuggestionsLoading ? (
                    <div className="px-3 py-2.5 text-sm font-medium text-slate-500">
                      Finding destinations…
                    </div>
                  ) : visibleDestinationSuggestions.length ? (
                    visibleDestinationSuggestions.map((suggestion, index) => {
                      const isActive = destinationHighlight === index;
                      const detail = [suggestion.region, suggestion.country]
                        .filter(Boolean)
                        .join(", ");

                      return (
                        <button
                          key={suggestion.id}
                          id={`hotel-destination-suggestion-${suggestion.id}`}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onClick={() => selectDestinationSuggestion(suggestion)}
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setDestinationHighlight(index)}
                          className={cn(
                            "flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                            isActive ? "bg-indigo-50" : "hover:bg-slate-50",
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-950">
                              {suggestion.name}
                            </span>
                            <span className="mt-0.5 block truncate text-xs font-medium text-slate-600">
                              {detail || suggestion.country}
                            </span>
                          </span>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                            {destinationKindLabels[suggestion.kind]}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-2.5 text-sm font-medium text-slate-500">
                      No matching destinations yet.
                    </div>
                  )}
                </div>
              ) : null}
            </label>

            <div ref={datesWrapperRef} className={fieldClassName}>
              <span className={fieldLabelClassName}>Travel dates</span>
              <button
                type="button"
                onClick={handleToggleDates}
                aria-expanded={datesOpen}
                aria-haspopup="dialog"
                aria-label="Choose travel dates"
                className={cn(
                  valueControlClassName,
                  "flex items-center gap-1.5 text-left",
                )}
              >
                <Calendar
                  size={16}
                  className={cn(
                    "shrink-0",
                    compact ? "text-indigo-700" : "text-slate-500",
                  )}
                />
                <span className="truncate">{dateSummary}</span>
              </button>
              {datesOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-[200] w-full rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_20px_45px_rgba(15,23,42,0.16)] sm:right-auto sm:w-[min(92vw,620px)] sm:p-4">
                  <p className="mb-3 text-base font-semibold text-slate-900">
                    Choose travel dates
                  </p>
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      type="button"
                      aria-label="Previous month"
                      onClick={() =>
                        setHotelVisibleMonthDate((prev) => addMonths(prev, -1))
                      }
                      className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      aria-label="Next month"
                      onClick={() =>
                        setHotelVisibleMonthDate((prev) => addMonths(prev, 1))
                      }
                      className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                    {[0, 1].map((monthOffset) => {
                      const monthDate = addMonths(
                        hotelVisibleMonthDate,
                        monthOffset,
                      );
                      const cells = buildMonthCells(monthDate);

                      return (
                        <div key={monthOffset}>
                          <p className="mb-1.5 text-center text-sm font-semibold text-slate-800">
                            {monthDate.toLocaleDateString("en-US", {
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                          <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-600">
                            {weekdays.map((weekday) => (
                              <span key={weekday}>{weekday}</span>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {cells.map((cell) => {
                              const day = cell.date;
                              const iso = toIsoDate(day);
                              const isCheckIn = iso === checkIn;
                              const isCheckOut = iso === checkOut;
                              const isPastDate = isBeforeToday(day);
                              const isInRange = !!(
                                checkInParsed &&
                                checkOutParsed &&
                                !isPastDate &&
                                day > checkInParsed &&
                                day < checkOutParsed
                              );

                              if (!cell.isCurrentMonth) {
                                return (
                                  <span
                                    key={`placeholder-${iso}`}
                                    aria-hidden="true"
                                    className="h-8 w-8 justify-self-center"
                                  />
                                );
                              }

                              return (
                                <button
                                  key={iso}
                                  type="button"
                                  aria-label={`Select ${day.toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "long",
                                      day: "numeric",
                                      year: "numeric",
                                    },
                                  )}`}
                                  onClick={() => handleSelectHotelDate(day)}
                                  disabled={isPastDate}
                                  className={`focus-ring flex h-8 w-8 items-center justify-center justify-self-center rounded-full text-sm transition-colors disabled:cursor-not-allowed ${
                                    isPastDate
                                      ? "text-slate-300 hover:bg-transparent"
                                      : "text-slate-900 hover:bg-indigo-50"
                                  } ${
                                    isInRange
                                      ? "rounded-md bg-indigo-100 text-indigo-900 hover:bg-indigo-100"
                                      : ""
                                  } ${
                                    isCheckIn || isCheckOut
                                      ? "bg-indigo-700 text-white hover:bg-indigo-700"
                                      : ""
                                  }`}
                                >
                                  {day.getDate()}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setCheckIn("");
                        setCheckOut("");
                      }}
                      className="focus-ring rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setDatesOpen(false)}
                      className="focus-ring rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div ref={guestsRoomsWrapperRef} className={fieldClassName}>
              <span className={fieldLabelClassName}>Guests</span>
              <button
                type="button"
                onClick={handleToggleGuestsRooms}
                aria-expanded={guestsRoomsOpen}
                aria-haspopup="dialog"
                aria-label="Choose guests and rooms"
                className={cn(
                  valueControlClassName,
                  "flex items-center justify-between gap-1.5 text-left",
                )}
              >
                <span className="truncate">{guestsRoomsSummary}</span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-slate-500 transition-transform ${
                    guestsRoomsOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {guestsRoomsOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 w-[calc(100vw-24px)] max-w-[330px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-[0_14px_32px_rgba(15,23,42,0.14)] max-sm:max-h-[min(70vh,360px)] sm:right-auto sm:w-[min(92vw,320px)] sm:max-w-[320px]">
                  <div className="space-y-3">
                    {[
                      {
                        key: "adults",
                        label: "Adults",
                        value: hotelAdultCount,
                        min: 1,
                        max: 12 - hotelChildCount,
                        onDecrement: () =>
                          setHotelAdultCount((prev) => Math.max(1, prev - 1)),
                        onIncrement: () =>
                          setHotelAdultCount((prev) =>
                            Math.min(12 - hotelChildCount, prev + 1),
                          ),
                      },
                      {
                        key: "children",
                        label: "Children",
                        value: hotelChildCount,
                        min: 0,
                        max: 12 - hotelAdultCount,
                        onDecrement: () =>
                          setHotelChildCount((prev) => Math.max(0, prev - 1)),
                        onIncrement: () =>
                          setHotelChildCount((prev) =>
                            Math.min(12 - hotelAdultCount, prev + 1),
                          ),
                      },
                      {
                        key: "rooms",
                        label: "Rooms",
                        value: clampCount(rooms, 1, 6),
                        min: 1,
                        max: 6,
                        onDecrement: () =>
                          setRooms((prev) =>
                            String(Math.max(1, clampCount(prev, 1, 6) - 1)),
                          ),
                        onIncrement: () =>
                          setRooms((prev) =>
                            String(Math.min(6, clampCount(prev, 1, 6) + 1)),
                          ),
                      },
                    ].map((row) => {
                      const canDecrement = row.value > row.min;
                      const canIncrement = row.value < row.max;

                      return (
                        <div
                          key={row.key}
                          className="flex items-center justify-between gap-2.5"
                        >
                          <span className="text-sm font-semibold text-slate-900">
                            {row.label}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={row.onDecrement}
                              disabled={!canDecrement}
                              className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="min-w-6 text-center text-sm font-semibold text-slate-900">
                              {row.value}
                            </span>
                            <button
                              type="button"
                              onClick={row.onIncrement}
                              disabled={!canIncrement}
                              className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="border-t border-slate-200 pt-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Pet-friendly
                          </p>
                          <p className="pr-2 text-xs leading-5 text-slate-600">
                            Only show stays that allow pets
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={hotelPetFriendly}
                          aria-label="Toggle pet-friendly stays"
                          onClick={() => setHotelPetFriendly((prev) => !prev)}
                          className={`focus-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
                            hotelPetFriendly
                              ? "border-indigo-600 bg-indigo-600"
                              : "border-slate-300 bg-slate-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                              hotelPetFriendly
                                ? "translate-x-5"
                                : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div
              className={cn(
                "sm:col-span-2 lg:col-span-1 lg:self-stretch",
                compact ? "sm:min-h-[54px]" : "lg:min-h-[54px]",
              )}
            >
              <button
                type="submit"
                className={cn(
                  "w-full rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-700/20 disabled:cursor-not-allowed disabled:opacity-75 lg:h-full lg:self-stretch lg:rounded-r-xl lg:border lg:border-l-0 lg:border-indigo-600/20",
                  compact
                    ? "h-12 shadow-lg sm:min-h-[54px] lg:min-w-[112px] lg:rounded-l-none"
                    : "h-12 lg:min-h-[54px] lg:rounded-none",
                )}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? "Searching hotels..." : "Search"}
              </button>
            </div>
          </div>
        </div>

        {hasActiveHotelSearch ? (
          <div
            className={cn(
              "flex justify-end px-1",
              compact && "mt-2 hidden sm:flex",
            )}
          >
            <button
              type="button"
              onClick={handleResetSearch}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Clear all
            </button>
          </div>
        ) : null}

        {error ? (
          <p
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            role={errorRole}
          >
            {error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
