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
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";

import {
  ArrowRightLeft,
  BedDouble,
  Building2,
  Calendar,
  CarFront,
  Clock,
  MapPin,
  ChevronDown,
  Minus,
  Plane,
  Plus,
  RotateCcw,
  UserRound,
  X,
} from "lucide-react";
import { PackagesIcon } from "@/components/icons/PackagesIcon";

import { useLocale } from "@/components/layout/LocaleProvider";
import { useRouteProgress } from "@/components/layout/RouteProgress";
import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
import { MobileAirportPicker } from "@/components/search/MobileAirportPicker";
import { MobileDatePickerDialog } from "@/components/search/MobileDateRangePicker";
import { MobileTravelerCabinPicker } from "@/components/search/MobileTravelerCabinPicker";
import { HotelDestinationMobilePicker } from "@/components/search/HotelDestinationMobilePicker";
import {
  hotelDestinationKindLabels,
  hotelDestinationKindTranslationKeys,
  useHotelDestinationAutocomplete,
} from "@/components/search/useHotelDestinationAutocomplete";
import { HotelMobilePickerShell } from "@/components/search/HotelMobilePickerShell";
import { MobileHotelGuestsRoomsPicker } from "@/components/search/MobileHotelGuestsRoomsPicker";
import { DealsSearchForm } from "@/components/search/DealsSearchForm";
import { CarLocationAutocomplete } from "@/components/search/CarLocationAutocomplete";
import { resolveDesktopPopoverGeometry } from "@/components/search/desktopPopoverGeometry";
import { MobileCarLocationPicker } from "@/components/search/MobileCarLocationPicker";
import {
  CarsDriverAgePickerContent,
  CarsRentalDatePickerContent,
  CarsTimeRangePickerContent,
  MobileCarDriverAgePickerDialog,
  MobileCarTimePickerDialog,
} from "@/components/search/CarsPickerContent";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  buildFlightRecentSearch,
  buildHotelRecentSearch,
  syncBackendRecentSearch,
  upsertRecentSearch,
} from "@/lib/recent-searches";
import {
  formatAirportLabel,
  getLocalizedAirportCountryName,
  getLocalizedCityName,
  type AirportOption,
} from "@/data/airports";
import { getHomeDiscoveryByRegion, homeDiscoveryByRegion } from "@/data/homeDiscovery";
import { translations as enTranslations } from "@/lib/i18n/en";
import {
  getLocalizedHotelDestinationCityName,
  getLocalizedHotelDestinationDetail,
  type HotelDestinationSuggestion,
} from "@/data/hotelDestinations";
import {
  applyDefaultOrigin,
  canApplyDefaultOrigin,
  markOriginManualInput,
  type OriginFieldState,
} from "@/lib/flights/defaultOrigin";
import {
  formatFlightsDateSummary,
  formatFlightsMonthHeading,
  normalizeFlightsCalendarLocale,
} from "@/lib/flights/dateFormatting";
import {
  defaultDriverAge,
  addMonths as addCarsMonths,
  getLocalizedWeekdays,
  isBeforeToday as isCarsDateBeforeToday,
  parseIsoDate as parseCarsIsoDate,
  toIsoDate as toCarsIsoDate,
  validateCarsForm,
  type CarsFormErrors,
  type CarsFormValues,
} from "@/lib/cars/carsSearchUtils";

type TabMode =
  | "flights"
  | "hotels"
  | "cars"
  | "deals";

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
  mobileHomepage?: boolean;
  locale?: string;
};

const normalizeHomepageCalendarLocale = normalizeFlightsCalendarLocale;

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

const formatCalendarWeekday = (
  formatter: Intl.DateTimeFormat,
  date: Date,
  calendarLocale: string
) => {
  const formatted = formatter.format(date);

  if (calendarLocale === "de-DE") {
    return `${formatted.replace(/\.$/, "")}.`;
  }

  if (calendarLocale === "th-TH-u-ca-gregory") {
    return ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"][date.getDay()] ?? formatted;
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
  "focus-ring min-h-11 rounded-xl bg-[#004BB8] px-6 text-sm font-bold text-white shadow-[0_8px_18px_rgba(2,28,43,0.14)] transition-colors hover:bg-[#021C2B] active:bg-[#021C2B] focus-visible:ring-[#004BB8]/35";

type DesktopTopLayerPopoverProps = {
  open: boolean;
  launcherRef?: RefObject<HTMLElement | null>;
  launcherId?: string;
  align?: "left" | "center" | "right";
  width: number;
  maxViewportGutter?: number;
  offset?: number;
  className?: string;
  panelRef?: RefObject<HTMLDivElement | null>;
  id?: string;
  role?: "dialog" | "listbox";
  ariaLabel?: string;
  placement?: "auto" | "above" | "below";
  desiredHeight?: number;
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
  launcherId,
  align = "left",
  width,
  maxViewportGutter = 16,
  offset = 12,
  className,
  panelRef,
  id,
  role,
  ariaLabel,
  placement = "auto",
  desiredHeight,
  children,
}: DesktopTopLayerPopoverProps) {
  const [anchorRect, setAnchorRect] = useState<{
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
  } | null>(null);

  const viewportSnapshot = useSyncExternalStore(
    subscribeToViewportChanges,
    () => (typeof window === "undefined"
      ? getDesktopPopoverServerSnapshot()
      : `${window.innerWidth}:${window.innerHeight}:${window.scrollX}:${window.scrollY}`),
    getDesktopPopoverServerSnapshot
  );

  const updateAnchorRect = useCallback(() => {
    const launcher = launcherRef?.current ?? (launcherId ? document.getElementById(launcherId) : null);
    const rect = launcher?.getBoundingClientRect();
    setAnchorRect(rect
      ? {
          bottom: rect.bottom,
          top: rect.top,
          left: rect.left,
          right: rect.right,
          width: rect.width,
        }
      : null);
  }, [launcherId, launcherRef]);

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
  const availableAbove = Math.max(0, anchorRect.top - offset - maxViewportGutter);
  const availableBelow = Math.max(
    0,
    window.innerHeight - anchorRect.bottom - offset - maxViewportGutter
  );
  const geometry = resolveDesktopPopoverGeometry({
    availableAbove,
    availableBelow,
    desiredHeight,
    placement,
  });
  const resolvedPlacement = geometry.placement;
  const launcherIsVisible = anchorRect.bottom > maxViewportGutter
    && anchorRect.top < window.innerHeight - maxViewportGutter
    && anchorRect.right > maxViewportGutter
    && anchorRect.left < viewportWidth - maxViewportGutter;

  if (!launcherIsVisible) return null;

  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role={role}
      aria-label={ariaLabel}
      data-desktop-search-popover="true"
      data-placement={resolvedPlacement}
      data-viewport-snapshot={viewportSnapshot}
      style={{
        left,
        ...(resolvedPlacement === "above"
          ? { bottom: window.innerHeight - anchorRect.top + offset }
          : { top: anchorRect.bottom + offset }),
        width: panelWidth,
        maxWidth,
        maxHeight: geometry.maxHeight,
      }}
      className={cn(
        "fixed hidden overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.14)] sm:block",
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


function CarsSummaryField({
  id,
  label,
  value,
  open,
  onOpenChange,
  className,
  children,
  popupRole = "dialog",
  desktopAlign = "left",
  desktopWidth = 448,
  desktopPanelClassName = "p-3",
  desktopPlacement = "auto",
  desktopDesiredHeight,
  leadingIcon,
  showChevron = true,
  valueClassName,
  mobilePresentation = "inline",
}: {
  id: string;
  label: string;
  value: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  children: ReactNode;
  popupRole?: "dialog" | "listbox";
  desktopAlign?: "left" | "center" | "right";
  desktopWidth?: number;
  desktopPanelClassName?: string;
  desktopPlacement?: "auto" | "above" | "below";
  desktopDesiredHeight?: number;
  leadingIcon?: ReactNode;
  showChevron?: boolean;
  valueClassName?: string;
  mobilePresentation?: "inline" | "shell";
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelId = `${id}-popup`;
  const wasOpenRef = useRef(open);
  const isSmViewport = useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia("(min-width: 640px)");
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia("(min-width: 640px)").matches,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    // A mobile shell is portalled outside wrapperRef. Its own full-screen
    // dialog owns dismissal, so treating document pointer events as desktop
    // outside clicks would unmount it on pointerdown before option clicks run.
    const listenForOutsidePointer =
      mobilePresentation !== "shell" || isSmViewport;
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target) && !panelRef.current?.contains(target)) onOpenChange(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onOpenChange(false);
      launcherRef.current?.focus({ preventScroll: true });
    };
    if (listenForOutsidePointer) {
      document.addEventListener("pointerdown", closeOnOutsideClick);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      if (listenForOutsidePointer) {
        document.removeEventListener("pointerdown", closeOnOutsideClick);
      }
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isSmViewport, mobilePresentation, onOpenChange, open]);

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      launcherRef.current?.focus({ preventScroll: true });
    }
    wasOpenRef.current = open;
  }, [open]);

  const panel = <div id={panelId} ref={panelRef} role={popupRole} aria-label={label} data-cars-popover-content className="w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:w-auto">{children}</div>;

  return (
    <div ref={wrapperRef} className={cn("relative rounded-xl border border-slate-300 bg-white", className)}>
      <span className="mb-1 block text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-slate-500 lg:text-[10px] lg:tracking-[0.10em] lg:text-slate-600">{label}</span>
      <button ref={launcherRef} type="button" aria-expanded={open} aria-controls={panelId} aria-haspopup={popupRole} onClick={() => onOpenChange(!open)} className="flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-md text-start text-[16px] font-medium text-slate-900 outline-none focus-visible:ring-0 sm:text-[15px] lg:text-[15px]">
        <span className={cn("flex min-w-0 items-center gap-2 truncate", valueClassName)}>
          {leadingIcon}
          <span className="truncate">{value}</span>
        </span>
        {showChevron ? <ChevronDown aria-hidden="true" className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} /> : null}
      </button>
      {open ? (isSmViewport
        ? <DesktopTopLayerPopover open={open} launcherRef={launcherRef} align={desktopAlign} width={desktopWidth} panelRef={panelRef} id={panelId} role={popupRole} ariaLabel={label} className={desktopPanelClassName} placement={desktopPlacement} desiredHeight={desktopDesiredHeight}>{children}</DesktopTopLayerPopover>
        : mobilePresentation === "inline" ? <div className="mt-3">{panel}</div> : null) : null}
    </div>
  );
}

