"use client";

import {
  useCallback,
  useEffect,
  type Dispatch,
  type FormEvent,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

import {
  ArrowRightLeft,
  BedDouble,
  Calendar,
  MapPin,
  ChevronDown,
  Minus,
  Plane,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { useRouteProgress } from "@/components/layout/RouteProgress";
import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
import { HotelDestinationMobilePicker } from "@/components/search/HotelDestinationMobilePicker";
import { HotelMobilePickerShell } from "@/components/search/HotelMobilePickerShell";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  buildFlightRecentSearch,
  buildHotelRecentSearch,
  upsertRecentSearch,
} from "@/lib/recent-searches";
import {
  formatAirportLabel,
  type AirportOption,
} from "@/data/airports";
import { getHomeDiscoveryByRegion, homeDiscoveryByRegion } from "@/data/homeDiscovery";
import { translations as enTranslations } from "@/lib/i18n/en";
import {
  applyDefaultOrigin,
  canApplyDefaultOrigin,
  markOriginManualInput,
  type OriginFieldState,
} from "@/lib/flights/defaultOrigin";

type TabMode =
  | "flights"
  | "hotels";

type TripType =
  | "round-trip"
  | "one-way"
  | "multi-city";

type SearchTabsTranslations =
  | Record<string, string>
  | ((key: string) => string);

type SearchTabsProps = {
  t: SearchTabsTranslations;
  compactHero?: boolean;
  locale?: string;
};

const normalizeHomepageCalendarLocale = (
  locale: string | null | undefined
) => {
  const normalized =
    locale?.trim().replace("_", "-").toLowerCase() ?? "";

  if (
    normalized === "fr" ||
    normalized.startsWith("fr-")
  ) {
    return "fr-FR";
  }

  if (
    normalized === "es" ||
    normalized.startsWith("es-")
  ) {
    return "es-ES";
  }

  if (
    normalized === "de" ||
    normalized.startsWith("de-")
  ) {
    return "de-DE";
  }

  if (
    normalized === "it" ||
    normalized.startsWith("it-")
  ) {
    return "it-IT";
  }

  if (
    normalized === "nl" ||
    normalized.startsWith("nl-")
  ) {
    return "nl-NL";
  }

  if (
    normalized === "pt" ||
    normalized.startsWith("pt-")
  ) {
    return "pt-BR";
  }

  return "en-US";
};

type PlacesApiResponse = {
  suggestions?: AirportOption[];
  defaultOriginAirport?: AirportOption | null;
  fallback?: boolean;
  source?: string;
};

type LocationApiResponse = {
  source?: "ipinfo-lite" | "fallback";
  countryCode?: string | null;
};

const formatCalendarHeading = (
  formatter: Intl.DateTimeFormat,
  date: Date,
  calendarLocale: string
) => {
  const formatted = formatter.format(date);

  if (calendarLocale !== "fr-FR") {
    return formatted;
  }

  return (
    formatted.charAt(0).toLocaleUpperCase("fr-FR") +
    formatted.slice(1)
  );
};

const formatCalendarWeekday = (
  formatter: Intl.DateTimeFormat,
  date: Date,
  calendarLocale: string
) => {
  const formatted = formatter.format(date);

  if (calendarLocale === "de-DE") {
    return `${formatted.replace(/\.$/, "")}.`;
  }

  if (calendarLocale !== "fr-FR") {
    return formatted;
  }

  const withoutTrailingPeriod = formatted.replace(/\.$/, "");
  return (
    withoutTrailingPeriod.charAt(0).toLocaleUpperCase("fr-FR") +
    withoutTrailingPeriod.slice(1)
  );
};

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

const clampNumberInput = (
  value: string,
  min: number,
  max: number
) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(min);
  return String(
    Math.min(
      max,
      Math.max(
        min,
        parsed
      )
    )
  );
};

const normalizeCabinClass = (value: string) =>
  value === "business" || value === "first"
    ? value
    : "economy";

const allDiscoveryRoutes = [
  ...Object.values(homeDiscoveryByRegion).flat(),
  ...getHomeDiscoveryByRegion(),
];

const normalizeDestinationKey = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();

const findDiscoveryImageForFlight = (originCode: string, destinationCode: string) => {
  const origin = originCode.trim().toUpperCase();
  const destination = destinationCode.trim().toUpperCase();
  const byRoute = allDiscoveryRoutes.find(
    (item) => item.originCode === origin && item.destinationCode === destination
  );
  if (byRoute) return byRoute;

  return allDiscoveryRoutes.find((item) => item.destinationCode === destination);
};

const findDiscoveryImageForHotel = (destination: string) => {
  const destinationKey = normalizeDestinationKey(destination);
  return allDiscoveryRoutes.find((item) => {
    const city = normalizeDestinationKey(item.destinationCity);
    const title = normalizeDestinationKey(item.title);
    return destinationKey === city || destinationKey.includes(city) || title.includes(destinationKey);
  });
};

const desktopOverlayRootClassName = "relative isolate z-[2147482800]";
const desktopOverlayGuardClassName =
  "fixed inset-0 z-[2147483000] hidden bg-transparent sm:block";
const desktopActiveFieldClassName = "z-[2147483200]";
const desktopPopoverPanelClassName = "z-[2147483400]";
const desktopTravelersFieldClassName = "z-[2147483500]";
const desktopTravelersPopoverClassName = "z-[2147483600]";
const mobileDoneButtonClassName =
  "focus-ring min-h-11 rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-6 text-sm font-bold text-white shadow-md shadow-indigo-700/20 transition-colors hover:from-indigo-600 hover:to-violet-500 active:from-indigo-800 active:to-violet-700";

type DesktopTopLayerPopoverProps = {
  open: boolean;
  launcherRef: RefObject<HTMLElement | null>;
  align?: "left" | "center" | "right";
  width: number;
  maxViewportGutter?: number;
  offset?: number;
  className?: string;
  children: ReactNode;
};

const subscribeToViewportChanges = (onStoreChange: () => void) => {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("resize", onStoreChange);
  window.addEventListener("scroll", onStoreChange, true);

  return () => {
    window.removeEventListener("resize", onStoreChange);
    window.removeEventListener("scroll", onStoreChange, true);
  };
};

const getDesktopPopoverServerSnapshot = () => "server";

function DesktopTopLayerPopover({
  open,
  launcherRef,
  align = "left",
  width,
  maxViewportGutter = 16,
  offset = 12,
  className,
  children,
}: DesktopTopLayerPopoverProps) {
  const [anchorRect, setAnchorRect] = useState<{
    bottom: number;
    left: number;
    right: number;
    width: number;
  } | null>(null);

  const viewportSnapshot = useSyncExternalStore(
    subscribeToViewportChanges,
    () => (typeof window === "undefined"
      ? getDesktopPopoverServerSnapshot()
      : `${window.innerWidth}:${window.scrollX}:${window.scrollY}`),
    getDesktopPopoverServerSnapshot
  );

  const updateAnchorRect = useCallback(() => {
    const rect = launcherRef.current?.getBoundingClientRect();
    setAnchorRect(rect
      ? {
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          width: rect.width,
        }
      : null);
  }, [launcherRef]);

  useEffect(() => {
    if (!open) {
      window.requestAnimationFrame(() => setAnchorRect(null));
      return;
    }

    const frameId = window.requestAnimationFrame(updateAnchorRect);
    return () => window.cancelAnimationFrame(frameId);
  }, [open, updateAnchorRect, viewportSnapshot]);

  if (!open || typeof document === "undefined" || !anchorRect) return null;

  const viewportWidth = window.innerWidth;
  const maxWidth = Math.max(0, viewportWidth - maxViewportGutter * 2);
  const panelWidth = Math.min(width, maxWidth);
  const unclampedLeft =
    align === "center"
      ? anchorRect.left + anchorRect.width / 2 - panelWidth / 2
      : align === "right"
        ? anchorRect.right - panelWidth
        : anchorRect.left;
  const left = Math.min(
    viewportWidth - maxViewportGutter - panelWidth,
    Math.max(maxViewportGutter, unclampedLeft)
  );

  return createPortal(
    <div
      data-desktop-search-popover="true"
      data-viewport-snapshot={viewportSnapshot}
      style={{
        left,
        top: anchorRect.bottom + offset,
        width: panelWidth,
        maxWidth,
      }}
      className={cn(
        "fixed hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.22)] ring-1 ring-slate-950/10 sm:block",
        desktopPopoverPanelClassName,
        className
      )}
    >
      <div className="absolute inset-0 bg-white" aria-hidden="true" />
      <div className="relative">{children}</div>
    </div>,
    document.body
  );
}


