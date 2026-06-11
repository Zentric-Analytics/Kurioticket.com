"use client";

import React, {
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { Calendar, ChevronDown, Minus, Plane, Plus, X } from "lucide-react";

import { useRouteProgress } from "@/components/layout/RouteProgress";
import { useLocale } from "@/components/layout/LocaleProvider";
import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
import { MobileAirportPicker } from "@/components/search/MobileAirportPicker";
import { Button } from "@/components/ui/Button";
import { type AirportOption, formatAirportLabel } from "@/data/airports";
import {
  applyDefaultOrigin,
  canApplyDefaultOrigin,
  markOriginManualInput,
  type OriginFieldState,
} from "@/lib/flights/defaultOrigin";
import { translations as enTranslations } from "@/lib/i18n/en";
import { cn } from "@/lib/utils";

type TripType = "round-trip" | "one-way";
type CabinClass = "economy" | "business" | "first";
type AirportField = "origin" | "destination";

type PlacesApiResponse = {
  suggestions?: AirportOption[];
  defaultOriginAirport?: AirportOption | null;
};

type LocationApiResponse = {
  source?: "ipinfo-lite" | "fallback";
  countryCode?: string | null;
};

type MonthCell = {
  date: Date;
  isCurrentMonth: boolean;
};

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const normalizeSuggestionText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();

const normalizeCountryHint = (value: string | null | undefined) => {
  const countryCode = value?.trim().toUpperCase() || "";
  return /^[A-Z]{2}$/.test(countryCode) ? countryCode : "";
};

const dedupeSuggestions = (suggestions: AirportOption[]) => {
  const seenCodes = new Set<string>();
  const seenNames = new Set<string>();
  const deduped: AirportOption[] = [];

  for (const suggestion of suggestions) {
    const codeKey = suggestion.code.trim().toUpperCase();
    if (!codeKey || seenCodes.has(codeKey)) continue;

    const nameKey = `${normalizeSuggestionText(suggestion.city)}|${normalizeSuggestionText(suggestion.airport)}`;
    if (seenNames.has(nameKey)) continue;

    seenCodes.add(codeKey);
    seenNames.add(nameKey);
    deduped.push(suggestion);
  }

  return deduped;
};

const normalizeCabinClass = (value: string): CabinClass => {
  if (value === "business" || value === "first") return value;
  return "economy";
};

const parseIsoDate = (value: string) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  return Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
    ? null
    : parsed;
};

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addMonths = (date: Date, offset: number) =>
  new Date(date.getFullYear(), date.getMonth() + offset, 1);

const buildMonthCells = (monthDate: Date) => {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startOffset = firstDay.getDay();
  const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() + index,
    );

    return {
      date,
      isCurrentMonth: date.getMonth() === monthDate.getMonth(),
    } satisfies MonthCell;
  });
};

const formatShortDate = (isoDate: string) => {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsed);
};