export function SearchTabs({
  t: translations,
  compactHero = false,
  mobileHomepage = false,
  locale,
}: SearchTabsProps) {
  const {
    locale: activeLocale,
    t: localeTranslations,
  } = useLocale();
  const { status: sessionStatus } = useSession();

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
  const translateHotelTravelDateText = useCallback(
    (key: string) =>
      localeTranslations[key] || t[key] || enTranslations[key] || "",
    [localeTranslations, t]
  );
  const translateFlightCalendarNavText = useCallback(
    (key: string) =>
      localeTranslations[key] || t[key] || enTranslations[key] || "",
    [localeTranslations, t]
  );

  const calendarLocale = useMemo(
    () => normalizeHomepageCalendarLocale(locale ?? activeLocale),
    [activeLocale, locale]
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
  const mobileDatePickerLabels = {
    selectDates: translate("carsResults.selectDates") || "Select dates",
    start: translate("mobileDatePicker.start") || "Start",
    end: translate("mobileDatePicker.end") || "End",
    done: translate("done") || "Done",
    selectDatePrefix: translate("selectDateAriaPrefix") || "Select",
  };

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
  const toMobileLauncherRef =
    useRef<HTMLButtonElement>(null);
  const dateWrapRef =
    useRef<HTMLDivElement>(null);
  const flightDatesLauncherRef =
    useRef<HTMLButtonElement>(null);
  const hotelDestinationMobileLauncherRef =
    useRef<HTMLButtonElement>(null);
  const hotelDestinationDesktopWrapRef = useRef<HTMLDivElement>(null);
  const hotelDestinationDesktopInputRef = useRef<HTMLInputElement>(null);
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
  const [isCarsSubmitting, setIsCarsSubmitting] =
    useState(false);
  const [carsValues, setCarsValues] = useState<CarsFormValues>({
    pickupLocation: "",
    pickupDate: "",
    pickupTime: "10:00",
    dropoffDate: "",
    dropoffTime: "10:00",
    driverAge: defaultDriverAge,
    returnToDifferentLocation: false,
    dropoffLocation: "",
  });
  const [carsErrors, setCarsErrors] = useState<CarsFormErrors>({});
  const [carsOpenPicker, setCarsOpenPicker] = useState<
    "pickup" | "dropoff" | "dates" | "times" | "age" | null
  >(null);
  const [carsDraftTimes, setCarsDraftTimes] = useState({
    pickupTime: "10:00",
    dropoffTime: "10:00",
  });
  const [carsVisibleMonthDate, setCarsVisibleMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const carsSearchSurfaceRef = useRef<HTMLDivElement | null>(null);
  const carsPickupFieldRef = useRef<HTMLDivElement | null>(null);
  const carsDropoffFieldRef = useRef<HTMLDivElement | null>(null);
  const carsPickupLauncherRef = useRef<HTMLButtonElement | null>(null);
  const carsDropoffLauncherRef = useRef<HTMLButtonElement | null>(null);

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
  const [draftHotelAdults, setDraftHotelAdults] = useState(1);
  const [draftHotelChildren, setDraftHotelChildren] = useState(0);
  const [draftHotelRooms, setDraftHotelRooms] = useState(1);
  const [draftHotelPetFriendly, setDraftHotelPetFriendly] = useState(false);
  const [hotelGuestsRoomsOpen, setHotelGuestsRoomsOpen] =
    useState(false);
  const {
    handleKeyDown: handleHotelDestinationKeyDown,
    highlight: hotelDestinationHighlight,
    loading: hotelDestinationLoading,
    open: hotelDestinationSuggestionsOpen,
    select: commitHotelDestinationSuggestion,
    setHighlight: setHotelDestinationHighlight,
    setOpen: setHotelDestinationSuggestionsOpen,
    shouldShow: shouldShowHotelDestinationSuggestions,
    suggestions: hotelDestinationSuggestions,
  } = useHotelDestinationAutocomplete({
    query: destination,
    detectedCountryHint: countryHint,
    locale: locale ?? activeLocale,
  });

  const selectHotelDestination = (suggestion: HotelDestinationSuggestion) => {
    setDestination(commitHotelDestinationSuggestion(suggestion));
    window.requestAnimationFrame(() =>
      hotelDestinationDesktopInputRef.current?.focus({ preventScroll: true }),
    );
  };

  useEffect(() => {
    if (!hotelGuestsRoomsOpen) return;
    setDraftHotelAdults(hotelAdultCount);
    setDraftHotelChildren(hotelChildCount);
    setDraftHotelRooms(Number(rooms));
    setDraftHotelPetFriendly(hotelPetFriendly);
  }, [hotelGuestsRoomsOpen]);

  const desktopPopoverOpen =
    flightDatesOpen ||
    hotelDatesOpen ||
    travelersMenuOpen ||
    fromOpen ||
    toOpen ||
    hotelDestinationSuggestionsOpen ||
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
        mobileHomepage
          ? "rounded-[14px] border-[#dee5ed] bg-[#f8fafc] px-[13px] pb-[13px] pt-0 shadow-[0_16px_36px_rgba(15,23,42,0.12)]"
          : compactHero
          ? "p-3 sm:p-4 lg:rounded-[22px] lg:border-white/80 lg:bg-white/95 lg:p-5 lg:shadow-[0_22px_54px_rgba(15,23,42,0.16)] lg:ring-1 lg:ring-white/80"
          : "p-2"
      ),
    [compactHero, mobileHomepage, searchTabsOverlayOpen, tab]
  );

  const tabsClassName = cn(
    "inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1",
    !mobileHomepage && compactHero
      ? "mb-4 w-full gap-5 rounded-none border-0 border-b border-slate-200 bg-transparent p-0 lg:mb-5 lg:gap-7 lg:shadow-none"
      : !mobileHomepage && "mb-2"
  );
  const formClassName = compactHero ? "space-y-3 lg:space-y-4" : "space-y-2";
  const fieldCardClassName = cn(
    "overflow-visible rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.10)]",
    compactHero
      ? "border-0 bg-transparent p-0 shadow-none ring-0"
      : "p-1"
  );
  const hotelFieldCardClassName = mobileHomepage
    ? "overflow-visible border-0 bg-transparent p-0 shadow-none ring-0"
    : fieldCardClassName;
  const carsFieldCardClassName = mobileHomepage
    ? "overflow-visible border-0 bg-transparent p-0 shadow-none ring-0 sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-white sm:p-0.5 sm:shadow-[0_10px_28px_rgba(15,23,42,0.10)] sm:ring-0"
    : fieldCardClassName;
  const flightGridClassName = cn(
    "grid grid-cols-1 sm:grid-cols-2 lg:gap-0",
    compactHero
      ? "gap-2.5 lg:grid-cols-[minmax(0,2.75fr)_minmax(180px,1.15fr)_minmax(190px,1.22fr)_132px] lg:gap-3"
      : "gap-1.5 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1.45fr)_minmax(0,1.2fr)_112px]"
  );
  const hotelGridClassName = cn(
    "grid grid-cols-1 sm:grid-cols-2 lg:gap-0",
    mobileHomepage && "gap-2.5",
    compactHero
      ? !mobileHomepage && "gap-1 lg:grid-cols-[minmax(0,1.65fr)_minmax(172px,1.28fr)_minmax(158px,1.02fr)_136px]"
      : "gap-1.5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,1.15fr)_112px]"
  );
  const carsGridClassName = cn(
    "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:gap-0",
    mobileHomepage && "sm:gap-2",
    compactHero
      ? carsValues.returnToDifferentLocation
        ? "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(150px,1fr)_minmax(150px,0.95fr)_minmax(120px,0.72fr)_136px]"
        : "lg:grid-cols-[minmax(0,1.65fr)_minmax(170px,1.25fr)_minmax(170px,1.15fr)_minmax(135px,0.85fr)_136px]"
      : "lg:grid-cols-[minmax(0,1.65fr)_minmax(160px,1.2fr)_minmax(160px,1.1fr)_minmax(125px,0.8fr)_112px]"
  );
  const joinedFieldClassName = cn(
    "transition-colors hover:border-slate-400 focus-within:border-[#004BB8] focus-within:ring-2 focus-within:ring-[#004BB8]/30 lg:rounded-none lg:border-0 lg:border-e lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0",
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
  const carsMobileHomepageFieldClassName = mobileHomepage
    ? "rounded-[11px] border-[#dee5ed] bg-[#fcfdfe] focus-within:border-[#dee5ed] focus-within:ring-0 sm:rounded-xl sm:border-slate-300 sm:bg-white sm:focus-within:border-[#004BB8] sm:focus-within:ring-2"
    : "";
  const flightFieldLabelClassName = cn(
    "mb-1 block text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600",
    compactHero && "lg:text-[10px] lg:font-semibold lg:tracking-[0.10em] lg:text-slate-600"
  );
  const flightFieldValueClassName = cn(
    "hidden h-full w-full min-w-0 rounded-md border-0 bg-transparent py-0 ps-0 pe-11 text-[16px] font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 sm:block sm:focus-visible:ring-0 sm:focus-visible:shadow-none md:text-sm lg:placeholder:text-slate-500",
    compactHero && "lg:text-[15px] lg:font-medium lg:tracking-[-0.01em] lg:text-slate-900"
  );
  const flightFieldButtonClassName = cn(
    "focus-ring flex h-8 w-full items-center gap-2 rounded-md border-0 bg-transparent px-0 pe-8 text-start text-[16px] font-medium text-slate-900 outline-none transition-colors sm:focus-visible:shadow-none md:text-sm",
    compactHero && "lg:text-[15px] lg:font-medium lg:tracking-[-0.01em] lg:text-slate-900"
  );
  const hotelFieldLabelClassName = cn(
    "mb-1 block text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-slate-500",
    compactHero && "lg:text-[10px] lg:font-semibold lg:tracking-[0.10em] lg:text-slate-600"
  );
  const hotelFieldValueClassName = cn(
    "flex w-full items-center gap-2 rounded-md border-0 bg-transparent px-0 text-start font-medium leading-6 text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus-visible:ring-0 focus-visible:shadow-none",
    compactHero ? "min-h-9 text-[17px] sm:text-[16px] lg:text-[15px] lg:tracking-[-0.01em] lg:text-slate-900 lg:placeholder:text-slate-500" : "min-h-8 text-[16px] sm:text-[15px]"
  );
  const flightRouteGroupClassName = compactHero
    ? "grid grid-cols-1 overflow-visible rounded-xl border border-slate-200 bg-white shadow-[0_3px_10px_rgba(15,23,42,0.05)] transition-colors sm:grid-cols-[minmax(0,1fr)_34px_minmax(0,1fr)] sm:items-stretch focus-within:border-[#075EE8] focus-within:ring-2 focus-within:ring-[#075EE8]/10"
    : cn("grid grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] items-stretch rounded-xl border border-slate-300 bg-white lg:rounded-s-xl", flightJoinedFieldClassName);
  const flightRouteFieldClassName = (side: "origin" | "destination") =>
    compactHero
      ? cn(
          "relative min-h-[68px] border-0 bg-transparent px-4 py-2.5 transition-colors lg:flex lg:flex-col lg:justify-center",
          side === "origin" ? "sm:rounded-s-xl sm:pe-2" : "sm:rounded-e-xl sm:ps-2"
        )
      : cn("relative px-0 py-0 transition-colors lg:rounded-lg", side === "origin" ? "pe-3" : "ps-3");
  const submitWrapClassName = cn(
    "sm:col-span-2 lg:col-span-1 lg:self-stretch",
    compactHero ? "lg:min-h-[58px]" : "lg:min-h-[58px]"
  );
  const submitButtonClassName = cn(
    "w-full rounded-xl bg-[#004BB8] px-4 text-sm font-bold text-white shadow-[0_10px_22px_rgba(2,28,43,0.14)] enabled:hover:bg-[#021C2B] enabled:active:bg-[#021C2B] disabled:bg-[#004BB8] disabled:opacity-100 disabled:shadow-md disabled:shadow-[#004BB8]/20 lg:h-full lg:self-stretch lg:rounded-none lg:rounded-e-xl lg:border lg:border-s-0 lg:border-[#004BB8]/20 lg:text-[15px] lg:shadow-[0_10px_22px_rgba(2,28,43,0.14)] lg:disabled:shadow-[0_10px_22px_rgba(2,28,43,0.14)]",
    compactHero ? "h-12 lg:min-h-[58px]" : "h-12 lg:min-h-[58px]"
  );
  const hotelSubmitWrapClassName = cn(
    "sm:col-span-2 lg:col-span-1 lg:self-stretch",
    compactHero ? "lg:min-h-[58px]" : "lg:min-h-[58px]"
  );
  const hotelSubmitButtonClassName = cn(
    "w-full rounded-xl bg-[#004BB8] px-4 text-sm font-bold text-white shadow-[0_10px_22px_rgba(2,28,43,0.14)] enabled:hover:bg-[#021C2B] enabled:active:bg-[#021C2B] disabled:bg-[#004BB8] disabled:opacity-100 disabled:shadow-md disabled:shadow-[#004BB8]/20 lg:h-full lg:self-stretch lg:rounded-none lg:rounded-e-xl lg:border lg:border-s-0 lg:border-[#004BB8]/20 lg:text-[15px] lg:shadow-[0_10px_22px_rgba(2,28,43,0.14)] lg:disabled:shadow-[0_10px_22px_rgba(2,28,43,0.14)]",
    compactHero ? "h-[54px] lg:min-h-[58px]" : "h-12 lg:min-h-[58px]",
    mobileHomepage && "rounded-[11px]",
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
    nextCabinClass: string,
    closePicker = true
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
    if (closePicker) setTravelersMenuOpen(false);
  }, [normalizePassengerDraft]);

  const applyTravelersDraft = useCallback((closePicker = true) => {
    applyTravelersFromValues(
      draftAdultCount,
      draftChildCount,
      draftInfantCount,
      draftCabinClass,
      closePicker
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
        setFromState((current) => applyDefaultOrigin(current, defaultAirport, locale));
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
  }, [buildPlacesUrl, fromState, locale]);

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
      if (!hotelDestinationDesktopWrapRef.current?.contains(eventTarget)) {
        setHotelDestinationSuggestionsOpen(false);
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
        setHotelDestinationSuggestionsOpen(false);
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
  }, [
    applyTravelersFromValues,
    cancelTravelersDraft,
    setHotelDestinationSuggestionsOpen,
    travelersMenuOpen,
  ]);


  const guests = String(hotelAdultCount + hotelChildCount);
  const normalizedSummaryLocale = (locale ?? activeLocale)
    ?.trim()
    .replace("_", "-")
    .toLowerCase();
  const isArabicLocale = normalizedSummaryLocale?.startsWith("ar");
  const isSimplifiedChineseLocale = normalizedSummaryLocale === "zh-cn";
  const isJapaneseLocale = normalizedSummaryLocale === "ja";
  const isKoreanLocale = normalizedSummaryLocale === "ko";
  const isThaiLocale = normalizedSummaryLocale?.startsWith("th");
  const summarySeparator = isSimplifiedChineseLocale ? "，" : ", ";
  const hotelGuestsRoomsSummary = isArabicLocale
    ? `${Number(guests) === 1 ? `${translate("guestSingular")} واحد` : `${guests} ${translate("guestPlural")}`}، ${Number(rooms) === 1 ? `${translate("roomSingular")} واحدة` : `${rooms} ${translate("roomPlural")}`}`
    : isJapaneseLocale
      ? `${translate("guestSingular") || "宿泊者"}${guests}名、${rooms}${translate("roomSingular") || "室"}`
    : isKoreanLocale
      ? `${translate("guestSingular") || "투숙객"} ${guests}명, ${translate("roomSingular") || "객실"} ${rooms}개`
    : isThaiLocale
      ? `${translate("guestSingular") || "ผู้เข้าพัก"} ${guests} คน, ${translate("roomSingular") || "ห้อง"} ${rooms} ห้อง`
    : `${guests} ${
        Number(guests) === 1
          ? translate("guestSingular") || "guest"
          : translate("guestPlural") || "guests"
      }${summarySeparator}${rooms} ${
        Number(rooms) === 1
          ? translate("roomSingular") || "room"
          : translate("roomPlural") || "rooms"
      }`;

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

    return formatFlightsDateSummary(parsedDate, null, calendarLocale);
  }, [calendarLocale]);

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

  const mobileHomepageTripTypeLabel = (mode: TripType) => {
    const isEnglish = (locale ?? activeLocale).toLowerCase().startsWith("en");

    if (isEnglish) {
      return mode === "round-trip"
        ? "Round-trip"
        : mode === "one-way"
          ? "One-way"
          : "Multi-city";
    }

    return tripTypeLabel(mode);
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
    const normalizedLocale = (locale ?? activeLocale).toLowerCase();
    const isJapanese = normalizedLocale.startsWith("ja");
    const isKorean = normalizedLocale.startsWith("ko");
    const separator = isJapanese ? "、" : ", ";
    const formatTravelerPart = (
      count: number,
      singularLabel: string,
      pluralLabel: string,
    ) => {
      if (isJapanese) return `${singularLabel}${count}名`;
      if (isKorean) return `${singularLabel} ${count}명`;
      return `${count} ${count === 1 ? singularLabel : pluralLabel}`;
    };
    const parts: string[] = [];

    if (adultCount > 0) {
      parts.push(formatTravelerPart(adultCount, t.adultSingular || "adult", t.adultPlural || "adults"));
    }
    if (childCount > 0) {
      parts.push(formatTravelerPart(childCount, t.childSingular || "child", t.childPlural || "children"));
    }
    if (infantCount > 0) {
      parts.push(formatTravelerPart(infantCount, t.infantSingular || "infant", t.infantPlural || "infants"));
    }

    const baseSummary =
      parts.length > 0
        ? parts.join(separator)
        : formatTravelerPart(
            travelerCount,
            t.travelerSingular || "traveler",
            t.travelerPlural || t.travelers || "travelers",
          );
    return `${baseSummary}${separator}${cabinClassLabel}`;
  }, [activeLocale, adultCount, childCount, infantCount, travelerCount, cabinClassLabel, locale, t]);

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

    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

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
          formatAirportLabel(list[active], locale),
          list[active].code
        ));
      } else {
        setTo(
          formatAirportLabel(
            list[active],
            locale
          )
        );
        setToCode(
          list[active].code
        );
      }

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
    window.requestAnimationFrame(() => input?.focus({ preventScroll: true }));
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
      const recentSearch = buildFlightRecentSearch({
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
        }, matchedFlightImage ? { image: matchedFlightImage.image, imageAlt: matchedFlightImage.imageAlt } : undefined);
      if (sessionStatus === "authenticated") {
        void syncBackendRecentSearch(recentSearch);
      } else {
        upsertRecentSearch(recentSearch);
      }
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
      const recentSearch = buildHotelRecentSearch({
          destination: params.get("destination") ?? "",
          checkIn: params.get("checkIn") ?? "",
          checkOut: params.get("checkOut") ?? "",
          guests: Number(params.get("guests") ?? "1"),
          rooms: Number(params.get("rooms") ?? "1"),
        }, matchedHotelImage ? { image: matchedHotelImage.image, imageAlt: matchedHotelImage.imageAlt } : undefined);
      if (sessionStatus === "authenticated") {
        void syncBackendRecentSearch(recentSearch);
      } else {
        upsertRecentSearch(recentSearch);
      }
    } catch {
      // best effort only
    }

    setIsHotelSubmitting(true);
    startRouteProgress();
    router.push(href);
  };


  const updateCarsValue = <Key extends keyof CarsFormValues>(
    key: Key,
    value: CarsFormValues[Key],
  ) => {
    setCarsValues((current) => {
      const next = { ...current, [key]: value };

      if (key === "returnToDifferentLocation" && value === false) {
        next.dropoffLocation = "";
      }

      return next;
    });
    setCarsErrors((current) => ({
      ...current,
      [key]: undefined,
      dateRange: undefined,
      ...(key === "returnToDifferentLocation"
        ? { dropoffLocation: undefined }
        : {}),
    }));
  };

  const selectHomepageRentalDate = (date: Date) => {
    if (isCarsDateBeforeToday(date)) return;
    const selectedIso = toCarsIsoDate(date);
    if (!carsValues.pickupDate || carsValues.dropoffDate || selectedIso < carsValues.pickupDate) {
      updateCarsValue("pickupDate", selectedIso);
      updateCarsValue("dropoffDate", "");
      return;
    }
    updateCarsValue("dropoffDate", selectedIso);
  };

  const openHomepageCarsPicker = (picker: "dates" | "times" | "age", open: boolean) => {
    if (open && picker === "dates") {
      const selectedPickup = parseCarsIsoDate(carsValues.pickupDate);
      const startingDate = mobileHomepage ? new Date() : (selectedPickup ?? new Date());
      setCarsVisibleMonthDate(new Date(startingDate.getFullYear(), startingDate.getMonth(), 1));
    }
    if (open && picker === "times") {
      setCarsDraftTimes({
        pickupTime: carsValues.pickupTime,
        dropoffTime: carsValues.dropoffTime,
      });
    }
    setCarsOpenPicker(open ? picker : null);
  };

  const translateCarsFormErrors = (errors: CarsFormErrors): CarsFormErrors =>
    Object.fromEntries(
      Object.entries(errors).map(([field, errorKey]) => [
        field,
        errorKey ? translate(errorKey) : errorKey,
      ]),
    ) as CarsFormErrors;

  const onCarsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCarsOpenPicker(null);

    if (isCarsSubmitting) return;

    const nextErrors = validateCarsForm(carsValues, toCarsIsoDate(new Date()));
    setCarsErrors(translateCarsFormErrors(nextErrors));

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    const pickupLocation = carsValues.pickupLocation.trim();
    const dropoffLocation = carsValues.returnToDifferentLocation
      ? carsValues.dropoffLocation.trim()
      : pickupLocation;
    const params = new URLSearchParams({
      pickupLocation,
      pickupDate: carsValues.pickupDate,
      pickupTime: carsValues.pickupTime,
      dropoffDate: carsValues.dropoffDate,
      dropoffTime: carsValues.dropoffTime,
      driverAge: carsValues.driverAge,
      dropoffLocation,
    });

    setIsCarsSubmitting(true);
    startRouteProgress();
    router.push(`/cars/results?${params.toString()}`);
  };

  const isCarsSearchDisabled =
    isCarsSubmitting ||
    !carsValues.pickupLocation.trim() ||
    !carsValues.pickupDate ||
    !carsValues.dropoffDate ||
    !carsValues.pickupTime ||
    !carsValues.dropoffTime ||
    (carsValues.returnToDifferentLocation && !carsValues.dropoffLocation.trim());

  const carsLocationStrings = {
    locationSuggestions: translate("carsSearch.locationSuggestions") || "Location suggestions",
    popularLocations: translate("carsSearch.popularLocations") || "Popular locations",
    loadingSuggestions: translate("carsSearch.loadingSuggestions") || "Loading suggestions",
    noMatchingLocations: translate("carsSearch.noMatchingLocations") || "No matching locations",
    suggestionsUnavailable: translate("carsSearch.suggestionsUnavailable") || "Suggestions unavailable.",
    continueTypingManually: translate("carsSearch.continueTypingManually") || "You can continue typing.",
    useTypedLocation: translate("carsSearch.useTypedLocation") || "Use this location",
    unverifiedTypedLocation: translate("carsSearch.unverifiedTypedLocation") || "Custom location",
    airport: translate("carsSearch.type.airport") || "Airport",
    city: translate("carsSearch.type.city") || "City",
    area: translate("carsSearch.type.area") || "Area",
    customLocation: translate("carsSearch.type.customLocation") || "Custom location",
  };
  const carsDateFormatter = new Intl.DateTimeFormat(calendarLocale, {
    month: "short",
    day: "numeric",
  });
  const formatCarsDate = (value: string) => {
    if (!value) return "";
    const [year, month, day] = value.split("-").map(Number);
    return year && month && day
      ? carsDateFormatter.format(new Date(year, month - 1, day))
      : "";
  };
  const carsPickupDateDisplay =
    formatCarsDate(carsValues.pickupDate) ||
    translate("carsSearch.pickupDateLabel") ||
    "Pickup date";
  const carsReturnDateDisplay =
    formatCarsDate(carsValues.dropoffDate) ||
    translate("carsSearch.returnDateLabel") ||
    "Return date";
  const carsDateSummary = (
    <>
      <span className={carsValues.pickupDate ? "text-slate-900" : "text-slate-500"}>{carsPickupDateDisplay}</span>
      <span className="text-slate-400"> — </span>
      <span className={carsValues.dropoffDate ? "text-slate-900" : "text-slate-500"}>{carsReturnDateDisplay}</span>
    </>
  );
  const formatCarsTime = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
    return new Intl.DateTimeFormat(calendarLocale, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(2024, 0, 1, hour, minute));
  };
  const carsTimeSummary = `${formatCarsTime(carsValues.pickupTime)} — ${formatCarsTime(carsValues.dropoffTime)}`;

  const hotelDateSummary = useMemo(
    () => {
      const checkInSummary =
        formatShortDate(checkIn);
      const checkOutSummary =
        formatShortDate(checkOut);

      if (!checkInSummary) {
        return (
          translateHotelTravelDateText("hotelSearchDatePlaceholder") ||
          "Check-in — Check-out"
        );
      }

      if (checkOutSummary) {
        return `${checkInSummary} — ${checkOutSummary}`;
      }

      return checkInSummary;
    },
    [checkIn, checkOut, formatShortDate, translateHotelTravelDateText]
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
    field: "origin" | "destination";
    open: boolean;
    title: string;
    inputId: string;
    value: string;
    launcherRef: typeof fromMobileLauncherRef;
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
        selectedCode={field === "origin" ? fromCode : toCode}
        launcherRef={launcherRef}
        onClose={onClose}
        locale={locale}
        labels={t}
        onCommit={(option) => (option ? onSelect(option) : onClear())}
      />
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
    <DesktopTopLayerPopover
      open
      launcherId={inputId}
      placement="auto"
      desiredHeight={360}
      width={520}
      id={`${inputId}-suggestions`}
      role="listbox"
      ariaLabel={sectionLabel}
    >
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-[0.11em] text-slate-500">
          {sectionLabel}
        </p>
      </div>
      <div className="py-1">
        {isLoading ? (
          <div className="flex items-center gap-3 px-4 py-4 text-sm font-medium text-slate-500">
            <span className="h-2 w-2 rounded-full bg-[#004BB8] shadow-[0_0_0_4px_rgba(0,75,184,0.18)]" aria-hidden="true" />
            {translate("searchingAirportsAndCities")}
          </div>
        ) : suggestions.length ? suggestions.map((option, index) => (
          <button
            key={`${option.code}-${option.airport}-${inputId}`}
            type="button"
            id={`${inputId}-suggestion-${index}`}
            role="option"
            aria-selected={highlight === index}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(option)}
            className={cn(
              "focus-ring flex w-full items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-start transition-colors last:border-b-0 hover:bg-[#004BB8]/10 focus-visible:bg-[#004BB8]/10",
              highlight === index && "bg-[#004BB8]/10 text-[#021C2B]"
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-200/70" aria-hidden="true">
              <Plane className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium leading-5 tracking-tight text-slate-900">
                {getLocalizedCityName(option.city, locale)}
              </span>
              <span className="mt-0.5 block truncate text-xs font-normal leading-5 text-slate-500">
                {option.airport}{option.country ? ` · ${getLocalizedAirportCountryName(option, locale)}` : ""}
              </span>
            </span>
            <span className="shrink-0 ps-3 text-end text-sm font-medium tracking-[0.08em] text-slate-600">
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
    </DesktopTopLayerPopover>
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
        aria-label={formatFlightsMonthHeading(monthDate, calendarLocale)}
        className="min-w-0"
      >
        <h3 className={cn("text-center text-sm font-medium tracking-tight text-slate-900", compactHero ? "mb-1.5" : "mb-2.5")}>
          {formatFlightsMonthHeading(monthDate, calendarLocale)}
        </h3>
        <div className={cn("grid grid-cols-7 text-center text-[10px] font-medium tracking-[0.09em] text-slate-500", compactHero ? "mb-1" : "mb-1.5")}>
          {weekdays.map((weekday) => (
            <span key={weekday} className={compactHero ? "py-1" : "py-1.5"}>{weekday}</span>
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
              return <span key={`desktop-placeholder-${mode}-${iso}`} aria-hidden="true" className={compactHero ? "h-8" : "h-10"} />;
            }

            return (
              <button
                key={`${mode}-${iso}`}
                type="button"
                aria-label={`${
                  isFlightMode
                    ? translate("selectDateAriaPrefix")
                    : translateHotelTravelDateText("selectDateAriaPrefix")
                } ${accessibleDateFormatter.format(day)}`}
                aria-pressed={isStart || isEnd}
                onClick={() => {
                  if (isDisabledDate) return;
                  if (isFlightMode) onSelectDate(day);
                  else onSelectHotelDate(day);
                }}
                disabled={isDisabledDate}
                aria-disabled={isDisabledDate}
                className={cn(
                  "focus-ring relative mx-auto flex items-center justify-center rounded-full text-sm font-medium transition-colors disabled:cursor-not-allowed",
                  compactHero ? "h-8 w-8" : "h-10 w-10",
                  isDisabledDate
                    ? "text-slate-300"
                    : "text-slate-800 hover:bg-[#004BB8]/10 hover:text-[#004BB8]",
                  isToday && !isDisabledDate && "ring-1 ring-inset ring-[#004BB8]/25",
                  isInRange && "rounded-xl bg-[#004BB8]/7 text-[#021C2B] hover:bg-[#004BB8]/10",
                  (isStart || isEnd) && "bg-[#004BB8] text-white shadow-none hover:bg-[#021C2B] hover:text-white ring-0"
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
      placement="auto"
      align={mode === "flights" ? "center" : "left"}
      width={mode === "flights" ? 760 : 660}
      desiredHeight={440}
      className={cn(
        compactHero ? "p-3" : "p-4",
        mode === "flights" && !compactHero && "lg:p-5"
      )}
    >
    <div
      role="dialog"
      aria-label={mode === "hotels"
        ? (translateHotelTravelDateText("chooseTravelDates") || "Choose travel dates")
        : (translate("chooseTravelDates") || "Choose travel dates")}
      className="bg-white"
    >
      <div className={cn("flex items-center justify-between gap-3", compactHero ? "mb-2" : "mb-3")}>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.11em] text-slate-600">
            {mode === "flights"
              ? (translate("travelDates") || "Travel dates")
              : (translateHotelTravelDateText("hotelSearchTravelDatesLabel") || "Travel dates")}
          </p>
          <h3 className="mt-1 text-[15px] font-medium tracking-tight text-slate-950">
            {mode === "hotels"
              ? (translateHotelTravelDateText("chooseTravelDates") || "Choose travel dates")
              : (translate("chooseTravelDates") || "Choose travel dates")}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={mode === "hotels"
              ? (translateHotelTravelDateText("previousMonth") || "Previous month")
              : (translateFlightCalendarNavText("previousMonth") || "Previous month")}
            onClick={() => setVisibleMonth((prev) => addMonths(prev, -1))}
            className="focus-ring rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
          >
            {mode === "hotels"
              ? (translateHotelTravelDateText("previousMonthShort") || "Prev")
              : (translateFlightCalendarNavText("previousMonthShort") || "Prev")}
          </button>
          <button
            type="button"
            aria-label={mode === "hotels"
              ? (translateHotelTravelDateText("nextMonth") || "Next month")
              : (translateFlightCalendarNavText("nextMonth") || "Next month")}
            onClick={() => setVisibleMonth((prev) => addMonths(prev, 1))}
            className="focus-ring rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
          >
            {mode === "hotels"
              ? (translateHotelTravelDateText("nextMonthShort") || "Next")
              : (translateFlightCalendarNavText("nextMonthShort") || "Next")}
          </button>
        </div>
      </div>
      <div className={cn("grid grid-cols-2", compactHero ? "gap-3" : "gap-5")}>
        {[0, 1].map((monthOffset) => renderDesktopCalendarMonth({
          monthDate: addMonths(visibleMonth, monthOffset),
          mode,
        }))}
      </div>
      <div className={cn("flex items-center justify-between gap-3 border-t border-slate-100", compactHero ? "mt-2 pt-2" : "mt-3 pt-3")}>
        <button
          type="button"
          onClick={onClear}
          className={cn("focus-ring rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900", compactHero ? "py-2" : "py-2.5")}
        >
          {mode === "hotels"
            ? (translateHotelTravelDateText("clear") || "Clear")
            : (translate("clear") || "Clear")}
        </button>
        <button
          type="button"
          onClick={onDone}
          className={cn("focus-ring rounded-lg bg-[#004BB8] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(2,28,43,0.14)] transition-colors hover:bg-[#021C2B] active:bg-[#021C2B] focus-visible:ring-[#004BB8]/35", compactHero ? "py-2" : "py-2.5")}
        >
          {translate("done") || "Done"}
        </button>
      </div>
    </div>
    </DesktopTopLayerPopover>
  );

  const passengerRows = [
    { key: "adults", label: translate("adults") || "Adults", subtitle: translate("adultAgeRange") || "18+", count: draftAdultCount, min: 1 },
    { key: "children", label: translate("children") || "Children", subtitle: translate("childAgeRange") || "Ages 2–17", count: draftChildCount, min: 0 },
    { key: "infants", label: translate("infantsOnLap") || translate("infants") || enTranslations.infantsOnLap, subtitle: translate("under2") || "Under 2", count: draftInfantCount, min: 0 },
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
              compact ? (compactHero ? "py-2" : "py-3") : "py-4"
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
                  compact ? "h-8 w-8 border-slate-200 text-slate-600 shadow-none hover:border-[#004BB8]/30 hover:bg-[#004BB8]/10 hover:text-[#004BB8]" : "h-10 w-10 hover:border-[#004BB8]/30 hover:bg-[#004BB8]/10 hover:text-[#004BB8]"
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
                  compact ? "h-8 w-8 border-slate-200 text-slate-600 shadow-none hover:border-[#004BB8]/30 hover:bg-[#004BB8]/10 hover:text-[#004BB8]" : "h-10 w-10 hover:border-[#004BB8]/30 hover:bg-[#004BB8]/10 hover:text-[#004BB8]"
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
      compact && cn("rounded-2xl border-slate-100 shadow-none", compactHero ? "p-2" : "p-3")
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
                    "border-[#004BB8]/20 bg-[#004BB8]/7 text-[#021C2B] shadow-none",
                    compact && "border-[#004BB8]/20 bg-[#004BB8]/7 shadow-none"
                  )
                : "border-slate-200 bg-slate-50/80 text-slate-700 hover:border-[#004BB8]/30 hover:bg-[#004BB8]/10 hover:text-[#004BB8]",
              compact ? cn("rounded-xl text-xs font-medium", compactHero ? "min-h-8" : "min-h-9") : "font-extrabold"
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

  const carsReturnLocationField = carsValues.returnToDifferentLocation ? (
    <div
      ref={carsDropoffFieldRef}
      className={cn(
        compactHero
          ? hotelJoinedFieldClassName
          : "relative rounded-xl border border-slate-300 bg-white px-4 py-2 sm:max-w-[50%]",
        mobileHomepage && "rounded-[11px] border-[#dee5ed] bg-[#fcfdfe] sm:rounded-xl sm:border-slate-300 sm:!bg-white",
      )}
      data-testid="cars-return-location-field"
    >
      <label htmlFor="homepage-cars-dropoff" className={hotelFieldLabelClassName}>
        {translate("carsSearch.returnLocationLabel") || "Return location"}
      </label>
      {mobileHomepage ? <button ref={carsDropoffLauncherRef} id="homepage-cars-dropoff" type="button" onClick={() => setCarsOpenPicker("dropoff")} className={cn(hotelFieldValueClassName, "focus-ring block h-8 w-full text-start sm:hidden")}>{carsValues.dropoffLocation || translate("carsSearch.returnLocationPlaceholder") || "Return city, airport or address"}</button> : null}
      <div className={cn("relative", mobileHomepage && "hidden sm:block")}>
        <MapPin aria-hidden="true" className="pointer-events-none absolute start-0 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <CarLocationAutocomplete
        id="homepage-cars-dropoff"
        name="dropoffLocation"
        value={carsValues.dropoffLocation}
        onValueChange={(value) => updateCarsValue("dropoffLocation", value)}
        placeholder={translate("carsSearch.returnLocationPlaceholder") || "Return city, airport or address"}
        presentation="responsive"
        inputClassName={cn(hotelFieldValueClassName, "h-8 w-full ps-6")}
        strings={carsLocationStrings}
        isOpen={carsOpenPicker === "dropoff"}
        onOpenChange={(open) => setCarsOpenPicker(open ? "dropoff" : null)}
        />
      </div>
      {carsErrors.dropoffLocation ? <p className="mt-1 text-xs font-semibold text-red-600">{carsErrors.dropoffLocation}</p> : null}
    </div>
  ) : null;

  const mobileHomepageProductTabs = (
    <div
      data-testid="mobile-homepage-product-tabs-breakout"
      className="relative left-1/2 w-[calc(100%+28px)] -translate-x-1/2 sm:static sm:w-full sm:translate-x-0"
    >
      <div
        role="tablist"
        aria-label={translate("searchType") || "Search type"}
        data-testid="mobile-homepage-product-tabs"
        className="grid h-[68px] w-full grid-cols-4 gap-[clamp(6px,2vw,8px)]"
      >
        {([
          ["flights", Plane, t.flights || "Flights"],
          ["hotels", Building2, t.hotels || "Hotels"],
          ["cars", CarFront, t.cars || "Cars"],
          ["deals", PackagesIcon, t.deals || "Packages"],
        ] as const).map(([mode, Icon, label]) => {
          const selected = tab === mode;
          return (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setCarsOpenPicker(null);
                setTab(mode);
              }}
              className={cn(
                "focus-ring flex h-[68px] min-w-0 flex-col items-center justify-center gap-1 rounded-[10px] border px-0.5 text-[clamp(13px,3.85vw,16px)] font-medium text-slate-950 shadow-[0_3px_10px_rgba(15,23,42,0.07)] transition-colors",
                selected
                  ? "border-[#075ee8] bg-[#eef5ff] text-[#075ee8]"
                  : "border-slate-200/70 bg-white",
              )}
            >
              <Icon
                aria-hidden="true"
                className="h-[clamp(22px,6.15vw,25px)] w-[clamp(22px,6.15vw,25px)] shrink-0"
                strokeWidth={1.8}
              />
              <span className="whitespace-nowrap tracking-[-0.01em]">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (mobileHomepage && tab === "flights") {
    const isEnglishMobileHomepage = calendarLocale.toLowerCase().startsWith("en");
    const mobileOriginLabel = t.origin || t.from || "Origin";
    const mobileDestinationLabel = t.destination || t.to || "Destination";
    const mobileDestinationPlaceholder = t.toPlaceholder || "To?";
    const mobileTravelDatesLabel = t.travelDates || "Travel dates";
    const mobileTravelersCabinLabel = isEnglishMobileHomepage
      ? "Travelers & Cabin Class"
      : t.travelersAndCabinClass || t.travelersAndCabin || t.travelers || "Travelers & Cabin Class";

    return (
      <section
        data-testid="mobile-homepage-flight-search"
        className="rounded-[14px] border border-[#dee5ed] bg-[#f8fafc] px-[13px] pb-[13px] pt-0 shadow-[0_8px_22px_rgba(15,23,42,0.07)] sm:hidden"
      >
        {mobileHomepageProductTabs}
        <form onSubmit={onFlightSubmit} className="mt-3 space-y-2">
          <div
            role="radiogroup"
            aria-label={t.tripType || "Trip type"}
            className="grid h-11 grid-cols-3 items-center gap-0 px-0.5"
            data-testid="mobile-homepage-trip-selector"
          >
            {(["round-trip", "one-way", "multi-city"] as const).map((mode) => {
              const selected = tripType === mode;
              const unavailable = mode === "multi-city";
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-disabled={unavailable}
                  disabled={unavailable}
                  title={unavailable ? (t.multiCityComingSoon || "Multi-city search coming soon") : undefined}
                  onClick={() => mode !== "multi-city" && onSelectTripType(mode)}
                  onKeyDown={(event) => {
                    if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key)) {
                      event.preventDefault();
                      onSelectTripType(mode === "round-trip" ? "one-way" : "round-trip");
                    }
                  }}
                  className={cn(
                    "focus-ring flex min-h-11 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] px-0.5 text-start text-[12px] font-medium text-slate-950 transition-colors max-[359px]:gap-1 max-[359px]:text-[11px] disabled:cursor-not-allowed",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white",
                    )}
                  >
                    <span className={cn("h-[5px] w-[5px] rounded-full bg-[#004BB8]", !selected && "invisible")} />
                  </span>
                  {mobileHomepageTripTypeLabel(mode)}
                </button>
              );
            })}
          </div>

          <div className="relative space-y-2" data-testid="mobile-homepage-route-fields">
            {([
              ["origin", mobileOriginLabel, from, t.fromPlaceholder || "From?"],
              ["destination", mobileDestinationLabel, to, mobileDestinationPlaceholder],
            ] as const).map(([kind, label, value, placeholder]) => (
              <button
                key={kind}
                ref={kind === "origin" ? fromMobileLauncherRef : toMobileLauncherRef}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={activeMobileAirportPicker === kind}
                aria-label={`${label}: ${value.trim() || placeholder}`}
                onClick={() => {
                  setFromOpen(false);
                  setToOpen(false);
                  setActiveMobileAirportPicker(kind);
                }}
                className="focus-ring flex h-[68px] w-full items-center rounded-[10px] border border-[#dee5ed] bg-[#fcfdfe] px-4 text-start"
                data-testid={`mobile-homepage-${kind}-field`}
              >
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase leading-3 tracking-[0.11em] text-slate-600">{label}</span>
                  <span data-testid={`mobile-homepage-${kind}-value`} className={cn("mt-1.5 flex min-w-0 items-center gap-2 text-[17px] font-medium leading-5 text-slate-950", !value.trim() && "text-slate-500")}>
                    <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
                    <span className="truncate">{value.trim() || placeholder}</span>
                  </span>
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={onSwapAirports}
              aria-label={t.swapOriginDestination || "Swap origin and destination"}
              data-testid="mobile-homepage-swap"
              className="focus-ring absolute left-1/2 top-[72px] z-20 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#dee5ed] bg-[#fcfdfe] text-[#075ee8] shadow-[0_4px_10px_rgba(15,23,42,0.10)] before:absolute before:-inset-0.5 before:rounded-full"
            >
              <ArrowRightLeft aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
            </button>
          </div>

          <button
            ref={flightDatesLauncherRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={flightDatesOpen}
            aria-label={translate("chooseTravelDates") || "Choose travel dates"}
            onClick={() => setFlightDatesOpen(true)}
            data-testid="mobile-homepage-travel-dates-field"
            className="focus-ring flex h-[62px] w-full items-center rounded-[10px] border border-[#dee5ed] bg-[#fcfdfe] px-4 text-start"
          >
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase leading-3 tracking-[0.11em] text-slate-600">{mobileTravelDatesLabel}</span>
              <span data-testid="mobile-homepage-travel-dates-value" className="mt-1.5 flex min-w-0 items-center gap-2 text-[16px] font-medium leading-5 text-slate-950">
                <Calendar aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="truncate">{dateSummary}</span>
              </span>
            </span>
          </button>

          <button
            ref={travelersLauncherRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={travelersMenuOpen}
            aria-label={`${mobileTravelersCabinLabel}: ${travelerSummary}`}
            onClick={() => travelersMenuOpen ? cancelTravelersDraft() : openTravelersMenu()}
            data-testid="mobile-homepage-travelers-field"
            className="focus-ring flex h-16 w-full items-center justify-between gap-3 rounded-[10px] border border-[#dee5ed] bg-[#fcfdfe] px-4 text-start"
          >
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-semibold uppercase leading-3 tracking-[0.11em] text-slate-600">{mobileTravelersCabinLabel}</span>
              <span data-testid="mobile-homepage-travelers-value" className="mt-1.5 flex min-w-0 items-center gap-2 text-[16px] font-medium leading-5 text-slate-950">
                <UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="truncate">{travelerSummary}</span>
              </span>
            </span>
            <ChevronDown aria-hidden="true" className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", travelersMenuOpen && "rotate-180")} />
          </button>

          <Button
            type="submit"
            disabled={isFlightSearchDisabled}
            aria-busy={isFlightSubmitting}
            aria-label={t.searchFlights || "Search flights"}
            data-testid="mobile-homepage-search-submit"
            className="h-12 w-full rounded-[10px] bg-[#004BB8] text-[16px] font-semibold text-white shadow-none enabled:hover:bg-[#003f9c] enabled:active:bg-[#003785] disabled:cursor-not-allowed disabled:bg-[#004BB8] disabled:text-white disabled:opacity-100"
          >
            {isFlightSubmitting ? t.searchingFlights || "Searching flights..." : t.search || "Search"}
          </Button>
        </form>

        {renderMobileAirportPicker({
          field: "origin",
          open: activeMobileAirportPicker === "origin",
          title: t.chooseOrigin || "Choose origin",
          inputId: "homepage-origin-picker-search",
          value: from,
          launcherRef: fromMobileLauncherRef,
          onClear: onClearOrigin,
          onSelect: (option) => {
            setFromState((current) =>
              markOriginManualInput(
                current,
                formatAirportLabel(option, locale),
                option.code,
              ),
            );
          },
          onClose: () => setActiveMobileAirportPicker(null),
        })}
        {renderMobileAirportPicker({
          field: "destination",
          open: activeMobileAirportPicker === "destination",
          title: t.chooseDestination || "Choose destination",
          inputId: "homepage-destination-picker-search",
          value: to,
          launcherRef: toMobileLauncherRef,
          onClear: onClearDestination,
          onSelect: (option) => {
            setTo(formatAirportLabel(option, locale));
            setToCode(option.code);
          },
          onClose: () => setActiveMobileAirportPicker(null),
        })}
        <MobileDatePickerDialog
          open={flightDatesOpen}
          title={translate("chooseTravelDates") || "Choose travel dates"}
          titleId="homepage-flight-dates-title"
          launcherRef={flightDatesLauncherRef}
          startDate={departureDate}
          endDate={returnDate}
          rangeRequired={tripType !== "one-way"}
          locale={calendarLocale}
          weekdays={weekdays}
          labels={mobileDatePickerLabels}
          isDateDisabled={(date) => !isSelectableFlightDate(date)}
          onCommit={(startDate, endDate) => {
            setDepartureDate(startDate);
            setReturnDate(endDate);
          }}
          onClose={() => setFlightDatesOpen(false)}
        />
        <FlightMobilePickerShell
          open={travelersMenuOpen}
          title={translate("mobileTravelerCabin.title") || "Travelers & Cabin"}
          titleId="homepage-flight-travelers-title"
          launcherRef={travelersLauncherRef}
          footer={(requestClose) => (
            <div>
              <button type="button" onClick={() => { applyTravelersDraft(false); requestClose(); }} className="focus-ring h-[52px] w-full rounded-[9px] bg-[#075ee8] text-[17px] font-bold text-white">
                {t.done || "Done"}
              </button>
            </div>
          )}
          onClose={cancelTravelersDraft}
          contentClassName="bg-[#fcfdfe] px-4 py-6"
          pickerMarker="traveler-cabin"
          headerVariant="close"
        >
          <MobileTravelerCabinPicker
            adults={draftAdultCount}
            children={draftChildCount}
            infants={draftInfantCount}
            cabinClass={normalizeCabinClass(draftCabinClass)}
            strings={{
              travelers: translate("travelers") || "Travelers",
              adults: translate("adults") || "Adults",
              adultDescription: translate("mobileTravelerCabin.adultDescription") || "18 years and above",
              children: translate("children") || "Children",
              childDescription: translate("mobileTravelerCabin.childDescription") || "2 to 17 years",
              infants: translate("infants") || "Infants",
              infantDescription: translate("mobileTravelerCabin.infantDescription") || "Under 2 years",
              cabinClass: translate("cabinClass") || "Cabin class",
              economy: translate("economy") || "Economy",
              business: translate("business") || "Business",
              first: translate("first") || "First",
              tip: translate("mobileTravelerCabin.tip") || "Tip",
              baggageTip: translate("mobileTravelerCabin.baggageTip") || "Baggage allowance may vary by airline. Check details on the provider page.",
              decrease: (label) => (translate("deals.decreaseCountAria") || "Decrease {{label}}").replace("{{label}}", label),
              increase: (label) => (translate("deals.increaseCountAria") || "Increase {{label}}").replace("{{label}}", label),
            }}
            onAdultsChange={setDraftAdultCount}
            onChildrenChange={setDraftChildCount}
            onInfantsChange={setDraftInfantCount}
            onCabinClassChange={setDraftCabinClass}
          />
        </FlightMobilePickerShell>
      </section>
    );
  }

  if (mobileHomepage && tab === "deals") {
    return (
      <section data-testid="mobile-homepage-deals-surface" className="rounded-[14px] border border-[#dee5ed] bg-[#f8fafc] px-[13px] pb-[13px] pt-0 shadow-[0_8px_22px_rgba(15,23,42,0.07)] sm:hidden">
        {mobileHomepageProductTabs}
        <DealsSearchForm variant="landing" presentation="mobile-homepage" />
      </section>
    );
  }

  return (
    <>
      <section className={wrapper}>
        {desktopPopoverOpen ? (
          <div aria-hidden="true" className={desktopOverlayGuardClassName} />
        ) : null}
      {mobileHomepage ? (
        <div className="mb-3">{mobileHomepageProductTabs}</div>
      ) : (
      <div className={tabsClassName}>
        <button
          type="button"
          onClick={() => {
            setCarsOpenPicker(null);
            setTab("flights");
          }}
          className={cn(
            "relative inline-flex items-center justify-center gap-2 text-sm font-semibold transition-colors",
            compactHero && !mobileHomepage ? "rounded-none px-2 pb-3 pt-2 outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/30 lg:px-2 lg:text-[15px]" : "focus-ring rounded-lg px-3 py-1.5",
            tab === "flights"
              ? compactHero ? "text-[#075EE8] after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:rounded-full after:bg-[#075EE8]" : "bg-white text-navy shadow-sm"
              : "text-slate-600 hover:text-slate-800",
          )}
        >
          <Plane className="h-4 w-4" />
          <span>{t.flights}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setCarsOpenPicker(null);
            setTab("hotels");
          }}
          className={cn(
            "relative inline-flex items-center justify-center gap-2 text-sm font-semibold transition-colors",
            compactHero && !mobileHomepage ? "rounded-none px-2 pb-3 pt-2 outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/30 lg:px-2 lg:text-[15px]" : "focus-ring rounded-lg px-3 py-1.5",
            tab === "hotels"
              ? compactHero ? "text-[#075EE8] after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:rounded-full after:bg-[#075EE8]" : "bg-white text-navy shadow-sm"
              : "text-slate-600 hover:text-slate-800",
          )}
        >
          <BedDouble className="h-4 w-4" />
          <span>{t.hotels}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setCarsOpenPicker(null);
            setTab("cars");
          }}
          className={cn(
            "relative inline-flex items-center justify-center gap-2 text-sm font-semibold transition-colors",
            compactHero && !mobileHomepage ? "rounded-none px-2 pb-3 pt-2 outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/30 lg:px-2 lg:text-[15px]" : "focus-ring rounded-lg px-3 py-1.5",
            tab === "cars"
              ? compactHero ? "text-[#075EE8] after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:rounded-full after:bg-[#075EE8]" : "bg-white text-navy shadow-sm"
              : "text-slate-600 hover:text-slate-800",
          )}
        >
          <CarFront className="h-4 w-4" />
          <span>{t.cars}</span>
        </button>

      </div>
      )}

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
                  className="inline-flex items-center gap-2 bg-transparent py-0.5"
                >
                  {(["round-trip", "one-way", "multi-city"] as const).map((mode) => {
                    const selected = tripType === mode;
                    const unavailable = mode === "multi-city";

                    return (
                      <button
                        key={mode}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-disabled={unavailable}
                        disabled={unavailable}
                        title={unavailable ? (t.useOneWayOrRoundTripSearch || "Use one-way or round-trip search") : undefined}
                        onClick={() => !unavailable && onSelectTripType(mode)}
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
                          if (!unavailable) onSelectTripType(mode === "round-trip" ? "one-way" : "round-trip");
                        }}
                        className={cn(
                          "focus-ring group inline-flex min-h-9 items-center gap-2 rounded-lg border px-4 py-1.5 text-sm font-semibold transition-colors",
                          selected ? "border-[#075EE8] bg-[#EEF5FF] text-[#075EE8]" : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-950",
                          unavailable && "cursor-not-allowed opacity-60"
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors lg:h-[15px] lg:w-[15px]",
                            selected
                              ? "border-[#004BB8] bg-white"
                              : "border-slate-300 bg-white group-hover:border-slate-400"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full bg-[#004BB8] transition-opacity",
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
                      className="absolute start-0 top-full z-30 mt-1 min-w-[210px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10"
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
                            "focus-ring flex w-full items-center rounded-lg px-2.5 py-1.5 text-start text-sm font-medium transition-colors",
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
                        className="mt-0.5 flex w-full cursor-not-allowed items-center rounded-lg px-2.5 py-1.5 text-start text-sm font-medium text-slate-500"
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
                  <MapPin aria-hidden="true" className="pointer-events-none absolute start-0 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-slate-500 sm:block" />
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
                    className="focus-ring flex h-full w-full min-w-0 items-center rounded-md border-0 bg-transparent py-0 ps-0 pe-11 text-start text-[16px] text-slate-900 outline-none transition-colors sm:hidden"
                  >
                    <span className={cn("truncate", !from.trim() && "text-slate-400")}>
                      {from.trim() || t.fromPlaceholder || "From?"}
                    </span>
                  </button>
                  <input
                    ref={fromInputRef}
                    id="homepage-flight-origin"
                    type="text"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={shouldShowFromSuggestionsPanel}
                    aria-controls="homepage-flight-origin-suggestions"
                    aria-activedescendant={shouldShowFromSuggestionsPanel && fromSuggestions.length
                      ? `homepage-flight-origin-suggestion-${fromHighlight}`
                      : undefined}
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
                    className={cn(flightFieldValueClassName, compactHero && "ps-6 pe-1")}
                  />
                  {!compactHero && from.trim() ? (
                    <button
                      type="button"
                      onClick={onClearOrigin}
                      onMouseDown={(event) => event.preventDefault()}
                      aria-label={t.clearOrigin || "Clear origin"}
                      className="focus-ring absolute end-0 top-1/2 z-30 hidden h-9 w-9 -translate-y-1/2 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[#004BB8]/30 active:scale-95 sm:inline-flex sm:h-8 sm:w-8"
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
                      formatAirportLabel(option, locale),
                      option.code
                    ));
                    setFromOpen(false);
                  },
                }) : null}
              </div>
              <div className="relative z-20 -my-px flex h-4 items-center justify-center before:absolute before:inset-y-0 before:start-1/2 before:w-px before:bg-slate-200 sm:my-0 sm:h-auto sm:before:inset-y-3 lg:z-30">
                <button
                  type="button"
                  onClick={onSwapAirports}
                  className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 focus-visible:border-[#004BB8] focus-visible:ring-2 focus-visible:ring-[#004BB8]/30 sm:shadow-none lg:h-9 lg:w-9 lg:shadow-[0_1px_3px_rgba(15,23,42,0.10)]"
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
                  <MapPin aria-hidden="true" className="pointer-events-none absolute start-0 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-slate-500 sm:block" />
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
                    className="focus-ring flex h-full w-full min-w-0 items-center rounded-md border-0 bg-transparent py-0 ps-0 pe-11 text-start text-[16px] text-slate-900 outline-none transition-colors sm:hidden"
                  >
                    <span className={cn("truncate", !to.trim() && "text-slate-400")}>
                      {to.trim() || t.toPlaceholder || "To?"}
                    </span>
                  </button>
                  <input
                    ref={toInputRef}
                    id="homepage-flight-destination"
                    type="text"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={shouldShowToSuggestionsPanel}
                    aria-controls="homepage-flight-destination-suggestions"
                    aria-activedescendant={shouldShowToSuggestionsPanel && toSuggestions.length
                      ? `homepage-flight-destination-suggestion-${toHighlight}`
                      : undefined}
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
                    className={cn(flightFieldValueClassName, compactHero && "ps-6 pe-1")}
                  />
                  {!compactHero && to.trim() ? (
                    <button
                      type="button"
                      onClick={onClearDestination}
                      onMouseDown={(event) => event.preventDefault()}
                      aria-label={t.clearDestination || "Clear destination"}
                      className="focus-ring absolute end-0 top-1/2 z-30 hidden h-9 w-9 -translate-y-1/2 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[#004BB8]/30 active:scale-95 sm:inline-flex sm:h-8 sm:w-8"
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
                    setTo(formatAirportLabel(option, locale));
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
                  compactHero && "lg:rounded-xl lg:border lg:border-slate-200 lg:shadow-[0_3px_10px_rgba(15,23,42,0.05)]",
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
                    className="focus-ring absolute end-2 top-6 inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 active:scale-95"
                  >
                    <X size={14} />
                  </button>
                ) : null}

                {flightDatesOpen ? (
                  <>
                    <MobileDatePickerDialog
                      open={flightDatesOpen}
                      title={translate("chooseTravelDates") || "Choose travel dates"}
                      titleId="homepage-flight-dates-title"
                      launcherRef={flightDatesLauncherRef}
                      startDate={departureDate}
                      endDate={returnDate}
                      rangeRequired={tripType !== "one-way"}
                      locale={calendarLocale}
                      weekdays={weekdays}
                      labels={mobileDatePickerLabels}
                      isDateDisabled={(date) => !isSelectableFlightDate(date)}
                      onCommit={(startDate, endDate) => {
                        setDepartureDate(startDate);
                        setReturnDate(endDate);
                      }}
                      onClose={() => setFlightDatesOpen(false)}
                    />
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
                  compactHero && "lg:rounded-xl lg:border lg:border-slate-200 lg:shadow-[0_3px_10px_rgba(15,23,42,0.05)]",
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
                  className={cn(flightFieldButtonClassName, "justify-between pe-0")}
                >
                  <span className="flex min-w-0 items-center gap-2 truncate">
                    <UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
                    <span className="truncate">
                      {
                        travelerSummary
                      }
                    </span>
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
                      footer={(requestClose) => (
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              applyTravelersDraft(false);
                              requestClose();
                            }}
                            className={cn(mobileDoneButtonClassName, "px-5 py-3")}
                          >
                            {t.done || "Done"}
                          </button>
                        </div>
                      )}
                      onClose={cancelTravelersDraft}
                      contentClassName="px-4 py-5"
                    >
                      {renderTravelersCabinPicker()}
                    </FlightMobilePickerShell>
                    <DesktopTopLayerPopover
                      open
                      launcherRef={travelersLauncherRef}
                      placement="auto"
                      desiredHeight={420}
                      align="right"
                      width={360}
                      className={cn(compactHero ? "p-3" : "p-4", desktopTravelersPopoverClassName)}
                    >
                    <div
                      role="dialog"
                      aria-label={translate("travelersCabinDialogLabel")}
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
                      <div className={cn(compactHero ? "mt-2 space-y-2" : "mt-3 space-y-4")}>
                        {renderPassengerControlRows(true)}
                        <div>
                          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.11em] text-slate-600">
                            {translate("cabinClass") || "Cabin class"}
                          </p>
                          {renderCabinClassPicker(true)}
                        </div>
                      </div>
                      <div className={cn("flex items-center justify-end gap-2 border-t border-slate-100 bg-white", compactHero ? "sticky bottom-0 mt-2 py-2" : "mt-3 pt-3")}>
                        <button type="button" onClick={() => applyTravelersDraft()} className="focus-ring rounded-lg bg-[#004BB8] px-4 py-2 text-sm font-medium text-white shadow-[0_8px_18px_rgba(2,28,43,0.14)] transition-colors hover:bg-[#021C2B] active:bg-[#021C2B] focus-visible:ring-[#004BB8]/35">{t.done || "Done"}</button>
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
            field: "origin",
            open: activeMobileAirportPicker === "origin",
            title: t.chooseOrigin || "Choose origin",
            inputId: "homepage-origin-picker-search",
            value: from,
            launcherRef: fromMobileLauncherRef,
            onClear: () => {
              setFromState((current) => markOriginManualInput(current, ""));
              setFromLoading(false);
              setFromLiveSuggestions([]);
              setFromHighlight(0);
            },
            onSelect: (option) => {
              setFromState((current) => markOriginManualInput(current, formatAirportLabel(option, locale), option.code));
            },
            onClose: () => setActiveMobileAirportPicker(null),
          })}
          {renderMobileAirportPicker({
            field: "destination",
            open: activeMobileAirportPicker === "destination",
            title: t.chooseDestination || "Choose destination",
            inputId: "homepage-destination-picker-search",
            value: to,
            launcherRef: toMobileLauncherRef,
            onClear: () => {
              setTo("");
              setToLoading(false);
              setToLiveSuggestions([]);
              setToCode("");
              setToHighlight(0);
            },
            onSelect: (option) => {
              setTo(formatAirportLabel(option, locale));
              setToCode(option.code);
            },
            onClose: () => setActiveMobileAirportPicker(null),
          })}
        </form>
      ) : tab === "hotels" ? (
        <form
          onSubmit={
            onHotelSubmit
          }
          className={formClassName}
        >
          <div
            className={hotelFieldCardClassName}
            data-testid={mobileHomepage ? "mobile-homepage-hotel-controls" : undefined}
          >
            <div className={hotelGridClassName}>
              <div
                ref={hotelDestinationDesktopWrapRef}
                className={cn(
                  "relative border",
                  mobileHomepage
                    ? "rounded-[11px] border-[#dee5ed] bg-[#fcfdfe]"
                    : "rounded-xl border-slate-300 bg-white lg:rounded-s-xl",
                  hotelJoinedFieldClassName,
                  hotelDestinationSuggestionsOpen && desktopActiveFieldClassName,
                )}
                data-testid={mobileHomepage ? "mobile-homepage-hotel-destination" : undefined}
              >
                <label className={hotelFieldLabelClassName}>
                  {t.hotelSearchDestinationLabel || t.destination || "Destination"}
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
                  {mobileHomepage ? (
                    <span
                      className="flex min-w-0 items-center gap-2"
                      data-testid="mobile-homepage-hotel-destination-value"
                    >
                      <MapPin
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-slate-500"
                      />
                      <span className={cn("truncate", !destination.trim() && "text-slate-400")}>
                        {destination.trim() || t.cityOrHotel || "City or hotel"}
                      </span>
                    </span>
                  ) : (
                    <>
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
                    </>
                  )}
                </button>
                <div className="relative hidden sm:block">
                  <MapPin
                    aria-hidden="true"
                    className="pointer-events-none absolute start-0 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    ref={hotelDestinationDesktopInputRef}
                    id="homepage-hotel-destination"
                    type="text"
                    value={destination}
                    onChange={(event) => {
                      setDestination(event.target.value);
                      setHotelDestinationSuggestionsOpen(
                        event.target.value.trim().length > 0,
                      );
                      setHotelDestinationHighlight(0);
                    }}
                    onFocus={() => {
                      if (destination.trim()) setHotelDestinationSuggestionsOpen(true);
                      setHotelDatesOpen(false);
                      setHotelGuestsRoomsOpen(false);
                    }}
                    onKeyDown={(event) =>
                      handleHotelDestinationKeyDown(event, selectHotelDestination)
                    }
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={shouldShowHotelDestinationSuggestions}
                    aria-controls="homepage-hotel-destination-suggestions"
                    aria-activedescendant={
                      shouldShowHotelDestinationSuggestions &&
                      hotelDestinationSuggestions[hotelDestinationHighlight]
                        ? `homepage-hotel-destination-suggestion-${hotelDestinationSuggestions[hotelDestinationHighlight].id}`
                        : undefined
                    }
                    placeholder={t.cityOrHotel || "City or hotel"}
                    className={cn(hotelFieldValueClassName, "ps-6")}
                    required
                  />
                </div>
                {shouldShowHotelDestinationSuggestions ? (
                  <DesktopTopLayerPopover
                    open
                    launcherRef={hotelDestinationDesktopInputRef}
                    align="left"
                    width={420}
                    desiredHeight={320}
                    placement="auto"
                    id="homepage-hotel-destination-suggestions"
                    role="listbox"
                    ariaLabel={translate("hotelDestinationSuggestions") || "Hotel destination suggestions"}
                    className="p-1.5"
                  >
                    {hotelDestinationLoading ? (
                      <div className="px-3 py-2.5 text-sm font-medium text-slate-500">
                        {translate("findingDestinations") || "Finding destinations…"}
                      </div>
                    ) : hotelDestinationSuggestions.length ? (
                      hotelDestinationSuggestions.map((suggestion, index) => {
                        const active = hotelDestinationHighlight === index;
                        const DestinationIcon = suggestion.kind === "airport-area"
                          ? Plane
                          : suggestion.kind === "city"
                            ? Building2
                            : MapPin;
                        const kindLabel =
                          translate(hotelDestinationKindTranslationKeys[suggestion.kind]) ||
                          hotelDestinationKindLabels[suggestion.kind];

                        return (
                          <button
                            key={suggestion.id}
                            id={`homepage-hotel-destination-suggestion-${suggestion.id}`}
                            type="button"
                            role="option"
                            aria-selected={active}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setHotelDestinationHighlight(index)}
                            onClick={() => selectHotelDestination(suggestion)}
                            className={cn(
                              "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-start transition-colors",
                              active ? "bg-slate-100" : "hover:bg-slate-50",
                            )}
                          >
                            <DestinationIcon
                              aria-hidden="true"
                              className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-slate-950">
                                {getLocalizedHotelDestinationCityName(
                                  suggestion.name,
                                  locale ?? activeLocale,
                                )}
                              </span>
                              <span className="mt-0.5 block truncate text-xs font-medium text-slate-600">
                                {getLocalizedHotelDestinationDetail(
                                  suggestion,
                                  locale ?? activeLocale,
                                )}
                              </span>
                            </span>
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                              {kindLabel}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-2.5 text-sm font-medium text-slate-500">
                        {translate("noMatchingDestinations") || "No matching destinations"}
                      </div>
                    )}
                  </DesktopTopLayerPopover>
                ) : null}
              </div>
              <div
                ref={hotelDateWrapRef}
                className={cn(
                  "relative border",
                  mobileHomepage
                    ? "rounded-[11px] border-[#dee5ed] bg-[#fcfdfe]"
                    : "rounded-xl border-slate-300 bg-white",
                  hotelJoinedFieldClassName,
                  hotelDatesOpen && desktopActiveFieldClassName
                )}
                data-testid={mobileHomepage ? "mobile-homepage-hotel-dates" : undefined}
              >
                <label className={hotelFieldLabelClassName}>
                  {translateHotelTravelDateText("hotelSearchTravelDatesLabel") ||
                    translateHotelTravelDateText("travelDates") || "Travel dates"}
                </label>
                <button
                  ref={hotelDatesMobileLauncherRef}
                  type="button"
                  onClick={() => {
                    setHotelDatesOpen((prev) => !prev);
                    setHotelDestinationSuggestionsOpen(false);
                    setHotelDestinationMobilePickerOpen(false);
                    setHotelGuestsRoomsOpen(false);
                  }}
                  aria-expanded={
                    hotelDatesOpen
                  }
                  aria-haspopup="dialog"
                  aria-label={translateHotelTravelDateText("chooseTravelDates") || "Choose travel dates"}
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
                  "relative border",
                  mobileHomepage
                    ? "rounded-[11px] border-[#dee5ed] bg-[#fcfdfe]"
                    : "rounded-xl border-slate-300 bg-white",
                  hotelJoinedFieldClassName,
                  hotelGuestsRoomsOpen && desktopActiveFieldClassName
                )}
                data-testid={mobileHomepage ? "mobile-homepage-hotel-guests" : undefined}
              >
                <label className={hotelFieldLabelClassName}>
                  {translate("hotelSearchGuestsLabel") ||
                    translate("guests") ||
                    "Guests"}
                </label>
                <button
                  ref={hotelGuestsRoomsMobileLauncherRef}
                  type="button"
                  onClick={() => {
                    setHotelGuestsRoomsOpen((prev) => !prev);
                    setHotelDestinationSuggestionsOpen(false);
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
                  <span
                    className="flex min-w-0 items-center gap-2"
                    data-testid={mobileHomepage ? "mobile-homepage-hotel-guests-value" : undefined}
                  >
                    <UserRound
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-slate-500"
                    />
                    <span className="truncate">
                      {hotelGuestsRoomsSummary}
                    </span>
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
                    desiredHeight={420}
                    className="p-4"
                  >
                  <div
                    role="dialog"
                    aria-label={translate("guestsAndRooms") || "Guests and rooms"}
                    className="bg-white"
                  >
                    <div className="mb-3">
                      <p className="text-[10px] font-medium uppercase tracking-[0.11em] text-slate-600">
                        {translate("stayDetails") || "Stay details"}
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
                                className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-[#004BB8]/30 hover:bg-[#004BB8]/10 hover:text-[#004BB8] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
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
                                className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-[#004BB8]/30 hover:bg-[#004BB8]/10 hover:text-[#004BB8] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
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
                                ? "border-[#004BB8] bg-[#004BB8]"
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
                    <div className="sticky bottom-0 mt-3 flex justify-end border-t border-slate-100 bg-white pt-3">
                      <button
                        type="button"
                        onClick={() => setHotelGuestsRoomsOpen(false)}
                        className="focus-ring rounded-lg bg-[#004BB8] px-4 py-2 text-sm font-medium text-white shadow-[0_8px_18px_rgba(2,28,43,0.14)] transition-colors hover:bg-[#021C2B] active:bg-[#021C2B] focus-visible:ring-[#004BB8]/35"
                      >
                        {translate("done") || "Done"}
                      </button>
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
                  data-testid={mobileHomepage ? "mobile-homepage-hotel-search" : undefined}
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

          <MobileDatePickerDialog
            open={hotelDatesOpen}
            title={translateHotelTravelDateText("chooseTravelDates") || "Choose travel dates"}
            titleId="homepage-hotel-mobile-dates-title"
            launcherRef={hotelDatesMobileLauncherRef}
            startDate={checkIn}
            endDate={checkOut}
            rangeRequired
            locale={calendarLocale}
            weekdays={weekdays}
            labels={mobileDatePickerLabels}
            isDateDisabled={isBeforeToday}
            onCommit={(startDate, endDate) => {
              setCheckIn(startDate);
              setCheckOut(endDate);
            }}
            onClose={() => setHotelDatesOpen(false)}
          />

          <HotelMobilePickerShell
            open={hotelGuestsRoomsOpen}
            title={translate("hotelGuestsRooms.mobileTitle")}
            titleId="homepage-hotel-mobile-guests-title"
            launcherRef={hotelGuestsRoomsMobileLauncherRef}
            onClose={() => setHotelGuestsRoomsOpen(false)}
            showCancelAction={false}
            showBackLabel={false}
            contentClassName="bg-[#fcfdfe] px-4 py-6"
            footer={(requestClose) => (
                <button type="button" onClick={() => {
                  setHotelAdultCount(draftHotelAdults);
                  setHotelChildCount(draftHotelChildren);
                  setRooms(String(draftHotelRooms));
                  setHotelPetFriendly(draftHotelPetFriendly);
                  requestClose();
                }} className="focus-ring h-[52px] w-full rounded-[9px] bg-[#075ee8] text-[17px] font-bold text-white">
                  {t.done || "Done"}
                </button>
            )}
          >
            <MobileHotelGuestsRoomsPicker adults={draftHotelAdults} children={draftHotelChildren} rooms={draftHotelRooms} petFriendly={draftHotelPetFriendly} density={mobileHomepage ? "compact" : undefined}
              onAdultsChange={setDraftHotelAdults} onChildrenChange={setDraftHotelChildren} onRoomsChange={setDraftHotelRooms} onPetFriendlyChange={setDraftHotelPetFriendly}
              strings={{ guests: translate("guests") || "Guests", adults: translate("adults") || "Adults", adultDescription: translate("hotelGuests.adultDescription") || "Ages 18+", children: translate("children") || "Children", childDescription: translate("hotelGuests.childDescription") || "Ages 0–17", rooms: translate("rooms") || "Rooms", roomDescription: translate("hotelGuests.roomDescription") || "Separate rooms", petFriendly: translate("petFriendly") || "Pet-friendly", petDescription: translate("onlyShowPetFriendlyStays") || "Only show stays that allow pets", decrease: (label) => `Decrease ${label}`, increase: (label) => `Increase ${label}` }} />
          </HotelMobilePickerShell>
        </form>
      ) : (
        <form onSubmit={onCarsSubmit} className={formClassName} noValidate>
          <div ref={carsSearchSurfaceRef} data-testid="cars-search-surface">
          <div className={carsFieldCardClassName} data-testid="cars-joined-search-card">
            <div className={carsGridClassName} data-testid="cars-primary-row">
              <div ref={carsPickupFieldRef} className={cn(hotelJoinedFieldClassName, "relative rounded-xl border border-slate-300 bg-white lg:rounded-s-xl", carsMobileHomepageFieldClassName)} data-testid="cars-pickup-location-field">
                <label htmlFor="homepage-cars-pickup" className={hotelFieldLabelClassName}>{translate("carsSearch.pickupLocationLabel") || "Pickup location"}</label>
                {mobileHomepage ? <button ref={carsPickupLauncherRef} id="homepage-cars-pickup" type="button" onClick={() => setCarsOpenPicker("pickup")} className={cn(hotelFieldValueClassName, "focus-ring block h-8 w-full text-start sm:hidden")}>
                  <span className="flex min-w-0 items-center gap-2">
                    <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
                    <span className="truncate">{carsValues.pickupLocation || translate("carsSearch.pickupLocationPlaceholder") || "Airport, city or address"}</span>
                  </span>
                </button> : null}
                <div className={cn("relative", mobileHomepage && "hidden sm:block")}>
                  <MapPin aria-hidden="true" className="pointer-events-none absolute start-0 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <CarLocationAutocomplete id={mobileHomepage ? "homepage-cars-pickup-desktop" : "homepage-cars-pickup"} name="pickupLocation" value={carsValues.pickupLocation} onValueChange={(value) => updateCarsValue("pickupLocation", value)} placeholder={translate("carsSearch.pickupLocationPlaceholder") || "Airport, city or address"} presentation="responsive" inputClassName={cn(hotelFieldValueClassName, "h-8 w-full ps-6")} strings={carsLocationStrings} isOpen={carsOpenPicker === "pickup"} onOpenChange={(open) => setCarsOpenPicker(open ? "pickup" : null)} />
                </div>
                {carsErrors.pickupLocation ? <p className="absolute start-3 top-full z-10 mt-1 text-xs font-semibold text-red-600">{carsErrors.pickupLocation}</p> : null}
              </div>
              {compactHero ? carsReturnLocationField : null}
              <CarsSummaryField id="homepage-cars-rental-dates" label={translate("carsSearch.rentalDatesLabel") || "Rental dates"} value={carsDateSummary} open={carsOpenPicker === "dates"} onOpenChange={(open) => openHomepageCarsPicker("dates", open)} className={cn(hotelJoinedFieldClassName, carsMobileHomepageFieldClassName)} desktopWidth={620} desktopPanelClassName="p-4" desktopPlacement="auto" desktopDesiredHeight={430} leadingIcon={<Calendar aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />} showChevron={false} mobilePresentation={mobileHomepage ? "shell" : "inline"}>
                <CarsRentalDatePickerContent
                  dropoffDate={carsValues.dropoffDate}
                  formatFullDate={(date) => new Intl.DateTimeFormat(calendarLocale, { dateStyle: "full" }).format(date)}
                  locale={calendarLocale}
                  onClear={() => { updateCarsValue("pickupDate", ""); updateCarsValue("dropoffDate", ""); }}
                  onDone={() => setCarsOpenPicker(null)}
                  onNextMonth={() => setCarsVisibleMonthDate((current) => addCarsMonths(current, 1))}
                  onPreviousMonth={() => setCarsVisibleMonthDate((current) => addCarsMonths(current, -1))}
                  onSelectDate={selectHomepageRentalDate}
                  pickupDate={carsValues.pickupDate}
                  strings={{ chooseDates: translate("carsSearch.chooseRentalDates") || "Choose rental dates", previousMonth: translate("carsSearch.previousMonth") || "Previous month", previousMonthShort: translate("carsSearch.previousMonthShort") || "Previous", nextMonth: translate("carsSearch.nextMonth") || "Next month", nextMonthShort: translate("carsSearch.nextMonthShort") || "Next", selectDatePrefix: translate("carsSearch.selectDateAriaPrefix") || "Select", startsNewPickupDate: translate("carsSearch.startsNewPickupDate") || "Starts a new pickup date", clear: translate("clear") || "Clear", done: translate("done") || "Done" }}
                  visibleMonthDate={carsVisibleMonthDate}
                  weekdays={getLocalizedWeekdays(calendarLocale)}
                />
              </CarsSummaryField>
              <CarsSummaryField id="homepage-cars-time-range" label={translate("carsSearch.pickupReturnTimeLabel") || "Pickup / return time"} value={carsTimeSummary} open={carsOpenPicker === "times"} onOpenChange={(open) => openHomepageCarsPicker("times", open)} className={cn(hotelJoinedFieldClassName, carsMobileHomepageFieldClassName)} desktopPlacement="auto" desktopDesiredHeight={350} leadingIcon={<Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />} mobilePresentation={mobileHomepage ? "shell" : "inline"}>
                <CarsTimeRangePickerContent formatTime={formatCarsTime} pickupLabel={translate("carsSearch.pickupTimeLabel") || "Pickup time"} pickupTime={carsValues.pickupTime} returnLabel={translate("carsSearch.returnTimeLabel") || "Return time"} returnTime={carsValues.dropoffTime} onPickupTimeChange={(time) => updateCarsValue("pickupTime", time)} onReturnTimeChange={(time) => updateCarsValue("dropoffTime", time)} />
              </CarsSummaryField>
              <CarsSummaryField id="homepage-cars-driver-age" label={translate("carsSearch.driverAgeLabel") || "Driver age"} value={carsValues.driverAge === defaultDriverAge ? translate("carsSearch.driverAgeAnyAgeRange") || "Any age" : carsValues.driverAge} open={carsOpenPicker === "age"} onOpenChange={(open) => openHomepageCarsPicker("age", open)} className={cn(hotelJoinedFieldClassName, carsMobileHomepageFieldClassName)} popupRole="listbox" desktopAlign="right" desktopWidth={248} desktopPanelClassName="p-0" desktopPlacement="auto" desktopDesiredHeight={340} leadingIcon={<UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />} mobilePresentation={mobileHomepage ? "shell" : "inline"}>
                <CarsDriverAgePickerContent anyAgeLabel={translate("carsSearch.driverAgeAnyAgeRange") || "Any age"} selectedAge={carsValues.driverAge} onSelect={(age) => updateCarsValue("driverAge", age)} />
              </CarsSummaryField>
              <div className={hotelSubmitWrapClassName}>
                <Button type="submit" disabled={isCarsSearchDisabled} aria-busy={isCarsSubmitting} aria-label={translate("searchCars") || "Search cars"} className={cn(hotelSubmitButtonClassName, "whitespace-nowrap", mobileHomepage && "rounded-[11px] sm:rounded-xl")}>
                  {isCarsSubmitting ? translate("searching") || "Searching…" : translate("search") || "Search"}
                </Button>
              </div>
            </div>
          </div>
          <div className={cn("flex min-h-8 items-center gap-3 px-1 text-sm font-semibold text-slate-600", mobileHomepage && "mt-[11px]")}>
            <label className="focus-within:text-slate-900 flex cursor-pointer items-center gap-2"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#004BB8]" checked={carsValues.returnToDifferentLocation} onChange={(event) => { updateCarsValue("returnToDifferentLocation", event.target.checked); if (!event.target.checked) setCarsOpenPicker(null); }} />{translate("carsSearch.differentReturnLocation") || "Different return location"}</label>
          </div>
          {!compactHero ? carsReturnLocationField : null}
          </div>
        </form>
      )}
      {mobileHomepage && tab === "cars" ? (
        <>
          {(["pickup", "dropoff"] as const).map((mode) => {
            const isPickup = mode === "pickup";
            if (!isPickup && !carsValues.returnToDifferentLocation) return null;
            return (
              <MobileCarLocationPicker
                key={mode}
                open={carsOpenPicker === mode}
                mode={isPickup ? "pickup" : "return"}
                value={isPickup ? carsValues.pickupLocation : carsValues.dropoffLocation}
                launcherRef={isPickup ? carsPickupLauncherRef : carsDropoffLauncherRef}
                onClose={() => setCarsOpenPicker(null)}
                onCommit={(value) => updateCarsValue(isPickup ? "pickupLocation" : "dropoffLocation", value)}
              />
            );
          })}
          <MobileDatePickerDialog
            open={carsOpenPicker === "dates"}
            title={translate("carsSearch.chooseRentalDates") || "Choose rental dates"}
            titleId="cars-dates-mobile-title"
            dialogId="cars-dates-mobile-dialog"
            startDate={carsValues.pickupDate}
            endDate={carsValues.dropoffDate}
            rangeRequired
            firstMonth={carsVisibleMonthDate}
            locale={calendarLocale}
            weekdays={getLocalizedWeekdays(calendarLocale)}
            labels={{ ...mobileDatePickerLabels, selectDatePrefix: translate("carsSearch.selectDateAriaPrefix") || "Select" }}
            isDateDisabled={isBeforeToday}
            onCommit={(startDate, endDate) => {
              updateCarsValue("pickupDate", startDate);
              updateCarsValue("dropoffDate", endDate);
            }}
            onClose={() => setCarsOpenPicker(null)}
          />
          <MobileCarTimePickerDialog open={carsOpenPicker === "times"} onClose={() => setCarsOpenPicker(null)} pickupTime={carsValues.pickupTime} returnTime={carsValues.dropoffTime} onCommit={(pickupTime, dropoffTime) => { updateCarsValue("pickupTime", pickupTime); updateCarsValue("dropoffTime", dropoffTime); }} formatTime={formatCarsTime} title={translate("carsSearch.pickupReturnTimeLabel") || "Pickup / return time"} intro={translate("carsSearch.mobileTimeIntro") || "Select when you’ll pick up and return your car."} pickupLabel={translate("carsSearch.pickupTimeLabel") || "Pickup time"} returnLabel={translate("carsSearch.returnTimeLabel") || "Return time"} doneLabel={translate("done") || "Done"} />
          <MobileCarDriverAgePickerDialog open={carsOpenPicker === "age"} onClose={() => setCarsOpenPicker(null)} driverAge={carsValues.driverAge} onCommit={(age) => updateCarsValue("driverAge", age)} title={translate("carsSearch.driverAgeLabel") || "Driver age"} intro={translate("carsSearch.mobileDriverAgeIntro") || "Driver must be between 18 and 70 years old."} anyAgeLabel={translate("carsSearch.driverAgeAnyAgeRange") || "Any age 18–70"} doneLabel={translate("done") || "Done"} />
        </>
      ) : null}
      </section>
    </>
  );
}