export function SearchTabs({
  t: translations,
  compactHero = false,
  locale,
}: SearchTabsProps) {
  const {
    locale: activeLocale,
    t: localeTranslations,
  } = useLocale();

  const t = useMemo(
    () =>
      typeof translations === "function"
        ? new Proxy(
            {},
            {
              get: (_target, key) =>
                typeof key === "string" ? translations(key) : undefined,
            }
          ) as Record<string, string>
        : translations,
    [translations]
  );
  const translate = useCallback(
    (key: string) =>
      t[key] || localeTranslations[key] || enTranslations[key] || "",
    [localeTranslations, t]
  );

  const calendarLocale = useMemo(
    () => normalizeHomepageCalendarLocale(locale ?? activeLocale),
    [activeLocale, locale]
  );
  const monthYearFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(calendarLocale, {
        month: "long",
        year: "numeric",
      }),
    [calendarLocale]
  );
  const accessibleDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(calendarLocale, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [calendarLocale]
  );
  const shortDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(calendarLocale, {
        month: "short",
        day: "numeric",
      }),
    [calendarLocale]
  );
  const weekdays = useMemo(() => {
    const weekdayFormatter = new Intl.DateTimeFormat(calendarLocale, {
      weekday: "short",
    });

    return Array.from({ length: 7 }, (_, index) =>
      formatCalendarWeekday(
        weekdayFormatter,
        new Date(2021, 7, index + 1),
        calendarLocale
      )
    );
  }, [calendarLocale]);

  const router = useRouter();
  const { start: startRouteProgress } = useRouteProgress();

  const fromWrapRef =
    useRef<HTMLDivElement>(null);
  const fromInputRef =
    useRef<HTMLInputElement>(null);

  const toWrapRef =
    useRef<HTMLDivElement>(null);
  const toInputRef =
    useRef<HTMLInputElement>(null);
  const fromMobileLauncherRef =
    useRef<HTMLButtonElement>(null);
  const fromMobilePickerInputRef =
    useRef<HTMLInputElement>(null);
  const toMobileLauncherRef =
    useRef<HTMLButtonElement>(null);
  const toMobilePickerInputRef =
    useRef<HTMLInputElement>(null);
  const dateWrapRef =
    useRef<HTMLDivElement>(null);
  const flightDatesLauncherRef =
    useRef<HTMLButtonElement>(null);
  const hotelDestinationMobileLauncherRef =
    useRef<HTMLButtonElement>(null);
  const hotelDateWrapRef =
    useRef<HTMLDivElement>(null);
  const hotelDatesMobileLauncherRef =
    useRef<HTMLButtonElement>(null);
  const hotelDatesPanelRef =
    useRef<HTMLDivElement>(null);
  const tripTypeWrapRef =
    useRef<HTMLDivElement>(null);
  const travelersWrapRef =
    useRef<HTMLDivElement>(null);
  const travelersLauncherRef =
    useRef<HTMLButtonElement>(null);
  const hotelGuestsRoomsWrapRef =
    useRef<HTMLDivElement>(null);
  const hotelGuestsRoomsMobileLauncherRef =
    useRef<HTMLButtonElement>(null);

  const [tab, setTab] =
    useState<TabMode>("flights");
  const [isFlightSubmitting, setIsFlightSubmitting] =
    useState(false);
  const [isHotelSubmitting, setIsHotelSubmitting] =
    useState(false);

  const [tripType, setTripType] =
    useState<TripType>(
      "round-trip"
    );
  const [tripTypeOpen, setTripTypeOpen] =
    useState(false);
  const [
    travelersMenuOpen,
    setTravelersMenuOpen,
  ] = useState(false);

  const [fromState, setFromState] =
    useState<OriginFieldState>({
      input: "",
      code: "",
      source: "empty",
      userInteracted: false,
    });
  const from = fromState.input;
  const fromCode = fromState.code;
  const [to, setTo] =
    useState("");
  const [toCode, setToCode] =
    useState("");

  const [fromOpen, setFromOpen] =
    useState(false);

  const [toOpen, setToOpen] =
    useState(false);
  const [activeMobileAirportPicker, setActiveMobileAirportPicker] =
    useState<"origin" | "destination" | null>(null);
  const [
    flightDatesOpen,
    setFlightDatesOpen,
  ] = useState(false);
  const [
    hotelDatesOpen,
    setHotelDatesOpen,
  ] = useState(false);
  const [hotelDestinationMobilePickerOpen, setHotelDestinationMobilePickerOpen] =
    useState(false);

  const [
    fromHighlight,
    setFromHighlight,
  ] = useState(0);

  const [
    toHighlight,
    setToHighlight,
  ] = useState(0);
  const [
    fromLiveSuggestions,
    setFromLiveSuggestions,
  ] = useState<AirportOption[]>(
    []
  );
  const [
    toLiveSuggestions,
    setToLiveSuggestions,
  ] = useState<AirportOption[]>(
    []
  );
  const [
    fromLoading,
    setFromLoading,
  ] = useState(false);
  const [toLoading, setToLoading] =
    useState(false);
  const [countryHint, setCountryHint] = useState("");

  const [
    departureDate,
    setDepartureDate,
  ] = useState("");

  const [
    returnDate,
    setReturnDate,
  ] = useState("");
  const [
    visibleMonthDate,
    setVisibleMonthDate,
  ] = useState(() => {
    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );
  });
  const [
    hotelVisibleMonthDate,
    setHotelVisibleMonthDate,
  ] = useState(() => {
    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );
  });

  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [infantCount, setInfantCount] = useState(0);
  const [draftAdultCount, setDraftAdultCount] = useState(1);
  const [draftChildCount, setDraftChildCount] = useState(0);
  const [draftInfantCount, setDraftInfantCount] = useState(0);

  const [
    cabinClass,
    setCabinClass,
  ] = useState("economy");
  const [draftCabinClass, setDraftCabinClass] = useState("economy");
  const travelersDraftRef = useRef({
    adults: 1,
    children: 0,
    infants: 0,
    cabinClass: "economy",
  });

  const [
    destination,
    setDestination,
  ] = useState("");

  const [checkIn, setCheckIn] =
    useState("");

  const [checkOut, setCheckOut] =
    useState("");

  const [hotelAdultCount, setHotelAdultCount] = useState(1);
  const [hotelChildCount, setHotelChildCount] = useState(0);

  const [rooms, setRooms] =
    useState("1");
  const [hotelPetFriendly, setHotelPetFriendly] = useState(false);
  const [hotelGuestsRoomsOpen, setHotelGuestsRoomsOpen] =
    useState(false);

  const desktopPopoverOpen =
    flightDatesOpen ||
    hotelDatesOpen ||
    travelersMenuOpen ||
    fromOpen ||
    toOpen ||
    hotelGuestsRoomsOpen;

  const searchTabsOverlayOpen =
    desktopPopoverOpen ||
    hotelDestinationMobilePickerOpen ||
    activeMobileAirportPicker !== null;

  const wrapper = useMemo(
    () =>
      cn(
        "rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.10)]",
        searchTabsOverlayOpen && desktopOverlayRootClassName,
        compactHero
          ? "p-1 sm:p-1.5 lg:border-slate-200/90 lg:bg-white/95 lg:p-2 lg:shadow-[0_18px_46px_rgba(15,23,42,0.13)] lg:ring-1 lg:ring-white/70"
          : "p-2"
      ),
    [compactHero, searchTabsOverlayOpen]
  );

  const tabsClassName = cn(
    "inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1",
    compactHero
      ? "mb-1 sm:mb-1.5 lg:mb-2 lg:gap-0.5 lg:border-slate-200/90 lg:bg-slate-100/80 lg:shadow-inner"
      : "mb-2"
  );
  const formClassName = compactHero ? "space-y-1 lg:space-y-1.5" : "space-y-2";
  const fieldCardClassName = cn(
    "overflow-visible rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.10)]",
    compactHero
      ? "p-0.5 lg:border-slate-200/90 lg:p-1 lg:shadow-[0_14px_34px_rgba(15,23,42,0.10)] lg:ring-1 lg:ring-slate-900/[0.02]"
      : "p-1"
  );
  const flightGridClassName = cn(
    "grid grid-cols-1 sm:grid-cols-2 lg:gap-0",
    compactHero
      ? "gap-1 lg:grid-cols-[minmax(0,3.35fr)_minmax(172px,1.2fr)_minmax(164px,1.05fr)_136px]"
      : "gap-1.5 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1.45fr)_minmax(0,1.2fr)_112px]"
  );
  const hotelGridClassName = cn(
    "grid grid-cols-1 sm:grid-cols-2 lg:gap-0",
    compactHero
      ? "gap-1 lg:grid-cols-[minmax(0,1.65fr)_minmax(172px,1.28fr)_minmax(158px,1.02fr)_136px]"
      : "gap-1.5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,1.15fr)_112px]"
  );
  const joinedFieldClassName = cn(
    "transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0",
    compactHero ? "min-h-[50px] px-3 py-1 lg:min-h-[56px] lg:px-4 lg:py-2" : "min-h-[54px] px-3 py-1.5"
  );
  const flightJoinedFieldClassName = cn(
    joinedFieldClassName,
    compactHero ? "min-h-[54px] px-3.5 py-1.5 lg:min-h-[58px] lg:px-4 lg:py-2" : "min-h-[58px] px-3.5 py-2"
  );
  const hotelJoinedFieldClassName = cn(
    joinedFieldClassName,
    compactHero ? "min-h-[58px] px-4 py-2 lg:min-h-[58px]" : "min-h-[58px] px-3.5 py-2"
  );
  const flightFieldLabelClassName = cn(
    "mb-1 block text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600",
    compactHero && "lg:text-[10px] lg:font-semibold lg:tracking-[0.10em] lg:text-slate-600"
  );
  const flightFieldValueClassName = cn(
    "focus-ring hidden h-full w-full min-w-0 rounded-md border-0 bg-transparent py-0 pl-0 pr-11 text-[16px] font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 sm:block sm:focus-visible:shadow-none md:text-sm lg:placeholder:text-slate-500",
    compactHero && "lg:text-[15px] lg:font-medium lg:tracking-[-0.01em] lg:text-slate-900"
  );
  const flightFieldButtonClassName = cn(
    "focus-ring flex h-8 w-full items-center gap-2 rounded-md border-0 bg-transparent px-0 pr-8 text-left text-[16px] font-medium text-slate-900 outline-none transition-colors sm:focus-visible:shadow-none md:text-sm",
    compactHero && "lg:text-[15px] lg:font-medium lg:tracking-[-0.01em] lg:text-slate-900"
  );
  const hotelFieldLabelClassName = cn(
    "mb-1 block text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-slate-500",
    compactHero && "lg:text-[10px] lg:font-semibold lg:tracking-[0.10em] lg:text-slate-600"
  );
  const hotelFieldValueClassName = cn(
    "focus-ring flex w-full items-center gap-2 rounded-md border-0 bg-transparent px-0 text-left font-medium leading-6 text-slate-950 outline-none transition-colors placeholder:text-slate-400",
    compactHero ? "min-h-9 text-[17px] sm:text-[16px] lg:text-[15px] lg:tracking-[-0.01em] lg:text-slate-900 lg:placeholder:text-slate-500" : "min-h-8 text-[16px] sm:text-[15px]"
  );
  const flightRouteGroupClassName = compactHero
    ? "grid grid-cols-1 gap-1 rounded-xl bg-transparent transition-colors sm:grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] sm:items-stretch sm:border sm:border-slate-300 sm:bg-white sm:px-3.5 sm:py-1.5 sm:hover:border-slate-400 sm:focus-within:border-indigo-500 sm:focus-within:ring-2 sm:focus-within:ring-indigo-500/40 lg:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)] lg:rounded-none lg:rounded-l-xl lg:border-0 lg:border-r lg:border-slate-200 lg:px-4 lg:py-2 lg:hover:border-slate-200 lg:focus-within:border-indigo-500 lg:focus-within:bg-white lg:focus-within:ring-2 lg:focus-within:ring-indigo-500/25"
    : cn("grid grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] items-stretch rounded-xl border border-slate-300 bg-white lg:rounded-l-xl", flightJoinedFieldClassName);
  const flightRouteFieldClassName = (side: "origin" | "destination") =>
    compactHero
      ? cn(
          "relative min-h-[54px] rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 transition-colors sm:min-h-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 lg:flex lg:flex-col lg:justify-center lg:rounded-lg",
          side === "origin" ? "sm:pr-3" : "sm:pl-3"
        )
      : cn("relative px-0 py-0 transition-colors lg:rounded-lg", side === "origin" ? "pr-3" : "pl-3");
  const submitWrapClassName = cn(
    "sm:col-span-2 lg:col-span-1 lg:self-stretch",
    compactHero ? "lg:min-h-[58px]" : "lg:min-h-[58px]"
  );
  const submitButtonClassName = cn(
    "w-full rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-700/20 enabled:hover:from-indigo-600 enabled:hover:to-violet-500 enabled:active:from-indigo-800 enabled:active:to-violet-700 disabled:from-indigo-700 disabled:to-violet-600 disabled:opacity-100 disabled:shadow-md disabled:shadow-indigo-700/20 lg:h-full lg:self-stretch lg:rounded-none lg:rounded-r-xl lg:border lg:border-l-0 lg:border-indigo-600/20 lg:text-[15px] lg:shadow-[0_10px_22px_rgba(67,56,202,0.22)] lg:disabled:shadow-[0_10px_22px_rgba(67,56,202,0.22)]",
    compactHero ? "h-12 lg:min-h-[58px]" : "h-12 lg:min-h-[58px]"
  );
  const hotelSubmitWrapClassName = cn(
    "sm:col-span-2 lg:col-span-1 lg:self-stretch",
    compactHero ? "lg:min-h-[58px]" : "lg:min-h-[58px]"
  );
  const hotelSubmitButtonClassName = cn(
    "w-full rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-700/20 enabled:hover:from-indigo-600 enabled:hover:to-violet-500 enabled:active:from-indigo-800 enabled:active:to-violet-700 disabled:from-indigo-700 disabled:to-violet-600 disabled:opacity-100 disabled:shadow-md disabled:shadow-indigo-700/20 lg:h-full lg:self-stretch lg:rounded-none lg:rounded-r-xl lg:border lg:border-l-0 lg:border-indigo-600/20 lg:text-[15px] lg:shadow-[0_10px_22px_rgba(67,56,202,0.22)] lg:disabled:shadow-[0_10px_22px_rgba(67,56,202,0.22)]",
    compactHero ? "h-[54px] lg:min-h-[58px]" : "h-12 lg:min-h-[58px]"
  );

  const fromQuery = from.trim();
  const toQuery = to.trim();
  const fromSuggestions = fromQuery.length >= 2 ? fromLiveSuggestions : [];
  const toSuggestions = toQuery.length >= 2 ? toLiveSuggestions : [];
  const isFromLoadingVisible = fromQuery.length >= 2 && fromLoading;
  const isToLoadingVisible = toQuery.length >= 2 && toLoading;
  const shouldShowFromSuggestionsPanel =
    fromOpen &&
    fromQuery.length >= 2 &&
    (fromLoading || fromSuggestions.length > 0 || !fromLoading);
  const shouldShowToSuggestionsPanel =
    toOpen &&
    toQuery.length >= 2 &&
    (toLoading || toSuggestions.length > 0 || !toLoading);

  const normalizePassengerDraft = useCallback((
    adults: number,
    children: number,
    infants: number
  ) => {
    const normalizedAdults = Math.max(1, Math.min(9, adults));
    const normalizedChildren = Math.max(
      0,
      Math.min(9 - normalizedAdults, children)
    );
    const normalizedInfants = Math.max(
      0,
      Math.min(
        normalizedAdults,
        Math.min(9 - normalizedAdults - normalizedChildren, infants)
      )
    );

    return {
      adults: normalizedAdults,
      children: normalizedChildren,
      infants: normalizedInfants,
    };
  }, []);

  const openTravelersMenu = useCallback(() => {
    setDraftAdultCount(adultCount);
    setDraftChildCount(childCount);
    setDraftInfantCount(infantCount);
    setDraftCabinClass(normalizeCabinClass(cabinClass));
    setTravelersMenuOpen(true);
  }, [adultCount, childCount, infantCount, cabinClass]);

  const cancelTravelersDraft = useCallback(() => {
    setDraftAdultCount(adultCount);
    setDraftChildCount(childCount);
    setDraftInfantCount(infantCount);
    setDraftCabinClass(normalizeCabinClass(cabinClass));
    setTravelersMenuOpen(false);
  }, [adultCount, childCount, infantCount, cabinClass]);

  const applyTravelersFromValues = useCallback((
    nextAdults: number,
    nextChildren: number,
    nextInfants: number,
    nextCabinClass: string
  ) => {
    const normalized = normalizePassengerDraft(
      nextAdults,
      nextChildren,
      nextInfants
    );
    setAdultCount(normalized.adults);
    setChildCount(normalized.children);
    setInfantCount(normalized.infants);
    setCabinClass(normalizeCabinClass(nextCabinClass));
    setTravelersMenuOpen(false);
  }, [normalizePassengerDraft]);

  const applyTravelersDraft = useCallback(() => {
    applyTravelersFromValues(
      draftAdultCount,
      draftChildCount,
      draftInfantCount,
      draftCabinClass
    );
  }, [applyTravelersFromValues, draftAdultCount, draftChildCount, draftInfantCount, draftCabinClass]);

  const buildPlacesUrl = useCallback((query: string, context: "origin" | "destination", requestDefault = false) => {
    const params = new URLSearchParams();
    if (query.length >= 2) params.set("q", query);
    if (requestDefault) params.set("default", "true");
    params.set("context", context);
    if (context === "origin" && countryHint) params.set("countryCode", countryHint);
    if (typeof navigator !== "undefined" && navigator.language) params.set("locale", navigator.language);

    return `/api/flights/places?${params.toString()}`;
  }, [countryHint]);

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
        const detectedCountryHint = payload.source === "ipinfo-lite"
          ? normalizeCountryHint(payload.countryCode)
          : "";
        setCountryHint(detectedCountryHint);
      } catch {
        // Leave airport country empty when IP country detection is unavailable.
      }
    };

    void loadLocationCountryHint();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!activeMobileAirportPicker) return;

    const inputRef = activeMobileAirportPicker === "origin"
      ? fromMobilePickerInputRef
      : toMobilePickerInputRef;
    const focusId = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 80);

    return () => window.clearTimeout(focusId);
  }, [activeMobileAirportPicker]);

  useEffect(() => {
    if (!canApplyDefaultOrigin(fromState)) return;

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
        setFromState((current) => applyDefaultOrigin(current, defaultAirport));
        if (Array.isArray(payload.suggestions)) {
          setFromLiveSuggestions(
            dedupeSuggestions(payload.suggestions)
              .filter((item) => !!item?.code && !!item?.city && !!item?.airport)
              .slice(0, 7),
          );
        }
      } catch {
        // The homepage search keeps its existing empty-origin behavior if defaults are unavailable.
      }
    };

    void loadDefaultOrigin();

    return () => controller.abort();
  }, [buildPlacesUrl, fromState]);

  useEffect(() => {
    const query = from.trim();
    if (query.length < 2) {
      return;
    }

    const controller =
      new AbortController();
    const timeoutId =
      window.setTimeout(
        async () => {
          setFromLoading(true);
          try {
            const response =
              await fetch(
                buildPlacesUrl(query, "origin"),
                {
                  signal:
                    controller.signal,
                  cache: "no-store",
                }
              );
            if (!response.ok) {
              throw new Error(
                "Failed to load suggestions"
              );
            }
            const payload =
              (await response.json()) as PlacesApiResponse;
            const suggestions = Array.isArray(
              payload.suggestions
            )
              ? dedupeSuggestions(payload.suggestions)
                  .filter(
                    (item) =>
                      !!item?.code &&
                      !!item?.city &&
                      !!item?.airport
                  )
                  .slice(0, 7)
              : [];
            setFromLiveSuggestions(
              suggestions
            );
          } catch {
            if (!controller.signal.aborted) {
              setFromLiveSuggestions(
                []
              );
            }
          } finally {
            if (!controller.signal.aborted) {
              setFromLoading(false);
            }
          }
        },
        300
      );

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [from, buildPlacesUrl]);

  useEffect(() => {
    const query = to.trim();
    if (query.length < 2) {
      return;
    }

    const controller =
      new AbortController();
    const timeoutId =
      window.setTimeout(
        async () => {
          setToLoading(true);
          try {
            const response =
              await fetch(
                buildPlacesUrl(query, "destination"),
                {
                  signal:
                    controller.signal,
                  cache: "no-store",
                }
              );
            if (!response.ok) {
              throw new Error(
                "Failed to load suggestions"
              );
            }
            const payload =
              (await response.json()) as PlacesApiResponse;
            const suggestions = Array.isArray(
              payload.suggestions
            )
              ? dedupeSuggestions(payload.suggestions)
                  .filter(
                    (item) =>
                      !!item?.code &&
                      !!item?.city &&
                      !!item?.airport
                  )
                  .slice(0, 7)
              : [];
            setToLiveSuggestions(
              suggestions
            );
          } catch {
            if (!controller.signal.aborted) {
              setToLiveSuggestions(
                []
              );
            }
          } finally {
            if (!controller.signal.aborted) {
              setToLoading(false);
            }
          }
        },
        300
      );

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [to, buildPlacesUrl]);

  useEffect(() => {
    travelersDraftRef.current = {
      adults: draftAdultCount,
      children: draftChildCount,
      infants: draftInfantCount,
      cabinClass: draftCabinClass,
    };
  }, [
    draftAdultCount,
    draftChildCount,
    draftInfantCount,
    draftCabinClass,
  ]);

  useEffect(() => {
    const onPointerDown = (
      event: MouseEvent
    ) => {
      const eventTarget = event.target as Node;
      if (
        eventTarget instanceof Element &&
        (eventTarget.closest("[data-flight-mobile-picker-shell]") ||
          eventTarget.closest("[data-desktop-search-popover]"))
      ) {
        return;
      }

      if (
        !fromWrapRef.current?.contains(
          eventTarget
        )
      ) {
        setFromOpen(false);
      }

      if (
        !toWrapRef.current?.contains(
          eventTarget
        )
      ) {
        setToOpen(false);
      }
      if (
        !dateWrapRef.current?.contains(
          eventTarget
        )
      ) {
        setFlightDatesOpen(
          false
        );
      }
      if (
        !hotelDateWrapRef.current?.contains(
          eventTarget
        ) &&
        !hotelDatesPanelRef.current?.contains(
          eventTarget
        )
      ) {
        setHotelDatesOpen(false);
      }
      if (
        !tripTypeWrapRef.current?.contains(
          eventTarget
        )
      ) {
        setTripTypeOpen(false);
      }
      if (
        !travelersWrapRef.current?.contains(
          eventTarget
        )
      ) {
        if (travelersMenuOpen) {
          const latestDraft = travelersDraftRef.current;
          applyTravelersFromValues(
            latestDraft.adults,
            latestDraft.children,
            latestDraft.infants,
            latestDraft.cabinClass
          );
        }
      }
      if (
        !hotelGuestsRoomsWrapRef.current?.contains(
          eventTarget
        )
      ) {
        setHotelGuestsRoomsOpen(false);
      }
    };
    const onEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        setFlightDatesOpen(
          false
        );
        setHotelDatesOpen(false);
        setHotelDestinationMobilePickerOpen(false);
        setTripTypeOpen(false);
        if (travelersMenuOpen) {
          cancelTravelersDraft();
        }
        setHotelGuestsRoomsOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      onPointerDown
    );
    document.addEventListener(
      "keydown",
      onEscape
    );

    return () =>
      {
        document.removeEventListener(
          "mousedown",
          onPointerDown
        );
        document.removeEventListener(
          "keydown",
          onEscape
        );
      };
  }, [applyTravelersFromValues, cancelTravelersDraft, travelersMenuOpen]);


  const guests = String(hotelAdultCount + hotelChildCount);
  const hotelGuestsRoomsSummary = `${guests} ${Number(guests) === 1 ? t.guestSingular || "guest" : t.guestPlural || "guests"}, ${rooms} ${Number(rooms) === 1 ? t.roomSingular || "room" : t.roomPlural || "rooms"}`;

  const formatShortDate = useCallback((
    isoDate: string
  ) => {
    if (!isoDate) {
      return "";
    }

    const [year, month, day] =
      isoDate.split("-");

    if (
      !year ||
      !month ||
      !day
    ) {
      return "";
    }

    const parsedDate = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "";
    }

    return shortDateFormatter.format(parsedDate);
  }, [shortDateFormatter]);

  const dateSummary = useMemo(
    () => {
      const departureSummary =
        formatShortDate(
          departureDate
        );
      const returnSummary =
        formatShortDate(returnDate);

      if (!departureSummary) {
        return t.travelDates || "Travel dates";
      }

      if (
        tripType ===
          "round-trip" &&
        returnSummary
      ) {
        return `${departureSummary} — ${returnSummary}`;
      }

      return departureSummary;
    },
    [
      departureDate,
      returnDate,
      tripType,
      formatShortDate,
      t.travelDates,
    ]
  );

  const parseIsoDate = (
    value: string
  ) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] =
      value.split("-").map(Number);
    const parsed = new Date(
      year,
      month - 1,
      day
    );
    return Number.isNaN(
      parsed.getTime()
    ) ||
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
      ? null
      : parsed;
  };

  const toIsoDate = (
    date: Date
  ) => {
    const year =
      date.getFullYear();
    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
      date.getDate()
    ).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const startOfLocalDay = (
    date: Date
  ) =>
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

  const todayLocal =
    startOfLocalDay(
      new Date()
    );

  const isBeforeToday = (
    date: Date
  ) =>
    startOfLocalDay(
      date
    ).getTime() <
    todayLocal.getTime();

  // Flight date selection intentionally shares one enabled-day rule across
  // one-way and round-trip calendars: only past local days are disabled. When
  // selecting a round-trip return, a future date before departure resets the
  // departure and clears the return instead of creating an invalid range.
  const isSelectableFlightDate = (
    date: Date
  ) => !isBeforeToday(date);

  const addMonths = (
    date: Date,
    offset: number
  ) =>
    new Date(
      date.getFullYear(),
      date.getMonth() + offset,
      1
    );

  type MonthCell = {
    date: Date;
    isCurrentMonth: boolean;
  };

  const buildMonthCells = (
    monthDate: Date
  ) => {
    const firstDay =
      new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        1
      );
    const startOffset =
      firstDay.getDay();
    const startDate = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1 - startOffset
    );
    return Array.from(
      { length: 42 },
      (_, index) => {
        const date =
          new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate() +
              index
          );

        return {
          date,
          isCurrentMonth:
            date.getMonth() ===
            monthDate.getMonth(),
        } satisfies MonthCell;
      }
    );
  };

  const departureParsed =
    parseIsoDate(
      departureDate
    );
  const returnParsed =
    parseIsoDate(returnDate);
  const isDepartureDateInvalid =
    !departureParsed ||
    isBeforeToday(departureParsed);
  const isReturnDateInvalid =
    tripType === "round-trip" &&
    (!returnParsed ||
      isBeforeToday(returnParsed) ||
      Boolean(departureParsed && returnParsed < departureParsed));

  const isValidFlightDate = (value: string) => {
    const parsed = parseIsoDate(value);
    return Boolean(parsed && !isBeforeToday(parsed));
  };

  const isFlightReturnRangeValid =
    tripType !== "round-trip" ||
    (isValidFlightDate(returnDate) &&
      isValidFlightDate(departureDate) &&
      returnDate >= departureDate);

  const onSelectDate = (
    date: Date
  ) => {
    if (!isSelectableFlightDate(date)) {
      return;
    }

    const selectedIso =
      toIsoDate(date);

    if (tripType === "one-way") {
      setDepartureDate(
        selectedIso
      );
      setReturnDate("");
      return;
    }

    if (
      !departureDate ||
      (departureDate &&
        returnDate)
    ) {
      setDepartureDate(
        selectedIso
      );
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

  const tripTypeLabel = (
    mode: TripType
  ) => {
    if (mode === "round-trip") {
      return (
        t.roundTrip ||
        t.tripRound ||
        "Round trip"
      );
    }

    if (mode === "one-way") {
      return (
        t.oneWay ||
        t.tripOneWay ||
        "One way"
      );
    }

    return (
      t.multiCity ||
      t.tripMulti ||
      "Multi-city"
    );
  };

  const onSelectTripType = (mode: Exclude<TripType, "multi-city">) => {
    setTripType(mode);
    if (mode === "one-way") {
      setReturnDate("");
    } else if (
      returnDate &&
      (!isValidFlightDate(returnDate) ||
        !isValidFlightDate(departureDate) ||
        returnDate < departureDate)
    ) {
      setReturnDate("");
    }
    setTripTypeOpen(false);
  };

  const travelerCount = adultCount + childCount + infantCount;

  const hasActiveFlightSearch =
    from.trim() !== "" ||
    fromCode.trim() !== "" ||
    to.trim() !== "" ||
    toCode.trim() !== "" ||
    departureDate !== "" ||
    returnDate !== "" ||
    tripType !== "round-trip" ||
    adultCount !== 1 ||
    childCount !== 0 ||
    infantCount !== 0 ||
    cabinClass !== "economy";

  const normalizedCabinClass =
    normalizeCabinClass(cabinClass);
  const cabinClassLabel =
    normalizedCabinClass === "business"
      ? t.business || "Business"
      : normalizedCabinClass === "first"
        ? t.first || "First"
        : t.economy || "Economy";

  const travelerSummary = useMemo(() => {
    const parts: string[] = [];

    if (adultCount > 0) {
      parts.push(`${adultCount} ${adultCount === 1 ? t.adultSingular || "adult" : t.adultPlural || "adults"}`);
    }
    if (childCount > 0) {
      parts.push(`${childCount} ${childCount === 1 ? t.childSingular || "child" : t.childPlural || "children"}`);
    }
    if (infantCount > 0) {
      parts.push(`${infantCount} ${infantCount === 1 ? t.infantSingular || "infant" : t.infantPlural || "infants"}`);
    }

    const baseSummary =
      parts.length > 0
        ? parts.join(", ")
        : `${travelerCount} ${travelerCount === 1 ? t.travelerSingular || "traveler" : t.travelerPlural || t.travelers || "travelers"}`;
    return `${baseSummary}, ${cabinClassLabel}`;
  }, [adultCount, childCount, infantCount, travelerCount, cabinClassLabel, t]);

  const onKeyNav = (
    event: ReactKeyboardEvent<HTMLInputElement>,
    isFrom: boolean
  ) => {
    const list = isFrom
      ? fromSuggestions
      : toSuggestions;

    const active = isFrom
      ? fromHighlight
      : toHighlight;

    const setActive = isFrom
      ? setFromHighlight
      : setToHighlight;

    const setOpen = isFrom
      ? setFromOpen
      : setToOpen;

    if (!list.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      setOpen(true);

      setActive(
        (active + 1) %
          list.length
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setOpen(true);

      setActive(
        (active - 1 + list.length) %
          list.length
      );
    }

    if (
      event.key === "Enter" &&
      (isFrom
        ? fromOpen
        : toOpen)
    ) {
      event.preventDefault();

      if (isFrom) {
        setFromState((current) => markOriginManualInput(
          current,
          formatAirportLabel(list[active]),
          list[active].code
        ));
      } else {
        setTo(
          formatAirportLabel(
            list[active]
          )
        );
        setToCode(
          list[active].code
        );
      }

      setOpen(false);
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const onSwapAirports = () => {
    const fromValue = from;
    const fromCanonicalCode = fromCode;

    setFromState({
      input: to,
      code: toCode,
      source: to.trim() ? "manual" : "empty",
      userInteracted: true,
    });
    setTo(fromValue);
    setToCode(fromCanonicalCode);
    setFromOpen(false);
    setToOpen(false);
  };

  const focusInputAfterClear = (input: HTMLInputElement | null) => {
    window.requestAnimationFrame(() => input?.focus());
  };

  const onClearOrigin = () => {
    setFromState((current) => markOriginManualInput(current, ""));
    setFromLoading(false);
    setFromLiveSuggestions([]);
    setFromOpen(false);
    setFromHighlight(0);
    if (!activeMobileAirportPicker) {
      focusInputAfterClear(fromInputRef.current);
    }
  };
  const onClearDestination = () => {
    setTo("");
    setToLoading(false);
    setToLiveSuggestions([]);
    setToCode("");
    setToOpen(false);
    setToHighlight(0);
    if (!activeMobileAirportPicker) {
      focusInputAfterClear(toInputRef.current);
    }
  };
  const onClearTravelDates = () => {
    setDepartureDate("");
    setReturnDate("");
    setFlightDatesOpen(false);
  };
  const onResetFlightSearch = () => {
    onClearOrigin();
    onClearDestination();
    onClearTravelDates();
    setTripType("round-trip");
    setAdultCount(1);
    setChildCount(0);
    setInfantCount(0);
    setDraftAdultCount(1);
    setDraftChildCount(0);
    setDraftInfantCount(0);
    setCabinClass("economy");
    setDraftCabinClass("economy");
    travelersDraftRef.current = { adults: 1, children: 0, infants: 0, cabinClass: "economy" };
    setTravelersMenuOpen(false);
    setTripTypeOpen(false);
  };

  const isFlightSearchDisabled =
    isFlightSubmitting ||
    !from.trim() ||
    !to.trim() ||
    !isValidFlightDate(departureDate) ||
    !isFlightReturnRangeValid;

  const onFlightSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      isFlightSearchDisabled ||
      isDepartureDateInvalid ||
      (tripType === "round-trip" && isReturnDateInvalid)
    ) {
      return;
    }
    const normalizedAdults = Math.max(1, Math.min(9, adultCount));
    const normalizedChildren = Math.max(0, Math.min(9 - normalizedAdults, childCount));
    const normalizedInfants = Math.max(0, Math.min(normalizedAdults, Math.min(9 - normalizedAdults - normalizedChildren, infantCount)));
    const normalizedTravelers = String(normalizedAdults + normalizedChildren + normalizedInfants);
    setAdultCount(normalizedAdults);
    setChildCount(normalizedChildren);
    setInfantCount(normalizedInfants);

    const normalizedCabinClass = normalizeCabinClass(cabinClass);
    const params =
      new URLSearchParams({
        tripType:
          tripType ===
          "one-way"
            ? "one-way"
            : "round-trip",
        origin:
          fromCode ||
          from.trim(),
        destination:
          toCode ||
          to.trim(),
        departureDate,
        adults: String(normalizedAdults),
        children: String(normalizedChildren),
        infants: String(normalizedInfants),
        travelers:
          normalizedTravelers,
        cabinClass: normalizedCabinClass,
      });

    if (
      tripType ===
        "round-trip" &&
      returnDate
    ) {
      params.set(
        "returnDate",
        returnDate
      );
    }

    const href = `/flights/results?${params.toString()}`;

    try {
      const matchedFlightImage = findDiscoveryImageForFlight(
        params.get("origin") ?? "",
        params.get("destination") ?? ""
      );
      upsertRecentSearch(
        buildFlightRecentSearch({
          tripType: (params.get("tripType") as "round-trip" | "one-way") ?? "round-trip",
          origin: params.get("origin") ?? "",
          destination: params.get("destination") ?? "",
          departureDate: params.get("departureDate") ?? "",
          returnDate: params.get("returnDate") ?? undefined,
          adults: Number(params.get("adults") ?? "1"),
          children: Number(params.get("children") ?? "0"),
          infants: Number(params.get("infants") ?? "0"),
          travelers: Number(params.get("travelers") ?? "1"),
          cabinClass: params.get("cabinClass") ?? "economy",
        }, matchedFlightImage ? { image: matchedFlightImage.image, imageAlt: matchedFlightImage.imageAlt } : undefined)
      );
    } catch {
      // best effort only
    }

    setIsFlightSubmitting(true);
    startRouteProgress();
    router.push(href);
  };

  const isHotelSearchDisabled =
    isHotelSubmitting ||
    !destination.trim() ||
    !checkIn ||
    !checkOut ||
    checkOut <= checkIn;

  const onHotelSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      isHotelSearchDisabled
    ) {
      return;
    }
    const normalizedGuests =
      clampNumberInput(
        guests,
        1,
        12
      );
    const normalizedRooms =
      clampNumberInput(
        rooms,
        1,
        6
      );
    setRooms(normalizedRooms);

    const params =
      new URLSearchParams({
        destination:
          destination.trim(),
        checkIn,
        checkOut,
        guests:
          normalizedGuests,
        rooms: normalizedRooms,
      });

    const href = `/hotels/results?${params.toString()}`;

    try {
      const matchedHotelImage = findDiscoveryImageForHotel(params.get("destination") ?? "");
      upsertRecentSearch(
        buildHotelRecentSearch({
          destination: params.get("destination") ?? "",
          checkIn: params.get("checkIn") ?? "",
          checkOut: params.get("checkOut") ?? "",
          guests: Number(params.get("guests") ?? "1"),
          rooms: Number(params.get("rooms") ?? "1"),
        }, matchedHotelImage ? { image: matchedHotelImage.image, imageAlt: matchedHotelImage.imageAlt } : undefined)
      );
    } catch {
      // best effort only
    }

    setIsHotelSubmitting(true);
    startRouteProgress();
    router.push(href);
  };

  const hotelDateSummary = useMemo(
    () => {
      const checkInSummary =
        formatShortDate(checkIn);
      const checkOutSummary =
        formatShortDate(checkOut);

      if (!checkInSummary) {
        return (
          t.hotelSearchDatePlaceholder ||
          enTranslations.hotelSearchDatePlaceholder
        );
      }

      if (checkOutSummary) {
        return `${checkInSummary} — ${checkOutSummary}`;
      }

      return checkInSummary;
    },
    [checkIn, checkOut, formatShortDate, t.hotelSearchDatePlaceholder]
  );

  const checkInParsed =
    parseIsoDate(checkIn);
  const checkOutParsed =
    parseIsoDate(checkOut);

  const onSelectHotelDate = (
    date: Date
  ) => {
    if (isBeforeToday(date)) {
      return;
    }

    const selectedIso =
      toIsoDate(date);

    if (
      !checkIn ||
      (checkIn && checkOut)
    ) {
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


  const renderFlightDateCalendar = () => {
    const mobileFlightCalendarMonths = Array.from(
      { length: 12 },
      (_, monthOffset) => addMonths(todayLocal, monthOffset)
    );

    return (
      <div className="mx-auto w-full max-w-xl space-y-8 pb-2">
        {mobileFlightCalendarMonths.map((monthDate) => {
          const monthKey = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
          const cells = buildMonthCells(monthDate);

          return (
            <section
              key={monthKey}
              aria-label={formatCalendarHeading(
                monthYearFormatter,
                monthDate,
                calendarLocale
              )}
              className="space-y-2.5"
            >
              <h3 className="text-left text-[17px] font-bold tracking-tight text-slate-950">
                {formatCalendarHeading(
                  monthYearFormatter,
                  monthDate,
                  calendarLocale
                )}
              </h3>
              <div className="grid grid-cols-7 text-center text-[12px] font-semibold tracking-[0.08em] text-slate-500">
                {weekdays.map((weekday) => (
                  <span key={weekday} className="py-2">{weekday}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1.5">
                {cells.map((cell) => {
                  const day = cell.date;
                  const iso = toIsoDate(day);
                  const isDeparture = iso === departureDate;
                  const isReturn = iso === returnDate;
                  const isDisabledDate = !isSelectableFlightDate(day);
                  const isToday = toIsoDate(new Date()) === iso;
                  const isInRange = !!(
                    departureParsed &&
                    returnParsed &&
                    !isDisabledDate &&
                    day > departureParsed &&
                    day < returnParsed
                  );

                  if (!cell.isCurrentMonth) {
                    return (
                      <span
                        key={`placeholder-${iso}`}
                        aria-hidden="true"
                        className="h-11 w-full"
                      />
                    );
                  }

                  return (
                    <button
                      key={iso}
                      type="button"
                      aria-label={`${translate("selectDateAriaPrefix")} ${accessibleDateFormatter.format(day)}`}
                      aria-pressed={isDeparture || isReturn}
                      onClick={() => {
                        if (isDisabledDate || !isSelectableFlightDate(day)) return;
                        onSelectDate(day);
                      }}
                      disabled={isDisabledDate}
                      aria-disabled={isDisabledDate}
                      className={cn(
                        "focus-ring relative mx-auto flex h-11 w-full max-w-11 items-center justify-center rounded-full text-[15px] font-semibold transition-colors disabled:cursor-not-allowed",
                        isDisabledDate
                          ? "text-slate-300"
                          : "text-slate-800 hover:bg-indigo-50 hover:text-indigo-800",
                        isToday && !isDisabledDate && "ring-1 ring-inset ring-indigo-300",
                        isInRange && "bg-indigo-50 text-indigo-900 hover:bg-indigo-100",
                        (isDeparture || isReturn) && "bg-indigo-700 text-white shadow-sm hover:bg-indigo-700 hover:text-white ring-0"
                      )}
                    >
                      {day.getDate()}
                      {isToday && !isDeparture && !isReturn ? (
                        <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-indigo-500" aria-hidden="true" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    );
  };

  const renderHotelDateCalendar = () => {
    const mobileHotelCalendarMonths = Array.from(
      { length: 12 },
      (_, monthOffset) => addMonths(todayLocal, monthOffset)
    );

    return (
      <div className="mx-auto w-full max-w-xl space-y-8 pb-2">
        {mobileHotelCalendarMonths.map((monthDate) => {
          const monthKey = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
          const cells = buildMonthCells(monthDate);

          return (
            <section
              key={monthKey}
              aria-label={formatCalendarHeading(
                monthYearFormatter,
                monthDate,
                calendarLocale
              )}
              className="space-y-2.5"
            >
              <h3 className="text-left text-[17px] font-bold tracking-tight text-slate-950">
                {formatCalendarHeading(
                  monthYearFormatter,
                  monthDate,
                  calendarLocale
                )}
              </h3>
              <div className="grid grid-cols-7 text-center text-[12px] font-semibold tracking-[0.08em] text-slate-500">
                {weekdays.map((weekday) => (
                  <span key={weekday} className="py-2">{weekday}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1.5">
                {cells.map((cell) => {
                  const day = cell.date;
                  const iso = toIsoDate(day);
                  const isCheckIn = iso === checkIn;
                  const isCheckOut = iso === checkOut;
                  const isPastDate = isBeforeToday(day);
                  const isDisabledDate = isPastDate;
                  const isToday = toIsoDate(new Date()) === iso;
                  const isInRange = Boolean(
                    checkInParsed &&
                      checkOutParsed &&
                      !isDisabledDate &&
                      day > checkInParsed &&
                      day < checkOutParsed,
                  );

                  if (!cell.isCurrentMonth) {
                    return (
                      <span
                        key={`homepage-mobile-placeholder-${iso}`}
                        aria-hidden="true"
                        className="h-11 w-full"
                      />
                    );
                  }

                  return (
                    <button
                      key={iso}
                      type="button"
                      aria-label={`${translate("selectDateAriaPrefix")} ${accessibleDateFormatter.format(day)}`}
                      aria-pressed={isCheckIn || isCheckOut}
                      onClick={() => {
                        if (isDisabledDate) return;
                        onSelectHotelDate(day);
                      }}
                      disabled={isDisabledDate}
                      aria-disabled={isDisabledDate}
                      className={cn(
                        "focus-ring relative mx-auto flex h-11 w-full max-w-11 items-center justify-center rounded-full text-[15px] font-semibold transition-colors disabled:cursor-not-allowed",
                        isDisabledDate
                          ? "text-slate-300"
                          : "text-slate-800 hover:bg-indigo-50 hover:text-indigo-800",
                        isToday && !isDisabledDate && "ring-1 ring-inset ring-indigo-300",
                        isInRange && "bg-indigo-50 text-indigo-900 hover:bg-indigo-100",
                        (isCheckIn || isCheckOut) && "bg-indigo-700 text-white shadow-sm hover:bg-indigo-700 hover:text-white ring-0"
                      )}
                    >
                      {day.getDate()}
                      {isToday && !isCheckIn && !isCheckOut ? (
                        <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-indigo-500" aria-hidden="true" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    );
  };

  const flightDatesFooter = (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => {
          setDepartureDate("");
          setReturnDate("");
        }}
        className="focus-ring rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
      >
        {translate("clear") || "Clear"}
      </button>
      <button
        type="button"
        onClick={() => setFlightDatesOpen(false)}
        className={cn(mobileDoneButtonClassName, "px-4 py-2")}
      >
        {translate("done") || "Done"}
      </button>
    </div>
  );



  const renderMobileAirportPicker = ({
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
    open: boolean;
    title: string;
    inputId: string;
    value: string;
    suggestions: AirportOption[];
    isLoading: boolean;
    launcherRef: typeof fromMobileLauncherRef;
    inputRef: typeof fromMobilePickerInputRef;
    onChange: (value: string) => void;
    onClear: () => void;
    onSelect: (option: AirportOption) => void;
    onClose: () => void;
  }) => {
    if (!open) return null;

    const titleId = `${inputId}-title`;
    const query = value.trim();
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
        footer={(
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                onClear();
                focusInput();
              }}
              className="focus-ring min-h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              {t.clear || "Clear"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={mobileDoneButtonClassName}
            >
              {t.done || "Done"}
            </button>
          </div>
        )}
      >
        <div className="mx-auto w-full max-w-xl space-y-5">
          <div className="space-y-2">
            <label className="block text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500" htmlFor={inputId}>
              {translate("searchAirportsAndCities")}
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id={inputId}
                type="text"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={translate("cityAirportOrCode")}
                autoComplete="off"
                className="focus-ring h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-4 pr-12 text-base font-semibold text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
              />
              {value.trim() ? (
                <button
                  type="button"
                  aria-label={title === (t.chooseOrigin || "Choose origin") ? (t.clearOrigin || "Clear origin") : (t.clearDestination || "Clear destination")}
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
                {translate("startTypingCityAirportOrCode")}
              </p>
            ) : isLoading ? (
              <p className="px-5 py-8 text-center text-sm font-medium leading-6 text-slate-500">
                {translate("searchingAirportsAndCities")}
              </p>
            ) : suggestions.length ? (
              suggestions.map((option) => (
                <button
                  key={`${option.code}-${option.airport}-${inputId}`}
                  type="button"
                  onClick={() => onSelect(option)}
                  className="focus-ring flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-slate-50 focus-visible:bg-slate-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500" aria-hidden="true">
                    <Plane className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-extrabold leading-5 tracking-tight text-slate-950">
                      {option.city}
                    </span>
                    <span className="mt-1 block truncate text-sm font-medium leading-5 text-slate-500">
                      {option.airport}
                    </span>
                  </span>
                  <span className="shrink-0 pl-2 text-right text-sm font-extrabold tracking-[0.12em] text-slate-700">
                    {option.code}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-5 py-8 text-center text-sm font-medium leading-6 text-slate-500">
                {translate("noMatchingAirportsOrCities")}
              </p>
            )}
          </div>
        </div>
      </FlightMobilePickerShell>
    );
  };

  const renderDesktopAirportSuggestions = ({
    inputId,
    suggestions,
    highlight,
    isLoading,
    sectionLabel,
    onSelect,
  }: {
    inputId: string;
    suggestions: AirportOption[];
    highlight: number;
    isLoading: boolean;
    sectionLabel: string;
    onSelect: (option: AirportOption) => void;
  }) => (
    <div
      className={cn(
        "absolute left-0 top-[calc(100%+10px)] hidden w-[min(92vw,520px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.12)] ring-1 ring-slate-950/[0.02] sm:block lg:w-[520px]",
        desktopPopoverPanelClassName
      )}
    >
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-[0.11em] text-slate-500">
          {sectionLabel}
        </p>
      </div>
      <div className="max-h-[min(52vh,360px)] overflow-y-auto py-1">
        {isLoading ? (
          <div className="flex items-center gap-3 px-4 py-4 text-sm font-medium text-slate-500">
            <span className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.12)]" aria-hidden="true" />
            {translate("searchingAirportsAndCities")}
          </div>
        ) : suggestions.length ? suggestions.map((option, index) => (
          <button
            key={`${option.code}-${option.airport}-${inputId}`}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(option)}
            className={cn(
              "focus-ring flex w-full items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-indigo-50/60 focus-visible:bg-indigo-50/60",
              highlight === index && "bg-indigo-50 text-indigo-950"
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-200/70" aria-hidden="true">
              <Plane className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium leading-5 tracking-tight text-slate-900">
                {option.city}
              </span>
              <span className="mt-0.5 block truncate text-xs font-normal leading-5 text-slate-500">
                {option.airport}{option.country ? ` · ${option.country}` : ""}
              </span>
            </span>
            <span className="shrink-0 pl-3 text-right text-sm font-medium tracking-[0.08em] text-slate-600">
              {option.code}
            </span>
          </button>
        )) : (
          <div className="flex items-center gap-3 px-4 py-4 text-sm font-medium text-slate-500">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400" aria-hidden="true">
              <MapPin className="h-4 w-4" />
            </span>
            {translate("noMatchingAirportsOrCities")}
          </div>
        )}
      </div>
    </div>
  );

  const renderDesktopCalendarMonth = ({
    monthDate,
    mode,
  }: {
    monthDate: Date;
    mode: "flights" | "hotels";
  }) => {
    const cells = buildMonthCells(monthDate);

    return (
      <section
        aria-label={formatCalendarHeading(
          monthYearFormatter,
          monthDate,
          calendarLocale
        )}
        className="min-w-0"
      >
        <h3 className="mb-2.5 text-center text-sm font-medium tracking-tight text-slate-900">
          {formatCalendarHeading(
            monthYearFormatter,
            monthDate,
            calendarLocale
          )}
        </h3>
        <div className="mb-1.5 grid grid-cols-7 text-center text-[10px] font-medium tracking-[0.09em] text-slate-500">
          {weekdays.map((weekday) => (
            <span key={weekday} className="py-1.5">{weekday}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((cell) => {
            const day = cell.date;
            const iso = toIsoDate(day);
            const isToday = toIsoDate(new Date()) === iso;
            const isFlightMode = mode === "flights";
            const isStart = isFlightMode ? iso === departureDate : iso === checkIn;
            const isEnd = isFlightMode ? iso === returnDate : iso === checkOut;
            const startParsed = isFlightMode ? departureParsed : checkInParsed;
            const endParsed = isFlightMode ? returnParsed : checkOutParsed;
            const isDisabledDate = isFlightMode ? !isSelectableFlightDate(day) : isBeforeToday(day);
            const isInRange = Boolean(
              startParsed &&
                endParsed &&
                !isDisabledDate &&
                day > startParsed &&
                day < endParsed
            );

            if (!cell.isCurrentMonth) {
              return <span key={`desktop-placeholder-${mode}-${iso}`} aria-hidden="true" className="h-10" />;
            }

            return (
              <button
                key={`${mode}-${iso}`}
                type="button"
                aria-label={`${translate("selectDateAriaPrefix")} ${accessibleDateFormatter.format(day)}`}
                aria-pressed={isStart || isEnd}
                onClick={() => {
                  if (isDisabledDate) return;
                  if (isFlightMode) onSelectDate(day);
                  else onSelectHotelDate(day);
                }}
                disabled={isDisabledDate}
                aria-disabled={isDisabledDate}
                className={cn(
                  "focus-ring relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors disabled:cursor-not-allowed",
                  isDisabledDate
                    ? "text-slate-300"
                    : "text-slate-800 hover:bg-indigo-50/80 hover:text-indigo-800",
                  isToday && !isDisabledDate && "ring-1 ring-inset ring-indigo-200",
                  isInRange && "rounded-xl bg-indigo-50/80 text-indigo-800 hover:bg-indigo-100",
                  (isStart || isEnd) && "bg-indigo-600 text-white shadow-none hover:bg-indigo-600 hover:text-white ring-0"
                )}
              >
                {day.getDate()}
                {isToday && !isStart && !isEnd ? (
                  <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-indigo-500" aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </div>
      </section>
    );
  };

  const renderDesktopCalendarPopover = ({
    launcherRef,
    mode,
    visibleMonth,
    setVisibleMonth,
    onClear,
    onDone,
  }: {
    launcherRef: RefObject<HTMLElement | null>;
    mode: "flights" | "hotels";
    visibleMonth: Date;
    setVisibleMonth: Dispatch<SetStateAction<Date>>;
    onClear: () => void;
    onDone: () => void;
  }) => (
    <DesktopTopLayerPopover
      open
      launcherRef={launcherRef}
      align={mode === "flights" ? "center" : "left"}
      width={mode === "flights" ? 760 : 660}
      className={cn(
        "p-4",
        mode === "flights" && "lg:p-5"
      )}
    >
    <div
      role="dialog"
      aria-label={translate("chooseTravelDates") || "Choose travel dates"}
      className="bg-white"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.11em] text-slate-600">
            {mode === "flights"
              ? (translate("travelDates") || "Travel dates")
              : (translate("hotelSearchTravelDatesLabel") || "Travel dates")}
          </p>
          <h3 className="mt-1 text-[15px] font-medium tracking-tight text-slate-950">
            {translate("chooseTravelDates") || "Choose travel dates"}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={translate("previousMonth") || "Previous month"}
            onClick={() => setVisibleMonth((prev) => addMonths(prev, -1))}
            className="focus-ring rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
          >
            {translate("previousMonthShort") || "Prev"}
          </button>
          <button
            type="button"
            aria-label={translate("nextMonth") || "Next month"}
            onClick={() => setVisibleMonth((prev) => addMonths(prev, 1))}
            className="focus-ring rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
          >
            {translate("nextMonthShort") || "Next"}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5">
        {[0, 1].map((monthOffset) => renderDesktopCalendarMonth({
          monthDate: addMonths(visibleMonth, monthOffset),
          mode,
        }))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={onClear}
          className="focus-ring rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
        >
          {translate("clear") || "Clear"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="focus-ring rounded-lg bg-gradient-to-r from-indigo-700 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-700/20 transition-colors hover:from-indigo-600 hover:to-violet-500"
        >
          {translate("done") || "Done"}
        </button>
      </div>
    </div>
    </DesktopTopLayerPopover>
  );

  const passengerRows = [
    { key: "adults", label: translate("adultPlural") || "Adults", subtitle: "18+", count: draftAdultCount, min: 1 },
    { key: "children", label: translate("childPlural") || "Children", subtitle: translate("childAgeRange") || "Ages 2–17", count: draftChildCount, min: 0 },
    { key: "infants", label: translate("infantPlural") || "Infants", subtitle: translate("under2") || "Under 2", count: draftInfantCount, min: 0 },
  ];
  const cabinOptions = [
    ["economy", translate("economy") || "Economy"],
    ["business", translate("business") || "Business"],
    ["first", translate("first") || "First"],
  ];

  const renderPassengerControlRows = (compact = false) => (
    <div className={cn(
      "overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_14px_38px_rgba(15,23,42,0.07)]",
      compact && "rounded-2xl border-slate-100 shadow-none"
    )}>
      {passengerRows.map((row) => {
        const draftTravelerCount = draftAdultCount + draftChildCount + draftInfantCount;
        const canDecrement = row.count > row.min;
        const canIncrement =
          draftTravelerCount < 9 &&
          (row.key !== "infants" || draftInfantCount < draftAdultCount);

        return (
          <div
            key={row.key}
            className={cn(
              "flex items-center justify-between gap-4 border-b border-slate-100 px-4 last:border-b-0",
              compact ? "py-3" : "py-4"
            )}
          >
            <span className="min-w-0">
              <span className={cn(
                "block tracking-tight sm:text-sm",
                compact
                  ? "text-base font-medium text-slate-900"
                  : "text-base font-extrabold text-slate-950"
              )}>
                {row.label}
              </span>
              <span className={cn(
                "mt-0.5 block text-xs leading-5 text-slate-500",
                compact ? "font-medium text-slate-600" : "font-medium"
              )}>
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
                    setDraftInfantCount((current) => Math.min(current, nextAdults));
                  }
                  if (row.key === "children") setDraftChildCount(Math.max(0, draftChildCount - 1));
                  if (row.key === "infants") setDraftInfantCount(Math.max(0, draftInfantCount - 1));
                }}
                disabled={!canDecrement}
                className={cn(
                  "focus-ring inline-flex items-center justify-center rounded-full border bg-white text-slate-700 shadow-sm transition-colors disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300 disabled:shadow-none",
                  compact ? "h-8 w-8 border-slate-200 text-slate-600 shadow-none hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800" : "h-10 w-10 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800"
                )}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className={cn(
                "tabular-nums text-center",
                compact
                  ? "min-w-7 text-sm font-medium text-slate-900"
                  : "min-w-8 text-base font-extrabold text-slate-950"
              )}>
                {row.count}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (row.key === "adults") {
                    if (draftTravelerCount >= 9) return;
                    setDraftAdultCount((current) => Math.min(9, current + 1));
                    return;
                  }
                  if (row.key === "children") {
                    if (draftTravelerCount >= 9) return;
                    setDraftChildCount((current) => Math.min(9, current + 1));
                    return;
                  }
                  if (row.key === "infants") {
                    if (draftTravelerCount >= 9 || draftInfantCount >= draftAdultCount) return;
                    setDraftInfantCount((current) => Math.min(draftAdultCount, current + 1));
                  }
                }}
                disabled={!canIncrement}
                className={cn(
                  "focus-ring inline-flex items-center justify-center rounded-full border bg-white text-slate-700 shadow-sm transition-colors disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300 disabled:shadow-none",
                  compact ? "h-8 w-8 border-slate-200 text-slate-600 shadow-none hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800" : "h-10 w-10 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800"
                )}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderCabinClassPicker = (compact = false) => (
    <div className={cn(
      "rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.07)]",
      compact && "rounded-2xl border-slate-100 p-3 shadow-none"
    )}>
      {!compact ? (
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
            {translate("cabinClass") || "Cabin class"}
          </p>
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-2">
        {cabinOptions.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setDraftCabinClass(value)}
            className={cn(
              "focus-ring min-h-11 rounded-2xl border px-2 text-center text-sm leading-4 transition-all",
              draftCabinClass === value
                ? cn(
                    "border-indigo-500 bg-indigo-700 text-white shadow-[0_10px_22px_rgba(67,56,202,0.22)]",
                    compact && "border-indigo-600 bg-indigo-600 shadow-none"
                  )
                : "border-slate-200 bg-slate-50/80 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800",
              compact ? "min-h-9 rounded-xl text-xs font-medium" : "font-extrabold"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderTravelersCabinPicker = () => (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
          {translate("passengers") || "Passengers"}
        </p>
        {renderPassengerControlRows()}
      </div>
      {renderCabinClassPicker()}
    </div>
  );

  return (
    <>
      <section className={wrapper}>
        {desktopPopoverOpen ? (
          <div aria-hidden="true" className={desktopOverlayGuardClassName} />
        ) : null}
      <div className={tabsClassName}>
        <button
          type="button"
          onClick={() =>
            setTab("flights")
          }
          className={cn(
            "focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
            compactHero && "lg:px-3.5 lg:py-2 lg:text-[15px]",
            tab === "flights"
              ? "bg-white text-navy shadow-sm"
              : "text-slate-600 hover:text-slate-800",
            compactHero && tab === "flights" && "lg:shadow-[0_3px_10px_rgba(15,23,42,0.08)]"
          )}
        >
          <Plane className="h-4 w-4" />
          {t.flights}
        </button>

        <button
          type="button"
          onClick={() =>
            setTab("hotels")
          }
          className={cn(
            "focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
            compactHero && "lg:px-3.5 lg:py-2 lg:text-[15px]",
            tab === "hotels"
              ? "bg-white text-navy shadow-sm"
              : "text-slate-600 hover:text-slate-800",
            compactHero && tab === "hotels" && "lg:shadow-[0_3px_10px_rgba(15,23,42,0.08)]"
          )}
        >
          <BedDouble className="h-4 w-4" />
          {t.hotels}
        </button>
      </div>

      {tab === "flights" ? (
        <form
          onSubmit={
            onFlightSubmit
          }
          className={formClassName}
        >
          <div className="flex items-center justify-between gap-2 px-1">
            <div
              ref={tripTypeWrapRef}
              className="relative inline-flex"
            >
              {compactHero ? (
                <div
                  role="radiogroup"
                  aria-label={t.tripType || "Trip type"}
                  className="inline-flex items-center gap-3 rounded-lg bg-white/80 px-0.5 py-1 lg:gap-1 lg:rounded-xl lg:border lg:border-slate-200 lg:bg-slate-50 lg:p-1"
                >
                  {(["round-trip", "one-way"] as const).map((mode) => {
                    const selected = tripType === mode;

                    return (
                      <button
                        key={mode}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onSelectTripType(mode)}
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
                          onSelectTripType(mode === "round-trip" ? "one-way" : "round-trip");
                        }}
                        className={cn(
                          "focus-ring group inline-flex min-h-8 items-center gap-2 rounded-lg px-1.5 py-1 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-950 lg:px-2.5",
                          selected && "text-slate-950 lg:bg-white lg:shadow-sm"
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors lg:h-[15px] lg:w-[15px]",
                            selected
                              ? "border-indigo-600 bg-white"
                              : "border-slate-300 bg-white group-hover:border-slate-400"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full bg-indigo-600 transition-opacity",
                              selected ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </span>
                        <span>{tripTypeLabel(mode)}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    aria-expanded={
                      tripTypeOpen
                    }
                    aria-haspopup="listbox"
                    onClick={() =>
                      setTripTypeOpen(
                        (
                          prevOpen
                        ) =>
                          !prevOpen
                      )
                    }
                    className="focus-ring inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-slate-700 transition-colors hover:text-slate-950"
                  >
                    {tripTypeLabel(
                      tripType
                    )}
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        "h-4 w-4 text-slate-500 transition-transform",
                        tripTypeOpen &&
                          "rotate-180"
                      )}
                    />
                  </button>

                  {tripTypeOpen && (
                    <div
                      role="listbox"
                      className="absolute left-0 top-full z-30 mt-1 min-w-[210px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10"
                    >
                      {(
                        [
                          "round-trip",
                          "one-way",
                        ] as const
                      ).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => onSelectTripType(mode)}
                          className={cn(
                            "focus-ring flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm font-medium transition-colors",
                            tripType ===
                              mode
                              ? "bg-slate-900 text-white"
                              : "text-slate-700 hover:bg-slate-100"
                          )}
                        >
                          {tripTypeLabel(
                            mode
                          )}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled
                        className="mt-0.5 flex w-full cursor-not-allowed items-center rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-slate-500"
                      >
                        {t.multiCity || "Multi-city"} —
                        {t.useOneWayOrRoundTripSearch || "Use one-way or round-trip search"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div className={fieldCardClassName}>
            <div className={flightGridClassName}>
              <div className={flightRouteGroupClassName}>
              <div
                ref={fromWrapRef}
                className={cn(
                  flightRouteFieldClassName("origin"),
                  fromOpen && desktopActiveFieldClassName
                )}
              >
                <label className={flightFieldLabelClassName}>
                  {t.origin ||
                    "Origin"}
                </label>
                <div className="relative h-8">
                  <button
                    ref={fromMobileLauncherRef}
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={activeMobileAirportPicker === "origin"}
                    onClick={() => {
                      setFromOpen(false);
                      setToOpen(false);
                      setActiveMobileAirportPicker("origin");
                    }}
                    className="focus-ring flex h-full w-full min-w-0 items-center rounded-md border-0 bg-transparent py-0 pl-0 pr-11 text-left text-[16px] text-slate-900 outline-none transition-colors sm:hidden"
                  >
                    <span className={cn("truncate", !from.trim() && "text-slate-400")}>
                      {from.trim() || t.fromPlaceholder || "From?"}
                    </span>
                  </button>
                  <input
                    ref={fromInputRef}
                    type="text"
                    value={from}
                    onChange={(
                      event
                    ) => {
                      const nextValue = event.target.value;
                      setFromState((current) => markOriginManualInput(current, nextValue));
                      if (nextValue.trim().length < 2) {
                        setFromLoading(false);
                        setFromLiveSuggestions([]);
                      }
                      setFromOpen(
                        true
                      );
                      setFromHighlight(
                        0
                      );
                    }}
                    onClick={() =>
                      setFromOpen(
                        true
                      )
                    }
                    onFocus={() =>
                      setFromOpen(
                        true
                      )
                    }
                    onKeyDown={(
                      event
                    ) =>
                      onKeyNav(
                        event,
                        true
                      )
                    }
                    placeholder={t.fromPlaceholder || "From?"}
                    className={flightFieldValueClassName}
                  />
                  {from.trim() ? (
                    <button
                      type="button"
                      onClick={onClearOrigin}
                      onMouseDown={(event) => event.preventDefault()}
                      aria-label={t.clearOrigin || "Clear origin"}
                      className="focus-ring absolute right-0 top-1/2 z-30 hidden h-9 w-9 -translate-y-1/2 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500/40 active:scale-95 sm:inline-flex sm:h-8 sm:w-8"
                    >
                      <X size={15} />
                    </button>
                  ) : null}
                </div>
                {shouldShowFromSuggestionsPanel ? renderDesktopAirportSuggestions({
                  inputId: "homepage-flight-origin",
                  suggestions: fromSuggestions,
                  highlight: fromHighlight,
                  isLoading: isFromLoadingVisible,
                  sectionLabel: fromState.source === "maxmind-default" ? translate("nearYou") : translate("airportsAndCities"),
                  onSelect: (option) => {
                    setFromState((current) => markOriginManualInput(
                      current,
                      formatAirportLabel(option),
                      option.code
                    ));
                    setFromOpen(false);
                  },
                }) : null}
              </div>
              <div className="relative z-20 -my-2 flex h-4 items-center justify-center sm:my-0 sm:h-auto lg:z-30">
                <button
                  type="button"
                  onClick={onSwapAirports}
                  className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40 sm:shadow-none lg:h-9 lg:w-9 lg:shadow-[0_1px_3px_rgba(15,23,42,0.10)]"
                  aria-label={t.swapOriginDestination || "Swap origin and destination"}
                >
                  <ArrowRightLeft size={14} />
                </button>
              </div>

              <div
                ref={toWrapRef}
                className={cn(
                  flightRouteFieldClassName("destination"),
                  toOpen && desktopActiveFieldClassName
                )}
              >
                <label className={flightFieldLabelClassName}>
                  {t.destination || "Destination"}
                </label>
                <div className="relative h-8">
                  <button
                    ref={toMobileLauncherRef}
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={activeMobileAirportPicker === "destination"}
                    onClick={() => {
                      setFromOpen(false);
                      setToOpen(false);
                      setActiveMobileAirportPicker("destination");
                    }}
                    className="focus-ring flex h-full w-full min-w-0 items-center rounded-md border-0 bg-transparent py-0 pl-0 pr-11 text-left text-[16px] text-slate-900 outline-none transition-colors sm:hidden"
                  >
                    <span className={cn("truncate", !to.trim() && "text-slate-400")}>
                      {to.trim() || t.toPlaceholder || "To?"}
                    </span>
                  </button>
                  <input
                    ref={toInputRef}
                    type="text"
                    value={to}
                    onChange={(
                      event
                    ) => {
                      const nextValue = event.target.value;
                      setTo(nextValue);
                      if (nextValue.trim().length < 2) {
                        setToLoading(false);
                        setToLiveSuggestions([]);
                      }
                      setToCode("");
                      setToOpen(
                        true
                      );
                      setToHighlight(
                        0
                      );
                    }}
                    onFocus={() =>
                      setToOpen(true)
                    }
                    onKeyDown={(
                      event
                    ) =>
                      onKeyNav(
                        event,
                        false
                      )
                    }
                    placeholder={t.toPlaceholder || "To?"}
                    className={flightFieldValueClassName}
                  />
                  {to.trim() ? (
                    <button
                      type="button"
                      onClick={onClearDestination}
                      onMouseDown={(event) => event.preventDefault()}
                      aria-label={t.clearDestination || "Clear destination"}
                      className="focus-ring absolute right-0 top-1/2 z-30 hidden h-9 w-9 -translate-y-1/2 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500/40 active:scale-95 sm:inline-flex sm:h-8 sm:w-8"
                    >
                      <X size={15} />
                    </button>
                  ) : null}
                </div>
                {shouldShowToSuggestionsPanel ? renderDesktopAirportSuggestions({
                  inputId: "homepage-flight-destination",
                  suggestions: toSuggestions,
                  highlight: toHighlight,
                  isLoading: isToLoadingVisible,
                  sectionLabel: translate("airportsAndCities"),
                  onSelect: (option) => {
                    setTo(formatAirportLabel(option));
                    setToCode(option.code);
                    setToOpen(false);
                  },
                }) : null}
              </div>
              </div>

              <div
                ref={dateWrapRef}
                className={cn(
                  "relative rounded-xl border border-slate-300 bg-white",
                  flightJoinedFieldClassName,
                  flightDatesOpen && desktopActiveFieldClassName
                )}
              >
                <label className={flightFieldLabelClassName}>
                  {t.departureDate ||
                    t.travelDates || "Travel dates"}
                </label>
                <button
                  type="button"
                  ref={flightDatesLauncherRef}
                  onClick={() =>
                    setFlightDatesOpen(
                      (
                        prev
                      ) => !prev
                    )
                  }
                  aria-expanded={
                    flightDatesOpen
                  }
                  aria-haspopup="dialog"
                  aria-label={translate("chooseTravelDates") || "Choose travel dates"}
                  className={flightFieldButtonClassName}
                >
                  <Calendar
                    size={16}
                    className="shrink-0 text-slate-500"
                  />
                  <span className="truncate">
                    {dateSummary}
                  </span>
                </button>
                {departureDate ? (
                  <button
                    type="button"
                    onClick={onClearTravelDates}
                    onMouseDown={(event) => event.preventDefault()}
                    aria-label={t.clearTravelDates || "Clear travel dates"}
                    className="focus-ring absolute right-2 top-6 inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 active:scale-95"
                  >
                    <X size={14} />
                  </button>
                ) : null}

                {flightDatesOpen ? (
                  <>
                    <FlightMobilePickerShell
                      open={flightDatesOpen}
                      title={translate("chooseTravelDates") || "Choose travel dates"}
                      titleId="homepage-flight-dates-title"
                      launcherRef={flightDatesLauncherRef}
                      footer={flightDatesFooter}
                      onClose={() => setFlightDatesOpen(false)}
                      contentClassName="px-4 py-4"
                    >
                      {renderFlightDateCalendar()}
                    </FlightMobilePickerShell>
                    {renderDesktopCalendarPopover({
                      launcherRef: flightDatesLauncherRef,
                      mode: "flights",
                      visibleMonth: visibleMonthDate,
                      setVisibleMonth: setVisibleMonthDate,
                      onClear: () => {
                        setDepartureDate("");
                        setReturnDate("");
                      },
                      onDone: () => setFlightDatesOpen(false),
                    })}
                  </>
                ) : null}
              </div>

              <div
                ref={travelersWrapRef}
                className={cn(
                  "relative rounded-xl border border-slate-300 bg-white",
                  flightJoinedFieldClassName,
                  travelersMenuOpen && desktopTravelersFieldClassName
                )}
              >
                <label className={flightFieldLabelClassName}>
                  {t.travelers}
                </label>
                <button
                  type="button"
                  aria-expanded={
                    travelersMenuOpen
                  }
                  aria-haspopup="dialog"
                  ref={travelersLauncherRef}
                  onClick={() => {
                    if (travelersMenuOpen) {
                      cancelTravelersDraft();
                      return;
                    }
                    openTravelersMenu();
                  }}
                  className={cn(flightFieldButtonClassName, "justify-between pr-0")}
                >
                  <span className="block min-w-0 truncate">
                      {
                        travelerSummary
                      }
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-slate-500 transition-transform",
                      travelersMenuOpen &&
                        "rotate-180"
                    )}
                  />
                </button>
                {travelersMenuOpen ? (
                  <>
                    <FlightMobilePickerShell
                      open={travelersMenuOpen}
                      title={translate("passengers") || t.travelers || "Travelers"}
                      titleId="homepage-flight-travelers-title"
                      launcherRef={travelersLauncherRef}
                      footer={
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={applyTravelersDraft}
                            className={cn(mobileDoneButtonClassName, "px-5 py-3")}
                          >
                            {t.done || "Done"}
                          </button>
                        </div>
                      }
                      onClose={cancelTravelersDraft}
                      contentClassName="px-4 py-5"
                    >
                      {renderTravelersCabinPicker()}
                    </FlightMobilePickerShell>
                    <DesktopTopLayerPopover
                      open
                      launcherRef={travelersLauncherRef}
                      align="right"
                      width={360}
                      className={cn("p-4", desktopTravelersPopoverClassName)}
                    >
                    <div
                      role="dialog"
                      aria-label="Travelers and cabin"
                      className="bg-white"
                    >
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.11em] text-slate-600">
                          {translate("passengers") || "Passengers"}
                        </p>
                        <h3 className="mt-1 text-[15px] font-medium tracking-tight text-slate-950">
                          {translate("passengers") || t.travelers || "Travelers"}
                        </h3>
                      </div>
                      <div className="mt-3 space-y-4">
                        {renderPassengerControlRows(true)}
                        <div>
                          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.11em] text-slate-600">
                            {translate("cabinClass") || "Cabin class"}
                          </p>
                          {renderCabinClassPicker(true)}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                        <button type="button" onClick={applyTravelersDraft} className="focus-ring rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600">{t.done || "Done"}</button>
                      </div>
                    </div>
                    </DesktopTopLayerPopover>
                  </>
                ) : null}
              </div>
              <div className={submitWrapClassName}>
                <Button
                  type="submit"
                  disabled={
                    isFlightSearchDisabled
                  }
                  aria-busy={isFlightSubmitting}
                  aria-label={t.searchFlights || "Search flights"}
                  className={submitButtonClassName}
                >
                  {isFlightSubmitting
                    ? t.searchingFlights || "Searching flights..."
                    : t.search || "Search"}
                </Button>
              </div>
            </div>
          </div>
          {hasActiveFlightSearch && !compactHero ? (
            <div className="grid w-full grid-cols-1 px-1 pt-0.5 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1.45fr)_minmax(0,1.2fr)_112px] lg:px-0">
              <div className="flex justify-end lg:col-start-4">
                <button
                  type="button"
                  onClick={onResetFlightSearch}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.clearAll || t.clear}
                </button>
              </div>
            </div>
          ) : null}

          {renderMobileAirportPicker({
            open: activeMobileAirportPicker === "origin",
            title: t.chooseOrigin || "Choose origin",
            inputId: "homepage-origin-picker-search",
            value: from,
            suggestions: fromSuggestions,
            isLoading: isFromLoadingVisible,
            launcherRef: fromMobileLauncherRef,
            inputRef: fromMobilePickerInputRef,
            onChange: (nextValue) => {
              setFromState((current) => markOriginManualInput(current, nextValue));
              if (nextValue.trim().length < 2) {
                setFromLoading(false);
                setFromLiveSuggestions([]);
              }
              setFromHighlight(0);
            },
            onClear: () => {
              setFromState((current) => markOriginManualInput(current, ""));
              setFromLoading(false);
              setFromLiveSuggestions([]);
              setFromHighlight(0);
            },
            onSelect: (option) => {
              setFromState((current) => markOriginManualInput(current, formatAirportLabel(option), option.code));
              setActiveMobileAirportPicker(null);
            },
            onClose: () => setActiveMobileAirportPicker(null),
          })}
          {renderMobileAirportPicker({
            open: activeMobileAirportPicker === "destination",
            title: t.chooseDestination || "Choose destination",
            inputId: "homepage-destination-picker-search",
            value: to,
            suggestions: toSuggestions,
            isLoading: isToLoadingVisible,
            launcherRef: toMobileLauncherRef,
            inputRef: toMobilePickerInputRef,
            onChange: (nextValue) => {
              setTo(nextValue);
              if (nextValue.trim().length < 2) {
                setToLoading(false);
                setToLiveSuggestions([]);
              }
              setToCode("");
              setToHighlight(0);
            },
            onClear: () => {
              setTo("");
              setToLoading(false);
              setToLiveSuggestions([]);
              setToCode("");
              setToHighlight(0);
            },
            onSelect: (option) => {
              setTo(formatAirportLabel(option));
              setToCode(option.code);
              setActiveMobileAirportPicker(null);
            },
            onClose: () => setActiveMobileAirportPicker(null),
          })}
        </form>
      ) : (
        <form
          onSubmit={
            onHotelSubmit
          }
          className={formClassName}
        >
          <div className={fieldCardClassName}>
            <div className={hotelGridClassName}>
              <div className={cn("relative rounded-xl border border-slate-300 bg-white lg:rounded-l-xl", hotelJoinedFieldClassName)}>
                <label className={hotelFieldLabelClassName}>
                  {t.destination || "Destination"}
                </label>
                <button
                  ref={hotelDestinationMobileLauncherRef}
                  type="button"
                  onClick={() => {
                    setHotelDestinationMobilePickerOpen(true);
                    setHotelDatesOpen(false);
                    setHotelGuestsRoomsOpen(false);
                  }}
                  aria-haspopup="dialog"
                  aria-expanded={hotelDestinationMobilePickerOpen}
                  aria-label={t.chooseHotelDestination || "Choose hotel destination"}
                  className={cn(hotelFieldValueClassName, "justify-between sm:hidden")}
                >
                  <span className={cn("truncate", !destination.trim() && "text-slate-400")}>
                    {destination.trim() || t.cityOrHotel || "City or hotel"}
                  </span>
                  <ChevronDown
                    size={16}
                    className={cn(
                      "shrink-0 text-slate-500 transition-transform",
                      hotelDestinationMobilePickerOpen && "rotate-180",
                    )}
                  />
                </button>
                <input
                  type="text"
                  value={
                    destination
                  }
                  onChange={(
                    event
                  ) =>
                    setDestination(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder={t.cityOrHotel || "City or hotel"}
                  className={cn(hotelFieldValueClassName, "hidden sm:block")}
                  required
                />
              </div>
              <div
                ref={hotelDateWrapRef}
                className={cn(
                  "relative rounded-xl border border-slate-300 bg-white",
                  hotelJoinedFieldClassName,
                  hotelDatesOpen && desktopActiveFieldClassName
                )}
              >
                <label className={hotelFieldLabelClassName}>
                  {t.hotelSearchTravelDatesLabel ||
                    t.travelDates || "Travel dates"}
                </label>
                <button
                  ref={hotelDatesMobileLauncherRef}
                  type="button"
                  onClick={() => {
                    setHotelDatesOpen((prev) => !prev);
                    setHotelDestinationMobilePickerOpen(false);
                    setHotelGuestsRoomsOpen(false);
                  }}
                  aria-expanded={
                    hotelDatesOpen
                  }
                  aria-haspopup="dialog"
                  aria-label={translate("chooseTravelDates") || "Choose travel dates"}
                  className={cn(hotelFieldValueClassName, "items-center")}
                >
                  <Calendar
                    size={16}
                    className="shrink-0 text-slate-500"
                  />
                  <span className="truncate">
                    {hotelDateSummary}
                  </span>
                </button>
                {hotelDatesOpen ? (
                  <>
                    <div ref={hotelDatesPanelRef}>
                      {renderDesktopCalendarPopover({
                        launcherRef: hotelDatesMobileLauncherRef,
                        mode: "hotels",
                        visibleMonth: hotelVisibleMonthDate,
                        setVisibleMonth: setHotelVisibleMonthDate,
                        onClear: () => {
                          setCheckIn("");
                          setCheckOut("");
                        },
                        onDone: () => setHotelDatesOpen(false),
                      })}
                    </div>
                  </>
                ) : null}
              </div>
              <div
                ref={hotelGuestsRoomsWrapRef}
                className={cn(
                  "relative rounded-xl border border-slate-300 bg-white",
                  hotelJoinedFieldClassName,
                  hotelGuestsRoomsOpen && desktopActiveFieldClassName
                )}
              >
                <label className={hotelFieldLabelClassName}>
                  {t.hotelSearchGuestsLabel ||
                    t.guests ||
                    "Guests"}
                </label>
                <button
                  ref={hotelGuestsRoomsMobileLauncherRef}
                  type="button"
                  onClick={() => {
                    setHotelGuestsRoomsOpen((prev) => !prev);
                    setHotelDestinationMobilePickerOpen(false);
                    setHotelDatesOpen(false);
                  }}
                  aria-expanded={
                    hotelGuestsRoomsOpen
                  }
                  aria-haspopup="dialog"
                  aria-label={translate("chooseGuestsAndRooms") || "Choose guests and rooms"}
                  className={cn(hotelFieldValueClassName, "justify-between")}
                >
                  <span className="truncate">
                    {hotelGuestsRoomsSummary}
                  </span>
                  <ChevronDown
                    size={16}
                    className={cn(
                      "shrink-0 text-slate-500 transition-transform",
                      hotelGuestsRoomsOpen && "rotate-180"
                    )}
                  />
                </button>
                {hotelGuestsRoomsOpen ? (
                  <DesktopTopLayerPopover
                    open
                    launcherRef={hotelGuestsRoomsMobileLauncherRef}
                    align="right"
                    width={360}
                    className="p-4"
                  >
                  <div
                    role="dialog"
                    aria-label={translate("guestsAndRooms") || "Guests and rooms"}
                    className="bg-white"
                  >
                    <div className="mb-3">
                      <p className="text-[10px] font-medium uppercase tracking-[0.11em] text-slate-600">
                        {translate("hotelStayDetails") || "Stay details"}
                      </p>
                      <h3 className="mt-1 text-[15px] font-medium tracking-tight text-slate-950">
                        {translate("guestsAndRooms") || "Guests and rooms"}
                      </h3>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                      {[
                        {
                          key: "adults",
                          label: translate("adults") || "Adults",
                          helper: translate("hotelAdultHelper") || "Guests 18+",
                          value: hotelAdultCount,
                          min: 1,
                          max: 12 - hotelChildCount,
                          onDecrement: () =>
                            setHotelAdultCount((prev) =>
                              Math.max(1, prev - 1)
                            ),
                          onIncrement: () =>
                            setHotelAdultCount((prev) =>
                              Math.min(12 - hotelChildCount, prev + 1)
                            ),
                        },
                        {
                          key: "children",
                          label: translate("children") || "Children",
                          helper: translate("hotelChildrenHelper") || "Ages 0–17",
                          value: hotelChildCount,
                          min: 0,
                          max: 12 - hotelAdultCount,
                          onDecrement: () =>
                            setHotelChildCount((prev) =>
                              Math.max(0, prev - 1)
                            ),
                          onIncrement: () =>
                            setHotelChildCount((prev) =>
                              Math.min(12 - hotelAdultCount, prev + 1)
                            ),
                        },
                        {
                          key: "rooms",
                          label: translate("rooms") || "Rooms",
                          helper: translate("hotelRoomsHelper") || "Up to 6 rooms",
                          value: Number(rooms),
                          min: 1,
                          max: 6,
                          onDecrement: () =>
                            setRooms((prev) =>
                              String(
                                Math.max(
                                  1,
                                  Number(prev) - 1
                                )
                              )
                            ),
                          onIncrement: () =>
                            setRooms((prev) =>
                              String(
                                Math.min(
                                  6,
                                  Number(prev) + 1
                                )
                              )
                            ),
                        },
                      ].map((row) => {
                        const canDecrement = row.value > row.min;
                        const canIncrement = row.value < row.max;

                        return (
                          <div
                            key={row.key}
                            className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0"
                          >
                            <span className="min-w-0">
                              <span className="block text-sm font-medium tracking-tight text-slate-900">
                                {row.label}
                              </span>
                              <span className="mt-0.5 block text-xs font-medium leading-5 text-slate-600">
                                {row.helper}
                              </span>
                            </span>
                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                type="button"
                                onClick={row.onDecrement}
                                disabled={!canDecrement}
                                className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="min-w-7 text-center text-sm font-medium tabular-nums text-slate-900">
                                {row.value}
                              </span>
                              <button
                                type="button"
                                onClick={row.onIncrement}
                                disabled={!canIncrement}
                                className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      <div className="px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-medium tracking-tight text-slate-900">
                              {translate("petFriendly") || "Pet-friendly"}
                            </p>
                            <p className="mt-0.5 text-xs font-medium leading-5 text-slate-600">
                              {translate("onlyShowPetFriendlyStays") ||
                                "Only show stays that allow pets"}
                            </p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={hotelPetFriendly}
                            aria-label={
                              translate("togglePetFriendlyStays") ||
                              "Toggle pet-friendly stays"
                            }
                            onClick={() =>
                              setHotelPetFriendly((prev) => !prev)
                            }
                            className={cn(
                              "focus-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
                              hotelPetFriendly
                                ? "border-indigo-600 bg-indigo-600"
                                : "border-slate-300 bg-slate-200"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                                hotelPetFriendly
                                  ? "translate-x-5"
                                  : "translate-x-0.5"
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  </DesktopTopLayerPopover>
                ) : null}
              </div>
              <div className={hotelSubmitWrapClassName}>
                <Button
                  type="submit"
                  disabled={
                    isHotelSearchDisabled
                  }
                  aria-busy={isHotelSubmitting}
                  aria-label={t.searchHotels || "Search hotels"}
                  className={hotelSubmitButtonClassName}
                >
                  {isHotelSubmitting
                    ? t.searchingHotels || "Searching hotels..."
                    : t.search || "Search"}
                </Button>
              </div>
            </div>
          </div>

          <HotelDestinationMobilePicker
            open={hotelDestinationMobilePickerOpen}
            value={destination}
            titleId="homepage-hotel-mobile-destination-title"
            inputId="homepage-hotel-mobile-destination-input"
            launcherRef={hotelDestinationMobileLauncherRef}
            detectedCountryHint={countryHint}
            onChange={(nextDestination) => setDestination(nextDestination)}
            onClose={() => setHotelDestinationMobilePickerOpen(false)}
          />

          <HotelMobilePickerShell
            open={hotelDatesOpen}
            title={translate("chooseTravelDates") || "Choose travel dates"}
            titleId="homepage-hotel-mobile-dates-title"
            launcherRef={hotelDatesMobileLauncherRef}
            onClose={() => setHotelDatesOpen(false)}
            contentClassName="px-3 py-3"
            footer={
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCheckIn("");
                    setCheckOut("");
                  }}
                  className="focus-ring rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  {translate("clear") || "Clear"}
                </button>
                <button
                  type="button"
                  onClick={() => setHotelDatesOpen(false)}
                  className={cn(mobileDoneButtonClassName, "px-4 py-2")}
                >
                  {translate("done") || "Done"}
                </button>
              </div>
            }
          >
            {renderHotelDateCalendar()}
          </HotelMobilePickerShell>

          <HotelMobilePickerShell
            open={hotelGuestsRoomsOpen}
            title={translate("guestsAndRooms") || "Guests and rooms"}
            titleId="homepage-hotel-mobile-guests-title"
            launcherRef={hotelGuestsRoomsMobileLauncherRef}
            onClose={() => setHotelGuestsRoomsOpen(false)}
            footer={
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setHotelGuestsRoomsOpen(false)}
                  className={cn(mobileDoneButtonClassName, "px-4 py-2")}
                >
                  {t.done || "Done"}
                </button>
              </div>
            }
          >
            <div className="mx-auto w-full max-w-xl divide-y divide-slate-200/80">
              {[
                {
                  key: "adults",
                  label: translate("adults") || "Adults",
                  value: hotelAdultCount,
                  min: 1,
                  max: 12 - hotelChildCount,
                  onDecrement: () => setHotelAdultCount((prev) => Math.max(1, prev - 1)),
                  onIncrement: () =>
                    setHotelAdultCount((prev) => Math.min(12 - hotelChildCount, prev + 1)),
                },
                {
                  key: "children",
                  label: translate("children") || "Children",
                  value: hotelChildCount,
                  min: 0,
                  max: 12 - hotelAdultCount,
                  onDecrement: () => setHotelChildCount((prev) => Math.max(0, prev - 1)),
                  onIncrement: () =>
                    setHotelChildCount((prev) => Math.min(12 - hotelAdultCount, prev + 1)),
                },
                {
                  key: "rooms",
                  label: translate("rooms") || "Rooms",
                  value: Number(rooms),
                  min: 1,
                  max: 6,
                  onDecrement: () => setRooms((prev) => String(Math.max(1, Number(prev) - 1))),
                  onIncrement: () => setRooms((prev) => String(Math.min(6, Number(prev) + 1))),
                },
              ].map((row) => {
                const canDecrement = row.value > row.min;
                const canIncrement = row.value < row.max;

                return (
                  <div
                    key={row.key}
                    className="flex items-center justify-between gap-4 px-1 py-4"
                  >
                    <span className="text-[15px] font-bold text-slate-950">{row.label}</span>
                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={row.onDecrement}
                        disabled={!canDecrement}
                        className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <span className="min-w-8 text-center text-base font-black tabular-nums text-slate-950">
                        {row.value}
                      </span>
                      <button
                        type="button"
                        onClick={row.onIncrement}
                        disabled={!canIncrement}
                        className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between gap-4 px-1 py-4">
                <div>
                  <p className="text-[15px] font-bold text-slate-950">
                    {translate("petFriendly") || "Pet-friendly"}
                  </p>
                  <p className="text-sm leading-5 text-slate-600">
                    {translate("onlyShowPetFriendlyStays") ||
                      "Only show stays that allow pets"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={hotelPetFriendly}
                  aria-label={
                    translate("togglePetFriendlyStays") ||
                    "Toggle pet-friendly stays"
                  }
                  onClick={() => setHotelPetFriendly((prev) => !prev)}
                  className={cn(
                    "focus-ring relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors",
                    hotelPetFriendly
                      ? "border-indigo-600 bg-indigo-600"
                      : "border-slate-300 bg-slate-200",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform",
                      hotelPetFriendly ? "translate-x-5" : "translate-x-0.5",
                    )}
                  />
                </button>
              </div>
            </div>
          </HotelMobilePickerShell>
        </form>
      )}
      </section>
    </>
  );
}