export function StandaloneFlightSearchForm() {
  const { t: dictionary } = useLocale();
  const t = useCallback(
    (key: string) => dictionary[key] ?? enTranslations[key] ?? "",
    [dictionary],
  );
  const airportPickerLabels = useMemo(
    () => ({
      clear: t("clear"),
      done: t("done"),
      chooseOrigin: t("chooseOrigin"),
      clearOrigin: t("clearOrigin"),
      clearDestination: t("clearDestination"),
      searchAirportsAndCities: t("searchAirportsAndCities"),
      searchAirportsOrCities: t("searchAirportsOrCities"),
      startTypingCityOrAirport: t("startTypingCityOrAirport"),
      searchingAirportsAndCities: t("searchingAirportsAndCities"),
      noMatchingAirportsOrCities: t("noMatchingAirportsOrCities"),
    }),
    [t],
  );
  const router = useRouter();
  const { start: startRouteProgress } = useRouteProgress();

  const originWrapRef = useRef<HTMLDivElement>(null);
  const originInputRef = useRef<HTMLInputElement>(null);
  const originMobileLauncherRef = useRef<HTMLButtonElement>(null);
  const destinationWrapRef = useRef<HTMLDivElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const destinationMobileLauncherRef = useRef<HTMLButtonElement>(null);
  const dateWrapRef = useRef<HTMLDivElement>(null);
  const datesMobileLauncherRef = useRef<HTMLButtonElement>(null);
  const travelersWrapRef = useRef<HTMLDivElement>(null);
  const travelersLauncherRef = useRef<HTMLButtonElement>(null);

  const [tripType, setTripType] = useState<TripType>("round-trip");
  const [originState, setOriginState] = useState<OriginFieldState>({
    input: "",
    code: "",
    source: "empty",
    userInteracted: false,
  });
  const origin = originState.input;
  const originCode = originState.code;
  const [destination, setDestination] = useState("");
  const [destinationCode, setDestinationCode] = useState("");
  const [originOpen, setOriginOpen] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [activeMobileAirportPicker, setActiveMobileAirportPicker] = useState<AirportField | null>(null);
  const [originHighlight, setOriginHighlight] = useState(0);
  const [destinationHighlight, setDestinationHighlight] = useState(0);
  const [originSuggestions, setOriginSuggestions] = useState<AirportOption[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<AirportOption[]>([]);
  const [originLoading, setOriginLoading] = useState(false);
  const [destinationLoading, setDestinationLoading] = useState(false);
  const [countryHint, setCountryHint] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [datesOpen, setDatesOpen] = useState(false);
  const [visibleMonthDate, setVisibleMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [infantCount, setInfantCount] = useState(0);
  const [draftAdultCount, setDraftAdultCount] = useState(1);
  const [draftChildCount, setDraftChildCount] = useState(0);
  const [draftInfantCount, setDraftInfantCount] = useState(0);
  const [cabinClass, setCabinClass] = useState<CabinClass>("economy");
  const [draftCabinClass, setDraftCabinClass] = useState<CabinClass>("economy");
  const [travelersOpen, setTravelersOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const originQuery = origin.trim();
  const destinationQuery = destination.trim();
  const visibleOriginSuggestions = originQuery.length >= 2 ? originSuggestions : [];
  const visibleDestinationSuggestions = destinationQuery.length >= 2 ? destinationSuggestions : [];
  const todayLocal = useMemo(() => startOfLocalDay(new Date()), []);
  const departureParsed = parseIsoDate(departureDate);
  const returnParsed = parseIsoDate(returnDate);

  const isBeforeToday = useCallback(
    (date: Date) => startOfLocalDay(date).getTime() < todayLocal.getTime(),
    [todayLocal],
  );

  const isValidFlightDate = useCallback(
    (value: string) => {
      const parsed = parseIsoDate(value);
      return Boolean(parsed && !isBeforeToday(parsed));
    },
    [isBeforeToday],
  );

  const isReturnRangeValid =
    tripType !== "round-trip" ||
    (isValidFlightDate(returnDate) && isValidFlightDate(departureDate) && returnDate >= departureDate);

  const isSearchDisabled =
    isSubmitting ||
    !origin.trim() ||
    !destination.trim() ||
    !isValidFlightDate(departureDate) ||
    !isReturnRangeValid;

  const dateSummary = useMemo(() => {
    const departureSummary = formatShortDate(departureDate);
    const returnSummary = formatShortDate(returnDate);

    if (!departureSummary) return t("travelDates");
    if (tripType === "round-trip" && returnSummary) return `${departureSummary} — ${returnSummary}`;
    return departureSummary;
  }, [departureDate, returnDate, tripType, t]);

  const cabinClassLabel =
    cabinClass === "business" ? t("business") : cabinClass === "first" ? t("first") : t("economy");
  const travelerCount = adultCount + childCount + infantCount;
  const travelerSummary = useMemo(() => {
    const parts: string[] = [];
    if (adultCount > 0) parts.push(`${adultCount} ${adultCount === 1 ? t("adultSingular") : t("adultPlural")}`);
    if (childCount > 0) parts.push(`${childCount} ${childCount === 1 ? t("childSingular") : t("childPlural")}`);
    if (infantCount > 0) parts.push(`${infantCount} ${infantCount === 1 ? t("infantSingular") : t("infantPlural")}`);

    return `${parts.length ? parts.join(", ") : `${travelerCount} ${travelerCount === 1 ? t("travelerSingular") : t("travelerPlural")}`}, ${cabinClassLabel}`;
  }, [adultCount, cabinClassLabel, childCount, infantCount, travelerCount, t]);

  const buildPlacesUrl = useCallback(
    (query: string, context: AirportField, requestDefault = false) => {
      const params = new URLSearchParams();
      if (query.length >= 2) params.set("q", query);
      if (requestDefault) params.set("default", "true");
      params.set("context", context);
      if (context === "origin" && countryHint) params.set("countryCode", countryHint);
      if (typeof navigator !== "undefined" && navigator.language) params.set("locale", navigator.language);

      return `/api/flights/places?${params.toString()}`;
    },
    [countryHint],
  );

  useEffect(() => {
    const controller = new AbortController();

    const loadLocationCountryHint = async () => {
      try {
        const response = await fetch("/api/location", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as LocationApiResponse;
        setCountryHint(payload.source === "ipinfo-lite" ? normalizeCountryHint(payload.countryCode) : "");
      } catch {
        // Airport suggestions still work without a country hint.
      }
    };

    void loadLocationCountryHint();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!canApplyDefaultOrigin(originState)) return;

    const controller = new AbortController();

    const loadDefaultOrigin = async () => {
      try {
        const response = await fetch(buildPlacesUrl("", "origin", true), {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as PlacesApiResponse;
        const defaultAirport = payload.defaultOriginAirport ?? null;
        setOriginState((current) => applyDefaultOrigin(current, defaultAirport));
        if (Array.isArray(payload.suggestions)) {
          setOriginSuggestions(
            dedupeSuggestions(payload.suggestions)
              .filter((item) => !!item?.code && !!item?.city && !!item?.airport)
              .slice(0, 7),
          );
        }
      } catch {
        // The search form keeps its existing empty origin behavior if defaults are unavailable.
      }
    };

    void loadDefaultOrigin();

    return () => controller.abort();
  }, [buildPlacesUrl, originState]);

  useAirportSuggestions({
    query: origin,
    context: "origin",
    buildPlacesUrl,
    setLoading: setOriginLoading,
    setSuggestions: setOriginSuggestions,
  });
  useAirportSuggestions({
    query: destination,
    context: "destination",
    buildPlacesUrl,
    setLoading: setDestinationLoading,
    setSuggestions: setDestinationSuggestions,
  });

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const eventTarget = event.target as Node;
      if (eventTarget instanceof Element && eventTarget.closest("[data-flight-mobile-picker-shell]")) return;

      if (!originWrapRef.current?.contains(eventTarget)) setOriginOpen(false);
      if (!destinationWrapRef.current?.contains(eventTarget)) setDestinationOpen(false);
      if (!dateWrapRef.current?.contains(eventTarget)) setDatesOpen(false);
      if (!travelersWrapRef.current?.contains(eventTarget)) setTravelersOpen(false);
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOriginOpen(false);
      setDestinationOpen(false);
      setDatesOpen(false);
      setTravelersOpen(false);
      setActiveMobileAirportPicker(null);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const openTravelers = () => {
    setDraftAdultCount(adultCount);
    setDraftChildCount(childCount);
    setDraftInfantCount(infantCount);
    setDraftCabinClass(cabinClass);
    setTravelersOpen(true);
  };

  const closeTravelers = () => {
    setDraftAdultCount(adultCount);
    setDraftChildCount(childCount);
    setDraftInfantCount(infantCount);
    setDraftCabinClass(cabinClass);
    setTravelersOpen(false);
  };

  const applyTravelersDraft = () => {
    const normalizedAdults = Math.max(1, Math.min(9, draftAdultCount));
    const normalizedChildren = Math.max(0, Math.min(9 - normalizedAdults, draftChildCount));
    const normalizedInfants = Math.max(
      0,
      Math.min(normalizedAdults, Math.min(9 - normalizedAdults - normalizedChildren, draftInfantCount)),
    );

    setAdultCount(normalizedAdults);
    setChildCount(normalizedChildren);
    setInfantCount(normalizedInfants);
    setCabinClass(normalizeCabinClass(draftCabinClass));
    setTravelersOpen(false);
  };

  const selectAirport = (field: AirportField, option: AirportOption) => {
    if (field === "origin") {
      setOriginState((current) => markOriginManualInput(current, formatAirportLabel(option), option.code));
      setOriginOpen(false);
    } else {
      setDestination(formatAirportLabel(option));
      setDestinationCode(option.code);
      setDestinationOpen(false);
    }
    setActiveMobileAirportPicker(null);
  };

  const clearAirport = (field: AirportField) => {
    if (field === "origin") {
      setOriginState((current) => markOriginManualInput(current, ""));
      setOriginSuggestions([]);
      setOriginLoading(false);
      setOriginOpen(false);
      setOriginHighlight(0);
      if (!activeMobileAirportPicker) window.requestAnimationFrame(() => originInputRef.current?.focus());
    } else {
      setDestination("");
      setDestinationCode("");
      setDestinationSuggestions([]);
      setDestinationLoading(false);
      setDestinationOpen(false);
      setDestinationHighlight(0);
      if (!activeMobileAirportPicker) window.requestAnimationFrame(() => destinationInputRef.current?.focus());
    }
  };

  const onAirportKeyNav = (event: ReactKeyboardEvent<HTMLInputElement>, field: AirportField) => {
    const list = field === "origin" ? visibleOriginSuggestions : visibleDestinationSuggestions;
    const active = field === "origin" ? originHighlight : destinationHighlight;
    const setActive = field === "origin" ? setOriginHighlight : setDestinationHighlight;
    const open = field === "origin" ? originOpen : destinationOpen;
    const setOpen = field === "origin" ? setOriginOpen : setDestinationOpen;

    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (!list.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((active + 1) % list.length);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive((active - 1 + list.length) % list.length);
    }

    if (event.key === "Enter" && open) {
      event.preventDefault();
      selectAirport(field, list[active]);
    }
  };

  const onSelectDate = (date: Date) => {
    if (isBeforeToday(date)) return;

    const selectedIso = toIsoDate(date);

    if (tripType === "one-way") {
      setDepartureDate(selectedIso);
      setReturnDate("");
      return;
    }

    if (!departureDate || returnDate) {
      setDepartureDate(selectedIso);
      setReturnDate("");
      return;
    }

    if (selectedIso < departureDate) {
      setDepartureDate(selectedIso);
      setReturnDate("");
      return;
    }

    setReturnDate(selectedIso);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedDeparture = parseIsoDate(departureDate);
    const parsedReturn = parseIsoDate(returnDate);
    const hasInvalidReturn =
      tripType === "round-trip" &&
      (!parsedReturn || isBeforeToday(parsedReturn) || Boolean(parsedDeparture && parsedReturn < parsedDeparture));

    if (isSearchDisabled || !parsedDeparture || isBeforeToday(parsedDeparture) || hasInvalidReturn) return;

    const normalizedAdults = Math.max(1, Math.min(9, adultCount));
    const normalizedChildren = Math.max(0, Math.min(9 - normalizedAdults, childCount));
    const normalizedInfants = Math.max(
      0,
      Math.min(normalizedAdults, Math.min(9 - normalizedAdults - normalizedChildren, infantCount)),
    );
    const normalizedTravelers = normalizedAdults + normalizedChildren + normalizedInfants;
    const params = new URLSearchParams({
      tripType,
      origin: originCode || origin.trim(),
      destination: destinationCode || destination.trim(),
      departureDate,
      adults: String(normalizedAdults),
      children: String(normalizedChildren),
      infants: String(normalizedInfants),
      travelers: String(normalizedTravelers),
      cabinClass: normalizeCabinClass(cabinClass),
    });

    if (tripType === "round-trip") params.set("returnDate", returnDate);

    setIsSubmitting(true);
    startRouteProgress();
    router.push(`/flights/results?${params.toString()}`);
  };

  const renderAirportSuggestions = (field: AirportField) => {
    const suggestions = field === "origin" ? visibleOriginSuggestions : visibleDestinationSuggestions;
    const query = field === "origin" ? originQuery : destinationQuery;
    const loading = field === "origin" ? originLoading : destinationLoading;
    const active = field === "origin" ? originHighlight : destinationHighlight;

    if (query.length < 2) return null;

    return (
      <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_36px_rgba(15,23,42,0.14)] sm:block">
        {loading ? (
          <p className="px-3 py-4 text-sm font-medium text-slate-500">{t("searchingAirportsAndCities")}</p>
        ) : suggestions.length ? (
          <div className="grid gap-1">
            {suggestions.map((option, index) => (
              <button
                key={`${field}-${option.code}-${option.airport}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectAirport(field, option)}
                className={cn(
                  "focus-ring rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-indigo-50",
                  active === index && "bg-indigo-50",
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-extrabold text-slate-950">{option.city}</span>
                    <span className="block truncate text-xs font-medium text-slate-600">{option.airport}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-extrabold text-indigo-700">
                    {option.code}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="px-3 py-4 text-sm font-medium text-slate-500">{t("noMatchingAirportsOrCities")}</p>
        )}
      </div>
    );
  };

  const renderDateCalendar = (compact = false) => (
    <div className={cn("mx-auto w-full max-w-2xl rounded-3xl bg-white shadow-sm", compact ? "p-3" : "p-3 sm:p-4")}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setVisibleMonthDate((prev) => addMonths(prev, -1))}
          className="focus-ring rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Prev
        </button>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setVisibleMonthDate((prev) => addMonths(prev, 1))}
          className="focus-ring rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Next
        </button>
      </div>
      <div className={cn("grid grid-cols-1 gap-4", compact ? "" : "md:grid-cols-2")}>
        {[0, 1].map((monthOffset) => {
          const monthDate = addMonths(visibleMonthDate, monthOffset);
          const cells = buildMonthCells(monthDate);

          return (
            <div key={`${monthDate.toISOString()}-${monthOffset}`}>
              <p className="mb-2 text-center text-sm font-black text-slate-900">
                {monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
              <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-500">
                {weekdays.map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((cell) => {
                  const day = cell.date;
                  const iso = toIsoDate(day);
                  const isDeparture = iso === departureDate;
                  const isReturn = iso === returnDate;
                  const isDisabledDate = isBeforeToday(day);
                  const isInRange = Boolean(
                    departureParsed && returnParsed && !isDisabledDate && day > departureParsed && day < returnParsed,
                  );

                  if (!cell.isCurrentMonth) {
                    return (
                      <span
                        key={`placeholder-${iso}`}
                        aria-hidden="true"
                        className="h-9 w-9 justify-self-center min-[390px]:h-10 min-[390px]:w-10"
                      />
                    );
                  }

                  return (
                    <button
                      key={iso}
                      type="button"
                      aria-label={`Select ${day.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}`}
                      onClick={() => onSelectDate(day)}
                      disabled={isDisabledDate}
                      aria-disabled={isDisabledDate}
                      className={cn(
                        "focus-ring flex h-9 w-9 items-center justify-center justify-self-center rounded-full text-sm font-semibold transition-colors disabled:cursor-not-allowed min-[390px]:h-10 min-[390px]:w-10",
                        isDisabledDate ? "text-slate-300" : "text-slate-900 hover:bg-indigo-50",
                        isInRange && "rounded-md bg-indigo-100 text-indigo-900 hover:bg-indigo-100",
                        (isDeparture || isReturn) && "bg-indigo-700 text-white hover:bg-indigo-700",
                      )}
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
    </div>
  );

  const renderTravelersPicker = () => (
    <div className="mx-auto w-full max-w-xl space-y-5 rounded-3xl bg-white p-4 shadow-sm">
      <div className="divide-y divide-slate-200">
        {[
          { key: "adults", label: t("adultPlural"), subtitle: "18+", count: draftAdultCount, min: 1 },
          { key: "children", label: t("childPlural"), subtitle: "2–17", count: draftChildCount, min: 0 },
          { key: "infants", label: t("infantPlural"), subtitle: "Under 2", count: draftInfantCount, min: 0 },
        ].map((row) => {
          const draftTravelerCount = draftAdultCount + draftChildCount + draftInfantCount;
          const canDecrement = row.count > row.min;
          const canIncrement = draftTravelerCount < 9 && (row.key !== "infants" || draftInfantCount < draftAdultCount);

          return (
            <div key={row.key} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <span>
                <span className="block text-base font-black text-slate-950">{row.label}</span>
                <span className="block text-sm leading-5 text-slate-600">{row.subtitle}</span>
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (row.key === "adults") {
                      const nextAdults = Math.max(1, draftAdultCount - 1);
                      setDraftAdultCount(nextAdults);
                      setDraftInfantCount((current) => Math.min(current, nextAdults));
                    }
                    if (row.key === "children") setDraftChildCount(Math.max(0, draftChildCount - 1));
                    if (row.key === "infants") setDraftInfantCount(Math.max(0, draftInfantCount - 1));
                  }}
                  disabled={!canDecrement}
                  className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="min-w-8 text-center text-base font-bold text-slate-950">{row.count}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (row.key === "adults") setDraftAdultCount((current) => Math.min(9, current + 1));
                    if (row.key === "children") setDraftChildCount((current) => Math.min(9, current + 1));
                    if (row.key === "infants") setDraftInfantCount((current) => Math.min(draftAdultCount, current + 1));
                  }}
                  disabled={!canIncrement}
                  className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-slate-200 pt-5">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-600">{t("cabinClass")}</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["economy", t("economy")],
            ["business", t("business")],
            ["first", t("first")],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setDraftCabinClass(normalizeCabinClass(value))}
              className={cn(
                "focus-ring min-h-11 rounded-xl border px-2 py-2 text-center text-sm font-bold transition-colors",
                draftCabinClass === value
                  ? "border-indigo-400 bg-indigo-50 text-indigo-900"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.10)] sm:p-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1 sm:inline-flex">
          {[
            ["round-trip", t("roundTrip")],
            ["one-way", t("oneWay")],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                const nextTripType = value as TripType;
                setTripType(nextTripType);
                if (nextTripType === "one-way") setReturnDate("");
              }}
              className={cn(
                "focus-ring inline-flex min-h-10 flex-1 items-center justify-center rounded-xl px-4 py-2 text-sm font-black transition-colors sm:flex-none",
                tripType === value
                  ? "bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-100"
                  : "text-slate-600 hover:bg-white/70 hover:text-slate-950",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.7fr)_minmax(170px,0.9fr)_minmax(165px,0.85fr)_156px] lg:gap-2">
          <AirportFieldControl
            ref={originWrapRef}
            inputRef={originInputRef}
            label={t("origin")}
            value={origin}
            placeholder={t("cityOrAirport")}
            open={originOpen || activeMobileAirportPicker === "origin"}
            onMobileOpen={() => setActiveMobileAirportPicker("origin")}
            onDesktopFocus={() => setOriginOpen(true)}
            onChange={(nextValue) => {
              setOriginState((current) => markOriginManualInput(current, nextValue));
              setOriginHighlight(0);
              if (nextValue.trim().length < 2) {
                setOriginSuggestions([]);
                setOriginLoading(false);
              }
            }}
            onClear={() => clearAirport("origin")}
            onKeyDown={(event) => onAirportKeyNav(event, "origin")}
            mobileLauncherRef={originMobileLauncherRef}
            desktopSuggestions={renderAirportSuggestions("origin")}
            className="lg:rounded-2xl"
          />

          <AirportFieldControl
            ref={destinationWrapRef}
            inputRef={destinationInputRef}
            label={t("destination")}
            value={destination}
            placeholder={t("cityOrAirport")}
            open={destinationOpen || activeMobileAirportPicker === "destination"}
            onMobileOpen={() => setActiveMobileAirportPicker("destination")}
            onDesktopFocus={() => setDestinationOpen(true)}
            onChange={(nextValue) => {
              setDestination(nextValue);
              setDestinationCode("");
              setDestinationHighlight(0);
              if (nextValue.trim().length < 2) {
                setDestinationSuggestions([]);
                setDestinationLoading(false);
              }
            }}
            onClear={() => clearAirport("destination")}
            onKeyDown={(event) => onAirportKeyNav(event, "destination")}
            mobileLauncherRef={destinationMobileLauncherRef}
            desktopSuggestions={renderAirportSuggestions("destination")}
            className="lg:rounded-2xl"
          />

          <div
            ref={dateWrapRef}
            className="relative min-h-[72px] rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-slate-300 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/15 lg:rounded-2xl"
          >
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-600">
              {t("travelDates")}
            </label>
            <button
              ref={datesMobileLauncherRef}
              type="button"
              aria-label={t("chooseTravelDates")}
              aria-expanded={datesOpen}
              aria-haspopup="dialog"
              onClick={() => setDatesOpen((prev) => !prev)}
              className="focus-ring flex min-h-9 w-full items-center justify-between gap-2 rounded-xl text-left text-base font-extrabold text-slate-950"
            >
              <span>{dateSummary}</span>
              <Calendar className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            </button>
            {datesOpen ? (
              <>
                <FlightMobilePickerShell
                  open={datesOpen}
                  title={t("chooseTravelDates")}
                  titleId="standalone-flight-mobile-dates-title"
                  launcherRef={datesMobileLauncherRef}
                  onClose={() => setDatesOpen(false)}
                  contentClassName="px-3 py-3"
                  footer={
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setDepartureDate("");
                          setReturnDate("");
                        }}
                        className="focus-ring rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        {t("clear")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDatesOpen(false)}
                        className="focus-ring rounded-xl bg-indigo-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
                      >
                        {t("done")}
                      </button>
                    </div>
                  }
                >
                  {renderDateCalendar(true)}
                </FlightMobilePickerShell>
                <div className="absolute left-0 top-[calc(100%+8px)] z-50 hidden w-[min(92vw,620px)] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_36px_rgba(15,23,42,0.14)] sm:block">
                  {renderDateCalendar(false)}
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDepartureDate("");
                        setReturnDate("");
                      }}
                      className="focus-ring rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      {t("clear")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDatesOpen(false)}
                      className="focus-ring rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                    >
                      {t("done")}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div
            ref={travelersWrapRef}
            className="relative min-h-[72px] rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-slate-300 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/15 lg:rounded-2xl"
          >
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-600">
              {t("travelers")}
            </label>
            <button
              ref={travelersLauncherRef}
              type="button"
              aria-expanded={travelersOpen}
              aria-haspopup="dialog"
              onClick={() => {
                if (travelersOpen) {
                  closeTravelers();
                  return;
                }
                openTravelers();
              }}
              className="focus-ring flex min-h-9 w-full items-center justify-between gap-2 rounded-xl text-left text-base font-extrabold text-slate-950"
            >
              <span className="truncate">{travelerSummary}</span>
              <ChevronDown
                className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", travelersOpen && "rotate-180")}
                aria-hidden="true"
              />
            </button>
            {travelersOpen ? (
              <>
                <FlightMobilePickerShell
                  open={travelersOpen}
                  title={t("travelers")}
                  titleId="standalone-flight-mobile-travelers-title"
                  launcherRef={travelersLauncherRef}
                  onClose={closeTravelers}
                  contentClassName="px-4 py-5"
                  footer={
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={applyTravelersDraft}
                        className="focus-ring rounded-xl bg-indigo-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
                      >
                        {t("done")}
                      </button>
                    </div>
                  }
                >
                  {renderTravelersPicker()}
                </FlightMobilePickerShell>
                <div className="absolute left-0 top-[calc(100%+8px)] z-50 hidden w-[min(92vw,360px)] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_36px_rgba(15,23,42,0.14)] sm:block">
                  {renderTravelersPicker()}
                  <div className="mt-3 flex justify-end border-t border-slate-200 pt-3">
                    <button
                      type="button"
                      onClick={applyTravelersDraft}
                      className="focus-ring rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
                    >
                      {t("done")}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={isSearchDisabled}
            aria-busy={isSubmitting}
            className="min-h-[58px] w-full whitespace-nowrap rounded-2xl bg-gradient-to-r from-indigo-700 to-violet-600 px-5 text-base font-black text-white shadow-lg shadow-indigo-700/20 hover:from-indigo-600 hover:to-violet-500 disabled:from-indigo-500 disabled:to-violet-500 lg:h-full"
          >
            <Plane className="mr-2 h-4 w-4" aria-hidden="true" />
            {isSubmitting ? t("searchingFlights") : t("searchFlights")}
          </Button>
        </div>

        <MobileAirportPicker
          open={activeMobileAirportPicker === "origin"}
          title={t("chooseOrigin")}
          inputId="standalone-flight-origin-mobile-search"
          value={origin}
          suggestions={visibleOriginSuggestions}
          isLoading={originQuery.length >= 2 && originLoading}
          launcherRef={originMobileLauncherRef}
          labels={airportPickerLabels}
          onChange={(nextValue) => {
            setOriginState((current) => markOriginManualInput(current, nextValue));
            setOriginHighlight(0);
            if (nextValue.trim().length < 2) {
              setOriginSuggestions([]);
              setOriginLoading(false);
            }
          }}
          onClear={() => clearAirport("origin")}
          onSelect={(option) => selectAirport("origin", option)}
          onClose={() => setActiveMobileAirportPicker(null)}
        />
        <MobileAirportPicker
          open={activeMobileAirportPicker === "destination"}
          title={t("chooseDestination")}
          inputId="standalone-flight-destination-mobile-search"
          value={destination}
          suggestions={visibleDestinationSuggestions}
          isLoading={destinationQuery.length >= 2 && destinationLoading}
          launcherRef={destinationMobileLauncherRef}
          labels={airportPickerLabels}
          onChange={(nextValue) => {
            setDestination(nextValue);
            setDestinationCode("");
            setDestinationHighlight(0);
            if (nextValue.trim().length < 2) {
              setDestinationSuggestions([]);
              setDestinationLoading(false);
            }
          }}
          onClear={() => clearAirport("destination")}
          onSelect={(option) => selectAirport("destination", option)}
          onClose={() => setActiveMobileAirportPicker(null)}
        />
      </form>
    </section>
  );
}

type AirportFieldControlProps = {
  label: string;
  value: string;
  placeholder: string;
  open: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  mobileLauncherRef: React.RefObject<HTMLButtonElement | null>;
  desktopSuggestions: React.ReactNode;
  className?: string;
  onMobileOpen: () => void;
  onDesktopFocus: () => void;
  onChange: (value: string) => void;
  onClear: () => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
};

const AirportFieldControl = React.forwardRef<HTMLDivElement, AirportFieldControlProps>(function AirportFieldControl(
  {
    label,
    value,
    placeholder,
    open,
    inputRef,
    mobileLauncherRef,
    desktopSuggestions,
    className,
    onMobileOpen,
    onDesktopFocus,
    onChange,
    onClear,
    onKeyDown,
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "relative min-h-[72px] rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-slate-300 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/15",
        className,
      )}
    >
      <label className="mb-1 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-600">
        {label}
      </label>
      <button
        ref={mobileLauncherRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={onMobileOpen}
        className="focus-ring flex min-h-9 w-full items-center justify-between gap-2 rounded-xl text-left text-base font-extrabold text-slate-950 sm:hidden"
      >
        <span className={cn("truncate", !value && "text-slate-400")}>{value || placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
      </button>
      <div className="relative hidden sm:block">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onFocus={onDesktopFocus}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="focus-ring h-9 w-full rounded-xl border-0 bg-transparent pr-9 text-base font-extrabold text-slate-950 outline-none placeholder:text-slate-400"
        />
        {value ? (
          <button
            type="button"
            aria-label={`Clear ${label.toLowerCase()}`}
            onClick={onClear}
            className="focus-ring absolute right-0 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {desktopSuggestions}
    </div>
  );
});

function useAirportSuggestions({
  query,
  context,
  buildPlacesUrl,
  setLoading,
  setSuggestions,
}: {
  query: string;
  context: AirportField;
  buildPlacesUrl: (query: string, context: AirportField, requestDefault?: boolean) => string;
  setLoading: (loading: boolean) => void;
  setSuggestions: (suggestions: AirportOption[]) => void;
}) {
  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(buildPlacesUrl(trimmedQuery, context), {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Failed to load suggestions");

        const payload = (await response.json()) as PlacesApiResponse;
        const suggestions = Array.isArray(payload.suggestions)
          ? dedupeSuggestions(payload.suggestions)
              .filter((item) => !!item?.code && !!item?.city && !!item?.airport)
              .slice(0, 7)
          : [];
        setSuggestions(suggestions);
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [buildPlacesUrl, context, query, setLoading, setSuggestions]);
}
