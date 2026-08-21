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
import { createPortal } from "react-dom";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import {
  ArrowRightLeft,
  Calendar,
  ChevronDown,
  MapPin,
  Minus,
  Plane,
  Plus,
  UserRound,
} from "lucide-react";

import { useRouteProgress } from "@/components/layout/RouteProgress";
import { useLocale } from "@/components/layout/LocaleProvider";
import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
import { MobileAirportPicker } from "@/components/search/MobileAirportPicker";
import { MobileDatePickerDialog } from "@/components/search/MobileDateRangePicker";
import { MobileTravelerCabinPicker } from "@/components/search/MobileTravelerCabinPicker";
import { MultiCityFlightEditor } from "@/components/search/MultiCityFlightEditor";
import type { FlightSearchLeg } from "@/lib/types";
import { appendFlightLegParams, parseFlightLegParams } from "@/lib/flights/flightSearchJourney";
import {
  formatFlightsDateSummary,
  formatFlightsMonthHeading,
  formatFlightsWeekdays,
  normalizeFlightsCalendarLocale,
} from "@/lib/flights/dateFormatting";
import { Button } from "@/components/ui/Button";
import {
  type AirportOption,
  formatAirportLabel,
  getLocalizedAirportCountryName,
  getLocalizedCityName,
} from "@/data/airports";
import {
  applyDefaultOrigin,
  applySavedHomeAirport,
  canApplyDefaultOrigin,
  markOriginFromUrl,
  markOriginManualInput,
  shouldRequestSavedHomeAirportDefault,
  type OriginFieldState,
} from "@/lib/flights/defaultOrigin";
import { translations as enTranslations } from "@/lib/i18n/en";
import { cn } from "@/lib/utils";

type TripType = "round-trip" | "one-way" | "multi-city";
type MobileTripTypeOption = TripType;
type CabinClass = "economy" | "business" | "first";
type AirportField = "origin" | "destination";
type MobilePickerField = AirportField | "dates" | "travelers";

type PlacesApiResponse = {
  suggestions?: AirportOption[];
  defaultOriginAirport?: AirportOption | null;
};

type LocationApiResponse = {
  source?: "ipinfo-lite" | "fallback";
  countryCode?: string | null;
};

type TravelPreferencesApiResponse = {
  preferences?: {
    homeAirport?: string | null;
  } | null;
};

type MonthCell = {
  date: Date;
  isCurrentMonth: boolean;
};

const searchFieldShellClassName =
  "relative min-h-[54px] rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-400 focus-within:border-[#004BB8] focus-within:ring-2 focus-within:ring-[#004BB8]/25 sm:min-h-[58px] sm:rounded-none sm:border-0 sm:border-e sm:border-slate-200 sm:bg-white sm:px-4 sm:py-2 sm:shadow-none sm:hover:border-slate-200 sm:focus-within:border-slate-200 sm:focus-within:bg-white sm:focus-within:ring-0 lg:flex lg:flex-col lg:justify-center";
const searchFieldLabelClassName =
  "mb-1 block text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600 sm:text-[10px] sm:font-semibold sm:tracking-[0.10em] sm:text-slate-700";
const searchFieldValueButtonClassName =
  "focus-ring flex h-8 w-full items-center justify-between gap-2 rounded-md text-start text-[16px] font-medium text-slate-900 outline-none transition-colors sm:h-auto sm:min-h-7 sm:rounded-none sm:text-[15px] sm:font-medium sm:tracking-[-0.01em] sm:text-slate-950 sm:focus-visible:shadow-none";
const mobileFieldValueRowClassName =
  "flex min-w-0 flex-1 items-center gap-2 sm:contents";
const mobileFieldValueIconClassName =
  "h-4 w-4 shrink-0 text-slate-500 sm:hidden";
const mobileDoneButtonClassName =
  "focus-ring min-h-11 rounded-xl bg-[#004BB8] px-6 text-sm font-bold text-white shadow-md shadow-[#004BB8]/20 transition-colors hover:bg-[#021C2B] active:bg-[#021C2B]";
const desktopPopoverSelector = "[data-standalone-flight-desktop-popover]";

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
  mobileHeroCard?: boolean;
  presentation?: "default" | "main-flight-landing";
};

