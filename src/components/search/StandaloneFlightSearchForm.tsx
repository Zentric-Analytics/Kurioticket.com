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

import {
  ArrowRightLeft,
  Calendar,
  ChevronDown,
  Minus,
  Plane,
  Plus,
  X,
} from "lucide-react";

import { useRouteProgress } from "@/components/layout/RouteProgress";
import { useLocale } from "@/components/layout/LocaleProvider";
import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
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

const normalizeFlightsCalendarLocale = (locale: string | null | undefined) => {
  const normalized = locale?.trim().replace("_", "-").toLowerCase() ?? "";

  if (normalized === "fr" || normalized.startsWith("fr-")) {
    return "fr-FR";
  }

  if (normalized === "es" || normalized.startsWith("es-")) {
    return "es-ES";
  }

  return "en-US";
};

const formatFlightsWeekdays = (locale: string) =>
  Array.from({ length: 7 }, (_, day) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
      new Date(2024, 0, 7 + day),
    ),
  );

const searchFieldShellClassName =
  "relative min-h-[54px] rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 sm:min-h-[62px] sm:rounded-2xl sm:border-slate-300 sm:bg-white sm:px-4 sm:py-2.5 sm:shadow-[0_4px_14px_rgba(15,23,42,0.06)] sm:hover:border-slate-400 sm:focus-within:border-indigo-500 sm:focus-within:bg-white sm:focus-within:ring-2 sm:focus-within:ring-indigo-500/25";
const searchFieldLabelClassName =
  "mb-1 block text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600 sm:text-[10px] sm:font-extrabold sm:tracking-[0.15em] sm:text-slate-600";
const searchFieldValueButtonClassName =
  "focus-ring flex h-8 w-full items-center justify-between gap-2 rounded-md text-left text-[16px] font-medium text-slate-900 outline-none transition-colors sm:h-7 sm:rounded-none sm:text-[15px] sm:font-extrabold sm:tracking-[-0.015em] sm:text-slate-950 sm:focus-visible:shadow-none";
const mobileDoneButtonClassName =
  "focus-ring min-h-11 rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-6 text-sm font-bold text-white shadow-md shadow-indigo-700/20 transition-colors hover:from-indigo-600 hover:to-violet-500 active:from-indigo-800 active:to-violet-700";

const normalizeSuggestionText = (value: string) =>
  value.normalize("NFKD").replace(/\p{M}/gu, "").trim().toLowerCase();

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
    } satisfies MonthCell;
  });
};

type StandaloneFlightSearchFormProps = {
  localizeCalendarLabels?: boolean;
};