export function StandaloneFlightSearchForm({
  localizeCalendarLabels = true,
  mobileHeroCard = false,
  presentation = "default",
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
  const accessibleDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(calendarLocale, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [calendarLocale],
  );
  const weekdays = useMemo(
    () => formatFlightsWeekdays(calendarLocale),
    [calendarLocale],
  );

  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const { start: startRouteProgress } = useRouteProgress();
  const useMainFlightLandingMobilePresentation =
    presentation === "main-flight-landing";
  const defaultTripTypeOptions = [
    ["round-trip", t("roundTrip")],
    ["one-way", t("oneWay")],
  ] as const;

  const standaloneFormCardRef = useRef<HTMLElement>(null);
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
  const travelPreferencesRequestedRef = useRef(false);

  const [tripType, setTripType] = useState<TripType>(() => {
    if (typeof window === "undefined") return "round-trip";
    const value = new URLSearchParams(window.location.search).get("tripType");
    return value === "one-way" || value === "multi-city" ? value : "round-trip";
  });
  const [originState, setOriginState] = useState<OriginFieldState>(() => {
    if (typeof window === "undefined") {
      return {
        input: "",
        code: "",
        source: "empty",
        userInteracted: false,
      };
    }

    return markOriginFromUrl(
      new URLSearchParams(window.location.search).get("origin")?.trim() ?? "",
    );
  });
  const origin = originState.input;
  const originCode = originState.code;
  const [destination, setDestination] = useState("");
  const [destinationCode, setDestinationCode] = useState("");
  const [originOpen, setOriginOpen] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [activeMobilePicker, setActiveMobilePicker] =
    useState<MobilePickerField | null>(null);
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
  const [multiCityLegs, setMultiCityLegs] = useState<FlightSearchLeg[]>(() => {
    if (typeof window !== "undefined") {
      const restored = parseFlightLegParams(new URLSearchParams(window.location.search));
      if (restored.length >= 2) return restored;
    }
    return [
      { origin: "", destination: "", departureDate: "" },
      { origin: "", destination: "", departureDate: "" },
    ];
  });
  const [multiCityAirportsValid, setMultiCityAirportsValid] = useState(false);
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
  const [homeAirportDefaultResolved, setHomeAirportDefaultResolved] =
    useState(false);
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

  const validMultiCity = multiCityAirportsValid && multiCityLegs.length >= 2 && multiCityLegs.every((leg, index) =>
    /^[A-Z0-9]{3}$/.test(leg.origin) && /^[A-Z0-9]{3}$/.test(leg.destination) && leg.origin !== leg.destination && isValidFlightDate(leg.departureDate) && (index === 0 || leg.departureDate >= multiCityLegs[index - 1].departureDate),
  );
  const isSearchDisabled = isSubmitting || (tripType === "multi-city"
    ? !validMultiCity
    : !origin.trim() || !destination.trim() || !isValidFlightDate(departureDate) || !isReturnRangeValid);

  const dateSummary = useMemo(() => {
    const departureSummary = departureParsed
      ? formatFlightsDateSummary(departureParsed, null, calendarLocale)
      : "";
    const returnSummary = returnParsed
      ? formatFlightsDateSummary(returnParsed, null, calendarLocale)
      : "";

    if (!departureSummary) return t("travelDates");
    if (tripType === "round-trip" && returnSummary)
      return `${departureSummary} — ${returnSummary}`;
    return departureSummary;
  }, [calendarLocale, departureParsed, returnParsed, tripType, t]);

  const cabinClassLabel =
    cabinClass === "business"
      ? t("business")
      : cabinClass === "first"
        ? t("first")
        : t("economy");
  const travelerCount = adultCount + childCount + infantCount;
  const travelerSummary = useMemo(() => {
    const isJapanese = locale.toLowerCase().startsWith("ja");
    const isEnglish = locale.toLowerCase().startsWith("en");
    const listSeparator = isJapanese ? "、" : locale === "zh-cn" ? "，" : ", ";
    const formatTravelerPart = (
      count: number,
      singularLabel: string,
      pluralLabel: string,
    ) => {
      const label = count === 1 ? singularLabel : pluralLabel;
      const presentedLabel =
        isEnglish && label
          ? `${label.charAt(0).toLocaleUpperCase(locale)}${label.slice(1)}`
          : label;

      return isJapanese
        ? `${singularLabel}${count}名`
        : `${count} ${presentedLabel}`;
    };
    const parts: string[] = [];
    if (adultCount > 0)
      parts.push(
        formatTravelerPart(adultCount, t("adultSingular"), t("adultPlural")),
      );
    if (childCount > 0)
      parts.push(
        formatTravelerPart(childCount, t("childSingular"), t("childPlural")),
      );
    if (infantCount > 0)
      parts.push(
        formatTravelerPart(infantCount, t("infantSingular"), t("infantPlural")),
      );

    const baseSummary = parts.length
      ? parts.join(listSeparator)
      : formatTravelerPart(
          travelerCount,
          t("travelerSingular"),
          t("travelerPlural"),
        );

    return `${baseSummary}${listSeparator}${cabinClassLabel}`;
  }, [
    adultCount,
    cabinClassLabel,
    childCount,
    infantCount,
    locale,
    travelerCount,
    t,
  ]);

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
    if (sessionStatus === "loading") return;
    if (sessionStatus === "unauthenticated") return;
    if (!canApplyDefaultOrigin(originState)) return;
    if (
      !shouldRequestSavedHomeAirportDefault(
        originState,
        sessionStatus,
        travelPreferencesRequestedRef.current,
      )
    ) {
      return;
    }

    travelPreferencesRequestedRef.current = true;

    const loadHomeAirportDefault = async () => {
      try {
        const response = await fetch("/api/account/travel-preferences", {
          cache: "no-store",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as TravelPreferencesApiResponse;
        setOriginState((current) =>
          applySavedHomeAirport(
            current,
            payload.preferences?.homeAirport ?? null,
            locale,
          ),
        );
      } catch {
        // Flight search keeps today's behavior if travel preferences are unavailable.
      } finally {
        setHomeAirportDefaultResolved(true);
      }
    };

    void loadHomeAirportDefault();
  }, [locale, originState, sessionStatus]);

  useEffect(() => {
    if (sessionStatus === "authenticated" && !homeAirportDefaultResolved)
      return;
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
          applyDefaultOrigin(current, defaultAirport, locale),
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
  }, [
    buildPlacesUrl,
    homeAirportDefaultResolved,
    locale,
    originState,
    sessionStatus,
  ]);

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
      if (
        eventTarget instanceof Element &&
        (eventTarget.closest("[data-flight-mobile-picker-shell]") ||
          eventTarget.closest(desktopPopoverSelector))
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
      setActiveMobilePicker(null);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  useEffect(() => {
    const hasOpenDesktopPopover =
      originOpen || destinationOpen || datesOpen || travelersOpen;

    if (!hasOpenDesktopPopover || typeof window === "undefined") return;

    const desktopMediaQuery = window.matchMedia("(min-width: 640px)");
    if (!desktopMediaQuery.matches) return;

    const getActiveDesktopAnchor = () => {
      if (originOpen) return originWrapRef.current;
      if (destinationOpen) return destinationWrapRef.current;
      if (datesOpen)
        return datesMobileLauncherRef.current ?? dateWrapRef.current;
      if (travelersOpen)
        return travelersLauncherRef.current ?? travelersWrapRef.current;

      return null;
    };

    const isMeaningfullyVisible = (element: HTMLElement | null) => {
      if (!element) return false;

      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const threshold = 24;
      const visibleHeight =
        Math.min(rect.bottom, viewportHeight - threshold) -
        Math.max(rect.top, threshold);
      const minimumVisibleHeight = Math.min(
        32,
        Math.max(1, rect.height * 0.25),
      );

      return (
        rect.bottom > threshold &&
        rect.top < viewportHeight - threshold &&
        visibleHeight >= minimumVisibleHeight
      );
    };

    const closeDesktopPopovers = () => {
      setOriginOpen(false);
      setDestinationOpen(false);
      setDatesOpen(false);
      setTravelersOpen(false);
    };

    const onPageScroll = (event: Event) => {
      const eventTarget = event.target;

      if (
        eventTarget instanceof Element &&
        eventTarget.closest(desktopPopoverSelector)
      ) {
        return;
      }

      const activeAnchor = getActiveDesktopAnchor();
      const formCard = standaloneFormCardRef.current;

      if (
        isMeaningfullyVisible(activeAnchor) ||
        isMeaningfullyVisible(formCard)
      ) {
        return;
      }

      closeDesktopPopovers();
    };

    window.addEventListener("scroll", onPageScroll, true);

    return () => window.removeEventListener("scroll", onPageScroll, true);
  }, [datesOpen, destinationOpen, originOpen, travelersOpen]);

  const openOriginDesktopPopover = () => {
    setDestinationOpen(false);
    setDatesOpen(false);
    setTravelersOpen(false);
    setOriginOpen(true);
  };

  const openDestinationDesktopPopover = () => {
    setOriginOpen(false);
    setDatesOpen(false);
    setTravelersOpen(false);
    setDestinationOpen(true);
  };

  const isMobilePickerViewport = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 639px)").matches;

  const openDatesMobilePicker = () => {
    setOriginOpen(false);
    setDestinationOpen(false);
    setDatesOpen(false);
    setTravelersOpen(false);
    setActiveMobilePicker("dates");
  };

  const openTravelersMobilePicker = () => {
    const normalizedCabinClass = normalizeCabinClass(cabinClass);
    setOriginOpen(false);
    setDestinationOpen(false);
    setDatesOpen(false);
    setTravelersOpen(false);
    setCabinClass(normalizedCabinClass);
    setDraftAdultCount(adultCount);
    setDraftChildCount(childCount);
    setDraftInfantCount(infantCount);
    setDraftCabinClass(normalizedCabinClass);
    setActiveMobilePicker("travelers");
  };

  const closeTravelersMobilePicker = () => {
    const normalizedCabinClass = normalizeCabinClass(cabinClass);
    setCabinClass(normalizedCabinClass);
    setDraftAdultCount(adultCount);
    setDraftChildCount(childCount);
    setDraftInfantCount(infantCount);
    setDraftCabinClass(normalizedCabinClass);
    setActiveMobilePicker(null);
  };

  const openDatesDesktopPopover = () => {
    setActiveMobilePicker(null);
    setOriginOpen(false);
    setDestinationOpen(false);
    setTravelersOpen(false);
    setDatesOpen(true);
  };

  const openTravelers = () => {
    const normalizedCabinClass = normalizeCabinClass(cabinClass);
    setActiveMobilePicker(null);
    setOriginOpen(false);
    setDestinationOpen(false);
    setDatesOpen(false);
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

  const applyTravelersDraft = (closePicker = true) => {
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
    if (closePicker) setTravelersOpen(false);
  };

  const selectAirport = (field: AirportField, option: AirportOption) => {
    if (field === "origin") {
      setOriginState((current) =>
        markOriginManualInput(
          current,
          formatAirportLabel(option, locale),
          option.code,
        ),
      );
      setOriginOpen(false);
    } else {
      setDestination(formatAirportLabel(option, locale));
      setDestinationCode(option.code);
      setDestinationOpen(false);
    }
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
    setActiveMobilePicker(null);
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
      if (!activeMobilePicker)
        window.requestAnimationFrame(() =>
          originInputRef.current?.focus({ preventScroll: true }),
        );
    } else {
      setDestination("");
      setDestinationCode("");
      setDestinationSuggestions([]);
      setDestinationLoading(false);
      setDestinationOpen(false);
      setDestinationHighlight(0);
      if (!activeMobilePicker)
        window.requestAnimationFrame(() =>
          destinationInputRef.current?.focus({ preventScroll: true }),
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
    const closeOther =
      field === "origin"
        ? () => setDestinationOpen(false)
        : () => setOriginOpen(false);

    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (!list.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      closeOther();
      setDatesOpen(false);
      setTravelersOpen(false);
      setOpen(true);
      setActive((active + 1) % list.length);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      closeOther();
      setDatesOpen(false);
      setTravelersOpen(false);
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
      (tripType !== "multi-city" && (!parsedDeparture || isBeforeToday(parsedDeparture))) ||
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
    const authoritativeLegs = tripType === "multi-city" ? multiCityLegs : [];
    const firstLeg = authoritativeLegs[0];
    const finalLeg = authoritativeLegs.at(-1);
    const params = new URLSearchParams({
      tripType,
      origin: tripType === "multi-city" ? firstLeg?.origin ?? "" : originCode || origin.trim(),
      destination: tripType === "multi-city" ? finalLeg?.destination ?? "" : destinationCode || destination.trim(),
      departureDate: tripType === "multi-city" ? firstLeg?.departureDate ?? "" : departureDate,
      adults: String(normalizedAdults),
      children: String(normalizedChildren),
      infants: String(normalizedInfants),
      travelers: String(normalizedTravelers),
      cabinClass: normalizeCabinClass(cabinClass),
    });

    if (tripType === "round-trip") params.set("returnDate", returnDate);
    if (tripType === "multi-city") appendFlightLegParams(params, authoritativeLegs);

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
    launcherRef,
    onClear,
    onSelect,
    onClose,
  }: {
    field: AirportField;
    open: boolean;
    title: string;
    inputId: string;
    value: string;
    launcherRef: React.RefObject<HTMLButtonElement | null>;
    onClear: () => void;
    onSelect: (option: AirportOption) => void;
    onClose: () => void;
  }) => {
    return (
      <MobileAirportPicker
        open={open}
        field={field}
        title={title}
        inputId={inputId}
        value={value}
        selectedCode={field === "origin" ? originCode : destinationCode}
        launcherRef={launcherRef}
        locale={locale}
        labels={airportPickerLabels}
        onCommit={(option) => (option ? onSelect(option) : onClear())}
        onClose={onClose}
      />
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
    const open = field === "origin" ? originOpen : destinationOpen;
    const anchorRef = field === "origin" ? originWrapRef : destinationWrapRef;

    if (!open || query.length < 2) return null;

    return (
      <DesktopFlightPopover
        open={open}
        anchorRef={anchorRef}
        desiredWidth={390}
        align="start"
        placement="above"
        offset={10}
        maxHeight={300}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/[0.02]"
      >
        {loading ? (
          <p className="px-4 py-5 text-center text-sm font-medium text-slate-500">
            {t("searchingAirportsAndCities")}
          </p>
        ) : suggestions.length ? (
          <div className="py-1">
            {suggestions.map((option, index) => (
              <button
                key={`${field}-${option.code}-${option.airport}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectAirport(field, option)}
                className={cn(
                  "focus-ring flex w-full items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-start transition-colors last:border-b-0 hover:bg-[#004BB8]/8",
                  active === index && "bg-[#004BB8]/8 text-[#021C2B]",
                )}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-200/70"
                  aria-hidden="true"
                >
                  <Plane className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium leading-5 tracking-tight text-slate-900">
                    {getLocalizedCityName(option.city, locale)}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-normal leading-5 text-slate-500">
                    {option.airport}
                    {option.country
                      ? ` · ${getLocalizedAirportCountryName(option, locale)}`
                      : ""}
                  </span>
                </span>
                <span className="shrink-0 ps-3 text-end text-sm font-medium tracking-[0.08em] text-slate-600">
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
      </DesktopFlightPopover>
    );
  };

  const renderDateCalendar = (compact = false) => {
    const renderMonth = (monthDate: Date) => {
      const cells = buildMonthCells(monthDate);
      const monthKey = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;

      return (
        <section
          key={monthKey}
          aria-label={formatFlightsMonthHeading(monthDate, calendarLocale)}
          className={cn("min-w-0", compact ? "space-y-2.5" : "")}
        >
          <h3
            className={cn(
              compact
                ? "text-start text-[17px] font-bold tracking-tight text-slate-950"
                : "mb-2.5 text-center text-sm font-medium tracking-tight text-slate-900",
            )}
          >
            {formatFlightsMonthHeading(monthDate, calendarLocale)}
          </h3>
          <div
            className={cn(
              "grid grid-cols-7 text-center text-slate-500",
              compact
                ? "text-[12px] font-semibold tracking-[0.08em]"
                : "mb-1.5 text-[10px] font-medium tracking-[0.09em]",
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
                      : "h-10 w-10 text-sm font-medium",
                    isDisabledDate
                      ? "text-slate-300"
                      : "text-slate-800 hover:bg-[#004BB8]/8 hover:text-[#004BB8]",
                    isToday &&
                      !isDisabledDate &&
                      "ring-1 ring-inset ring-[#004BB8]/20",
                    isInRange &&
                      "bg-[#004BB8]/10 text-[#021C2B] hover:bg-[#004BB8]/10",
                    (isDeparture || isReturn) &&
                      "bg-[#004BB8] text-white shadow-none ring-0 hover:bg-[#004BB8] hover:text-white",
                  )}
                >
                  {day.getDate()}
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
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <button
            type="button"
            aria-label={t("previousMonth")}
            onClick={() => setVisibleMonthDate((prev) => addMonths(prev, -1))}
            className="focus-ring rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-[#004BB8]/20 hover:bg-[#004BB8]/8 hover:text-[#004BB8]"
          >
            {t("previousMonthShort")}
          </button>
          <button
            type="button"
            aria-label={t("nextMonth")}
            onClick={() => setVisibleMonthDate((prev) => addMonths(prev, 1))}
            className="focus-ring rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-[#004BB8]/20 hover:bg-[#004BB8]/8 hover:text-[#004BB8]"
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
        label: t("adults") || "Adults",
        subtitle: t("adultAgeRange") || "18+",
        count: draftAdultCount,
        min: 1,
      },
      {
        key: "children",
        label: t("children") || "Children",
        subtitle: t("childAgeRange") || "Ages 2–17",
        count: draftChildCount,
        min: 0,
      },
      {
        key: "infants",
        label: t("infantsOnLap") || t("infants") || enTranslations.infantsOnLap,
        subtitle: t("under2") || "Under 2",
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
          "mx-auto w-full",
          compact ? "max-w-xl space-y-4" : "space-y-3",
        )}
      >
        <div>
          <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
            {t("passengers") || "Passengers"}
          </p>
          {!compact ? (
            <h2 className="mb-2 text-lg font-extrabold tracking-tight text-slate-950">
              {t("passengers") || t("travelers") || "Travelers"}
            </h2>
          ) : null}
          <div
            className={cn(
              "overflow-hidden",
              compact
                ? "rounded-3xl border border-slate-200 bg-white shadow-[0_14px_38px_rgba(15,23,42,0.07)]"
                : "rounded-none border-y border-slate-100 bg-transparent",
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
                    compact ? "px-4 py-4" : "px-0 py-2.5",
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
                      className={cn(
                        "focus-ring inline-flex items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition-colors hover:border-[#004BB8]/25 hover:bg-[#004BB8]/8 hover:text-[#004BB8] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300",
                        compact
                          ? "h-9 w-9 shadow-sm sm:h-10 sm:w-10"
                          : "h-7 w-7",
                      )}
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
                      className={cn(
                        "focus-ring inline-flex items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition-colors hover:border-[#004BB8]/25 hover:bg-[#004BB8]/8 hover:text-[#004BB8] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300",
                        compact
                          ? "h-9 w-9 shadow-sm sm:h-10 sm:w-10"
                          : "h-7 w-7",
                      )}
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
            compact
              ? "rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.07)]"
              : "pt-1",
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
                  compact ? "min-h-11 rounded-2xl" : "min-h-9 rounded-xl",
                  draftCabinClass === value
                    ? "border-[#004BB8] bg-[#004BB8] font-extrabold text-white shadow-[0_10px_22px_rgba(0,75,184,0.22)]"
                    : "border-slate-200 bg-slate-50/80 font-bold text-slate-700 hover:border-[#004BB8]/20 hover:bg-[#004BB8]/8 hover:text-[#004BB8]",
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
    <section
      ref={standaloneFormCardRef}
      className={cn(
        "relative isolate z-[120] rounded-2xl border border-white/70 bg-white/92 p-3 shadow-[0_10px_26px_rgba(15,23,42,0.06)] ring-1 ring-slate-950/[0.05] backdrop-blur-xl sm:rounded-[1.5rem] sm:border-slate-200/80 sm:bg-white sm:p-4 sm:shadow-[0_16px_38px_rgba(15,23,42,0.10)] sm:backdrop-blur-none",
        mobileHeroCard &&
          "border-white/85 bg-white/95 p-3 pb-[calc(0.9rem+env(safe-area-inset-bottom))] shadow-[0_18px_44px_-18px_rgba(15,23,42,0.38)] ring-slate-950/[0.06] sm:p-4",
      )}
    >
      <form onSubmit={onSubmit} className="relative space-y-3 sm:space-y-3">
        {useMainFlightLandingMobilePresentation ? (
          <div
            className="inline-flex items-center gap-2 rounded-lg bg-[#004BB8]/8 px-3 py-2 shadow-sm ring-1 ring-[#004BB8]/10 sm:hidden"
            data-testid="main-flight-landing-identity"
          >
            <Plane
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-[#004BB8]"
              strokeWidth={2.1}
            />
            <h2 className="text-[16px] font-semibold text-navy">
              {t("flights") || "Flights"}
            </h2>
          </div>
        ) : null}

        {!useMainFlightLandingMobilePresentation ? (
          <div
            className="hidden w-fit items-center gap-2 rounded-lg bg-[#004BB8]/8 px-3 py-2 shadow-sm ring-1 ring-[#004BB8]/10 sm:flex"
            data-testid="desktop-flight-landing-identity"
          >
            <Plane
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-[#004BB8]"
              strokeWidth={2.1}
            />
            <h2 className="text-[16px] font-semibold text-navy">
              {t("flights") || "Flights"}
            </h2>
          </div>
        ) : null}

        <div
          role="radiogroup"
          aria-label={t("tripType") || "Trip type"}
          className={cn(
            "items-center rounded-lg px-0.5 py-1 sm:inline-flex sm:gap-1 sm:rounded-full sm:bg-transparent sm:p-0.5",
            useMainFlightLandingMobilePresentation
              ? "grid h-11 grid-cols-3 gap-0 py-0 sm:h-auto"
              : "inline-flex gap-3",
          )}
          data-testid={
            useMainFlightLandingMobilePresentation
              ? "main-flight-landing-trip-selector"
              : undefined
          }
        >
          {(
            [
              ...defaultTripTypeOptions,
              ["multi-city", "Multi-city"] as const,
            ] satisfies ReadonlyArray<readonly [MobileTripTypeOption, string]>
          ).map(([value, localizedLabel]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={tripType === value}
              onClick={() => {
                const nextTripType = value;
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
                const options: TripType[] = ["round-trip", "one-way", "multi-city"];
                const currentIndex = options.indexOf(value);
                const offset = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
                const nextTripType = options[(currentIndex + offset + options.length) % options.length];
                setTripType(nextTripType);
                if (nextTripType === "one-way") setReturnDate("");
              }}
              className={cn(
                "focus-ring group inline-flex rounded-lg py-1 font-semibold text-slate-700 transition-colors hover:bg-slate-100/70 hover:text-slate-950 sm:min-h-9 sm:flex-none sm:justify-center sm:px-3.5 sm:py-2 sm:text-sm sm:font-bold",
                useMainFlightLandingMobilePresentation
                  ? "min-h-11 min-w-0 items-center justify-center gap-1 whitespace-nowrap bg-transparent px-0.5 text-[11px] font-medium text-slate-950 hover:bg-transparent hover:text-slate-950 max-[359px]:gap-0.5 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-950 sm:min-h-9 sm:hover:bg-slate-100/70 sm:hover:text-slate-950"
                  : "min-h-8 items-center gap-2 px-1.5 text-sm",
                tripType === value &&
                  (useMainFlightLandingMobilePresentation
                    ? "sm:bg-[#004BB8]/8 sm:text-[#004BB8] sm:ring-1 sm:ring-[#004BB8]/10 sm:shadow-none"
                    : "bg-transparent text-slate-950 ring-0 shadow-none hover:bg-transparent hover:text-slate-950"),
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border bg-white transition-colors",
                  tripType === value
                    ? "border-[#004BB8]"
                    : "border-slate-300 group-hover:border-slate-400",
                )}
              >
                <span
                  className={cn(
                    "h-[5px] w-[5px] rounded-full bg-[#004BB8] transition-opacity",
                    tripType === value ? "opacity-100" : "opacity-0",
                  )}
                />
              </span>
              <span>
                {locale.toLowerCase().startsWith("en")
                  ? value === "round-trip"
                    ? "Round trip"
                    : value === "one-way"
                      ? "One way-trip"
                      : "Multi-city trip"
                  : localizedLabel}
              </span>
            </button>
          ))}
        </div>

        {tripType === "multi-city" ? <MultiCityFlightEditor legs={multiCityLegs} onChange={setMultiCityLegs} minimumDate={toIsoDate(todayLocal)} onAirportValidityChange={setMultiCityAirportsValid} /> : null}

        <div className={cn("grid grid-cols-1 gap-2 sm:overflow-hidden sm:rounded-2xl sm:ring-1 sm:ring-slate-200 lg:items-stretch lg:gap-0", tripType === "multi-city" ? "mt-3 sm:grid-cols-[minmax(164px,1fr)_136px]" : "lg:grid-cols-[minmax(0,3.35fr)_minmax(172px,1.2fr)_minmax(164px,1.05fr)_136px]")}>
          <div className={cn("grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] lg:items-stretch lg:gap-0 lg:border-e lg:border-slate-200 lg:bg-transparent", tripType === "multi-city" && "hidden")}>
            <AirportFieldControl
              ref={originWrapRef}
              inputRef={originInputRef}
              label={t("origin")}
              value={origin}
              placeholder={t("cityOrAirport")}
              mobilePlaceholder={t("cityOrAirport")}
              useMainFlightLandingMobilePresentation={
                useMainFlightLandingMobilePresentation
              }
              open={originOpen || activeMobilePicker === "origin"}
              onMobileOpen={() => setActiveMobilePicker("origin")}
              onDesktopFocus={openOriginDesktopPopover}
              onChange={(nextValue) => {
                openOriginDesktopPopover();
                setOriginState((current) =>
                  markOriginManualInput(current, nextValue),
                );
                setOriginHighlight(0);
                if (nextValue.trim().length < 2) {
                  setOriginSuggestions([]);
                  setOriginLoading(false);
                }
              }}
              onKeyDown={(event) => onAirportKeyNav(event, "origin")}
              mobileLauncherRef={originMobileLauncherRef}
              desktopSuggestions={renderAirportSuggestions("origin")}
              className={cn(
                "lg:min-h-[58px] lg:rounded-s-2xl lg:border-0 lg:bg-white lg:shadow-none lg:focus-within:border-0 lg:focus-within:bg-white lg:focus-within:ring-0",
                originOpen && "sm:z-20",
              )}
            />

            <div className="relative z-10 -my-2 flex h-4 items-center justify-center lg:my-0 lg:h-auto lg:before:absolute lg:before:left-1/2 lg:before:top-3 lg:before:h-[calc(100%-1.5rem)] lg:before:w-px lg:before:-translate-x-1/2 lg:before:bg-slate-200/90">
              <button
                type="button"
                onClick={swapAirports}
                className="focus-ring relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 focus-visible:border-[#004BB8] focus-visible:ring-2 focus-visible:ring-[#004BB8]/25 lg:h-8 lg:w-8 lg:border-slate-300 lg:text-[#004BB8] lg:shadow-[0_4px_12px_rgba(15,23,42,0.12)]"
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
              mobilePlaceholder={t("flightSearchDestinationPlaceholderShort")}
              useMainFlightLandingMobilePresentation={
                useMainFlightLandingMobilePresentation
              }
              open={destinationOpen || activeMobilePicker === "destination"}
              onMobileOpen={() => setActiveMobilePicker("destination")}
              onDesktopFocus={openDestinationDesktopPopover}
              onChange={(nextValue) => {
                openDestinationDesktopPopover();
                setDestination(nextValue);
                setDestinationCode("");
                setDestinationHighlight(0);
                if (nextValue.trim().length < 2) {
                  setDestinationSuggestions([]);
                  setDestinationLoading(false);
                }
              }}
              onKeyDown={(event) => onAirportKeyNav(event, "destination")}
              mobileLauncherRef={destinationMobileLauncherRef}
              desktopSuggestions={renderAirportSuggestions("destination")}
              className={cn(
                "lg:min-h-[58px] lg:rounded-none lg:border-0 lg:bg-white lg:shadow-none lg:focus-within:border-0 lg:focus-within:bg-white lg:focus-within:ring-0",
                destinationOpen && "sm:z-20",
              )}
            />
          </div>

          <div
            ref={dateWrapRef}
            className={cn(searchFieldShellClassName, datesOpen && "sm:z-20", tripType === "multi-city" && "!hidden")}
          >
            <label className={searchFieldLabelClassName}>
              {t("travelDates")}
            </label>
            <button
              ref={datesMobileLauncherRef}
              type="button"
              aria-label={t("chooseTravelDates")}
              aria-expanded={datesOpen || activeMobilePicker === "dates"}
              aria-haspopup="dialog"
              onClick={() => {
                if (isMobilePickerViewport()) {
                  if (activeMobilePicker === "dates") {
                    setActiveMobilePicker(null);
                    return;
                  }
                  openDatesMobilePicker();
                  return;
                }

                if (datesOpen) {
                  setDatesOpen(false);
                  return;
                }
                openDatesDesktopPopover();
              }}
              className={searchFieldValueButtonClassName}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <Calendar
                  className="h-4 w-4 shrink-0 text-slate-500"
                  aria-hidden="true"
                />
                <span className="truncate">{dateSummary}</span>
              </span>
            </button>
            {datesOpen ? (
              <>
                <DesktopFlightPopover
                  open={datesOpen}
                  anchorRef={datesMobileLauncherRef}
                  desiredWidth={690}
                  align="end"
                  className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-[0_22px_54px_rgba(15,23,42,0.16)] ring-1 ring-slate-950/[0.03] xl:p-5"
                >
                  {renderDateCalendar(false)}
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
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
                      className="focus-ring rounded-xl bg-[#004BB8] px-5 py-2 text-sm font-extrabold text-white shadow-md shadow-[#004BB8]/20 transition-colors hover:bg-[#021C2B]"
                    >
                      {t("done")}
                    </button>
                  </div>
                </DesktopFlightPopover>
              </>
            ) : null}
          </div>

          <div
            ref={travelersWrapRef}
            className={cn(
              searchFieldShellClassName,
              travelersOpen && "sm:z-20",
            )}
          >
            <label className={searchFieldLabelClassName}>
              {t("travelers")}
            </label>
            <button
              ref={travelersLauncherRef}
              type="button"
              aria-expanded={
                travelersOpen || activeMobilePicker === "travelers"
              }
              aria-haspopup="dialog"
              onClick={() => {
                if (isMobilePickerViewport()) {
                  if (activeMobilePicker === "travelers") {
                    closeTravelersMobilePicker();
                    return;
                  }
                  openTravelersMobilePicker();
                  return;
                }

                if (travelersOpen) {
                  closeTravelers();
                  return;
                }
                openTravelers();
              }}
              className={searchFieldValueButtonClassName}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <UserRound
                  className="h-4 w-4 shrink-0 text-slate-500"
                  aria-hidden="true"
                />
                <span className="truncate">{travelerSummary}</span>
              </span>
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
                <DesktopFlightPopover
                  open={travelersOpen}
                  anchorRef={travelersLauncherRef}
                  desiredWidth={360}
                  align="end"
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.15)] ring-1 ring-slate-950/[0.03]"
                >
                  {renderTravelersPicker(false)}
                  <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => applyTravelersDraft()}
                      className="focus-ring rounded-xl bg-[#004BB8] px-5 py-2 text-sm font-extrabold text-white shadow-md shadow-[#004BB8]/20 transition-colors hover:bg-[#021C2B]"
                    >
                      {t("done")}
                    </button>
                  </div>
                </DesktopFlightPopover>
              </>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={isSearchDisabled}
            aria-busy={isSubmitting}
            className="h-12 w-full whitespace-nowrap rounded-xl bg-[#004BB8] px-4 text-sm font-bold text-white shadow-md shadow-[#004BB8]/20 enabled:hover:bg-[#021C2B] enabled:active:bg-[#021C2B] disabled:bg-[#004BB8] disabled:opacity-100 disabled:shadow-md disabled:shadow-[#004BB8]/20 sm:min-h-[58px] sm:rounded-none sm:rounded-e-2xl sm:border sm:border-s-0 sm:border-[#004BB8]/20 sm:px-5 sm:text-[15px] sm:font-bold sm:shadow-[0_10px_22px_rgba(0,75,184,0.22)] sm:disabled:shadow-[0_10px_22px_rgba(0,75,184,0.22)] lg:h-full"
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

        {activeMobilePicker === "dates" ? (
          <MobileDatePickerDialog
            open={true}
            title={t("chooseTravelDates")}
            titleId="standalone-flight-mobile-dates-title"
            launcherRef={datesMobileLauncherRef}
            startDate={departureDate}
            endDate={returnDate}
            rangeRequired={tripType !== "one-way"}
            locale={calendarLocale}
            weekdays={weekdays}
            labels={{
              selectDates: t("carsResults.selectDates") || "Select dates",
              start: t("mobileDatePicker.start") || "Start",
              end: t("mobileDatePicker.end") || "End",
              done: t("done") || "Done",
              selectDatePrefix: t("selectDateAriaPrefix") || "Select",
            }}
            isDateDisabled={isBeforeToday}
            onCommit={(startDate, endDate) => {
              setDepartureDate(startDate);
              setReturnDate(endDate);
            }}
            onClose={() => setActiveMobilePicker(null)}
          />
        ) : null}

        {activeMobilePicker === "travelers" ? (
          <FlightMobilePickerShell
            open={true}
            title={t("mobileTravelerCabin.title") || "Travelers & Cabin"}
            titleId="standalone-flight-mobile-travelers-title"
            launcherRef={travelersLauncherRef}
            onClose={closeTravelersMobilePicker}
            contentClassName="bg-[#fcfdfe] px-4 py-6"
            headerVariant="close"
            pickerMarker="traveler-cabin"
            footer={(requestClose) => (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    applyTravelersDraft(false);
                    requestClose();
                  }}
                  className="focus-ring h-[52px] w-full rounded-[9px] bg-[#075ee8] text-[17px] font-bold text-white"
                >
                  {t("done")}
                </button>
              </div>
            )}
          >
            <MobileTravelerCabinPicker
              adults={draftAdultCount}
              children={draftChildCount}
              infants={draftInfantCount}
              cabinClass={draftCabinClass}
              strings={{
                travelers: t("travelers") || "Travelers",
                adults: t("adults") || "Adults",
                adultDescription:
                  t("mobileTravelerCabin.adultDescription") ||
                  "18 years and above",
                children: t("children") || "Children",
                childDescription:
                  t("mobileTravelerCabin.childDescription") || "2 to 17 years",
                infants: t("infants") || "Infants",
                infantDescription:
                  t("mobileTravelerCabin.infantDescription") || "Under 2 years",
                cabinClass: t("cabinClass") || "Cabin class",
                economy: t("economy") || "Economy",
                business: t("business") || "Business",
                first: t("first") || "First",
                tip: t("mobileTravelerCabin.tip") || "Tip",
                baggageTip:
                  t("mobileTravelerCabin.baggageTip") ||
                  "Baggage allowance may vary by airline. Check details on the provider page.",
                decrease: (label) =>
                  (
                    t("deals.decreaseCountAria") || "Decrease {{label}}"
                  ).replace("{{label}}", label),
                increase: (label) =>
                  (
                    t("deals.increaseCountAria") || "Increase {{label}}"
                  ).replace("{{label}}", label),
              }}
              onAdultsChange={setDraftAdultCount}
              onChildrenChange={setDraftChildCount}
              onInfantsChange={setDraftInfantCount}
              onCabinClassChange={setDraftCabinClass}
            />
          </FlightMobilePickerShell>
        ) : null}

        {renderMobileAirportPicker({
          field: "origin",
          open: activeMobilePicker === "origin",
          title: t("chooseOrigin"),
          inputId: "standalone-flight-origin-mobile-search",
          value: origin,
          launcherRef: originMobileLauncherRef,
          onClear: () => clearAirport("origin"),
          onSelect: (option) => selectAirport("origin", option),
          onClose: () => setActiveMobilePicker(null),
        })}
        {renderMobileAirportPicker({
          field: "destination",
          open: activeMobilePicker === "destination",
          title: t("chooseDestination"),
          inputId: "standalone-flight-destination-mobile-search",
          value: destination,
          launcherRef: destinationMobileLauncherRef,
          onClear: () => clearAirport("destination"),
          onSelect: (option) => selectAirport("destination", option),
          onClose: () => setActiveMobilePicker(null),
        })}
      </form>
    </section>
  );
}

type AirportFieldControlProps = {
  label: string;
  value: string;
  placeholder: string;
  mobilePlaceholder: string;
  useMainFlightLandingMobilePresentation: boolean;
  open: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  mobileLauncherRef: React.RefObject<HTMLButtonElement | null>;
  desktopSuggestions: React.ReactNode;
  className?: string;
  onMobileOpen: () => void;
  onDesktopFocus: () => void;
  onChange: (value: string) => void;
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
    mobilePlaceholder,
    useMainFlightLandingMobilePresentation,
    open,
    inputRef,
    mobileLauncherRef,
    desktopSuggestions,
    className,
    onMobileOpen,
    onDesktopFocus,
    onChange,
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
        {useMainFlightLandingMobilePresentation ? (
          <span className={mobileFieldValueRowClassName}>
            <MapPin
              className={mobileFieldValueIconClassName}
              aria-hidden="true"
            />
            <span className={cn("truncate", !value && "text-slate-400")}>
              {value || mobilePlaceholder}
            </span>
          </span>
        ) : (
          <>
            <span className={cn("truncate", !value && "text-slate-400")}>
              {value || placeholder}
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-slate-500"
              aria-hidden="true"
            />
          </>
        )}
      </button>
      <div className="relative hidden min-w-0 items-center gap-2 sm:flex">
        <MapPin
          className="h-4 w-4 shrink-0 text-slate-500"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onFocus={onDesktopFocus}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="h-7 min-w-0 flex-1 rounded-none border-0 bg-transparent pe-0 text-[15px] font-semibold tracking-[-0.01em] text-slate-950 outline-none placeholder:font-medium placeholder:text-slate-500"
        />
      </div>
      {desktopSuggestions}
    </div>
  );
});

type DesktopFlightPopoverProps = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  desiredWidth: number;
  align?: "start" | "end";
  placement?: "auto" | "above" | "below";
  offset?: number;
  maxHeight?: number | string;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
};

function DesktopFlightPopover({
  open,
  anchorRef,
  desiredWidth,
  align = "start",
  placement = "auto",
  offset = 10,
  maxHeight,
  className,
  contentClassName,
  children,
}: DesktopFlightPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number | null;
    bottom: number | null;
    width: number;
    availableHeight: number;
  } | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const desktopMediaQuery = window.matchMedia("(min-width: 640px)");
    const syncDesktopState = () => setIsDesktop(desktopMediaQuery.matches);

    syncDesktopState();
    desktopMediaQuery.addEventListener("change", syncDesktopState);

    return () =>
      desktopMediaQuery.removeEventListener("change", syncDesktopState);
  }, []);

  useEffect(() => {
    if (!open || !isDesktop || typeof window === "undefined") {
      return;
    }

    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) {
        setPosition(null);
        return;
      }

      const gutter = 16;
      const anchorRect = anchor.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const width = Math.min(
        desiredWidth,
        Math.max(0, viewportWidth - gutter * 2),
      );
      const preferredLeft =
        align === "end" ? anchorRect.right - width : anchorRect.left;
      const left = Math.min(
        Math.max(gutter, preferredLeft),
        Math.max(gutter, viewportWidth - width - gutter),
      );
      const viewportHeight = window.innerHeight;
      const measuredHeight = popoverRef.current?.getBoundingClientRect().height;
      const estimatedHeight =
        typeof maxHeight === "number"
          ? maxHeight
          : Math.min(520, viewportHeight * 0.72);
      const popoverHeight = Math.min(
        measuredHeight || estimatedHeight,
        viewportHeight - gutter * 2,
      );
      const availableBelow =
        viewportHeight - anchorRect.bottom - offset - gutter;
      const availableAbove = anchorRect.top - offset - gutter;
      const openAbove =
        placement === "above" ||
        (placement === "auto" &&
          availableBelow < popoverHeight &&
          availableAbove > availableBelow);
      const availableHeight = Math.max(
        160,
        openAbove ? availableAbove : availableBelow,
      );
      const top = openAbove
        ? null
        : Math.max(gutter, anchorRect.bottom + offset);
      const bottom = openAbove
        ? Math.max(gutter, viewportHeight - anchorRect.top + offset)
        : null;

      setPosition({ left, top, bottom, width, availableHeight });
    };

    updatePosition();
    const animationFrame = window.requestAnimationFrame(updatePosition);
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => updatePosition());
    if (popoverRef.current) resizeObserver?.observe(popoverRef.current);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [
    align,
    anchorRef,
    desiredWidth,
    isDesktop,
    maxHeight,
    offset,
    open,
    placement,
  ]);

  if (!open || !isDesktop || !position || typeof document === "undefined")
    return null;

  return createPortal(
    <div
      ref={popoverRef}
      data-standalone-flight-desktop-popover
      className={cn(
        "fixed z-[1000] overflow-y-auto overscroll-contain",
        contentClassName,
      )}
      style={{
        left: position.left,
        top: position.top ?? undefined,
        bottom: position.bottom ?? undefined,
        width: position.width,
        maxHeight:
          typeof maxHeight === "number"
            ? `${Math.min(maxHeight, position.availableHeight)}px`
            : maxHeight || `${position.availableHeight}px`,
      }}
    >
      <div className={cn("bg-white", className)}>{children}</div>
    </div>,
    document.body,
  );
}

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