export function StandaloneFlightSearchForm({
  localizeCalendarLabels = false,
}: StandaloneFlightSearchFormProps = {}) {
  const { t: dictionary, locale } = useLocale();
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
  const calendarLocale = useMemo(
    () =>
      normalizeFlightsCalendarLocale(localizeCalendarLabels ? locale : "en-us"),
    [localizeCalendarLabels, locale],
  );
  const monthYearFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(calendarLocale, {
        month: "long",
        year: "numeric",
      }),
    [calendarLocale],
  );
  const accessibleDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(calendarLocale, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [calendarLocale],
  );
  const shortDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(calendarLocale, {
        month: "short",
        day: "numeric",
      }),
    [calendarLocale],
  );
  const weekdays = useMemo(
    () => formatFlightsWeekdays(calendarLocale),
    [calendarLocale],
  );

  const router = useRouter();
  const { start: startRouteProgress } = useRouteProgress();

  const originWrapRef = useRef<HTMLDivElement>(null);
  const originInputRef = useRef<HTMLInputElement>(null);
  const originMobileLauncherRef = useRef<HTMLButtonElement>(null);
  const originMobilePickerInputRef = useRef<HTMLInputElement>(null);
  const destinationWrapRef = useRef<HTMLDivElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const destinationMobileLauncherRef = useRef<HTMLButtonElement>(null);
  const destinationMobilePickerInputRef = useRef<HTMLInputElement>(null);
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
  const [activeMobileAirportPicker, setActiveMobileAirportPicker] =
    useState<AirportField | null>(null);
  const [originHighlight, setOriginHighlight] = useState(0);
  const [destinationHighlight, setDestinationHighlight] = useState(0);
  const [originSuggestions, setOriginSuggestions] = useState<AirportOption[]>(
    [],
  );
  const [destinationSuggestions, setDestinationSuggestions] = useState<
    AirportOption[]
  >([]);
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
  const visibleOriginSuggestions =
    originQuery.length >= 2 ? originSuggestions : [];
  const visibleDestinationSuggestions =
    destinationQuery.length >= 2 ? destinationSuggestions : [];
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
    (isValidFlightDate(returnDate) &&
      isValidFlightDate(departureDate) &&
      returnDate >= departureDate);

  const isSearchDisabled =
    isSubmitting ||
    !origin.trim() ||
    !destination.trim() ||
    !isValidFlightDate(departureDate) ||
    !isReturnRangeValid;

  const dateSummary = useMemo(() => {
    const departureSummary = departureParsed
      ? shortDateFormatter.format(departureParsed)
      : "";
    const returnSummary = returnParsed
      ? shortDateFormatter.format(returnParsed)
      : "";

    if (!departureSummary) return t("travelDates");
    if (tripType === "round-trip" && returnSummary)
      return `${departureSummary} — ${returnSummary}`;
    return departureSummary;
  }, [departureParsed, returnParsed, shortDateFormatter, tripType, t]);

  const cabinClassLabel =
    cabinClass === "business"
      ? t("business")
      : cabinClass === "first"
        ? t("first")
        : t("economy");
  const travelerCount = adultCount + childCount + infantCount;
  const travelerSummary = useMemo(() => {
    const parts: string[] = [];
    if (adultCount > 0)
      parts.push(
        `${adultCount} ${adultCount === 1 ? t("adultSingular") : t("adultPlural")}`,
      );
    if (childCount > 0)
      parts.push(
        `${childCount} ${childCount === 1 ? t("childSingular") : t("childPlural")}`,
      );
    if (infantCount > 0)
      parts.push(
        `${infantCount} ${infantCount === 1 ? t("infantSingular") : t("infantPlural")}`,
      );

    return `${parts.length ? parts.join(", ") : `${travelerCount} ${travelerCount === 1 ? t("travelerSingular") : t("travelerPlural")}`}, ${cabinClassLabel}`;
  }, [adultCount, cabinClassLabel, childCount, infantCount, travelerCount, t]);

  const buildPlacesUrl = useCallback(
    (query: string, context: AirportField, requestDefault = false) => {
      const params = new URLSearchParams();
      if (query.length >= 2) params.set("q", query);
      if (requestDefault) params.set("default", "true");
      params.set("context", context);
      if (context === "origin" && countryHint)
        params.set("countryCode", countryHint);
      if (typeof navigator !== "undefined" && navigator.language)
        params.set("locale", navigator.language);

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
        setCountryHint(
          payload.source === "ipinfo-lite"
            ? normalizeCountryHint(payload.countryCode)
            : "",
        );
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
        setOriginState((current) =>
          applyDefaultOrigin(current, defaultAirport),
        );
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
    if (!activeMobileAirportPicker || typeof window === "undefined") return;

    const focusId = window.setTimeout(() => {
      const inputRef =
        activeMobileAirportPicker === "origin"
          ? originMobilePickerInputRef
          : destinationMobilePickerInputRef;

      inputRef.current?.focus();
      inputRef.current?.select();
    }, 80);

    return () => window.clearTimeout(focusId);
  }, [activeMobileAirportPicker]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const eventTarget = event.target as Node;
      if (
        eventTarget instanceof Element &&
        eventTarget.closest("[data-flight-mobile-picker-shell]")
      )
        return;

      if (!originWrapRef.current?.contains(eventTarget)) setOriginOpen(false);
      if (!destinationWrapRef.current?.contains(eventTarget))
        setDestinationOpen(false);
      if (!dateWrapRef.current?.contains(eventTarget)) setDatesOpen(false);
      if (!travelersWrapRef.current?.contains(eventTarget))
        setTravelersOpen(false);
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
    const normalizedCabinClass = normalizeCabinClass(cabinClass);
    setCabinClass(normalizedCabinClass);
    setDraftAdultCount(adultCount);
    setDraftChildCount(childCount);
    setDraftInfantCount(infantCount);
    setDraftCabinClass(normalizedCabinClass);
    setTravelersOpen(true);
  };

  const closeTravelers = () => {
    const normalizedCabinClass = normalizeCabinClass(cabinClass);
    setCabinClass(normalizedCabinClass);
    setDraftAdultCount(adultCount);
    setDraftChildCount(childCount);
    setDraftInfantCount(infantCount);
    setDraftCabinClass(normalizedCabinClass);
    setTravelersOpen(false);
  };

  const applyTravelersDraft = () => {
    const normalizedAdults = Math.max(1, Math.min(9, draftAdultCount));
    const normalizedChildren = Math.max(
      0,
      Math.min(9 - normalizedAdults, draftChildCount),
    );
    const normalizedInfants = Math.max(
      0,
      Math.min(
        normalizedAdults,
        Math.min(9 - normalizedAdults - normalizedChildren, draftInfantCount),
      ),
    );

    setAdultCount(normalizedAdults);
    setChildCount(normalizedChildren);
    setInfantCount(normalizedInfants);
    setCabinClass(normalizeCabinClass(draftCabinClass));
    setTravelersOpen(false);
  };

  const selectAirport = (field: AirportField, option: AirportOption) => {
    if (field === "origin") {
      setOriginState((current) =>
        markOriginManualInput(current, formatAirportLabel(option), option.code),
      );
      setOriginOpen(false);
    } else {
      setDestination(formatAirportLabel(option));
      setDestinationCode(option.code);
      setDestinationOpen(false);
    }
    setActiveMobileAirportPicker(null);
  };

  const swapAirports = () => {
    const nextOrigin = destination;
    const nextOriginCode = destinationCode;
    const nextDestination = origin;
    const nextDestinationCode = originCode;

    setOriginState((current) =>
      markOriginManualInput(current, nextOrigin, nextOriginCode),
    );
    setDestination(nextDestination);
    setDestinationCode(nextDestinationCode);
    setOriginOpen(false);
    setDestinationOpen(false);
    setActiveMobileAirportPicker(null);
    setOriginHighlight(0);
    setDestinationHighlight(0);
  };

  const clearAirport = (field: AirportField) => {
    if (field === "origin") {
      setOriginState((current) => markOriginManualInput(current, ""));
      setOriginSuggestions([]);
      setOriginLoading(false);
      setOriginOpen(false);
      setOriginHighlight(0);
      if (!activeMobileAirportPicker)
        window.requestAnimationFrame(() => originInputRef.current?.focus());
    } else {
      setDestination("");
      setDestinationCode("");
      setDestinationSuggestions([]);
      setDestinationLoading(false);
      setDestinationOpen(false);
      setDestinationHighlight(0);
      if (!activeMobileAirportPicker)
        window.requestAnimationFrame(() =>
          destinationInputRef.current?.focus(),
        );
    }
  };

  const onAirportKeyNav = (
    event: ReactKeyboardEvent<HTMLInputElement>,
    field: AirportField,
  ) => {
    const list =
      field === "origin"
        ? visibleOriginSuggestions
        : visibleDestinationSuggestions;
    const active = field === "origin" ? originHighlight : destinationHighlight;
    const setActive =
      field === "origin" ? setOriginHighlight : setDestinationHighlight;
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
      (!parsedReturn ||
        isBeforeToday(parsedReturn) ||
        Boolean(parsedDeparture && parsedReturn < parsedDeparture));

    if (
      isSearchDisabled ||
      !parsedDeparture ||
      isBeforeToday(parsedDeparture) ||
      hasInvalidReturn
    )
      return;

    const normalizedAdults = Math.max(1, Math.min(9, adultCount));
    const normalizedChildren = Math.max(
      0,
      Math.min(9 - normalizedAdults, childCount),
    );
    const normalizedInfants = Math.max(
      0,
      Math.min(
        normalizedAdults,
        Math.min(9 - normalizedAdults - normalizedChildren, infantCount),
      ),
    );
    const normalizedTravelers =
      normalizedAdults + normalizedChildren + normalizedInfants;
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

  const renderMobileAirportPicker = ({
    field,
    open,
    title,
    inputId,
    value,
    suggestions,
    isLoading,
    launcherRef,
    inputRef,
    onChange,
    onClear,
    onSelect,
    onClose,
  }: {
    field: AirportField;
    open: boolean;
    title: string;
    inputId: string;
    value: string;
    suggestions: AirportOption[];
    isLoading: boolean;
    launcherRef: React.RefObject<HTMLButtonElement | null>;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onChange: (value: string) => void;
    onClear: () => void;
    onSelect: (option: AirportOption) => void;
    onClose: () => void;
  }) => {
    if (!open) return null;

    const titleId = `${inputId}-title`;
    const query = value.trim();
    const clearLabel =
      field === "origin"
        ? airportPickerLabels.clearOrigin
        : airportPickerLabels.clearDestination;
    const focusInput = () => {
      window.requestAnimationFrame(() => inputRef.current?.focus());
    };

    return (
      <FlightMobilePickerShell
        open={open}
        title={title}
        titleId={titleId}
        launcherRef={launcherRef}
        onClose={onClose}
        contentClassName="bg-slate-50 px-4 py-5"
        footer={
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                onClear();
                focusInput();
              }}
              className="focus-ring min-h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              {airportPickerLabels.clear}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={mobileDoneButtonClassName}
            >
              {airportPickerLabels.done}
            </button>
          </div>
        }
      >
        <div className="mx-auto w-full max-w-xl space-y-5">
          <div className="space-y-2">
            <label
              className="block text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500"
              htmlFor={inputId}
            >
              {airportPickerLabels.searchAirportsAndCities}
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id={inputId}
                type="text"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={airportPickerLabels.searchAirportsOrCities}
                autoComplete="off"
                className="focus-ring h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-4 pr-12 text-base font-semibold text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
              />
              {value.trim() ? (
                <button
                  type="button"
                  aria-label={clearLabel}
                  onClick={() => {
                    onClear();
                    focusInput();
                  }}
                  className="focus-ring absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {query.length < 2 ? (
              <p className="px-5 py-8 text-center text-sm font-medium leading-6 text-slate-500">
                {airportPickerLabels.startTypingCityOrAirport}
              </p>
            ) : isLoading ? (
              <p className="px-5 py-8 text-center text-sm font-medium leading-6 text-slate-500">
                {airportPickerLabels.searchingAirportsAndCities}
              </p>
            ) : suggestions.length ? (
              suggestions.map((option) => (
                <button
                  key={`${option.code}-${option.airport}-${inputId}`}
                  type="button"
                  onClick={() => onSelect(option)}
                  className="focus-ring flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-slate-50 focus-visible:bg-slate-50"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                    aria-hidden="true"
                  >
                    <Plane className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-extrabold leading-5 tracking-tight text-slate-950">
                      {option.city}
                    </span>
                    <span className="mt-1 block truncate text-sm font-medium leading-5 text-slate-500">
                      {option.airport}
                      {option.country ? ` · ${option.country}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 pl-2 text-right text-sm font-extrabold tracking-[0.12em] text-slate-700">
                    {option.code}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-5 py-8 text-center text-sm font-medium leading-6 text-slate-500">
                {airportPickerLabels.noMatchingAirportsOrCities}
              </p>
            )}
          </div>
        </div>
      </FlightMobilePickerShell>
    );
  };

  const renderAirportSuggestions = (field: AirportField) => {
    const suggestions =
      field === "origin"
        ? visibleOriginSuggestions
        : visibleDestinationSuggestions;
    const query = field === "origin" ? originQuery : destinationQuery;
    const loading = field === "origin" ? originLoading : destinationLoading;
    const active = field === "origin" ? originHighlight : destinationHighlight;

    if (query.length < 2) return null;

    return (
      <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[140] hidden overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_24px_60px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.04] sm:block">
        {loading ? (
          <p className="px-4 py-5 text-center text-sm font-medium text-slate-500">
            {t("searchingAirportsAndCities")}
          </p>
        ) : suggestions.length ? (
          <div className="grid gap-1">
            {suggestions.map((option, index) => (
              <button
                key={`${field}-${option.code}-${option.airport}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectAirport(field, option)}
                className={cn(
                  "focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-indigo-50",
                  active === index &&
                    "bg-indigo-50 ring-1 ring-inset ring-indigo-100",
                )}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700"
                  aria-hidden="true"
                >
                  <Plane className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-extrabold leading-5 text-slate-950">
                    {option.city}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-medium leading-5 text-slate-500">
                    {option.airport}
                    {option.country ? ` · ${option.country}` : ""}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black tracking-[0.12em] text-slate-700">
                  {option.code}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="px-4 py-5 text-center text-sm font-medium text-slate-500">
            {t("noMatchingAirportsOrCities")}
          </p>
        )}
      </div>
    );
  };

  const renderDateCalendar = (compact = false) => {
    const renderMonth = (monthDate: Date) => {
      const cells = buildMonthCells(monthDate);
      const monthKey = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;

      return (
        <section
          key={monthKey}
          aria-label={monthYearFormatter.format(monthDate)}
          className={cn("min-w-0", compact ? "space-y-2.5" : "")}
        >
          <h3
            className={cn(
              compact
                ? "text-left text-[17px] font-bold tracking-tight text-slate-950"
                : "mb-3 text-center text-[15px] font-extrabold tracking-tight text-slate-950",
            )}
          >
            {monthYearFormatter.format(monthDate)}
          </h3>
          <div
            className={cn(
              "grid grid-cols-7 text-center text-slate-500",
              compact
                ? "text-[12px] font-semibold tracking-[0.08em]"
                : "mb-2 text-[11px] font-bold uppercase tracking-[0.10em]",
            )}
          >
            {weekdays.map((weekday) => (
              <span key={weekday} className={compact ? "py-2" : "py-1.5"}>
                {weekday}
              </span>
            ))}
          </div>
          <div
            className={cn(
              "grid grid-cols-7",
              compact ? "gap-y-1.5" : "gap-y-0.5",
            )}
          >
            {cells.map((cell) => {
              const day = cell.date;
              const iso = toIsoDate(day);
              const isDeparture = iso === departureDate;
              const isReturn = iso === returnDate;
              const isDisabledDate = isBeforeToday(day);
              const isToday = toIsoDate(new Date()) === iso;
              const isInRange = Boolean(
                departureParsed &&
                returnParsed &&
                !isDisabledDate &&
                day > departureParsed &&
                day < returnParsed,
              );

              if (!cell.isCurrentMonth) {
                return (
                  <span
                    key={`placeholder-${iso}`}
                    aria-hidden="true"
                    className={compact ? "h-11 w-full" : "h-10"}
                  />
                );
              }

              return (
                <button
                  key={iso}
                  type="button"
                  aria-label={`${t("selectDateAriaPrefix")} ${accessibleDateFormatter.format(day)}`}
                  aria-pressed={isDeparture || isReturn}
                  onClick={() => onSelectDate(day)}
                  disabled={isDisabledDate}
                  aria-disabled={isDisabledDate}
                  className={cn(
                    "focus-ring relative mx-auto flex items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed",
                    compact
                      ? "h-11 w-full max-w-11 text-[15px] font-semibold"
                      : "h-9 w-9 text-sm font-semibold",
                    isDisabledDate
                      ? "text-slate-300"
                      : "text-slate-800 hover:bg-indigo-50 hover:text-indigo-800",
                    isToday &&
                      !isDisabledDate &&
                      "ring-1 ring-inset ring-indigo-300",
                    isInRange &&
                      "bg-indigo-50 text-indigo-900 hover:bg-indigo-100",
                    (isDeparture || isReturn) &&
                      "bg-indigo-700 text-white shadow-sm ring-0 hover:bg-indigo-700 hover:text-white",
                  )}
                >
                  {day.getDate()}
                  {isToday && !isDeparture && !isReturn ? (
                    <span
                      className="absolute bottom-1.5 h-1 w-1 rounded-full bg-indigo-500"
                      aria-hidden="true"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      );
    };

    if (compact) {
      const mobileCalendarMonths = Array.from(
        { length: 12 },
        (_, monthOffset) => addMonths(todayLocal, monthOffset),
      );

      return (
        <div className="mx-auto w-full max-w-xl space-y-8 pb-2">
          {mobileCalendarMonths.map((monthDate) => renderMonth(monthDate))}
        </div>
      );
    }

    return (
      <div className="mx-auto w-full max-w-2xl rounded-3xl bg-white p-2 sm:p-3">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <button
            type="button"
            aria-label={t("previousMonth")}
            onClick={() => setVisibleMonthDate((prev) => addMonths(prev, -1))}
            className="focus-ring rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800"
          >
            {t("previousMonthShort")}
          </button>
          <button
            type="button"
            aria-label={t("nextMonth")}
            onClick={() => setVisibleMonthDate((prev) => addMonths(prev, 1))}
            className="focus-ring rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800"
          >
            {t("nextMonthShort")}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {[0, 1].map((monthOffset) =>
            renderMonth(addMonths(visibleMonthDate, monthOffset)),
          )}
        </div>
      </div>
    );
  };

  const renderTravelersPicker = (compact = true) => {
    const passengerRows = [
      {
        key: "adults",
        label: t("adultPlural") || "Adults",
        subtitle: "18+",
        count: draftAdultCount,
        min: 1,
      },
      {
        key: "children",
        label: t("childPlural") || "Children",
        subtitle: "Ages 2–17",
        count: draftChildCount,
        min: 0,
      },
      {
        key: "infants",
        label: t("infantPlural") || "Infants",
        subtitle: "Under 2",
        count: draftInfantCount,
        min: 0,
      },
    ];
    const cabinOptions = [
      ["economy", t("economy") || "Economy"],
      ["business", t("business") || "Business"],
      ["first", t("first") || "First"],
    ] as const;

    return (
      <div
        className={cn(
          "mx-auto w-full max-w-xl",
          compact ? "space-y-4" : "space-y-3",
        )}
      >
        <div>
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
            Passengers
          </p>
          <div
            className={cn(
              "overflow-hidden border border-slate-200 bg-white",
              compact
                ? "rounded-3xl shadow-[0_14px_38px_rgba(15,23,42,0.07)]"
                : "rounded-2xl shadow-sm",
            )}
          >
            {passengerRows.map((row) => {
              const draftTravelerCount =
                draftAdultCount + draftChildCount + draftInfantCount;
              const canDecrement = row.count > row.min;
              const canIncrement =
                draftTravelerCount < 9 &&
                (row.key !== "infants" || draftInfantCount < draftAdultCount);

              return (
                <div
                  key={row.key}
                  className={cn(
                    "flex items-center justify-between gap-4 border-b border-slate-100 last:border-b-0",
                    compact ? "px-4 py-4" : "px-4 py-3",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-base font-extrabold tracking-tight text-slate-950 sm:text-sm">
                      {row.label}
                    </span>
                    <span className="mt-0.5 block text-xs font-medium leading-5 text-slate-500">
                      {row.subtitle}
                    </span>
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (row.key === "adults") {
                          const nextAdults = Math.max(1, draftAdultCount - 1);
                          setDraftAdultCount(nextAdults);
                          setDraftInfantCount((current) =>
                            Math.min(current, nextAdults),
                          );
                        }
                        if (row.key === "children")
                          setDraftChildCount(Math.max(0, draftChildCount - 1));
                        if (row.key === "infants")
                          setDraftInfantCount(
                            Math.max(0, draftInfantCount - 1),
                          );
                      }}
                      disabled={!canDecrement}
                      className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white text-slate-700 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300 disabled:shadow-none"
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <span className="min-w-8 text-center text-base font-extrabold tabular-nums text-slate-950">
                      {row.count}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (row.key === "adults") {
                          if (draftTravelerCount >= 9) return;
                          setDraftAdultCount((current) =>
                            Math.min(9, current + 1),
                          );
                          return;
                        }
                        if (row.key === "children") {
                          if (draftTravelerCount >= 9) return;
                          setDraftChildCount((current) =>
                            Math.min(9, current + 1),
                          );
                          return;
                        }
                        if (row.key === "infants") {
                          if (
                            draftTravelerCount >= 9 ||
                            draftInfantCount >= draftAdultCount
                          )
                            return;
                          setDraftInfantCount((current) =>
                            Math.min(draftAdultCount, current + 1),
                          );
                        }
                      }}
                      disabled={!canIncrement}
                      className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white text-slate-700 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300 disabled:shadow-none"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          className={cn(
            "border border-slate-200 bg-white p-4",
            compact
              ? "rounded-3xl shadow-[0_14px_38px_rgba(15,23,42,0.07)]"
              : "rounded-2xl shadow-sm",
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
              {t("cabinClass") || "Cabin class"}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {cabinOptions.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setDraftCabinClass(normalizeCabinClass(value))}
                className={cn(
                  "focus-ring border px-2 text-center text-sm leading-4 transition-all",
                  compact ? "min-h-11 rounded-2xl" : "min-h-10 rounded-xl",
                  draftCabinClass === value
                    ? "border-indigo-500 bg-indigo-700 font-extrabold text-white shadow-[0_10px_22px_rgba(67,56,202,0.22)]"
                    : "border-slate-200 bg-slate-50/80 font-bold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="relative z-30 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_10px_28px_rgba(15,23,42,0.10)] sm:rounded-[1.75rem] sm:border-white/80 sm:bg-white sm:p-3 sm:shadow-[0_22px_55px_rgba(15,23,42,0.16)] sm:ring-1 sm:ring-slate-900/[0.04] lg:p-4">
      <form onSubmit={onSubmit} className="space-y-2 sm:space-y-3">
        <div
          role="radiogroup"
          aria-label={t("tripType") || "Trip type"}
          className="inline-flex items-center gap-3 rounded-lg bg-white/80 px-0.5 py-1 sm:gap-1 sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-slate-100/80 sm:p-1 sm:shadow-inner"
        >
          {[
            ["round-trip", t("roundTrip")],
            ["one-way", t("oneWay")],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={tripType === value}
              onClick={() => {
                const nextTripType = value as TripType;
                setTripType(nextTripType);
                if (nextTripType === "one-way") setReturnDate("");
              }}
              onKeyDown={(event) => {
                if (
                  event.key !== "ArrowRight" &&
                  event.key !== "ArrowLeft" &&
                  event.key !== "ArrowDown" &&
                  event.key !== "ArrowUp"
                ) {
                  return;
                }

                event.preventDefault();
                const nextTripType =
                  value === "round-trip" ? "one-way" : "round-trip";
                setTripType(nextTripType);
                if (nextTripType === "one-way") setReturnDate("");
              }}
              className={cn(
                "focus-ring group inline-flex min-h-8 items-center gap-2 rounded-lg px-1.5 py-1 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-950 sm:min-h-9 sm:flex-none sm:justify-center sm:px-3.5 sm:py-2 sm:font-bold",
                tripType === value &&
                  "text-slate-950 sm:bg-white sm:text-indigo-700 sm:shadow-sm sm:ring-1 sm:ring-indigo-100",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border bg-white transition-colors",
                  tripType === value
                    ? "border-indigo-600"
                    : "border-slate-300 group-hover:border-slate-400",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full bg-indigo-600 transition-opacity",
                    tripType === value ? "opacity-100" : "opacity-0",
                  )}
                />
              </span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-1 sm:gap-3 lg:grid-cols-[minmax(420px,3.6fr)_minmax(162px,1.22fr)_minmax(150px,1.08fr)_148px] lg:items-stretch lg:gap-2.5">
          <div className="grid grid-cols-1 gap-1 lg:grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] lg:items-stretch lg:gap-0 lg:rounded-2xl lg:border lg:border-slate-300 lg:bg-white lg:shadow-[0_4px_14px_rgba(15,23,42,0.06)] lg:transition-colors lg:hover:border-slate-400 lg:focus-within:border-indigo-500 lg:focus-within:bg-white lg:focus-within:ring-2 lg:focus-within:ring-indigo-500/25">
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
                setOriginState((current) =>
                  markOriginManualInput(current, nextValue),
                );
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
              className="lg:min-h-[62px] lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none lg:focus-within:border-0 lg:focus-within:bg-transparent lg:focus-within:ring-0"
            />

            <div className="relative z-10 -my-2 flex h-4 items-center justify-center lg:my-0 lg:h-auto lg:before:absolute lg:before:left-1/2 lg:before:top-3 lg:before:h-[calc(100%-1.5rem)] lg:before:w-px lg:before:-translate-x-1/2 lg:before:bg-slate-200">
              <button
                type="button"
                onClick={swapAirports}
                className="focus-ring relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40 lg:h-9 lg:w-9 lg:border-slate-300 lg:text-indigo-700 lg:shadow-[0_4px_12px_rgba(15,23,42,0.12)]"
                aria-label={
                  t("swapOriginDestination") || "Swap origin and destination"
                }
              >
                <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <AirportFieldControl
              ref={destinationWrapRef}
              inputRef={destinationInputRef}
              label={t("destination")}
              value={destination}
              placeholder={t("cityOrAirport")}
              open={
                destinationOpen || activeMobileAirportPicker === "destination"
              }
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
              className="lg:min-h-[62px] lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none lg:focus-within:border-0 lg:focus-within:bg-transparent lg:focus-within:ring-0"
            />
          </div>

          <div ref={dateWrapRef} className={searchFieldShellClassName}>
            <label className={searchFieldLabelClassName}>
              {t("travelDates")}
            </label>
            <button
              ref={datesMobileLauncherRef}
              type="button"
              aria-label={t("chooseTravelDates")}
              aria-expanded={datesOpen}
              aria-haspopup="dialog"
              onClick={() => setDatesOpen((prev) => !prev)}
              className={searchFieldValueButtonClassName}
            >
              <span>{dateSummary}</span>
              <Calendar
                className="h-4 w-4 shrink-0 text-slate-500"
                aria-hidden="true"
              />
            </button>
            {datesOpen ? (
              <>
                <FlightMobilePickerShell
                  open={datesOpen}
                  title={t("chooseTravelDates")}
                  titleId="standalone-flight-mobile-dates-title"
                  launcherRef={datesMobileLauncherRef}
                  onClose={() => setDatesOpen(false)}
                  contentClassName="px-4 py-4"
                  footer={
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setDepartureDate("");
                          setReturnDate("");
                        }}
                        className="focus-ring min-h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                      >
                        {t("clear")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDatesOpen(false)}
                        className={mobileDoneButtonClassName}
                      >
                        {t("done")}
                      </button>
                    </div>
                  }
                >
                  {renderDateCalendar(true)}
                </FlightMobilePickerShell>
                <div className="absolute right-0 top-[calc(100%+10px)] z-[150] hidden w-[min(92vw,690px)] rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_28px_70px_rgba(15,23,42,0.20)] ring-1 ring-slate-900/[0.04] sm:block">
                  {renderDateCalendar(false)}
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDepartureDate("");
                        setReturnDate("");
                      }}
                      className="focus-ring rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                    >
                      {t("clear")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDatesOpen(false)}
                      className="focus-ring rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-5 py-2 text-sm font-extrabold text-white shadow-md shadow-indigo-700/20 transition-colors hover:from-indigo-600 hover:to-violet-500"
                    >
                      {t("done")}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div ref={travelersWrapRef} className={searchFieldShellClassName}>
            <label className={searchFieldLabelClassName}>
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
              className={searchFieldValueButtonClassName}
            >
              <span className="truncate">{travelerSummary}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-slate-500 transition-transform",
                  travelersOpen && "rotate-180",
                )}
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
                        className={cn(mobileDoneButtonClassName, "px-6 py-3")}
                      >
                        {t("done")}
                      </button>
                    </div>
                  }
                >
                  {renderTravelersPicker()}
                </FlightMobilePickerShell>
                <div className="absolute right-0 top-[calc(100%+10px)] z-[150] hidden w-[min(92vw,380px)] rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_28px_70px_rgba(15,23,42,0.20)] ring-1 ring-slate-900/[0.04] sm:block">
                  {renderTravelersPicker(false)}
                  <div className="mt-3 flex justify-end border-t border-slate-200 pt-3">
                    <button
                      type="button"
                      onClick={applyTravelersDraft}
                      className="focus-ring rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-5 py-2 text-sm font-extrabold text-white shadow-md shadow-indigo-700/20 transition-colors hover:from-indigo-600 hover:to-violet-500"
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
            className="h-12 w-full whitespace-nowrap rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-700/20 enabled:hover:from-indigo-600 enabled:hover:to-violet-500 enabled:active:from-indigo-800 enabled:active:to-violet-700 disabled:from-indigo-700 disabled:to-violet-600 disabled:opacity-100 disabled:shadow-md disabled:shadow-indigo-700/20 sm:min-h-[62px] sm:rounded-2xl sm:px-5 sm:text-base sm:font-black sm:shadow-[0_14px_28px_rgba(67,56,202,0.28)] lg:h-full"
          >
            <Plane
              className="mr-2 hidden h-4 w-4 sm:inline"
              aria-hidden="true"
            />
            <span className="sm:hidden">
              {isSubmitting ? t("searchingFlights") : t("search")}
            </span>
            <span className="hidden sm:inline">
              {isSubmitting ? t("searchingFlights") : t("searchFlights")}
            </span>
          </Button>
        </div>

        {renderMobileAirportPicker({
          field: "origin",
          open: activeMobileAirportPicker === "origin",
          title: t("chooseOrigin"),
          inputId: "standalone-flight-origin-mobile-search",
          value: origin,
          suggestions: visibleOriginSuggestions,
          isLoading: originQuery.length >= 2 && originLoading,
          launcherRef: originMobileLauncherRef,
          inputRef: originMobilePickerInputRef,
          onChange: (nextValue) => {
            setOriginState((current) =>
              markOriginManualInput(current, nextValue),
            );
            setOriginHighlight(0);
            if (nextValue.trim().length < 2) {
              setOriginSuggestions([]);
              setOriginLoading(false);
            }
          },
          onClear: () => clearAirport("origin"),
          onSelect: (option) => selectAirport("origin", option),
          onClose: () => setActiveMobileAirportPicker(null),
        })}
        {renderMobileAirportPicker({
          field: "destination",
          open: activeMobileAirportPicker === "destination",
          title: t("chooseDestination"),
          inputId: "standalone-flight-destination-mobile-search",
          value: destination,
          suggestions: visibleDestinationSuggestions,
          isLoading: destinationQuery.length >= 2 && destinationLoading,
          launcherRef: destinationMobileLauncherRef,
          inputRef: destinationMobilePickerInputRef,
          onChange: (nextValue) => {
            setDestination(nextValue);
            setDestinationCode("");
            setDestinationHighlight(0);
            if (nextValue.trim().length < 2) {
              setDestinationSuggestions([]);
              setDestinationLoading(false);
            }
          },
          onClear: () => clearAirport("destination"),
          onSelect: (option) => selectAirport("destination", option),
          onClose: () => setActiveMobileAirportPicker(null),
        })}
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

const AirportFieldControl = React.forwardRef<
  HTMLDivElement,
  AirportFieldControlProps
>(function AirportFieldControl(
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
    <div ref={ref} className={cn(searchFieldShellClassName, className)}>
      <label className={searchFieldLabelClassName}>{label}</label>
      <button
        ref={mobileLauncherRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={onMobileOpen}
        className={cn(searchFieldValueButtonClassName, "sm:hidden")}
      >
        <span className={cn("truncate", !value && "text-slate-400")}>
          {value || placeholder}
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-slate-500"
          aria-hidden="true"
        />
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
          className="h-7 w-full rounded-none border-0 bg-transparent pr-9 text-[15px] font-extrabold tracking-[-0.015em] text-slate-950 outline-none placeholder:font-semibold placeholder:text-slate-500"
        />
        {value ? (
          <button
            type="button"
            aria-label={`Clear ${label.toLowerCase()}`}
            onClick={onClear}
            className="focus-ring absolute right-0 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
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
  buildPlacesUrl: (
    query: string,
    context: AirportField,
    requestDefault?: boolean,
  ) => string;
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
