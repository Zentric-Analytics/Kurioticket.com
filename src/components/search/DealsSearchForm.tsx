"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightLeft,
  BedDouble,
  Building2,
  Calendar,
  CarFront,
  Check,
  ChevronDown,
  MapPin,
  Minus,
  Plane,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRouteProgress } from "@/components/layout/RouteProgress";
import {
  buildDealsJourneyUrl,
  getFirstDealsJourneyStage,
} from "@/lib/deals/dealsJourneyRoutes";
import { removeDealsStagedJourneyPlan } from "@/lib/deals/dealsTripPlanStorage";
import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
import { HotelDestinationMobilePicker } from "@/components/search/HotelDestinationMobilePicker";
import { HotelMobilePickerShell } from "@/components/search/HotelMobilePickerShell";
import { translations as en } from "@/lib/i18n/en";
import { driverAgeOptions, timeOptions } from "@/lib/cars/carsSearchUtils";
import {
  createDefaultDealsSearch,
  dealsProductOrder,
  getIncludedProducts,
  parseDealsSearchParams,
  validateDealsSearch,
  type DealsFlightTripType,
  type DealsPackageMode,
  type DealsSearch,
  type DealsProduct,
} from "@/lib/deals/dealsSearchParams";
import {
  applySharedDates,
  applySharedDestination,
  customizeInheritedField,
  relinkInheritedField,
  setCarReturnMode,
  swapFlightAirports,
  transitionDealsMode,
} from "@/lib/deals/dealsSearchSynchronization";
import {
  formatAirportLabel,
  getAirportByCode,
  getLocalizedAirportCountryName,
  getLocalizedCityName,
  type AirportOption,
} from "@/data/airports";
import {
  getLocalizedHotelDestinationCityName,
  getLocalizedHotelDestinationDetail,
} from "@/data/hotelDestinations";
import {
  formatFlightsDateSummary,
  formatFlightsMonthHeading,
  formatFlightsWeekdays,
  normalizeFlightsCalendarLocale,
} from "@/lib/flights/dateFormatting";
import { normalizeHotelCalendarLocale } from "@/lib/hotelsDateFormatting";
import { calculateDesktopPopoverGeometry } from "@/components/search/desktopPopoverPosition";

type HotelSuggestion = {
  id: string;
  name: string;
  country: string;
  searchValue: string;
  countryCode?: string;
  region?: string;
  kind?: string;
};
type DealsPlacesApiResponse = { defaultOriginAirport?: AirportOption | null };
type LocationApiResponse = {
  source?: "ipinfo-lite" | "fallback";
  countryCode?: string | null;
};
const mobileHomepagePackageOptions = [
  { mode: "hotel-flight", text: "Flight + Hotel" },
  { mode: "flight-car", text: "Flight + Car" },
  { mode: "hotel-car", text: "Hotel + Car" },
  { mode: "hotel-flight-car", text: "Flight + Hotel + Car" },
] as const satisfies ReadonlyArray<{
  mode: DealsPackageMode;
  text: string;
}>;
const dealsPackageOptions = [
  { mode: "hotel-flight", label: "deals.package.hotelFlight" },
  { mode: "flight-car", label: "deals.package.flightCar" },
  { mode: "hotel-car", label: "deals.package.hotelCar" },
  { mode: "hotel-flight-car", label: "deals.package.hotelFlightCar" },
] as const satisfies ReadonlyArray<{
  mode: DealsPackageMode;
  label: keyof typeof en;
}>;
const desktopLandingPackageOptions = [
  { id: "hotel-flight", mode: "hotel-flight", text: "Flight+Hotel" },
  { id: "flight-car", mode: "flight-car", text: "Flight+Car" },
  { id: "hotel-car", mode: "hotel-car", text: "Hotel+Car" },
  {
    id: "hotel-flight-car",
    mode: "hotel-flight-car",
    text: "Flight+Hotel+Car",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  mode: DealsPackageMode;
  text: string;
}>;
const field =
  "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-medium text-slate-900 outline-none focus:border-[#004BB8] focus:ring-2 focus:ring-[#004BB8]/20";
const label =
  "mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-slate-600";
const connectedShell =
  "grid gap-3 sm:gap-0 sm:rounded-2xl sm:bg-white sm:ring-1 sm:ring-slate-200";
const connectedSegment =
  "relative min-w-0 transition-colors sm:min-h-[68px] sm:px-4 sm:py-2 sm:hover:bg-slate-50 sm:focus-within:z-10 sm:focus-within:bg-[#004BB8]/8 sm:focus-within:ring-1 sm:focus-within:ring-inset sm:focus-within:ring-[#004BB8]/20 lg:min-h-14 lg:py-1.5";
const connectedField =
  "sm:min-h-7 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:focus:border-0 sm:focus:ring-0";
const flightConnectedSegment = `${connectedSegment} lg:min-h-[54px] lg:py-1`;
const flightConnectedField = `${connectedField} lg:min-h-6`;
const packageActionSegment =
  "relative min-w-0 min-h-12 border-0 bg-transparent px-3 py-2 text-start transition-colors hover:bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#004BB8]/20 focus-within:bg-[#004BB8]/[0.04] focus-within:ring-2 focus-within:ring-inset focus-within:ring-[#004BB8]/20";
const packageActionControl =
  "min-h-6 w-full border-0 bg-transparent px-0 text-base font-medium text-slate-900 shadow-none outline-none focus:ring-0";
const desktopLandingFieldSurface =
  "lg:bg-transparent lg:hover:bg-slate-50/60 lg:focus-within:bg-transparent lg:focus-within:ring-0";

const parseIsoDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
    ? parsed
    : null;
};
const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addMonths = (date: Date, offset: number) =>
  new Date(date.getFullYear(), date.getMonth() + offset, 1);
const buildMonthCells = (monthDate: Date) => {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(
    first.getFullYear(),
    first.getMonth(),
    1 - first.getDay(),
  );
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + index,
    );
    return { date, isCurrentMonth: date.getMonth() === monthDate.getMonth() };
  });
};
const getCarsIntlLocale = (locale: string) => {
  const normalized = locale.toLowerCase();
  if (normalized.startsWith("hi")) return "hi-IN";
  if (normalized.startsWith("tr")) return "tr-TR";
  if (normalized.startsWith("pl")) return "pl-PL";
  return locale;
};
const formatCarTimeLabel = (time: string, locale: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return Number.isNaN(hour) || Number.isNaN(minute)
    ? time
    : new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(2024, 0, 1, hour, minute));
};
const normalizeLocationCountryHint = (value: string | null | undefined) => {
  const countryCode = value?.trim().toUpperCase() || "";
  return /^[A-Z]{2}$/.test(countryCode) ? countryCode : "";
};
const normalizeAirportCode = (value: string | null | undefined) => {
  const code = value?.trim().toUpperCase() || "";
  return /^[A-Z]{3}$/.test(code) ? code : "";
};
const dealsIncludesFlights = (mode: DealsPackageMode) =>
  getIncludedProducts(mode).flight;
const buildFlightOriginPatch = (option: AirportOption, locale: string) => {
  if (!option.city?.trim()) return null;
  const code = normalizeAirportCode(option.code);
  if (!code) return null;
  const text = formatAirportLabel({ ...option, code }, locale).trim();
  return text ? { flightOriginText: text, flightOriginCode: code } : null;
};

function DesktopLandingPopover({
  open,
  anchorRef,
  width,
  desiredHeight,
  align = "start",
  marker,
  className = "p-3",
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  width: number;
  desiredHeight: number;
  align?: "start" | "center" | "end";
  marker: string;
  className?: string;
  children: ReactNode;
}) {
  const [geometry, setGeometry] = useState<ReturnType<
    typeof calculateDesktopPopoverGeometry
  > | null>(null);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const updatePosition = () => {
      if (!desktop.matches || !anchorRef.current) return setGeometry(null);
      const rect = anchorRef.current.getBoundingClientRect();
      setGeometry(
        calculateDesktopPopoverGeometry({
          fieldRect: rect,
          boundaryRect: rect,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          viewportPadding: 16,
          gap: 8,
          preferredWidth: width,
          align,
          desiredHeight,
        }),
      );
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    desktop.addEventListener("change", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      desktop.removeEventListener("change", updatePosition);
    };
  }, [align, anchorRef, desiredHeight, open, width]);

  if (!open || !geometry || typeof document === "undefined") return null;
  const { placement, ...popoverStyle } = geometry;
  return createPortal(
    <div
      data-deals-desktop-landing-popover={marker}
      className={`fixed z-[1300] overflow-y-auto rounded-[8px] border border-[#dee5ed] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.12)] ${className}`}
      style={{
        ...popoverStyle,
        transform: placement === "above" ? "translateY(-100%)" : undefined,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

function DealsCarPopover({
  open,
  anchorRef,
  width: preferredWidth,
  marker,
  desktopLanding = false,
  onDismiss,
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  width: number;
  marker: "dates" | "times" | "return-location";
  desktopLanding?: boolean;
  onDismiss?: () => void;
  children: ReactNode;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const desktop = window.matchMedia("(min-width: 640px)");
    const updatePosition = () => {
      if (!desktop.matches || !anchorRef.current) return setPosition(null);
      const gutter = 16;
      const gap = 12;
      const rect = anchorRef.current.getBoundingClientRect();
      const width = Math.min(preferredWidth, window.innerWidth - gutter * 2);
      const below = window.innerHeight - rect.bottom - gap - gutter;
      const above = rect.top - gap - gutter;
      const openAbove = below < 360 && above > below;
      const maxHeight = Math.max(
        180,
        Math.min(openAbove ? above : below, window.innerHeight - gutter * 2),
      );
      setPosition({
        left: Math.min(
          Math.max(gutter, rect.left + rect.width / 2 - width / 2),
          window.innerWidth - width - gutter,
        ),
        top: openAbove
          ? Math.max(gutter, rect.top - gap - maxHeight)
          : rect.bottom + gap,
        width,
        maxHeight,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    desktop.addEventListener("change", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      desktop.removeEventListener("change", updatePosition);
    };
  }, [anchorRef, open, preferredWidth]);
  useEffect(() => {
    if (!open || !onDismiss) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !popoverRef.current?.contains(target) &&
        !anchorRef.current?.contains(target) &&
        !(
          target instanceof Element &&
          target.closest(`[data-deals-desktop-landing-popover='car-${marker}']`)
        )
      )
        onDismiss();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorRef, marker, onDismiss, open]);
  if (desktopLanding)
    return (
      <DesktopLandingPopover
        open={open}
        anchorRef={anchorRef}
        width={preferredWidth}
        desiredHeight={marker === "dates" ? 520 : 300}
        align="center"
        marker={`car-${marker}`}
        className="p-4"
      >
        {children}
      </DesktopLandingPopover>
    );
  if (!open || !position || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={popoverRef}
      {...(marker === "dates"
        ? { "data-deals-car-dates-popover": true }
        : marker === "times"
          ? { "data-deals-car-times-popover": true }
          : { "data-deals-car-return-location-popover": true })}
      className="fixed z-[1200] hidden overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.24)] sm:block"
      style={position}
    >
      {children}
    </div>,
    document.body,
  );
}

function DealsFlightDatesPopover({
  open,
  anchorRef,
  desktopLanding = false,
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  desktopLanding?: boolean;
  children: ReactNode;
}) {
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const desktop = window.matchMedia("(min-width: 640px)");
    const updatePosition = () => {
      if (!desktop.matches || !anchorRef.current) return setPosition(null);
      const gutter = 16;
      const rect = anchorRef.current.getBoundingClientRect();
      const width = Math.min(690, window.innerWidth - gutter * 2);
      const expectedHeight = Math.min(560, window.innerHeight - gutter * 2);
      setPosition({
        left: Math.min(
          Math.max(gutter, rect.right - width),
          window.innerWidth - width - gutter,
        ),
        top: Math.max(
          gutter,
          Math.min(
            rect.bottom + 10,
            window.innerHeight - expectedHeight - gutter,
          ),
        ),
        width,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    desktop.addEventListener("change", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      desktop.removeEventListener("change", updatePosition);
    };
  }, [anchorRef, open]);
  if (desktopLanding)
    return (
      <DesktopLandingPopover
        open={open}
        anchorRef={anchorRef}
        width={660}
        desiredHeight={540}
        align="end"
        marker="flight-dates"
        className="p-4"
      >
        {children}
      </DesktopLandingPopover>
    );
  if (!open || !position || typeof document === "undefined") return null;
  return createPortal(
    <div
      data-deals-flight-dates-popover
      className="fixed z-[1000] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.18)]"
      style={position}
    >
      {children}
    </div>,
    document.body,
  );
}

function DealsHotelDatesPopover({
  open,
  anchorRef,
  desktopLanding = false,
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  desktopLanding?: boolean;
  children: ReactNode;
}) {
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const desktop = window.matchMedia("(min-width: 640px)");
    const updatePosition = () => {
      if (!desktop.matches || !anchorRef.current) return setPosition(null);
      const gutter = 16;
      const rect = anchorRef.current.getBoundingClientRect();
      const width = Math.min(640, window.innerWidth - gutter * 2);
      const expectedHeight = Math.min(560, window.innerHeight - gutter * 2);
      setPosition({
        left: Math.min(
          Math.max(gutter, rect.right - width),
          window.innerWidth - width - gutter,
        ),
        top: Math.max(
          gutter,
          Math.min(
            rect.bottom + 10,
            window.innerHeight - expectedHeight - gutter,
          ),
        ),
        width,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    desktop.addEventListener("change", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      desktop.removeEventListener("change", updatePosition);
    };
  }, [anchorRef, open]);
  if (desktopLanding)
    return (
      <DesktopLandingPopover
        open={open}
        anchorRef={anchorRef}
        width={640}
        desiredHeight={540}
        align="end"
        marker="hotel-dates"
        className="p-4"
      >
        {children}
      </DesktopLandingPopover>
    );
  if (!open || !position || typeof document === "undefined") return null;
  return createPortal(
    <div
      data-deals-hotel-dates-popover
      className="fixed z-[1000] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.18)]"
      style={position}
    >
      {children}
    </div>,
    document.body,
  );
}

function DealsFlightPopover({
  open,
  anchorRef,
  desktopLanding = false,
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  desktopLanding?: boolean;
  children: ReactNode;
}) {
  const [position, setPosition] = useState<{
    left: number;
    width: number;
    maxHeight: number;
    top?: number;
    bottom?: number;
  } | null>(null);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const desktop = window.matchMedia("(min-width: 640px)");
    const updatePosition = () => {
      if (!desktop.matches || !anchorRef.current) return setPosition(null);
      const gutter = 16;
      const gap = 10;
      const rect = anchorRef.current.getBoundingClientRect();
      const width = Math.min(360, window.innerWidth - gutter * 2);
      const below = window.innerHeight - rect.bottom - gap - gutter;
      const above = rect.top - gap - gutter;
      const desiredHeight = 480;
      const openAbove = below < desiredHeight && above > below;
      const availableHeight = openAbove ? above : below;
      const maxHeight = Math.max(
        1,
        Math.min(availableHeight, window.innerHeight - gutter * 2),
      );
      setPosition({
        left: Math.min(
          Math.max(gutter, rect.right - width),
          window.innerWidth - width - gutter,
        ),
        width,
        maxHeight,
        ...(openAbove
          ? { bottom: window.innerHeight - rect.top + gap }
          : { top: rect.bottom + gap }),
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    desktop.addEventListener("change", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      desktop.removeEventListener("change", updatePosition);
    };
  }, [anchorRef, open]);

  if (desktopLanding)
    return (
      <DesktopLandingPopover
        open={open}
        anchorRef={anchorRef}
        width={380}
        desiredHeight={460}
        align="end"
        marker="travellers"
        className="flex overflow-hidden p-4"
      >
        {children}
      </DesktopLandingPopover>
    );
  if (!open || !position || typeof document === "undefined") return null;
  return createPortal(
    <div
      data-deals-flight-travellers-popover
      className="fixed z-[1000] flex overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.18)]"
      style={position}
    >
      {children}
    </div>,
    document.body,
  );
}

function DealsDestinationPopover({
  open,
  anchorRef,
  width: desiredWidth,
  marker,
  desktopLanding = false,
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  width: number;
  marker: string;
  desktopLanding?: boolean;
  children: ReactNode;
}) {
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const desktop = window.matchMedia("(min-width: 640px)");
    const updatePosition = () => {
      if (!desktop.matches || !anchorRef.current) return setPosition(null);
      const gutter = 16;
      const gap = 8;
      const rect = anchorRef.current.getBoundingClientRect();
      const width = Math.min(desiredWidth, window.innerWidth - gutter * 2);
      const below = window.innerHeight - rect.bottom - gap - gutter;
      const above = rect.top - gap - gutter;
      const useAbove = below < 240 && above > below;
      const maxHeight = Math.max(160, Math.min(352, useAbove ? above : below));
      setPosition({
        left: Math.min(
          Math.max(gutter, rect.left),
          window.innerWidth - width - gutter,
        ),
        top: useAbove
          ? Math.max(gutter, rect.top - gap - maxHeight)
          : rect.bottom + gap,
        width,
        maxHeight,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    desktop.addEventListener("change", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      desktop.removeEventListener("change", updatePosition);
    };
  }, [anchorRef, desiredWidth, open]);
  if (desktopLanding)
    return (
      <DesktopLandingPopover
        open={open}
        anchorRef={anchorRef}
        width={desiredWidth}
        desiredHeight={352}
        marker={marker}
        className="p-2"
      >
        {children}
      </DesktopLandingPopover>
    );
  if (!open || !position || typeof document === "undefined") return null;
  return createPortal(
    <div
      data-deals-destination-popover={marker}
      className="fixed z-[1100] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,0.22)]"
      style={position}
    >
      {children}
    </div>,
    document.body,
  );
}

export type DealsSearchFormProps = {
  initialSearch?: DealsSearch;
  variant?: "landing" | "results";
  onSubmitSearch?: (search: DealsSearch) => void;
  onDraftChange?: (search: DealsSearch) => void;
  warning?: ReactNode;
  pending?: boolean;
  presentation?: "default" | "mobile-homepage" | "desktop-landing";
};

export function normalizeUnifiedResultsSearch(current: DealsSearch) {
  const included = getIncludedProducts(current.mode);
  let next = current;

  if (included.hotel) {
    next = relinkInheritedField(next, "stayDestination");
    if (!included.flight || next.stayDatesLinked) {
      next = relinkInheritedField(next, "stayDates");
    }
  }
  if (included.car) {
    next = relinkInheritedField(next, "carPickup");
    next = relinkInheritedField(next, "carDates");
    next = setCarReturnMode(next, false);
  }
  return next;
}

export function DealsSearchForm({
  initialSearch,
  variant = "landing",
  onSubmitSearch,
  onDraftChange,
  warning,
  pending = false,
  presentation = "default",
}: DealsSearchFormProps = {}) {
  const params = useSearchParams();
  const router = useRouter();
  const { start } = useRouteProgress();
  const { t: dictionary, locale } = useLocale();
  const t = useCallback(
    (key: string) => dictionary[key] ?? en[key] ?? key,
    [dictionary],
  );
  const isLandingVariant = variant === "landing";
  const isDesktopLanding =
    isLandingVariant && presentation === "desktop-landing";
  const [desktopPackageChoice, setDesktopPackageChoice] = useState<
    string | null
  >(null);
  const guidedPreviewEnabled =
    isLandingVariant && params.get("guidedPreview") === "1";
  const [search, setSearch] = useState<DealsSearch>(
    () =>
      initialSearch ??
      (params.size
        ? parseDealsSearchParams(params)
        : createDefaultDealsSearch()),
  );
  const [errors, setErrors] = useState<ReturnType<typeof validateDealsSearch>>(
    {},
  );
  const [submitting, setSubmitting] = useState(false);
  const [productSelectionMessage, setProductSelectionMessage] = useState("");
  const [airportLists, setAirportLists] = useState<
    Record<"origin" | "destination", AirportOption[]>
  >({ origin: [], destination: [] });
  const [hotelSuggestions, setHotelSuggestions] = useState<HotelSuggestion[]>(
    [],
  );
  const [flightOriginOpen, setFlightOriginOpen] = useState(false);
  const [flightDestinationOpen, setFlightDestinationOpen] = useState(false);
  const [flightOriginLoading, setFlightOriginLoading] = useState(false);
  const [flightDestinationLoading, setFlightDestinationLoading] =
    useState(false);
  const [flightOriginHighlight, setFlightOriginHighlight] = useState(0);
  const [flightDestinationHighlight, setFlightDestinationHighlight] =
    useState(0);
  const [flightMobileAirport, setFlightMobileAirport] = useState<
    "origin" | "destination" | null
  >(null);
  const [hotelDestinationOpen, setHotelDestinationOpen] = useState(false);
  const [hotelDestinationLoading, setHotelDestinationLoading] = useState(false);
  const [hotelDestinationHighlight, setHotelDestinationHighlight] = useState(0);
  const [hotelDestinationMobileOpen, setHotelDestinationMobileOpen] =
    useState(false);
  const flightOriginWrapRef = useRef<HTMLDivElement>(null);
  const flightOriginInputRef = useRef<HTMLInputElement>(null);
  const flightOriginMobileLauncherRef = useRef<HTMLButtonElement>(null);
  const flightOriginMobileInputRef = useRef<HTMLInputElement>(null);
  const flightDestinationWrapRef = useRef<HTMLDivElement>(null);
  const flightDestinationInputRef = useRef<HTMLInputElement>(null);
  const flightDestinationMobileLauncherRef = useRef<HTMLButtonElement>(null);
  const flightDestinationMobileInputRef = useRef<HTMLInputElement>(null);
  const hotelDestinationWrapRef = useRef<HTMLDivElement>(null);
  const hotelDestinationInputRef = useRef<HTMLInputElement>(null);
  const hotelDestinationMobileLauncherRef = useRef<HTMLButtonElement>(null);
  const flightOriginUserInteractedRef = useRef(false);
  const flightDefaultOriginRequestedRef = useRef(false);
  const firstError = useRef<HTMLDivElement>(null);
  const mobilePackageOptionRefs = useRef<
    Partial<Record<DealsPackageMode, HTMLButtonElement>>
  >({});
  const mobilePackageRailRef = useRef<HTMLDivElement>(null);
  const flightDatesLauncherRef = useRef<HTMLButtonElement>(null);
  const mobileFlightDatesCommittedRef = useRef(false);
  const [flightDatesOpen, setFlightDatesOpen] = useState(false);
  const [mobileFlightDatesOpen, setMobileFlightDatesOpen] = useState(false);
  const [draftFlightDepartureDate, setDraftFlightDepartureDate] = useState(
    search.flightDepartureDate,
  );
  const [draftFlightReturnDate, setDraftFlightReturnDate] = useState(
    search.flightReturnDate,
  );
  const [visibleFlightMonth, setVisibleFlightMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const hotelDatesLauncherRef = useRef<HTMLButtonElement>(null);
  const mobileHotelDatesCommittedRef = useRef(false);
  const [hotelDatesOpen, setHotelDatesOpen] = useState(false);
  const [mobileHotelDatesOpen, setMobileHotelDatesOpen] = useState(false);
  const [draftHotelCheckIn, setDraftHotelCheckIn] = useState(
    search.hotelCheckIn,
  );
  const [draftHotelCheckOut, setDraftHotelCheckOut] = useState(
    search.hotelCheckOut,
  );
  const [visibleHotelMonth, setVisibleHotelMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const travelersLauncherRef = useRef<HTMLButtonElement>(null);
  const mobileTravelersCommittedRef = useRef(false);
  const [travelersOpen, setTravelersOpen] = useState(false);
  const [mobileTravelersOpen, setMobileTravelersOpen] = useState(false);
  const cabinLauncherRef = useRef<HTMLButtonElement>(null);
  const [cabinOpen, setCabinOpen] = useState(false);
  const [draftAdults, setDraftAdults] = useState(search.flightAdults);
  const [draftChildren, setDraftChildren] = useState(search.flightChildren);
  const [draftInfants, setDraftInfants] = useState(search.flightInfants);
  const [draftHotelRooms, setDraftHotelRooms] = useState(search.hotelRooms);
  const [draftHotelPetFriendly, setDraftHotelPetFriendly] = useState(
    search.hotelPetFriendly,
  );
  const carPickupLocationRef = useRef<HTMLInputElement>(null);
  const carPickupLocationLauncherRef = useRef<HTMLButtonElement>(null);
  const carReturnLocationLauncherRef = useRef<HTMLButtonElement>(null);
  const carReturnLocationInputRef = useRef<HTMLInputElement>(null);
  const carPickupMobileInputRef = useRef<HTMLInputElement>(null);
  const carReturnMobileInputRef = useRef<HTMLInputElement>(null);
  const carDatesLauncherRef = useRef<HTMLButtonElement>(null);
  const carTimesLauncherRef = useRef<HTMLButtonElement>(null);
  const carDriverAgeLauncherRef = useRef<HTMLButtonElement>(null);
  const mobileCarDatesCommittedRef = useRef(false);
  const mobileCarTimesCommittedRef = useRef(false);
  const mobileCarDriverAgeCommittedRef = useRef(false);
  const [mobileCarLocation, setMobileCarLocation] = useState<
    "pickup" | "return" | null
  >(null);
  const [carReturnLocationOpen, setCarReturnLocationOpen] = useState(false);
  const [draftCarReturnLocation, setDraftCarReturnLocation] = useState(
    search.carReturnLocation,
  );
  useEffect(() => {
    if (
      !carReturnLocationOpen ||
      !window.matchMedia("(min-width: 640px)").matches
    )
      return;
    const frame = requestAnimationFrame(() => {
      carReturnLocationInputRef.current?.focus({ preventScroll: true });
      carReturnLocationInputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [carReturnLocationOpen]);
  const [carDatesOpen, setCarDatesOpen] = useState(false);
  const [mobileCarDatesOpen, setMobileCarDatesOpen] = useState(false);
  const [draftCarPickupDate, setDraftCarPickupDate] = useState(
    search.carPickupDate,
  );
  const [draftCarReturnDate, setDraftCarReturnDate] = useState(
    search.carReturnDate,
  );
  const [visibleCarMonth, setVisibleCarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [carTimesOpen, setCarTimesOpen] = useState(false);
  const [mobileCarTimesOpen, setMobileCarTimesOpen] = useState(false);
  const [draftCarPickupTime, setDraftCarPickupTime] = useState(
    search.carPickupTime,
  );
  const [draftCarReturnTime, setDraftCarReturnTime] = useState(
    search.carReturnTime,
  );
  const [mobileCarDriverAgeOpen, setMobileCarDriverAgeOpen] = useState(false);
  const [draftCarDriverAge, setDraftCarDriverAge] = useState(
    search.carDriverAge,
  );
  const included = getIncludedProducts(search.mode);
  const closeDesktopLandingPanels = () => {
    if (!isDesktopLanding) return;
    setFlightOriginOpen(false);
    setFlightDestinationOpen(false);
    setHotelDestinationOpen(false);
    setFlightDatesOpen(false);
    setHotelDatesOpen(false);
    setTravelersOpen(false);
    setCabinOpen(false);
    setCarReturnLocationOpen(false);
    setCarDatesOpen(false);
    setCarTimesOpen(false);
  };
  const supportsStayDateOverride = included.hotel && included.flight;
  const travelersControlLabel = !included.hotel
    ? t("deals.travellersRow")
    : t("deals.travellersRooms");
  const applyAuthoritativeDestination = (
    current: DealsSearch,
    value: string,
    flightText = value,
  ) =>
    applySharedDestination(
      variant === "results" ? normalizeUnifiedResultsSearch(current) : current,
      value,
      flightText,
    );
  const applyAuthoritativeDates = (
    current: DealsSearch,
    dates: { start: string; end: string },
  ) =>
    applySharedDates(
      variant === "results" ? normalizeUnifiedResultsSearch(current) : current,
      dates,
    );
  const update = <K extends keyof DealsSearch>(key: K, value: DealsSearch[K]) =>
    setSearch((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    onDraftChange?.(search);
  }, [onDraftChange, search]);

  useEffect(() => {
    if (
      variant === "results" ||
      !dealsIncludesFlights(search.mode) ||
      search.flightOriginText.trim() ||
      search.flightOriginCode.trim() ||
      flightOriginUserInteractedRef.current ||
      flightDefaultOriginRequestedRef.current
    )
      return;
    flightDefaultOriginRequestedRef.current = true;
    const controller = new AbortController();
    const loadDefaultOrigin = async () => {
      let countryHint = "";
      try {
        const locationResponse = await fetch("/api/location", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (locationResponse.ok) {
          const payload =
            (await locationResponse.json()) as LocationApiResponse;
          countryHint =
            payload.source === "ipinfo-lite"
              ? normalizeLocationCountryHint(payload.countryCode)
              : "";
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
      }
      if (controller.signal.aborted) return;
      try {
        const request = new URLSearchParams({
          default: "true",
          context: "origin",
        });
        if (countryHint) request.set("countryCode", countryHint);
        if (typeof navigator !== "undefined" && navigator.language)
          request.set("locale", navigator.language);
        const placesResponse = await fetch(
          `/api/flights/places?${request.toString()}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!placesResponse.ok) return;
        const payload = (await placesResponse.json()) as DealsPlacesApiResponse;
        const patch = payload.defaultOriginAirport
          ? buildFlightOriginPatch(payload.defaultOriginAirport, locale)
          : null;
        if (!patch || controller.signal.aborted) return;
        setSearch((current) => {
          if (
            !dealsIncludesFlights(current.mode) ||
            current.flightOriginText.trim() ||
            current.flightOriginCode.trim() ||
            flightOriginUserInteractedRef.current
          )
            return current;
          return { ...current, ...patch };
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
      }
    };
    void loadDefaultOrigin();
    return () => controller.abort();
  }, [
    locale,
    search.flightOriginCode,
    search.flightOriginText,
    search.mode,
    variant,
  ]);

  const swapDealsFlightAirports = () => {
    flightOriginUserInteractedRef.current = true;
    setSearch((current) =>
      swapFlightAirports(
        current,
        getAirportByCode(current.flightOriginCode)?.city ??
          current.flightOriginText,
      ),
    );
    setFlightOriginOpen(false);
    setFlightDestinationOpen(false);
    setFlightMobileAirport(null);
    setFlightOriginHighlight(0);
    setFlightDestinationHighlight(0);
    setFlightOriginLoading(false);
    setFlightDestinationLoading(false);
    setAirportLists({ origin: [], destination: [] });
  };

  const calendarLocale = useMemo(
    () => normalizeFlightsCalendarLocale(locale),
    [locale],
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
  const [todayLocal, setTodayLocal] = useState(() =>
    startOfLocalDay(new Date()),
  );
  const isBeforeToday = useCallback(
    (date: Date) => startOfLocalDay(date).getTime() < todayLocal.getTime(),
    [todayLocal],
  );
  useEffect(() => {
    let midnightTimeout: number | undefined;

    const refreshTodayLocal = () => {
      const nextToday = startOfLocalDay(new Date());
      setTodayLocal((current) =>
        current.getTime() === nextToday.getTime() ? current : nextToday,
      );
    };
    const scheduleMidnightRefresh = () => {
      if (midnightTimeout !== undefined) window.clearTimeout(midnightTimeout);
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );
      midnightTimeout = window.setTimeout(
        () => {
          refreshTodayLocal();
          scheduleMidnightRefresh();
        },
        nextMidnight.getTime() - now.getTime() + 1_000,
      );
    };
    const refreshAndReschedule = () => {
      refreshTodayLocal();
      scheduleMidnightRefresh();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshAndReschedule();
    };

    scheduleMidnightRefresh();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", refreshAndReschedule);

    return () => {
      if (midnightTimeout !== undefined) window.clearTimeout(midnightTimeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", refreshAndReschedule);
    };
  }, []);
  const flightDatesSummary = useMemo(() => {
    const departure = parseIsoDate(search.flightDepartureDate);
    const returning = parseIsoDate(
      search.flightTripType === "one-way"
        ? search.sharedTravelEndDate
        : search.flightReturnDate,
    );
    if (!departure || isBeforeToday(departure)) return t("travelDates");
    return returning && !isBeforeToday(returning) && returning >= departure
      ? formatFlightsDateSummary(departure, returning, calendarLocale)
      : t("travelDates");
  }, [
    calendarLocale,
    isBeforeToday,
    search.flightDepartureDate,
    search.flightReturnDate,
    search.sharedTravelEndDate,
    search.flightTripType,
    t,
  ]);
  const resetFlightDatesDraft = useCallback(() => {
    setDraftFlightDepartureDate(
      search.sharedTravelStartDate || search.flightDepartureDate,
    );
    setDraftFlightReturnDate(
      search.flightTripType === "one-way"
        ? search.sharedTravelEndDate
        : search.flightReturnDate,
    );
  }, [
    search.flightDepartureDate,
    search.flightReturnDate,
    search.flightTripType,
    search.sharedTravelEndDate,
    search.sharedTravelStartDate,
  ]);
  const restoreFlightDatesFocus = () =>
    requestAnimationFrame(() =>
      flightDatesLauncherRef.current?.focus({ preventScroll: true }),
    );
  const openFlightDates = () => {
    closeDesktopLandingPanels();
    resetFlightDatesDraft();
    const departure = parseIsoDate(search.flightDepartureDate);
    const validVisibleDeparture =
      departure && !isBeforeToday(departure) ? departure : todayLocal;
    setVisibleFlightMonth(
      new Date(
        validVisibleDeparture.getFullYear(),
        validVisibleDeparture.getMonth(),
        1,
      ),
    );
    if (window.matchMedia("(max-width: 639px)").matches)
      setMobileFlightDatesOpen(true);
    else setFlightDatesOpen(true);
  };
  const dismissDesktopFlightDates = useCallback(
    (restoreFocus = false) => {
      resetFlightDatesDraft();
      setFlightDatesOpen(false);
      if (restoreFocus) restoreFlightDatesFocus();
    },
    [resetFlightDatesDraft],
  );
  const validDraftFlightRange = useMemo(() => {
    const departure = parseIsoDate(draftFlightDepartureDate);
    if (!departure || isBeforeToday(departure)) return false;
    const returning = parseIsoDate(draftFlightReturnDate);
    return Boolean(
      returning &&
      !isBeforeToday(returning) &&
      (included.hotel ? returning > departure : returning >= departure),
    );
  }, [
    draftFlightDepartureDate,
    draftFlightReturnDate,
    isBeforeToday,
    included.hotel,
  ]);
  const selectDraftFlightDate = (date: Date) => {
    if (isBeforeToday(date)) return;
    const selected = toIsoDate(date);
    const departure = parseIsoDate(draftFlightDepartureDate);
    if (!departure || isBeforeToday(departure) || draftFlightReturnDate) {
      setDraftFlightDepartureDate(selected);
      setDraftFlightReturnDate("");
    } else if (selected < draftFlightDepartureDate) {
      setDraftFlightDepartureDate(selected);
      setDraftFlightReturnDate("");
    } else setDraftFlightReturnDate(selected);
  };
  const commitFlightDates = (mobile = false) => {
    const departure = parseIsoDate(draftFlightDepartureDate);
    if (!departure || isBeforeToday(departure)) return;
    const normalizedDeparture = toIsoDate(departure);
    const returning = parseIsoDate(draftFlightReturnDate);
    if (
      !returning ||
      isBeforeToday(returning) ||
      returning < departure ||
      (included.hotel && returning <= departure)
    )
      return;
    setSearch((current) =>
      applyAuthoritativeDates(current, {
        start: normalizedDeparture,
        end: toIsoDate(returning),
      }),
    );
    if (mobile) mobileFlightDatesCommittedRef.current = true;
    else {
      setFlightDatesOpen(false);
      restoreFlightDatesFocus();
    }
  };
  const setDealsFlightTripType = (nextTripType: DealsFlightTripType) => {
    setSearch((current) => ({
      ...current,
      flightTripType: nextTripType,
      flightReturnDate:
        nextTripType === "round-trip" ? current.sharedTravelEndDate : "",
    }));
    setDraftFlightReturnDate(search.sharedTravelEndDate);
  };
  const closeMobileFlightDates = useCallback(() => {
    if (!mobileFlightDatesCommittedRef.current) resetFlightDatesDraft();
    mobileFlightDatesCommittedRef.current = false;
    setMobileFlightDatesOpen(false);
    restoreFlightDatesFocus();
  }, [resetFlightDatesDraft]);

  const hotelCalendarLocale = useMemo(
    () => normalizeHotelCalendarLocale(locale),
    [locale],
  );
  const hotelWeekdays = useMemo(
    () =>
      hotelCalendarLocale === "th-TH-u-ca-gregory"
        ? ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]
        : Array.from({ length: 7 }, (_, day) =>
            new Intl.DateTimeFormat(hotelCalendarLocale, {
              weekday: "short",
            }).format(new Date(2024, 0, 7 + day)),
          ),
    [hotelCalendarLocale],
  );
  const hotelAccessibleDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(hotelCalendarLocale, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [hotelCalendarLocale],
  );
  const displayedHotelCheckIn =
    variant === "results" && !included.flight
      ? search.sharedTravelStartDate
      : search.hotelCheckIn;
  const displayedHotelCheckOut =
    variant === "results" && !included.flight
      ? search.sharedTravelEndDate
      : search.hotelCheckOut;
  const hotelDatesSummary = useMemo(() => {
    const checkIn = parseIsoDate(displayedHotelCheckIn);
    const checkOut = parseIsoDate(displayedHotelCheckOut);
    if (
      !checkIn ||
      !checkOut ||
      isBeforeToday(checkIn) ||
      isBeforeToday(checkOut) ||
      checkOut <= checkIn
    )
      return t("hotelSearchDatePlaceholder");
    const formatter = new Intl.DateTimeFormat(hotelCalendarLocale, {
      month: "short",
      day: "numeric",
    });
    return t("hotelSearch.dateRange")
      .replace("{{checkIn}}", formatter.format(checkIn))
      .replace("{{checkOut}}", formatter.format(checkOut));
  }, [
    hotelCalendarLocale,
    isBeforeToday,
    displayedHotelCheckIn,
    displayedHotelCheckOut,
    t,
  ]);
  const resetHotelDatesDraft = useCallback(() => {
    setDraftHotelCheckIn(displayedHotelCheckIn);
    setDraftHotelCheckOut(displayedHotelCheckOut);
  }, [displayedHotelCheckIn, displayedHotelCheckOut]);
  const restoreHotelDatesFocus = () =>
    requestAnimationFrame(() =>
      hotelDatesLauncherRef.current?.focus({ preventScroll: true }),
    );
  const openHotelDates = () => {
    closeDesktopLandingPanels();
    resetHotelDatesDraft();
    const checkIn = parseIsoDate(displayedHotelCheckIn);
    const visibleDate =
      checkIn && !isBeforeToday(checkIn) ? checkIn : todayLocal;
    setVisibleHotelMonth(
      new Date(visibleDate.getFullYear(), visibleDate.getMonth(), 1),
    );
    if (window.matchMedia("(max-width: 639px)").matches)
      setMobileHotelDatesOpen(true);
    else setHotelDatesOpen(true);
  };
  const dismissDesktopHotelDates = useCallback(
    (restoreFocus = false) => {
      resetHotelDatesDraft();
      setHotelDatesOpen(false);
      if (restoreFocus) restoreHotelDatesFocus();
    },
    [resetHotelDatesDraft],
  );
  const validDraftHotelRange = useMemo(() => {
    const checkIn = parseIsoDate(draftHotelCheckIn);
    const checkOut = parseIsoDate(draftHotelCheckOut);
    return Boolean(
      checkIn &&
      checkOut &&
      !isBeforeToday(checkIn) &&
      !isBeforeToday(checkOut) &&
      checkOut > checkIn,
    );
  }, [draftHotelCheckIn, draftHotelCheckOut, isBeforeToday]);
  const selectDraftHotelDate = (date: Date) => {
    if (isBeforeToday(date)) return;
    const selected = toIsoDate(date);
    const checkIn = parseIsoDate(draftHotelCheckIn);
    if (!checkIn || isBeforeToday(checkIn) || draftHotelCheckOut) {
      setDraftHotelCheckIn(selected);
      setDraftHotelCheckOut("");
    } else if (selected <= draftHotelCheckIn) {
      setDraftHotelCheckIn(selected);
      setDraftHotelCheckOut("");
    } else setDraftHotelCheckOut(selected);
  };
  const commitHotelDates = (mobile = false) => {
    const checkIn = parseIsoDate(draftHotelCheckIn);
    const checkOut = parseIsoDate(draftHotelCheckOut);
    if (
      !checkIn ||
      !checkOut ||
      isBeforeToday(checkIn) ||
      isBeforeToday(checkOut) ||
      checkOut <= checkIn
    )
      return;
    const normalizedCheckIn = toIsoDate(checkIn);
    const normalizedCheckOut = toIsoDate(checkOut);
    setSearch((current) =>
      getIncludedProducts(current.mode).flight
        ? customizeInheritedField(current, "stayDates", {
            start: normalizedCheckIn,
            end: normalizedCheckOut,
          })
        : applyAuthoritativeDates(current, {
            start: normalizedCheckIn,
            end: normalizedCheckOut,
          }),
    );
    if (mobile) mobileHotelDatesCommittedRef.current = true;
    else {
      setHotelDatesOpen(false);
      restoreHotelDatesFocus();
    }
  };
  const closeMobileHotelDates = useCallback(() => {
    if (!mobileHotelDatesCommittedRef.current) resetHotelDatesDraft();
    mobileHotelDatesCommittedRef.current = false;
    setMobileHotelDatesOpen(false);
    restoreHotelDatesFocus();
  }, [resetHotelDatesDraft]);

  const travelerSummary = useMemo(() => {
    const total =
      search.flightAdults + search.flightChildren + search.flightInfants;
    const travellerLabel = t(
      total === 1 ? "deals.travelerSingular" : "deals.travelerPlural",
    );
    const people = `${total} ${travellerLabel}`;
    if (!included.hotel) return people;
    return `${people}, ${search.hotelRooms} ${t(search.hotelRooms === 1 ? "roomSingular" : "roomPlural")}`;
  }, [
    included.hotel,
    search.flightAdults,
    search.flightChildren,
    search.flightInfants,
    search.hotelRooms,
    t,
  ]);
  const restoreTravelersFocus = () =>
    requestAnimationFrame(() =>
      travelersLauncherRef.current?.focus({ preventScroll: true }),
    );
  const resetTravelersDraft = useCallback(() => {
    setDraftAdults(search.flightAdults);
    setDraftChildren(search.flightChildren);
    setDraftInfants(search.flightInfants);
    setDraftHotelRooms(search.hotelRooms);
    setDraftHotelPetFriendly(search.hotelPetFriendly);
  }, [
    search.flightAdults,
    search.flightChildren,
    search.flightInfants,
    search.hotelPetFriendly,
    search.hotelRooms,
  ]);
  const openTravelers = () => {
    closeDesktopLandingPanels();
    resetTravelersDraft();
    if (window.matchMedia("(max-width: 639px)").matches)
      setMobileTravelersOpen(true);
    else setTravelersOpen(true);
  };
  const dismissDesktopTravelers = useCallback(() => {
    resetTravelersDraft();
    setTravelersOpen(false);
    restoreTravelersFocus();
  }, [resetTravelersDraft]);
  const normalizeTravelersDraft = () => {
    const limit = included.flight ? 9 : 12;
    const adults = Math.max(1, Math.min(limit, draftAdults));
    const children = Math.max(0, Math.min(limit - adults, draftChildren));
    const infants = included.flight
      ? Math.max(0, Math.min(adults, limit - adults - children, draftInfants))
      : draftInfants;
    return {
      adults,
      children,
      infants,
      rooms: Math.max(1, Math.min(6, draftHotelRooms)),
    };
  };
  const commitTravelers = (mobile = false) => {
    const normalized = normalizeTravelersDraft();
    setSearch((current) => ({
      ...current,
      flightAdults: normalized.adults,
      flightChildren: normalized.children,
      flightInfants: normalized.infants,
      hotelAdults: normalized.adults,
      hotelChildren: normalized.children,
      hotelRooms: normalized.rooms,
      hotelPetFriendly: draftHotelPetFriendly,
    }));
    if (mobile) mobileTravelersCommittedRef.current = true;
    else {
      setTravelersOpen(false);
      restoreTravelersFocus();
    }
  };
  const closeMobileTravelers = useCallback(() => {
    if (!mobileTravelersCommittedRef.current) resetTravelersDraft();
    mobileTravelersCommittedRef.current = false;
    setMobileTravelersOpen(false);
    restoreTravelersFocus();
  }, [resetTravelersDraft]);

  const carIntlLocale = useMemo(() => getCarsIntlLocale(locale), [locale]);
  const carWeekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, day) =>
        new Intl.DateTimeFormat(carIntlLocale, { weekday: "short" }).format(
          new Date(2024, 0, 7 + day),
        ),
      ),
    [carIntlLocale],
  );
  const carAccessibleDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(carIntlLocale, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [carIntlLocale],
  );
  const carShortDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(carIntlLocale, {
        month: "short",
        day: "numeric",
      }),
    [carIntlLocale],
  );
  const carDatesSummary = useMemo(() => {
    const pickup = parseIsoDate(search.carPickupDate);
    const returning = parseIsoDate(search.carReturnDate);
    return pickup &&
      returning &&
      !isBeforeToday(pickup) &&
      !isBeforeToday(returning) &&
      returning >= pickup
      ? `${carShortDateFormatter.format(pickup)} — ${carShortDateFormatter.format(returning)}`
      : t("carsSearch.rentalDatePlaceholder");
  }, [
    carShortDateFormatter,
    isBeforeToday,
    search.carPickupDate,
    search.carReturnDate,
    t,
  ]);
  const carTimesSummary = useMemo(
    () =>
      timeOptions.includes(search.carPickupTime) &&
      timeOptions.includes(search.carReturnTime)
        ? t("carsSearch.pickupReturnTimeSummary")
            .replace(
              "{pickupTime}",
              formatCarTimeLabel(search.carPickupTime, carIntlLocale),
            )
            .replace(
              "{returnTime}",
              formatCarTimeLabel(search.carReturnTime, carIntlLocale),
            )
        : t("carsSearch.pickupReturnTimeLabel"),
    [carIntlLocale, search.carPickupTime, search.carReturnTime, t],
  );
  const carDriverAgeLabel = (age: string) =>
    age === "18-70" ? t("carsSearch.driverAgeAnyAgeRange") : age;
  const resetCarDatesDraft = useCallback(() => {
    setDraftCarPickupDate(search.carPickupDate);
    setDraftCarReturnDate(search.carReturnDate);
  }, [
    search.carPickupDate,
    search.carReturnDate,
    setDraftCarPickupDate,
    setDraftCarReturnDate,
  ]);
  const resetCarTimesDraft = useCallback(() => {
    setDraftCarPickupTime(search.carPickupTime);
    setDraftCarReturnTime(search.carReturnTime);
  }, [search.carPickupTime, search.carReturnTime]);
  const restoreCarFocus = (ref: RefObject<HTMLButtonElement | null>) =>
    requestAnimationFrame(() => ref.current?.focus({ preventScroll: true }));
  const closeOtherDealsPickers = () => {
    setFlightOriginOpen(false);
    setFlightDestinationOpen(false);
    setFlightMobileAirport(null);
    setHotelDestinationOpen(false);
    setHotelDestinationMobileOpen(false);
    dismissDesktopFlightDates();
    setMobileFlightDatesOpen(false);
    dismissDesktopHotelDates();
    setMobileHotelDatesOpen(false);
    setTravelersOpen(false);
    setMobileTravelersOpen(false);
  };
  const closeCarMobilePickers = () => {
    setMobileCarLocation(null);
    setMobileCarDatesOpen(false);
    setMobileCarTimesOpen(false);
    setMobileCarDriverAgeOpen(false);
  };
  const openCarLocation = (kind: "pickup" | "return") => {
    closeDesktopLandingPanels();
    closeOtherDealsPickers();
    resetCarDatesDraft();
    resetCarTimesDraft();
    setCarDatesOpen(false);
    setCarTimesOpen(false);
    closeCarMobilePickers();
    if (kind === "return") setDraftCarReturnLocation(search.carReturnLocation);
    if (window.matchMedia("(max-width: 639px)").matches)
      setMobileCarLocation(kind);
    else if (kind === "return") setCarReturnLocationOpen(true);
    else setMobileCarLocation(kind);
  };
  const dismissCarReturnLocation = useCallback(() => {
    setDraftCarReturnLocation(search.carReturnLocation);
    setCarReturnLocationOpen(false);
    restoreCarFocus(carReturnLocationLauncherRef);
  }, [search.carReturnLocation]);
  const commitCarReturnLocation = () => {
    const location = draftCarReturnLocation.trim();
    if (!location) return;
    setSearch((current) => setCarReturnMode(current, true, location));
    setCarReturnLocationOpen(false);
    restoreCarFocus(carReturnLocationLauncherRef);
  };
  const openCarDates = () => {
    closeDesktopLandingPanels();
    resetCarDatesDraft();
    resetCarTimesDraft();
    closeOtherDealsPickers();
    closeCarMobilePickers();
    setCarTimesOpen(false);
    const pickup = parseIsoDate(search.carPickupDate);
    const visible = pickup && !isBeforeToday(pickup) ? pickup : todayLocal;
    setVisibleCarMonth(new Date(visible.getFullYear(), visible.getMonth(), 1));
    if (window.matchMedia("(max-width: 639px)").matches)
      setMobileCarDatesOpen(true);
    else setCarDatesOpen(true);
  };
  const dismissCarDates = useCallback(
    (focus = false) => {
      resetCarDatesDraft();
      setCarDatesOpen(false);
      if (focus) restoreCarFocus(carDatesLauncherRef);
    },
    [resetCarDatesDraft],
  );
  const openCarTimes = () => {
    closeDesktopLandingPanels();
    resetCarTimesDraft();
    resetCarDatesDraft();
    closeOtherDealsPickers();
    closeCarMobilePickers();
    setCarDatesOpen(false);
    if (window.matchMedia("(max-width: 639px)").matches)
      setMobileCarTimesOpen(true);
    else setCarTimesOpen(true);
  };
  const dismissCarTimes = useCallback(
    (focus = false) => {
      resetCarTimesDraft();
      setCarTimesOpen(false);
      if (focus) restoreCarFocus(carTimesLauncherRef);
    },
    [resetCarTimesDraft],
  );
  const validDraftCarRange = useMemo(() => {
    const pickup = parseIsoDate(draftCarPickupDate);
    const returning = parseIsoDate(draftCarReturnDate);
    return Boolean(
      pickup &&
      returning &&
      !isBeforeToday(pickup) &&
      !isBeforeToday(returning) &&
      returning >= pickup,
    );
  }, [draftCarPickupDate, draftCarReturnDate, isBeforeToday]);
  const selectDraftCarDate = (date: Date) => {
    if (isBeforeToday(date)) return;
    const selected = toIsoDate(date);
    const pickup = parseIsoDate(draftCarPickupDate);
    if (!pickup || isBeforeToday(pickup) || draftCarReturnDate) {
      setDraftCarPickupDate(selected);
      setDraftCarReturnDate("");
    } else if (selected < draftCarPickupDate) {
      setDraftCarPickupDate(selected);
      setDraftCarReturnDate("");
    } else setDraftCarReturnDate(selected);
  };
  const commitCarDates = (mobile = false) => {
    const pickup = parseIsoDate(draftCarPickupDate);
    const returning = parseIsoDate(draftCarReturnDate);
    if (
      !pickup ||
      !returning ||
      isBeforeToday(pickup) ||
      isBeforeToday(returning) ||
      returning < pickup
    )
      return;
    setSearch((current) =>
      customizeInheritedField(current, "carDates", {
        start: toIsoDate(pickup),
        end: toIsoDate(returning),
      }),
    );
    if (mobile) mobileCarDatesCommittedRef.current = true;
    else {
      setCarDatesOpen(false);
      restoreCarFocus(carDatesLauncherRef);
    }
  };
  const invalidSameDayCarTimes =
    search.carPickupDate === search.carReturnDate &&
    draftCarReturnTime <= draftCarPickupTime;
  const validDraftCarTimes =
    timeOptions.includes(draftCarPickupTime) &&
    timeOptions.includes(draftCarReturnTime) &&
    !invalidSameDayCarTimes;
  const commitCarTimes = (mobile = false) => {
    if (!validDraftCarTimes) return;
    setSearch((current) => ({
      ...current,
      carPickupTime: draftCarPickupTime,
      carReturnTime: draftCarReturnTime,
    }));
    if (mobile) mobileCarTimesCommittedRef.current = true;
    else {
      setCarTimesOpen(false);
      restoreCarFocus(carTimesLauncherRef);
    }
  };
  const closeMobileCarDates = useCallback(() => {
    if (!mobileCarDatesCommittedRef.current) resetCarDatesDraft();
    mobileCarDatesCommittedRef.current = false;
    setMobileCarDatesOpen(false);
    restoreCarFocus(carDatesLauncherRef);
  }, [resetCarDatesDraft]);
  const closeMobileCarTimes = useCallback(() => {
    if (!mobileCarTimesCommittedRef.current) resetCarTimesDraft();
    mobileCarTimesCommittedRef.current = false;
    setMobileCarTimesOpen(false);
    restoreCarFocus(carTimesLauncherRef);
  }, [resetCarTimesDraft]);
  const closeMobileCarDriverAge = () => {
    if (!mobileCarDriverAgeCommittedRef.current)
      setDraftCarDriverAge(search.carDriverAge);
    mobileCarDriverAgeCommittedRef.current = false;
    setMobileCarDriverAgeOpen(false);
    restoreCarFocus(carDriverAgeLauncherRef);
  };

  useEffect(() => {
    if (!mobileCarLocation) return;
    const timer = window.setTimeout(() => {
      const input =
        mobileCarLocation === "pickup"
          ? carPickupMobileInputRef.current
          : carReturnMobileInputRef.current;
      input?.focus();
      input?.select();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [mobileCarLocation]);
  useEffect(() => {
    if (!carDatesOpen && !carTimesOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        carDatesOpen &&
        !carDatesLauncherRef.current?.contains(target) &&
        !(
          target instanceof Element &&
          target.closest(
            "[data-deals-car-dates-popover], [data-deals-desktop-landing-popover='car-dates']",
          )
        )
      )
        dismissCarDates();
      if (
        carTimesOpen &&
        !carTimesLauncherRef.current?.contains(target) &&
        !(
          target instanceof Element &&
          target.closest(
            "[data-deals-car-times-popover], [data-deals-desktop-landing-popover='car-times']",
          )
        )
      )
        dismissCarTimes();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (carDatesOpen) dismissCarDates(true);
      if (carTimesOpen) dismissCarTimes(true);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [carDatesOpen, carTimesOpen, dismissCarDates, dismissCarTimes]);

  useEffect(() => {
    if (!travelersOpen) return;
    const dismissOnPointer = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !travelersLauncherRef.current?.contains(target) &&
        !(
          target instanceof Element &&
          target.closest(
            "[data-deals-flight-travellers-popover], [data-deals-desktop-landing-popover='travellers']",
          )
        )
      )
        dismissDesktopTravelers();
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismissDesktopTravelers();
      }
    };
    document.addEventListener("mousedown", dismissOnPointer);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("mousedown", dismissOnPointer);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [dismissDesktopTravelers, travelersOpen]);

  useEffect(() => {
    if (!cabinOpen) return;
    const dismiss = (restoreFocus = false) => {
      setCabinOpen(false);
      if (restoreFocus)
        requestAnimationFrame(() =>
          cabinLauncherRef.current?.focus({ preventScroll: true }),
        );
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        !cabinLauncherRef.current?.contains(target) &&
        !(
          target instanceof Element &&
          target.closest('[data-deals-desktop-landing-popover="cabin"]')
        )
      )
        dismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      dismiss(true);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [cabinOpen]);

  useEffect(() => {
    if (!flightDatesOpen) return;
    const dismissOnPointer = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !flightDatesLauncherRef.current?.contains(target) &&
        !(
          target instanceof Element &&
          target.closest(
            "[data-deals-flight-dates-popover], [data-deals-desktop-landing-popover='flight-dates']",
          )
        )
      )
        dismissDesktopFlightDates();
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismissDesktopFlightDates(true);
      }
    };
    document.addEventListener("pointerdown", dismissOnPointer);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOnPointer);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [dismissDesktopFlightDates, flightDatesOpen]);

  useEffect(() => {
    if (!hotelDatesOpen) return;
    const dismissOnPointer = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !hotelDatesLauncherRef.current?.contains(target) &&
        !(
          target instanceof Element &&
          target.closest(
            "[data-deals-hotel-dates-popover], [data-deals-desktop-landing-popover='hotel-dates']",
          )
        )
      )
        dismissDesktopHotelDates();
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismissDesktopHotelDates(true);
      }
    };
    document.addEventListener("pointerdown", dismissOnPointer);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOnPointer);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [dismissDesktopHotelDates, hotelDatesOpen]);

  const closeUnrelatedPickers = useCallback(() => {
    resetFlightDatesDraft();
    setFlightDatesOpen(false);
    setMobileFlightDatesOpen(false);
    resetTravelersDraft();
    setTravelersOpen(false);
    setMobileTravelersOpen(false);
    resetHotelDatesDraft();
    setHotelDatesOpen(false);
    setMobileHotelDatesOpen(false);
  }, [resetFlightDatesDraft, resetHotelDatesDraft, resetTravelersDraft]);
  const closeProductPickers = (product: DealsProduct) => {
    if (product === "flight") {
      setFlightOriginOpen(false);
      setFlightDestinationOpen(false);
      setFlightMobileAirport(null);
      setFlightDatesOpen(false);
      setMobileFlightDatesOpen(false);
      setTravelersOpen(false);
      setMobileTravelersOpen(false);
    }
    if (product === "hotel") {
      setHotelDestinationOpen(false);
      setHotelDestinationMobileOpen(false);
      setHotelDatesOpen(false);
      setMobileHotelDatesOpen(false);
    }
    if (product === "car") {
      setMobileCarLocation(null);
      setCarReturnLocationOpen(false);
      setCarDatesOpen(false);
      setMobileCarDatesOpen(false);
      setCarTimesOpen(false);
      setMobileCarTimesOpen(false);
      setMobileCarDriverAgeOpen(false);
    }
  };
  const selectPackageMode = (mode: DealsPackageMode) => {
    const nextIncluded = getIncludedProducts(mode);
    if (
      !included.flight &&
      nextIncluded.flight &&
      search.flightAdults + search.flightChildren + search.flightInfants > 9
    ) {
      setProductSelectionMessage(t("deals.error.flightPassengers"));
      return;
    }
    for (const product of dealsProductOrder) {
      if (included[product] && !nextIncluded[product]) {
        closeProductPickers(product);
      }
    }
    setTravelersOpen(false);
    setMobileTravelersOpen(false);
    resetTravelersDraft();
    setProductSelectionMessage("");
    setSearch((current) => {
      let next = transitionDealsMode(current, mode);
      if (isLandingVariant) {
        const enteringHotelFlight =
          nextIncluded.hotel &&
          nextIncluded.flight &&
          !(included.hotel && included.flight);
        if (enteringHotelFlight) {
          next = relinkInheritedField(next, "stayDestination");
          next = relinkInheritedField(next, "stayDates");
        }
        if (nextIncluded.car && !included.car) {
          next = relinkInheritedField(next, "carPickup");
          next = relinkInheritedField(next, "carDates");
        }
      } else {
        next = normalizeUnifiedResultsSearch(next);
      }
      return next;
    });
  };
  useEffect(() => {
    if (presentation !== "mobile-homepage") return;
    const rail = mobilePackageRailRef.current;
    const selectedOption = mobilePackageOptionRefs.current[search.mode];
    if (!rail || !selectedOption) return;
    const frame = requestAnimationFrame(() => {
      const railBounds = rail.getBoundingClientRect();
      const optionBounds = selectedOption.getBoundingClientRect();
      const startOverflow = optionBounds.left - railBounds.left;
      const endOverflow = optionBounds.right - railBounds.right;
      const delta =
        startOverflow < 0 ? startOverflow : endOverflow > 0 ? endOverflow : 0;
      if (delta)
        rail.scrollBy({
          left: delta,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        });
    });
    return () => cancelAnimationFrame(frame);
  }, [presentation, search.mode]);
  const openFlightAirport = (
    kind: "origin" | "destination",
    mobile = false,
  ) => {
    closeDesktopLandingPanels();
    closeUnrelatedPickers();
    setHotelDestinationOpen(false);
    setHotelDestinationMobileOpen(false);
    setFlightOriginOpen(!mobile && kind === "origin");
    setFlightDestinationOpen(!mobile && kind === "destination");
    setFlightMobileAirport(mobile ? kind : null);
  };
  const openHotelDestination = (mobile = false) => {
    closeDesktopLandingPanels();
    closeUnrelatedPickers();
    setFlightOriginOpen(false);
    setFlightDestinationOpen(false);
    setFlightMobileAirport(null);
    setHotelDestinationOpen(!mobile);
    setHotelDestinationMobileOpen(mobile);
  };

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        target instanceof Element &&
        target.closest(
          "[data-deals-destination-popover], [data-deals-desktop-landing-popover^='flight-'], [data-deals-desktop-landing-popover='hotel']",
        )
      )
        return;
      if (!flightOriginWrapRef.current?.contains(target))
        setFlightOriginOpen(false);
      if (!flightDestinationWrapRef.current?.contains(target))
        setFlightDestinationOpen(false);
      if (!hotelDestinationWrapRef.current?.contains(target))
        setHotelDestinationOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFlightOriginOpen(false);
        setFlightDestinationOpen(false);
        setHotelDestinationOpen(false);
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  useEffect(() => {
    const query = search.flightOriginText.trim();
    if (
      (!flightOriginOpen && flightMobileAirport !== "origin") ||
      query.length < 2
    )
      return;
    const controller = new AbortController();
    const id = window.setTimeout(async () => {
      setFlightOriginLoading(true);
      try {
        const response = await fetch(
          `/api/flights/places?${new URLSearchParams({ q: query, context: "origin" })}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) throw new Error();
        const payload = (await response.json()) as {
          suggestions?: AirportOption[];
        };
        setAirportLists((all) => ({
          ...all,
          origin: payload.suggestions?.slice(0, 8) ?? [],
        }));
        setFlightOriginHighlight(0);
      } catch {
        if (!controller.signal.aborted)
          setAirportLists((all) => ({ ...all, origin: [] }));
      } finally {
        if (!controller.signal.aborted) setFlightOriginLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [flightMobileAirport, flightOriginOpen, search.flightOriginText]);
  useEffect(() => {
    const query = search.flightDestinationText.trim();
    if (
      (!flightDestinationOpen && flightMobileAirport !== "destination") ||
      query.length < 2
    )
      return;
    const controller = new AbortController();
    const id = window.setTimeout(async () => {
      setFlightDestinationLoading(true);
      try {
        const response = await fetch(
          `/api/flights/places?${new URLSearchParams({ q: query, context: "destination" })}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) throw new Error();
        const payload = (await response.json()) as {
          suggestions?: AirportOption[];
        };
        setAirportLists((all) => ({
          ...all,
          destination: payload.suggestions?.slice(0, 8) ?? [],
        }));
        setFlightDestinationHighlight(0);
      } catch {
        if (!controller.signal.aborted)
          setAirportLists((all) => ({ ...all, destination: [] }));
      } finally {
        if (!controller.signal.aborted) setFlightDestinationLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [
    flightDestinationOpen,
    flightMobileAirport,
    search.flightDestinationText,
  ]);
  useEffect(() => {
    if (!hotelDestinationOpen) return;
    const query = search.hotelDestination.trim();
    const controller = new AbortController();
    const id = window.setTimeout(
      async () => {
        setHotelDestinationLoading(true);
        try {
          const request = new URLSearchParams({ limit: "8" });
          if (query) request.set("q", query);
          const response = await fetch(`/api/hotels/destinations?${request}`, {
            signal: controller.signal,
            cache: "no-store",
          });
          if (!response.ok) throw new Error();
          const payload = (await response.json()) as {
            suggestions?: HotelSuggestion[];
          };
          setHotelSuggestions(
            payload.suggestions
              ?.filter(
                (option) =>
                  option?.id &&
                  option?.name &&
                  option?.country &&
                  option?.searchValue,
              )
              .slice(0, 8) ?? [],
          );
          setHotelDestinationHighlight(0);
        } catch {
          if (!controller.signal.aborted) setHotelSuggestions([]);
        } finally {
          if (!controller.signal.aborted) setHotelDestinationLoading(false);
        }
      },
      query ? 180 : 0,
    );
    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [hotelDestinationOpen, search.hotelDestination]);
  useEffect(() => {
    if (!flightMobileAirport) return;
    const frame = requestAnimationFrame(() =>
      (flightMobileAirport === "origin"
        ? flightOriginMobileInputRef
        : flightDestinationMobileInputRef
      ).current?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, [flightMobileAirport]);

  const chooseAirport = (
    kind: "origin" | "destination",
    option: AirportOption,
  ) => {
    if (kind === "origin") flightOriginUserInteractedRef.current = true;
    const text = formatAirportLabel(option, locale);
    const codeKey =
      kind === "origin" ? "flightOriginCode" : "flightDestinationCode";
    const textKey =
      kind === "origin" ? "flightOriginText" : "flightDestinationText";
    setSearch((current) =>
      kind === "destination"
        ? {
            ...applyAuthoritativeDestination(current, option.city, text),
            flightDestinationCode: option.code.toUpperCase(),
          }
        : { ...current, [textKey]: text, [codeKey]: option.code.toUpperCase() },
    );
    setAirportLists((all) => ({ ...all, [kind]: [] }));
    setFlightOriginOpen(false);
    setFlightDestinationOpen(false);
    setFlightMobileAirport(null);
    if (kind === "origin") setFlightOriginHighlight(0);
    else setFlightDestinationHighlight(0);
  };
  const validateCurrentDealsSearch = (candidate = search) => {
    const found = validateDealsSearch(candidate);
    setErrors(found);
    if (Object.keys(found).length) {
      requestAnimationFrame(() => {
        firstError.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
          block: "center",
        });
        firstError.current?.focus({ preventScroll: true });
      });
      return false;
    }
    return true;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const submittedSearch =
      variant === "results" ? normalizeUnifiedResultsSearch(search) : search;
    if (!validateCurrentDealsSearch(submittedSearch)) return;
    if (variant === "results" && onSubmitSearch) {
      onSubmitSearch(submittedSearch);
      return;
    }
    removeDealsStagedJourneyPlan();
    setSubmitting(true);
    start();
    router.push(
      buildDealsJourneyUrl(
        getFirstDealsJourneyStage(submittedSearch.mode),
        submittedSearch,
      ),
    );
  };

  const previewGuidedJourney = () => {
    if (submitting || pending) return;
    if (!validateCurrentDealsSearch()) return;
    const firstStage = getFirstDealsJourneyStage(search.mode);
    const destination = buildDealsJourneyUrl(firstStage, search);
    setSubmitting(true);
    start();
    router.push(destination);
  };
  const errorBlock = (product: DealsProduct) =>
    errors[product] ? (
      <div
        ref={firstError}
        role="alert"
        aria-live="polite"
        className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700"
      >
        {Object.values(errors[product] ?? {})
          .map(t)
          .join(" ")}
      </div>
    ) : null;
  const travelersPicker = (
    <div className="w-full space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {(
          [
            ["adults", t("adults"), t("adultAgeRange"), draftAdults, 1],
            ["children", t("children"), t("childAgeRange"), draftChildren, 0],
            ["infants", t("infantsOnLap"), t("under2"), draftInfants, 0],
          ] as const
        ).map(([key, rowLabel, description, count, minimum]) => {
          const total = draftAdults + draftChildren + draftInfants;
          const limit = included.flight ? 9 : 12;
          const canDecrease = count > minimum;
          const canIncrease =
            total < limit && (key !== "infants" || draftInfants < draftAdults);
          const ariaName = (translationKey: string) =>
            t(translationKey).replace("{{label}}", rowLabel);
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0"
            >
              <span className="min-w-0">
                <span className="block font-extrabold text-slate-950">
                  {rowLabel}
                </span>
                <span className="block text-xs font-medium text-slate-500">
                  {description}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  aria-label={ariaName("deals.decreaseCountAria")}
                  disabled={!canDecrease}
                  onClick={() => {
                    if (key === "adults") {
                      const adults = Math.max(1, draftAdults - 1);
                      setDraftAdults(adults);
                      setDraftInfants((current) => Math.min(current, adults));
                    } else if (key === "children")
                      setDraftChildren((current) => Math.max(0, current - 1));
                    else setDraftInfants((current) => Math.max(0, current - 1));
                  }}
                  className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 hover:border-[#004BB8] hover:text-[#004BB8] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300 sm:h-10 sm:w-10"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="min-w-7 text-center font-extrabold tabular-nums text-slate-950">
                  {count}
                </span>
                <button
                  type="button"
                  aria-label={ariaName("deals.increaseCountAria")}
                  disabled={!canIncrease}
                  onClick={() => {
                    if (total >= (included.flight ? 9 : 12)) return;
                    if (key === "adults")
                      setDraftAdults((current) => current + 1);
                    else if (key === "children")
                      setDraftChildren((current) => current + 1);
                    else if (draftInfants < draftAdults)
                      setDraftInfants((current) => current + 1);
                  }}
                  className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 hover:border-[#004BB8] hover:text-[#004BB8] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300 sm:h-10 sm:w-10"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </span>
            </div>
          );
        })}
      </div>
      {included.hotel ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <span className="font-extrabold">{t("rooms")}</span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t("deals.decreaseCountAria").replace(
                  "{{label}}",
                  t("rooms"),
                )}
                disabled={draftHotelRooms <= 1}
                onClick={() =>
                  setDraftHotelRooms((value) => Math.max(1, value - 1))
                }
                className="focus-ring h-10 w-10 rounded-full border"
              >
                −
              </button>
              <span>{draftHotelRooms}</span>
              <button
                type="button"
                aria-label={t("deals.increaseCountAria").replace(
                  "{{label}}",
                  t("rooms"),
                )}
                disabled={draftHotelRooms >= 6}
                onClick={() =>
                  setDraftHotelRooms((value) => Math.min(6, value + 1))
                }
                className="focus-ring h-10 w-10 rounded-full border"
              >
                +
              </button>
            </span>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={draftHotelPetFriendly}
              onChange={(event) =>
                setDraftHotelPetFriendly(event.target.checked)
              }
            />
            {t("petFriendly")}
          </label>
        </div>
      ) : null}
    </div>
  );

  const renderFlightDatesCalendar = (mobile = false) => {
    const draftDeparture = parseIsoDate(draftFlightDepartureDate);
    const draftReturn = parseIsoDate(draftFlightReturnDate);
    const renderMonth = (monthDate: Date) => (
      <section
        key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}
        aria-label={formatFlightsMonthHeading(monthDate, calendarLocale)}
        className="min-w-0"
      >
        <h3
          className={`${mobile ? "mb-1 text-start text-[17px] font-bold" : "mb-2.5 text-center text-sm font-medium"} text-slate-950`}
        >
          {formatFlightsMonthHeading(monthDate, calendarLocale)}
        </h3>
        <div
          className={`grid grid-cols-7 text-center font-semibold text-slate-500 ${mobile ? "text-xs" : "mb-1.5 text-[10px]"}`}
        >
          {weekdays.map((weekday, index) => (
            <span key={`${weekday}-${index}`} className="py-2">
              {weekday}
            </span>
          ))}
        </div>
        <div
          className={`grid grid-cols-7 ${mobile ? "gap-y-1.5" : "gap-y-0.5"}`}
        >
          {buildMonthCells(monthDate).map(({ date, isCurrentMonth }) => {
            const iso = toIsoDate(date);
            if (!isCurrentMonth)
              return (
                <span
                  key={iso}
                  aria-hidden="true"
                  className={mobile ? "h-11" : "h-10"}
                />
              );
            const disabled = isBeforeToday(date);
            const departure = iso === draftFlightDepartureDate;
            const returning = iso === draftFlightReturnDate;
            const inRange = Boolean(
              draftDeparture &&
              draftReturn &&
              date > draftDeparture &&
              date < draftReturn &&
              !disabled,
            );
            const today = iso === toIsoDate(todayLocal);
            return (
              <button
                key={iso}
                type="button"
                aria-label={`${t("selectDateAriaPrefix")} ${accessibleDateFormatter.format(date)}`}
                aria-pressed={departure || returning}
                aria-disabled={disabled}
                disabled={disabled}
                onClick={() => selectDraftFlightDate(date)}
                className={`focus-ring relative mx-auto flex items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed ${mobile ? "h-11 w-full max-w-11 text-[15px] font-semibold" : "h-10 w-10 text-sm font-medium"} ${disabled ? "text-slate-300" : "text-slate-800 hover:bg-[#004BB8]/10 hover:text-[#004BB8]"} ${today && !disabled ? "ring-1 ring-inset ring-[#004BB8]/20" : ""} ${inRange ? "bg-[#004BB8]/10 text-[#021C2B]" : ""} ${departure || returning ? "bg-[#004BB8] text-white ring-0 hover:bg-[#004BB8] hover:text-white" : ""}`}
              >
                {date.getDate()}
                {today && !departure && !returning && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[#004BB8]"
                  />
                )}
              </button>
            );
          })}
        </div>
      </section>
    );
    if (mobile)
      return (
        <div className="mx-auto w-full max-w-xl space-y-8 pb-2">
          {search.flightTripType === "one-way" ? (
            <p className="text-sm font-bold text-slate-700">
              {t("deals.packageEndDate")}
            </p>
          ) : null}
          {Array.from({ length: 12 }, (_, offset) =>
            renderMonth(addMonths(todayLocal, offset)),
          )}
        </div>
      );
    return (
      <div className="mx-auto w-full max-w-2xl">
        {search.flightTripType === "one-way" ? (
          <p className="mb-3 text-sm font-bold text-slate-700">
            {t("deals.packageEndDate")}
          </p>
        ) : null}
        <div className="mb-3 flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label={t("previousMonth")}
            onClick={() =>
              setVisibleFlightMonth((month) => addMonths(month, -1))
            }
            className="focus-ring rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:text-[#004BB8]"
          >
            {t("previousMonthShort")}
          </button>
          <button
            type="button"
            aria-label={t("nextMonth")}
            onClick={() =>
              setVisibleFlightMonth((month) => addMonths(month, 1))
            }
            className="focus-ring rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:text-[#004BB8]"
          >
            {t("nextMonthShort")}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-5 min-[700px]:grid-cols-2">
          {[0, 1].map((offset) =>
            renderMonth(addMonths(visibleFlightMonth, offset)),
          )}
        </div>
      </div>
    );
  };

  const renderHotelDatesCalendar = (mobile = false) => {
    const draftCheckIn = parseIsoDate(draftHotelCheckIn);
    const draftCheckOut = parseIsoDate(draftHotelCheckOut);
    const renderMonth = (monthDate: Date) => (
      <section
        key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}
        aria-label={monthDate.toLocaleDateString(hotelCalendarLocale, {
          month: "long",
          year: "numeric",
        })}
        className="min-w-0"
      >
        <h3
          className={`${mobile ? "mb-1 text-start text-[17px] font-bold" : "mb-2.5 text-center text-sm font-medium"} text-slate-950`}
        >
          {monthDate.toLocaleDateString(hotelCalendarLocale, {
            month: "long",
            year: "numeric",
          })}
        </h3>
        <div
          className={`grid grid-cols-7 text-center font-semibold text-slate-500 ${mobile ? "text-xs" : "mb-1.5 text-[10px]"}`}
        >
          {hotelWeekdays.map((weekday, index) => (
            <span key={`${weekday}-${index}`} className="py-2">
              {weekday}
            </span>
          ))}
        </div>
        <div
          className={`grid grid-cols-7 ${mobile ? "gap-y-1.5" : "gap-y-0.5"}`}
        >
          {buildMonthCells(monthDate).map(({ date, isCurrentMonth }) => {
            const iso = toIsoDate(date);
            if (!isCurrentMonth)
              return (
                <span
                  key={iso}
                  aria-hidden="true"
                  className={mobile ? "h-11" : "h-10"}
                />
              );
            const disabled = isBeforeToday(date);
            const checkIn = iso === draftHotelCheckIn;
            const checkOut = iso === draftHotelCheckOut;
            const inRange = Boolean(
              draftCheckIn &&
              draftCheckOut &&
              date > draftCheckIn &&
              date < draftCheckOut &&
              !disabled,
            );
            const today = iso === toIsoDate(todayLocal);
            return (
              <button
                key={iso}
                type="button"
                aria-label={`${t("hotelResults.selectDateAriaPrefix")} ${hotelAccessibleDateFormatter.format(date)}`}
                aria-pressed={checkIn || checkOut}
                aria-disabled={disabled}
                disabled={disabled}
                onClick={() => selectDraftHotelDate(date)}
                className={`focus-ring relative mx-auto flex items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed ${mobile ? "h-11 w-full max-w-11 text-[15px] font-semibold" : "h-10 w-10 text-sm font-medium"} ${disabled ? "text-slate-300" : "text-slate-800 hover:bg-[#004BB8]/10 hover:text-[#004BB8]"} ${today && !disabled ? "ring-1 ring-inset ring-[#004BB8]/20" : ""} ${inRange ? "bg-[#004BB8]/10 text-[#021C2B]" : ""} ${checkIn || checkOut ? "bg-[#004BB8] text-white ring-0 hover:bg-[#004BB8] hover:text-white" : ""}`}
              >
                {date.getDate()}
                {today && !checkIn && !checkOut && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[#004BB8]"
                  />
                )}
              </button>
            );
          })}
        </div>
      </section>
    );
    if (mobile)
      return (
        <div className="mx-auto w-full max-w-xl space-y-8 pb-2">
          {Array.from({ length: 12 }, (_, offset) =>
            renderMonth(addMonths(todayLocal, offset)),
          )}
        </div>
      );
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label={t("previousMonth")}
            onClick={() =>
              setVisibleHotelMonth((month) => addMonths(month, -1))
            }
            className="focus-ring rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:text-[#004BB8]"
          >
            {t("previousMonthShort")}
          </button>
          <button
            type="button"
            aria-label={t("nextMonth")}
            onClick={() => setVisibleHotelMonth((month) => addMonths(month, 1))}
            className="focus-ring rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:text-[#004BB8]"
          >
            {t("nextMonthShort")}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-5 min-[700px]:grid-cols-2">
          {[0, 1].map((offset) =>
            renderMonth(addMonths(visibleHotelMonth, offset)),
          )}
        </div>
      </div>
    );
  };

  const renderCarDatesCalendar = (mobile = false) => {
    const pickup = parseIsoDate(draftCarPickupDate);
    const returning = parseIsoDate(draftCarReturnDate);
    const renderMonth = (monthDate: Date) => (
      <section
        key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}
        aria-label={monthDate.toLocaleDateString(carIntlLocale, {
          month: "long",
          year: "numeric",
        })}
        className="min-w-0"
      >
        <h3
          className={`${mobile ? "mb-1 text-start text-[17px] font-bold" : "mb-2 text-center text-sm font-semibold"} text-slate-950`}
        >
          {monthDate.toLocaleDateString(carIntlLocale, {
            month: "long",
            year: "numeric",
          })}
        </h3>
        <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500">
          {carWeekdays.map((weekday, index) => (
            <span key={`${weekday}-${index}`} className="py-2">
              {weekday}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {buildMonthCells(monthDate).map(({ date, isCurrentMonth }) => {
            const iso = toIsoDate(date);
            if (!isCurrentMonth)
              return (
                <span
                  key={iso}
                  aria-hidden="true"
                  className={mobile ? "h-11" : "h-9"}
                />
              );
            const disabled = isBeforeToday(date);
            const isPickup = iso === draftCarPickupDate;
            const isReturn = iso === draftCarReturnDate;
            const inRange = Boolean(
              pickup &&
              returning &&
              date > pickup &&
              date < returning &&
              !disabled,
            );
            return (
              <button
                key={iso}
                type="button"
                aria-label={`${t("carsSearch.selectDateAriaPrefix")} ${carAccessibleDateFormatter.format(date)}`}
                aria-pressed={isPickup || isReturn}
                aria-disabled={disabled}
                disabled={disabled}
                onClick={() => selectDraftCarDate(date)}
                className={`focus-ring mx-auto flex items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed ${mobile ? "h-11 w-full max-w-11 text-[15px] font-semibold" : "h-9 w-9 text-sm"} ${disabled ? "text-slate-300" : "text-slate-800 hover:bg-[#004BB8]/10"} ${inRange ? "rounded-lg bg-[#004BB8]/10" : ""} ${isPickup || isReturn ? "bg-[#004BB8] text-white hover:bg-[#004BB8]" : ""}`}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </section>
    );
    return (
      <div className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label={t("carsSearch.previousMonth")}
            onClick={() => setVisibleCarMonth((month) => addMonths(month, -1))}
            className="focus-ring min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold"
          >
            {t("carsSearch.previousMonthShort")}
          </button>
          <button
            type="button"
            aria-label={t("carsSearch.nextMonth")}
            onClick={() => setVisibleCarMonth((month) => addMonths(month, 1))}
            className="focus-ring min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold"
          >
            {t("carsSearch.nextMonthShort")}
          </button>
        </div>
        <div
          className={`grid min-w-0 grid-cols-1 gap-6 ${mobile ? "" : "min-[560px]:grid-cols-2"}`}
        >
          {[0, 1].map((offset) =>
            renderMonth(addMonths(visibleCarMonth, offset)),
          )}
        </div>
      </div>
    );
  };
  const renderCarTimePicker = (mobile = false) => (
    <div className={`grid min-w-0 ${mobile ? "gap-6" : "gap-3"}`}>
      {(["pickup", "return"] as const).map((kind) => {
        const value =
          kind === "pickup" ? draftCarPickupTime : draftCarReturnTime;
        const setValue =
          kind === "pickup" ? setDraftCarPickupTime : setDraftCarReturnTime;
        return (
          <section key={kind} className="min-w-0">
            <label
              className={label}
              htmlFor={mobile ? undefined : `deals-car-${kind}-time`}
            >
              {t(
                kind === "pickup"
                  ? "carsSearch.pickupTimeLabel"
                  : "carsSearch.returnTimeLabel",
              )}
            </label>
            {mobile ? (
              <div className="max-h-[36dvh] overflow-y-auto rounded-2xl border border-slate-200 p-1">
                {timeOptions.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setValue(time)}
                    className={`focus-ring flex min-h-11 w-full items-center justify-between rounded-xl px-4 text-start text-sm font-bold ${value === time ? "bg-[#004BB8] text-white" : "text-slate-800 hover:bg-slate-50"}`}
                  >
                    {formatCarTimeLabel(time, carIntlLocale)}
                    {value === time ? <span aria-hidden="true">✓</span> : null}
                  </button>
                ))}
              </div>
            ) : (
              <select
                id={`deals-car-${kind}-time`}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className={field}
              >
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {formatCarTimeLabel(time, carIntlLocale)}
                  </option>
                ))}
              </select>
            )}
          </section>
        );
      })}
      {invalidSameDayCarTimes ? (
        <p role="alert" className="text-sm font-semibold text-rose-600">
          {t("carsSearch.error.sameDayDropoffAfterPickup")}
        </p>
      ) : null}
    </div>
  );

  const flightSuggestionContent = (kind: "origin" | "destination") => {
    const query = (
      kind === "origin" ? search.flightOriginText : search.flightDestinationText
    ).trim();
    const loading =
      kind === "origin" ? flightOriginLoading : flightDestinationLoading;
    const options = airportLists[kind];
    const highlight =
      kind === "origin" ? flightOriginHighlight : flightDestinationHighlight;
    const setHighlight =
      kind === "origin"
        ? setFlightOriginHighlight
        : setFlightDestinationHighlight;
    if (query.length < 2)
      return (
        <p className="px-4 py-6 text-center text-sm font-medium text-slate-500">
          {t("startTypingCityAirportOrCode")}
        </p>
      );
    if (loading)
      return (
        <p className="px-4 py-6 text-center text-sm font-medium text-slate-500">
          {t("searchingAirportsAndCities")}
        </p>
      );
    if (!options.length)
      return (
        <p className="px-4 py-6 text-center text-sm font-medium text-slate-500">
          {t("noMatchingAirportsOrCities")}
        </p>
      );
    return (
      <ul
        id={`deals-flight-${kind}-listbox`}
        role="listbox"
        className="divide-y divide-slate-100"
      >
        {options.map((option, index) => (
          <li key={`${option.code}-${index}`} role="presentation">
            <button
              id={`deals-flight-${kind}-option-${index}`}
              type="button"
              role="option"
              aria-selected={highlight === index}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setHighlight(index)}
              onClick={() => chooseAirport(kind, option)}
              className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-start transition-colors ${highlight === index ? "bg-blue-50" : "hover:bg-slate-50"}`}
            >
              <MapPin
                className="h-5 w-5 shrink-0 text-[#004BB8]"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold text-slate-950">
                  {getLocalizedCityName(option.city, locale)}
                </span>
                <span className="block truncate text-xs font-medium text-slate-500">
                  {option.name}
                  {getLocalizedAirportCountryName(option, locale)
                    ? ` · ${getLocalizedAirportCountryName(option, locale)}`
                    : ""}
                </span>
              </span>
              <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">
                {option.code.toUpperCase()}
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  };
  const handleFlightKey = (
    kind: "origin" | "destination",
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    const options = airportLists[kind];
    const open = kind === "origin" ? flightOriginOpen : flightDestinationOpen;
    const highlight =
      kind === "origin" ? flightOriginHighlight : flightDestinationHighlight;
    const setHighlight =
      kind === "origin"
        ? setFlightOriginHighlight
        : setFlightDestinationHighlight;
    if (event.key === "Escape") {
      if (kind === "origin") setFlightOriginOpen(false);
      else setFlightDestinationOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openFlightAirport(kind);
      if (options.length)
        setHighlight(
          (highlight + (event.key === "ArrowDown" ? 1 : -1) + options.length) %
            options.length,
        );
      return;
    }
    if (event.key === "Enter" && open && options[highlight]) {
      event.preventDefault();
      chooseAirport(kind, options[highlight]);
    }
  };
  const hotelSuggestionContent = (
    <>
      {hotelDestinationLoading ? (
        <p className="px-4 py-6 text-center text-sm font-medium text-slate-500">
          {t("findingDestinations")}
        </p>
      ) : hotelSuggestions.length ? (
        <ul
          id="deals-hotel-destination-listbox"
          role="listbox"
          className="divide-y divide-slate-100"
        >
          {hotelSuggestions.map((option, index) => (
            <li key={option.id} role="presentation">
              <button
                id={`deals-hotel-destination-option-${index}`}
                type="button"
                role="option"
                aria-selected={hotelDestinationHighlight === index}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHotelDestinationHighlight(index)}
                onClick={() => {
                  setSearch((current) =>
                    getIncludedProducts(current.mode).flight
                      ? customizeInheritedField(
                          current,
                          "stayDestination",
                          option.searchValue,
                        )
                      : applyAuthoritativeDestination(
                          current,
                          option.searchValue,
                        ),
                  );
                  setHotelDestinationOpen(false);
                  setHotelDestinationHighlight(0);
                }}
                className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-start ${hotelDestinationHighlight === index ? "bg-blue-50" : "hover:bg-slate-50"}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold text-slate-950">
                    {getLocalizedHotelDestinationCityName(option.name, locale)}
                  </span>
                  <span className="block truncate text-xs font-medium text-slate-500">
                    {getLocalizedHotelDestinationDetail(
                      { ...option, countryCode: option.countryCode ?? "" },
                      locale,
                    )}
                  </span>
                </span>
                {option.kind ? (
                  <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600">
                    {t(`hotelDestinationKind.${option.kind}`)}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-center text-sm font-medium text-slate-500">
          {search.hotelDestination.trim()
            ? t("noMatchingDestinationsYet")
            : t("searchCityAreaLandmark")}
        </p>
      )}
    </>
  );

  const guidedPreviewPanel = guidedPreviewEnabled ? (
    <section
      aria-labelledby="deals-guided-preview-title"
      aria-describedby="deals-guided-preview-description"
      aria-label={t("deals.guidedPreview.accessibleName")}
      data-deals-guided-preview
      className="mt-3 w-full rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-start text-sm text-slate-800 shadow-sm"
    >
      <p className="mb-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[#004BB8] ring-1 ring-blue-200">
        {t("deals.guidedPreview.badge")}
      </p>
      <h2
        id="deals-guided-preview-title"
        className="text-lg font-extrabold text-[#021C2B]"
      >
        {t("deals.guidedPreview.title")}
      </h2>
      <p
        id="deals-guided-preview-description"
        className="mt-2 max-w-3xl leading-6 text-slate-700"
      >
        {t("deals.guidedPreview.description")}
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-white/80 p-3 ring-1 ring-blue-100">
          <p className="font-extrabold text-[#021C2B]">
            {t("deals.guidedPreview.availableTitle")}
          </p>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-slate-700">
            <li>{t("deals.guidedPreview.availableHotel")}</li>
            <li>{t("deals.guidedPreview.availableFlight")}</li>
            <li>{t("deals.guidedPreview.availableCar")}</li>
            <li>{t("deals.guidedPreview.availableReview")}</li>
            <li>{t("deals.guidedPreview.availableHandoff")}</li>
          </ul>
        </div>
        <div className="rounded-xl bg-white/80 p-3 ring-1 ring-amber-100">
          <p className="font-extrabold text-[#021C2B]">
            {t("deals.guidedPreview.previewOnlyTitle")}
          </p>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-slate-700">
            <li>{t("deals.guidedPreview.previewOnlyPublicLaunch")}</li>
            <li>{t("deals.guidedPreview.previewOnlyBooking")}</li>
          </ul>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold text-slate-600">
          {t("deals.guidedPreview.normalSearchNote")}
        </p>
        <button
          type="button"
          disabled={submitting || pending}
          onClick={previewGuidedJourney}
          className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#004BB8] bg-white px-5 py-2 text-sm font-extrabold text-[#004BB8] hover:bg-blue-50 disabled:opacity-70 sm:w-auto"
        >
          {t("deals.guidedPreview.action")}
        </button>
      </div>
    </section>
  ) : null;

  const displayedHotelDestination =
    variant === "results" && !included.flight
      ? search.sharedDestination
      : search.hotelDestination;

  const flightRowDesktopClasses =
    variant === "results"
      ? "min-[1180px]:grid-cols-[minmax(0,2.6fr)_minmax(150px,1fr)_minmax(185px,1.15fr)_minmax(135px,0.8fr)_minmax(165px,auto)]"
      : "min-[1050px]:grid-cols-[minmax(0,3fr)_minmax(125px,1.05fr)_minmax(145px,1.15fr)_minmax(105px,0.8fr)_minmax(156px,auto)]";
  const packageTravellersDesktopClasses = included.flight
    ? variant === "results"
      ? "min-[1180px]:min-h-[54px] min-[1180px]:border-b-0 min-[1180px]:border-s"
      : "min-[1050px]:min-h-[54px] min-[1050px]:border-b-0 min-[1050px]:border-s"
    : "lg:min-h-[54px] lg:border-b-0 lg:border-s";
  const packageCabinDesktopClasses =
    variant === "results"
      ? "min-[1180px]:min-h-[54px] min-[1180px]:border-b-0 min-[1180px]:border-s"
      : "min-[1050px]:min-h-[54px] min-[1050px]:border-b-0 min-[1050px]:border-s";
  const packageSearchDesktopClasses = included.flight
    ? variant === "results"
      ? "min-[1180px]:h-full min-[1180px]:min-w-[165px] min-[1180px]:items-center min-[1180px]:border-s min-[1180px]:border-slate-200 min-[1180px]:px-2"
      : "min-[1050px]:h-full min-[1050px]:min-w-[156px] min-[1050px]:items-center min-[1050px]:border-s min-[1050px]:border-slate-200 min-[1050px]:px-2"
    : "lg:h-full lg:min-w-[156px] lg:items-center lg:border-s lg:border-slate-200 lg:px-2";

  const searchDealsButton = (
    <div
      data-deals-search-submit-row={
        isDesktopLanding ? "desktop-landing" : undefined
      }
      className={`flex w-full ${packageSearchDesktopClasses} ${isDesktopLanding ? "lg:mt-[14px] lg:min-w-0 lg:justify-end lg:border-s-0 lg:p-0" : ""}`}
    >
      <button
        type="submit"
        disabled={submitting || pending}
        aria-busy={submitting || pending}
        className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#004BB8] px-8 text-sm font-extrabold text-white shadow-lg shadow-blue-900/20 hover:bg-[#021C2B] disabled:opacity-70 sm:w-auto ${isDesktopLanding ? "lg:h-[46px] lg:min-h-[46px] lg:w-auto lg:min-w-[176px] lg:rounded-[8px] lg:px-6 lg:text-[14px] lg:shadow-none" : ""}`}
      >
        <Search className="h-4 w-4" />
        {t(
          variant === "results" && pending
            ? "deals.results.editor.updating"
            : variant === "results"
              ? "deals.results.editor.update"
              : "deals.searchButton",
        )}
      </button>
    </div>
  );

  const primaryPackageControls = (
    <>
      <button
        data-deals-package-travellers
        ref={travelersLauncherRef}
        type="button"
        aria-expanded={travelersOpen || mobileTravelersOpen}
        aria-haspopup="dialog"
        aria-controls={
          mobileTravelersOpen
            ? "deals-mobile-travellers"
            : "deals-desktop-travellers"
        }
        onClick={() =>
          travelersOpen ? dismissDesktopTravelers() : openTravelers()
        }
        className={`${packageActionSegment} ${packageTravellersDesktopClasses} flex items-center justify-between gap-2 border-b border-slate-200 ${isDesktopLanding ? `${desktopLandingFieldSurface} lg:h-[78px] lg:min-h-[78px] lg:border-b-0 lg:border-s lg:px-4 lg:text-[15px] lg:font-semibold` : ""}`}
      >
        {isDesktopLanding ? (
          <UserRound
            aria-hidden="true"
            className="hidden h-4 w-4 shrink-0 text-[#2563eb] lg:block"
          />
        ) : null}
        <span className="min-w-0">
          <span className={`${label} mb-0.5 whitespace-nowrap`}>
            {travelersControlLabel}
          </span>
          <span className="block truncate">{travelerSummary}</span>
        </span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" />
      </button>
      {included.flight ? (
        <div
          data-deals-package-cabin
          className={`${packageActionSegment} ${packageCabinDesktopClasses} border-b border-slate-200 ${isDesktopLanding ? `${desktopLandingFieldSurface} lg:h-[78px] lg:min-h-[78px] lg:border-b-0 lg:border-s lg:px-4 lg:ps-10 lg:text-[15px] lg:font-semibold` : ""}`}
        >
          {isDesktopLanding ? (
            <Plane
              aria-hidden="true"
              className="absolute start-4 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-[#2563eb] lg:block"
            />
          ) : null}
          <span className={`${label} mb-0.5 whitespace-nowrap`}>
            {t("deals.cabinClass")}
          </span>
          {isDesktopLanding ? (
            <button
              ref={cabinLauncherRef}
              id="deals-flight-cabin"
              type="button"
              aria-haspopup="listbox"
              aria-expanded={cabinOpen}
              onClick={() => {
                if (cabinOpen) setCabinOpen(false);
                else {
                  closeDesktopLandingPanels();
                  setCabinOpen(true);
                }
              }}
              className={`${packageActionControl} flex items-center justify-between pe-6 text-start`}
            >
              <span>{t(search.flightCabinClass)}</span>
              <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" />
            </button>
          ) : (
            <select
              id="deals-flight-cabin"
              value={search.flightCabinClass}
              onChange={(event) =>
                update(
                  "flightCabinClass",
                  event.target.value as DealsSearch["flightCabinClass"],
                )
              }
              className={`${packageActionControl} appearance-none pe-6`}
            >
              <option value="economy">{t("economy")}</option>
              <option value="business">{t("business")}</option>
              <option value="first">{t("first")}</option>
            </select>
          )}
          {!isDesktopLanding ? (
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute end-3 bottom-3 h-4 w-4 lg:bottom-1/2 lg:translate-y-1/2"
            />
          ) : null}
        </div>
      ) : null}
      {!isDesktopLanding ? searchDealsButton : null}
    </>
  );

  const compactFieldClassName =
    "focus-ring flex h-[68px] w-full min-w-0 items-center gap-2.5 rounded-[10px] border border-[#dee5ed] bg-[#fcfdfe] px-[13px] text-start max-[359px]:gap-2";
  const compactIconClassName =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100/70 text-slate-600";
  const compactLabelClassName =
    "block truncate text-[10px] font-semibold uppercase leading-3 tracking-[0.11em] text-slate-600";
  const compactValueClassName =
    "mt-1.5 block truncate text-[16px] font-medium leading-5 text-slate-950";

  const mobileHomepageControls =
    presentation === "mobile-homepage" ? (
      <div
        data-testid="mobile-homepage-deals-search"
        className="mt-3 space-y-2"
      >
        <fieldset className="min-w-0 w-full max-w-full overflow-hidden">
          <legend className="sr-only">
            {t("deals.packageSelector.instruction")}
          </legend>
          <div
            ref={mobilePackageRailRef}
            role="radiogroup"
            aria-label={t("deals.packageSelector.instruction")}
            data-testid="mobile-homepage-deals-package-rail"
            className="flex h-10 min-w-0 w-full max-w-full touch-pan-x flex-nowrap overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth border-b border-slate-200 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
          >
            {mobileHomepagePackageOptions.map(({ mode, text }, index) => {
              const selected = search.mode === mode;
              return (
                <button
                  ref={(node) => {
                    mobilePackageOptionRefs.current[mode] = node ?? undefined;
                  }}
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={text}
                  data-deals-mode={mode}
                  onClick={() => selectPackageMode(mode)}
                  onKeyDown={(event) => {
                    const offset =
                      event.key === "ArrowRight"
                        ? 1
                        : event.key === "ArrowLeft"
                          ? -1
                          : 0;
                    if (!offset && event.key !== "Home" && event.key !== "End")
                      return;
                    event.preventDefault();
                    const nextIndex =
                      event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? mobileHomepagePackageOptions.length - 1
                          : (index +
                              offset +
                              mobileHomepagePackageOptions.length) %
                            mobileHomepagePackageOptions.length;
                    const nextMode =
                      mobileHomepagePackageOptions[nextIndex].mode;
                    selectPackageMode(nextMode);
                    mobilePackageOptionRefs.current[nextMode]?.focus({
                      preventScroll: true,
                    });
                  }}
                  className={`focus-ring relative flex h-10 w-max shrink-0 items-center justify-center whitespace-nowrap bg-transparent px-3 text-[13px] font-medium text-slate-900 ${selected ? "after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:bg-[#075ee8] after:content-['']" : ""}`}
                >
                  <span className="whitespace-nowrap">{text}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {included.flight ? (
          <div
            className="relative space-y-2"
            data-testid="mobile-homepage-deals-route-fields"
          >
            <button
              ref={flightOriginMobileLauncherRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={flightMobileAirport === "origin"}
              onClick={() => setFlightMobileAirport("origin")}
              className={compactFieldClassName}
            >
              <span className={compactIconClassName}>
                <MapPin aria-hidden="true" className="h-[17px] w-[17px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={compactLabelClassName}>Origin</span>
                <span className={compactValueClassName}>
                  {search.flightOriginText || t("cityOrAirport")}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={swapDealsFlightAirports}
              aria-label={
                t("swapOriginDestination") || "Swap origin and destination"
              }
              className="focus-ring absolute left-1/2 top-[53px] z-10 flex h-[38px] w-[38px] -translate-x-1/2 items-center justify-center rounded-full border border-[#dee5ed] bg-[#fcfdfe] text-[#075ee8] shadow-[0_2px_6px_rgba(15,23,42,0.10)] before:absolute before:-inset-[3px] before:content-[''] focus-visible:ring-2 focus-visible:ring-[#075ee8]/30"
            >
              <ArrowRightLeft
                aria-hidden="true"
                className="h-[18px] w-[18px]"
              />
            </button>
            <button
              ref={flightDestinationMobileLauncherRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={flightMobileAirport === "destination"}
              onClick={() => setFlightMobileAirport("destination")}
              className={compactFieldClassName}
            >
              <span className={compactIconClassName}>
                <MapPin aria-hidden="true" className="h-[17px] w-[17px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={compactLabelClassName}>Destination</span>
                <span
                  className={`${compactValueClassName} ${search.flightDestinationText ? "" : "text-slate-500"}`}
                >
                  {search.flightDestinationText || "Where to?"}
                </span>
              </span>
            </button>
            <button
              ref={flightDatesLauncherRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={mobileFlightDatesOpen}
              onClick={openFlightDates}
              className={compactFieldClassName}
            >
              <span className={compactIconClassName}>
                <Calendar aria-hidden="true" className="h-[17px] w-[17px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={compactLabelClassName}>Travel Dates</span>
                <span
                  className={`${compactValueClassName} ${search.flightDepartureDate ? "" : "text-slate-500"}`}
                >
                  {search.flightDepartureDate
                    ? flightDatesSummary
                    : "Choose dates"}
                </span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-slate-700"
              />
            </button>
          </div>
        ) : (
          <>
            <button
              ref={hotelDestinationMobileLauncherRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={hotelDestinationMobileOpen}
              onClick={() => openHotelDestination(true)}
              className={compactFieldClassName}
            >
              <span className={compactIconClassName}>
                <MapPin aria-hidden="true" className="h-[17px] w-[17px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={compactLabelClassName}>Destination</span>
                <span
                  className={`${compactValueClassName} ${displayedHotelDestination ? "" : "text-slate-500"}`}
                >
                  {displayedHotelDestination || "Where to?"}
                </span>
              </span>
            </button>
            <button
              ref={hotelDatesLauncherRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={mobileHotelDatesOpen}
              onClick={openHotelDates}
              className={compactFieldClassName}
            >
              <span className={compactIconClassName}>
                <Calendar aria-hidden="true" className="h-[17px] w-[17px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={compactLabelClassName}>Travel Dates</span>
                <span
                  className={`${compactValueClassName} ${displayedHotelCheckIn ? "" : "text-slate-500"}`}
                >
                  {displayedHotelCheckIn ? hotelDatesSummary : "Choose dates"}
                </span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-slate-700"
              />
            </button>
          </>
        )}
        <button
          ref={travelersLauncherRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={mobileTravelersOpen}
          onClick={openTravelers}
          className={compactFieldClassName}
        >
          <span className={compactIconClassName}>
            <UserRound aria-hidden="true" className="h-[17px] w-[17px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className={compactLabelClassName}>
              {included.hotel ? <>Travelers &amp; Rooms</> : <>Travelers</>}
            </span>
            <span className={compactValueClassName}>{travelerSummary}</span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-slate-700"
          />
        </button>
        {errorBlock("flight")}
        {errorBlock("hotel")}
        {included.car ? errorBlock("car") : null}
        <button
          type="submit"
          disabled={submitting || pending}
          aria-busy={submitting || pending}
          className="focus-ring h-12 w-full rounded-[11px] bg-[#075ee8] text-[16px] font-semibold text-white disabled:opacity-60"
        >
          Search packages
        </button>
      </div>
    ) : null;

  return (
    <form
      data-deals-layout={variant}
      {...(variant === "results" ? { "data-deals-results-layout": true } : {})}
      onSubmit={submit}
      noValidate
      className={
        presentation === "mobile-homepage"
          ? "w-full"
          : `mx-auto w-full max-w-[1120px] bg-white p-4 sm:px-4 sm:py-3 ${variant === "landing" ? "rounded-3xl border border-slate-200 shadow-[0_18px_46px_rgba(15,23,42,0.12)] sm:px-6 lg:py-3" : ""} ${isDesktopLanding ? "lg:max-w-[1280px] lg:rounded-[8px] lg:border-[#dee5ed] lg:bg-[#fafbfd] lg:px-5 lg:py-6 lg:shadow-[0_18px_48px_rgba(15,35,65,0.14)] xl:px-8" : ""}`
      }
    >
      {mobileHomepageControls ?? (
        <>
          {isDesktopLanding ? (
            <fieldset
              className="hidden lg:block lg:pb-0"
              data-deals-desktop-package-selector
            >
              <legend className="sr-only">
                {t("deals.packageSelector.instruction")}
              </legend>
              <div
                role="radiogroup"
                aria-label={t("deals.packageSelector.instruction")}
                className="inline-grid h-12 grid-cols-4 overflow-hidden rounded-[8px] border border-[#dee5ed] bg-[#fcfdfe]"
              >
                {desktopLandingPackageOptions.map((option, index) => {
                  const selected =
                    (desktopPackageChoice ??
                      (search.mode === "hotel-flight"
                        ? "hotel-flight"
                        : search.mode)) === option.id;
                  const Icon =
                    option.id === "hotel-car"
                      ? CarFront
                      : option.id === "flight-car"
                        ? Plane
                        : Building2;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      data-deals-presentation-choice={option.id}
                      data-deals-canonical-mode={option.mode}
                      onClick={() => {
                        setDesktopPackageChoice(option.id);
                        selectPackageMode(option.mode);
                      }}
                      className={`focus-ring relative flex min-w-[135px] items-center justify-center gap-2 px-3 text-[14px] font-semibold text-slate-700 transition-colors xl:min-w-[154px] xl:px-4 ${index ? "border-s border-[#dee5ed]" : ""} ${selected ? "after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-[#2563EB] after:content-['']" : "hover:bg-slate-50"}`}
                    >
                      <Icon aria-hidden="true" className="h-4 w-4" />
                      {option.text}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}
          <fieldset
            className={`pb-3 sm:pb-2 lg:pb-1 ${isDesktopLanding ? "lg:hidden" : ""}`}
          >
            <legend className="sr-only">
              {t("deals.packageSelector.instruction")}
            </legend>
            <div
              data-deals-package-selector
              data-deals-package-selector-variant={variant}
              className="flex flex-nowrap gap-2 overflow-x-auto pb-1"
            >
              {dealsPackageOptions.map((option) => {
                const selected = search.mode === option.mode;
                return (
                  <button
                    key={option.mode}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => selectPackageMode(option.mode)}
                    className={`focus-ring min-h-10 shrink-0 rounded-full border-2 px-4 py-2 text-sm font-extrabold transition ${selected ? "border-[#004BB8] bg-blue-50 text-[#004BB8] shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"}`}
                  >
                    {t(option.label)}
                  </button>
                );
              })}
            </div>
            <p
              role="status"
              aria-live="polite"
              className={`mt-2 min-h-5 text-sm font-semibold text-rose-700 ${productSelectionMessage ? "" : "sr-only"}`}
            >
              {productSelectionMessage}
            </p>
          </fieldset>
          {included.flight && (
            <section
              aria-label={t("deals.flightRow")}
              className={`border-t border-slate-200 py-4 sm:py-3 lg:py-2 ${isDesktopLanding ? "lg:mt-5 lg:border-t-0 lg:py-0" : ""}`}
            >
              <div
                data-deals-heading-rail="flight"
                className="lg:flex lg:min-w-0 lg:items-center lg:gap-3"
              >
                <h2 className="sr-only">{t("deals.flightRow")}</h2>
                <div
                  role="radiogroup"
                  aria-label={t("tripType")}
                  className={`mb-1 inline-flex items-center gap-3 rounded-lg px-0.5 py-1 sm:gap-1 sm:rounded-full sm:bg-transparent sm:p-0.5 lg:mb-0 lg:flex-row lg:gap-1 ${isDesktopLanding ? "lg:gap-5 lg:p-0" : ""}`}
                >
                  {(["round-trip", "one-way"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={search.flightTripType === value}
                      onClick={() => setDealsFlightTripType(value)}
                      onKeyDown={(event) => {
                        if (
                          ![
                            "ArrowRight",
                            "ArrowLeft",
                            "ArrowDown",
                            "ArrowUp",
                          ].includes(event.key)
                        )
                          return;
                        event.preventDefault();
                        setDealsFlightTripType(
                          value === "round-trip" ? "one-way" : "round-trip",
                        );
                      }}
                      className={`focus-ring group inline-flex min-h-8 items-center gap-2 rounded-lg px-1.5 py-1 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100/70 hover:text-slate-950 sm:min-h-9 sm:flex-none sm:justify-center sm:px-3.5 sm:py-2 sm:font-bold ${search.flightTripType === value ? "bg-[#004BB8]/8 text-[#004BB8] ring-1 ring-[#004BB8]/10 sm:bg-[#004BB8]/8 sm:text-[#004BB8] sm:shadow-none" : ""} ${isDesktopLanding ? "lg:min-h-5 lg:rounded-none lg:bg-transparent lg:p-0 lg:text-[14px] lg:font-medium lg:text-slate-800 lg:ring-0" : ""}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border bg-white transition-colors ${search.flightTripType === value ? "border-[#004BB8]" : "border-slate-300 group-hover:border-slate-400"} ${isDesktopLanding ? "lg:h-[18px] lg:w-[18px] lg:border-2 lg:border-slate-300" : ""}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full bg-[#004BB8] transition-opacity ${search.flightTripType === value ? "opacity-100" : "opacity-0"}`}
                        />
                      </span>
                      <span>
                        {t(
                          value === "round-trip"
                            ? isDesktopLanding
                              ? "roundTrip"
                              : "deals.tripType.return"
                            : "deals.tripType.oneWay",
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div
                data-deals-field-content="flight"
                data-deals-main-search-row="flight"
                data-deals-main-search-variant={variant}
                {...(variant === "results"
                  ? { "data-deals-results-main-search-row": "flight" }
                  : {})}
                className={`${connectedShell} ${flightRowDesktopClasses} lg:mt-1 ${isDesktopLanding ? "lg:mt-[18px] lg:h-[78px] lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1.3fr)_minmax(0,1.25fr)_minmax(0,.95fr)] lg:overflow-visible lg:rounded-[8px] lg:bg-[#fcfdfe] lg:ring-1 lg:ring-[#dee5ed]" : ""}`}
              >
                <div
                  className={`grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] lg:items-stretch lg:gap-0 lg:border-e lg:border-slate-200 ${isDesktopLanding ? "lg:h-[78px] lg:grid-cols-[minmax(0,1fr)_32px_minmax(0,1fr)]" : ""}`}
                >
                  {(["origin", "destination"] as const).map((kind, index) => {
                    const textKey =
                      kind === "origin"
                        ? "flightOriginText"
                        : "flightDestinationText";
                    const codeKey =
                      kind === "origin"
                        ? "flightOriginCode"
                        : "flightDestinationCode";
                    const open =
                      kind === "origin"
                        ? flightOriginOpen
                        : flightDestinationOpen;
                    const loading =
                      kind === "origin"
                        ? flightOriginLoading
                        : flightDestinationLoading;
                    const highlight =
                      kind === "origin"
                        ? flightOriginHighlight
                        : flightDestinationHighlight;
                    const wrapRef =
                      kind === "origin"
                        ? flightOriginWrapRef
                        : flightDestinationWrapRef;
                    const inputRef =
                      kind === "origin"
                        ? flightOriginInputRef
                        : flightDestinationInputRef;
                    const launcherRef =
                      kind === "origin"
                        ? flightOriginMobileLauncherRef
                        : flightDestinationMobileLauncherRef;
                    return (
                      <Fragment key={kind}>
                        <div
                          ref={wrapRef}
                          className={`${flightConnectedSegment} sm:border-b sm:border-slate-200 lg:border-b-0 ${open ? `sm:z-20 sm:bg-[#004BB8]/8 sm:ring-1 sm:ring-inset sm:ring-[#004BB8]/20 ${isDesktopLanding ? "lg:bg-transparent lg:ring-0" : ""}` : ""} ${isDesktopLanding ? `${desktopLandingFieldSurface} lg:min-h-[78px] lg:py-3 lg:ps-10 lg:pe-3` : ""}`}
                          data-deals-flight-destination={kind}
                        >
                          {isDesktopLanding ? (
                            <MapPin
                              aria-hidden="true"
                              className="absolute start-4 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-[#2563eb] lg:block"
                            />
                          ) : null}
                          <label
                            className={label}
                            htmlFor={`deals-flight-${kind}`}
                          >
                            {t(kind)}
                          </label>
                          <div className="relative hidden sm:block">
                            <input
                              ref={inputRef}
                              id={`deals-flight-${kind}`}
                              role="combobox"
                              aria-autocomplete="list"
                              aria-expanded={open}
                              aria-controls={`deals-flight-${kind}-listbox`}
                              aria-activedescendant={
                                open && airportLists[kind][highlight]
                                  ? `deals-flight-${kind}-option-${highlight}`
                                  : undefined
                              }
                              value={search[textKey]}
                              placeholder={t("cityOrAirport")}
                              onFocus={() => openFlightAirport(kind)}
                              onKeyDown={(event) =>
                                handleFlightKey(kind, event)
                              }
                              onChange={(event) => {
                                const value = event.target.value;
                                if (kind === "origin")
                                  flightOriginUserInteractedRef.current = true;
                                openFlightAirport(kind);
                                setSearch((current) =>
                                  kind === "destination"
                                    ? {
                                        ...applyAuthoritativeDestination(
                                          current,
                                          value,
                                        ),
                                        flightDestinationCode:
                                          /^[a-z]{3}$/i.test(value.trim())
                                            ? value.trim().toUpperCase()
                                            : "",
                                      }
                                    : {
                                        ...current,
                                        [textKey]: value,
                                        [codeKey]: /^[a-z]{3}$/i.test(
                                          value.trim(),
                                        )
                                          ? value.trim().toUpperCase()
                                          : "",
                                      },
                                );
                                if (kind === "origin")
                                  setFlightOriginHighlight(0);
                                else setFlightDestinationHighlight(0);
                                if (value.trim().length < 2)
                                  setAirportLists((all) => ({
                                    ...all,
                                    [kind]: [],
                                  }));
                              }}
                              className={`${field} ${flightConnectedField} ${isDesktopLanding ? "pe-3 lg:text-[15px] lg:font-semibold" : "pe-10"}`}
                              autoComplete="off"
                            />
                            {!isDesktopLanding && search[textKey] ? (
                              <button
                                data-deals-flight-clear={kind}
                                type="button"
                                aria-label={t("clear")}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  if (kind === "origin")
                                    flightOriginUserInteractedRef.current = true;
                                  setSearch((current) =>
                                    kind === "destination"
                                      ? {
                                          ...applyAuthoritativeDestination(
                                            current,
                                            "",
                                          ),
                                          flightDestinationCode: "",
                                        }
                                      : {
                                          ...current,
                                          [textKey]: "",
                                          [codeKey]: "",
                                        },
                                  );
                                  setAirportLists((all) => ({
                                    ...all,
                                    [kind]: [],
                                  }));
                                  if (kind === "origin") {
                                    setFlightOriginLoading(false);
                                    setFlightOriginHighlight(0);
                                  } else {
                                    setFlightDestinationLoading(false);
                                    setFlightDestinationHighlight(0);
                                  }
                                  inputRef.current?.focus();
                                }}
                                className="focus-ring absolute end-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                              >
                                <X className="h-4 w-4" aria-hidden="true" />
                              </button>
                            ) : null}
                          </div>
                          <button
                            ref={launcherRef}
                            type="button"
                            aria-haspopup="dialog"
                            aria-expanded={flightMobileAirport === kind}
                            aria-controls={`deals-flight-mobile-${kind}-dialog`}
                            onClick={() => openFlightAirport(kind, true)}
                            className={`${field} flex items-center justify-between gap-2 text-start sm:hidden`}
                          >
                            <span
                              className={`min-w-0 truncate ${search[textKey] ? "text-slate-900" : "text-slate-400"}`}
                            >
                              {search[textKey] || t("cityOrAirport")}
                            </span>
                            <ChevronDown
                              className="h-4 w-4 shrink-0 text-slate-500"
                              aria-hidden="true"
                            />
                          </button>
                          <DealsDestinationPopover
                            open={open}
                            anchorRef={wrapRef}
                            width={390}
                            marker={`flight-${kind}`}
                            desktopLanding={isDesktopLanding}
                          >
                            {flightSuggestionContent(kind)}
                          </DealsDestinationPopover>
                          {loading ? (
                            <span className="sr-only" aria-live="polite">
                              {t("searchingAirportsAndCities")}
                            </span>
                          ) : null}
                        </div>
                        {index === 0 ? (
                          <div className="relative z-10 -my-2 flex h-4 items-center justify-center lg:my-0 lg:h-auto lg:before:absolute lg:before:left-1/2 lg:before:top-3 lg:before:h-[calc(100%-1.5rem)] lg:before:w-px lg:before:-translate-x-1/2 lg:before:bg-slate-200/90">
                            <button
                              type="button"
                              onClick={swapDealsFlightAirports}
                              aria-label={
                                t("swapOriginDestination") ||
                                "Swap origin and destination"
                              }
                              className="focus-ring relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 focus-visible:border-[#004BB8] focus-visible:ring-2 focus-visible:ring-[#004BB8]/25 lg:h-8 lg:w-8 lg:text-[#2563eb] lg:shadow-[0_4px_12px_rgba(15,23,42,0.12)]"
                            >
                              <ArrowRightLeft
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </div>
                <div
                  className={`${flightConnectedSegment} sm:border-e sm:border-b sm:border-slate-200 lg:border-b-0 lg:last:border-e-0 ${flightDatesOpen ? `sm:z-20 sm:bg-[#004BB8]/8 sm:ring-1 sm:ring-inset sm:ring-[#004BB8]/20 ${isDesktopLanding ? "lg:bg-transparent lg:ring-0" : ""}` : ""} ${isDesktopLanding ? `${desktopLandingFieldSurface} lg:h-[78px] lg:min-h-[78px] lg:py-3 lg:ps-10 lg:pe-3` : ""}`}
                >
                  {isDesktopLanding ? (
                    <Calendar
                      aria-hidden="true"
                      className="absolute start-4 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-[#2563eb] lg:block"
                    />
                  ) : null}
                  <span className={label}>{t("travelDates")}</span>
                  <button
                    ref={flightDatesLauncherRef}
                    type="button"
                    aria-expanded={flightDatesOpen || mobileFlightDatesOpen}
                    aria-haspopup="dialog"
                    aria-controls={
                      mobileFlightDatesOpen
                        ? "deals-flight-mobile-dates"
                        : "deals-flight-desktop-dates"
                    }
                    aria-label={t("chooseTravelDates")}
                    onClick={() =>
                      flightDatesOpen
                        ? dismissDesktopFlightDates(true)
                        : openFlightDates()
                    }
                    className={`${field} ${flightConnectedField} flex items-center justify-between gap-2 text-start`}
                  >
                    <span className="min-w-0 truncate">
                      {flightDatesSummary}
                    </span>
                    <Calendar
                      aria-hidden="true"
                      className={`h-4 w-4 shrink-0 text-slate-500 ${isDesktopLanding ? "lg:hidden" : ""}`}
                    />
                  </button>
                </div>
                {primaryPackageControls}
              </div>
              <div>{errorBlock("flight")}</div>
            </section>
          )}
          {included.hotel &&
            (!included.flight ||
              (variant === "landing" && !search.stayDestinationLinked)) && (
              <section
                aria-labelledby="deals-hotel-heading"
                data-deals-hotel-primary={!included.flight ? "true" : undefined}
                data-deals-hotel-overrides={
                  included.flight ? "true" : undefined
                }
                className="border-t border-slate-200 py-4 sm:py-3 lg:py-2"
              >
                <h2
                  id="deals-hotel-heading"
                  data-deals-heading-rail="stay"
                  className="sr-only"
                >
                  <BedDouble className="h-5 w-5 text-[#004BB8]" />
                  {t("deals.stayRow")}
                </h2>
                <div
                  data-deals-field-content="stay"
                  data-deals-main-search-row="stay"
                  data-deals-main-search-variant={variant}
                  {...(variant === "results"
                    ? { "data-deals-results-main-search-row": "stay" }
                    : {})}
                  className={`${connectedShell} sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(150px,1fr)_minmax(180px,1fr)_minmax(156px,auto)] ${isDesktopLanding ? "lg:h-[78px] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1.25fr)] lg:overflow-visible lg:rounded-[8px] lg:bg-[#fcfdfe] lg:ring-1 lg:ring-[#dee5ed]" : ""}`}
                >
                  {(!included.flight || !search.stayDestinationLinked) && (
                    <div
                      ref={hotelDestinationWrapRef}
                      className={`${`${connectedSegment} sm:border-e sm:border-b sm:border-slate-200 lg:border-b-0`} ${hotelDestinationOpen ? "sm:z-20 sm:bg-[#004BB8]/8 sm:ring-1 sm:ring-inset sm:ring-[#004BB8]/20" : ""}`}
                      data-deals-hotel-destination
                    >
                      <label
                        className={label}
                        htmlFor="deals-hotel-destination"
                      >
                        {t("deals.destination")}
                      </label>
                      <div className="relative hidden sm:block">
                        <input
                          ref={hotelDestinationInputRef}
                          id="deals-hotel-destination"
                          role="combobox"
                          aria-autocomplete="list"
                          aria-controls="deals-hotel-destination-listbox"
                          aria-expanded={hotelDestinationOpen}
                          aria-activedescendant={
                            hotelDestinationOpen &&
                            hotelSuggestions[hotelDestinationHighlight]
                              ? `deals-hotel-destination-option-${hotelDestinationHighlight}`
                              : undefined
                          }
                          value={displayedHotelDestination}
                          placeholder={t("hotelSearchDestinationPlaceholder")}
                          onFocus={() => openHotelDestination()}
                          onChange={(event) => {
                            setSearch((current) =>
                              getIncludedProducts(current.mode).flight
                                ? customizeInheritedField(
                                    current,
                                    "stayDestination",
                                    event.target.value,
                                  )
                                : applySharedDestination(
                                    current,
                                    event.target.value,
                                  ),
                            );
                            setHotelDestinationHighlight(0);
                            openHotelDestination();
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Escape")
                              return setHotelDestinationOpen(false);
                            if (
                              event.key === "ArrowDown" ||
                              event.key === "ArrowUp"
                            ) {
                              event.preventDefault();
                              openHotelDestination();
                              if (hotelSuggestions.length)
                                setHotelDestinationHighlight(
                                  (current) =>
                                    (current +
                                      (event.key === "ArrowDown" ? 1 : -1) +
                                      hotelSuggestions.length) %
                                    hotelSuggestions.length,
                                );
                            } else if (
                              event.key === "Enter" &&
                              hotelDestinationOpen &&
                              hotelSuggestions[hotelDestinationHighlight]
                            ) {
                              event.preventDefault();
                              const option =
                                hotelSuggestions[hotelDestinationHighlight];
                              setSearch((current) =>
                                getIncludedProducts(current.mode).flight
                                  ? customizeInheritedField(
                                      current,
                                      "stayDestination",
                                      option.searchValue,
                                    )
                                  : applySharedDestination(
                                      current,
                                      option.searchValue,
                                    ),
                              );
                              setHotelDestinationOpen(false);
                              setHotelDestinationHighlight(0);
                            }
                          }}
                          className={`${field} ${connectedField} pe-10`}
                          autoComplete="off"
                        />
                        {displayedHotelDestination ? (
                          <button
                            type="button"
                            aria-label={t("clearDestination")}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setSearch((current) =>
                                getIncludedProducts(current.mode).flight
                                  ? customizeInheritedField(
                                      current,
                                      "stayDestination",
                                      "",
                                    )
                                  : applyAuthoritativeDestination(current, ""),
                              );
                              setHotelSuggestions([]);
                              setHotelDestinationLoading(false);
                              setHotelDestinationHighlight(0);
                              hotelDestinationInputRef.current?.focus();
                            }}
                            className="focus-ring absolute end-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                      <button
                        ref={hotelDestinationMobileLauncherRef}
                        type="button"
                        aria-haspopup="dialog"
                        aria-expanded={hotelDestinationMobileOpen}
                        onClick={() => openHotelDestination(true)}
                        className={`${field} flex items-center justify-between gap-2 text-start sm:hidden`}
                      >
                        <span
                          className={`min-w-0 truncate ${displayedHotelDestination ? "text-slate-900" : "text-slate-400"}`}
                        >
                          {displayedHotelDestination ||
                            t("hotelSearchDestinationPlaceholder")}
                        </span>
                        <ChevronDown
                          className="h-4 w-4 shrink-0 text-slate-500"
                          aria-hidden="true"
                        />
                      </button>
                      <DealsDestinationPopover
                        open={hotelDestinationOpen}
                        anchorRef={hotelDestinationWrapRef}
                        width={436}
                        marker="hotel"
                        desktopLanding={isDesktopLanding}
                      >
                        {hotelSuggestionContent}
                      </DealsDestinationPopover>
                      {getIncludedProducts(search.mode).flight &&
                      !search.stayDestinationLinked ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSearch((current) =>
                              relinkInheritedField(current, "stayDestination"),
                            );
                          }}
                          className="focus-ring mt-1 rounded-md px-1 text-xs font-bold text-[#004BB8] hover:underline"
                        >
                          {t("deals.useMainDestination")}
                        </button>
                      ) : null}
                    </div>
                  )}
                  {!included.flight && (
                    <div
                      className={`${`${connectedSegment} sm:border-e sm:border-b sm:border-slate-200 lg:border-b-0 lg:last:border-e-0`} ${hotelDatesOpen ? "sm:z-20 sm:bg-[#004BB8]/8 sm:ring-1 sm:ring-inset sm:ring-[#004BB8]/20" : ""}`}
                    >
                      <span className={label}>{t("deals.travelDates")}</span>
                      <button
                        ref={hotelDatesLauncherRef}
                        type="button"
                        aria-expanded={hotelDatesOpen || mobileHotelDatesOpen}
                        aria-haspopup="dialog"
                        aria-controls={
                          mobileHotelDatesOpen
                            ? "deals-hotel-mobile-dates"
                            : "deals-hotel-desktop-dates"
                        }
                        aria-label={t("chooseTravelDates")}
                        onClick={() =>
                          hotelDatesOpen
                            ? dismissDesktopHotelDates(true)
                            : openHotelDates()
                        }
                        className={`${field} ${connectedField} flex items-center justify-between gap-2 text-start`}
                      >
                        <span className="min-w-0 truncate">
                          {hotelDatesSummary}
                        </span>
                        <Calendar
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 text-slate-500"
                        />
                      </button>
                      {getIncludedProducts(search.mode).flight &&
                      !search.stayDatesLinked ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSearch((current) =>
                              relinkInheritedField(current, "stayDates"),
                            );
                          }}
                          className="focus-ring mt-1 rounded-md px-1 text-xs font-bold text-[#004BB8] hover:underline"
                        >
                          {t("deals.useMainTravelDates")}
                        </button>
                      ) : null}
                    </div>
                  )}
                  {!included.flight ? primaryPackageControls : null}
                </div>
                <div>{errorBlock("hotel")}</div>
              </section>
            )}
          {variant === "landing" &&
          included.car &&
          (!search.carPickupLinked || !search.carDatesLinked) ? (
            <aside
              data-deals-car-recovery
              className="border-t border-slate-200 py-3 text-sm text-slate-700"
            >
              <p className="font-bold">{t("deals.carRow")}</p>
              <div className="mt-1 flex flex-wrap gap-3">
                {!search.carPickupLinked ? (
                  <button
                    type="button"
                    onClick={() =>
                      setSearch((current) =>
                        relinkInheritedField(current, "carPickup"),
                      )
                    }
                    className="focus-ring min-h-11 rounded-lg px-2 text-xs font-bold text-[#004BB8] hover:underline"
                  >
                    {t("deals.useMainDestination")}
                  </button>
                ) : null}
                {!search.carDatesLinked ? (
                  <button
                    type="button"
                    onClick={() =>
                      setSearch((current) =>
                        relinkInheritedField(current, "carDates"),
                      )
                    }
                    className="focus-ring min-h-11 rounded-lg px-2 text-xs font-bold text-[#004BB8] hover:underline"
                  >
                    {t("deals.useMainTravelDates")}
                  </button>
                ) : null}
              </div>
            </aside>
          ) : null}
          <section data-deals-search-actions className="py-3">
            <div data-deals-stay-options>
              {supportsStayDateOverride ? (
                <label
                  data-deals-change-stay-dates
                  className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 px-1 text-sm font-bold text-slate-800"
                >
                  <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      checked={!search.stayDatesLinked}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        if (!checked) {
                          dismissDesktopHotelDates();
                          resetHotelDatesDraft();
                          setMobileHotelDatesOpen(false);
                        }
                        setSearch((current) =>
                          checked
                            ? customizeInheritedField(current, "stayDates", {
                                start: current.sharedTravelStartDate,
                                end: current.sharedTravelEndDate,
                              })
                            : relinkInheritedField(current, "stayDates"),
                        );
                      }}
                      className={`size-4 rounded border-slate-300 ${isDesktopLanding ? "appearance-none bg-white checked:border-slate-400 checked:bg-white focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-[#2563eb]/30 focus-visible:ring-offset-1" : "text-[#004BB8] focus:ring-[#004BB8]"}`}
                    />
                    {isDesktopLanding && !search.stayDatesLinked ? (
                      <Check
                        aria-hidden="true"
                        className="pointer-events-none absolute h-3 w-3 text-[#2563eb]"
                        strokeWidth={3}
                      />
                    ) : null}
                  </span>
                  <span>{t("deals.changeDatesForStay")}</span>
                </label>
              ) : null}
            </div>
            {supportsStayDateOverride && !search.stayDatesLinked ? (
              <div
                data-deals-stay-dates
                className="mt-3 w-full border-b border-slate-200 pb-3"
              >
                <span className={`${label} px-3`}>
                  {t("deals.datesForStay")}
                </span>
                <button
                  ref={hotelDatesLauncherRef}
                  type="button"
                  aria-expanded={hotelDatesOpen || mobileHotelDatesOpen}
                  aria-haspopup="dialog"
                  aria-controls={
                    mobileHotelDatesOpen
                      ? "deals-hotel-mobile-dates"
                      : "deals-hotel-desktop-dates"
                  }
                  aria-label={t("deals.chooseStayDates")}
                  onClick={() =>
                    hotelDatesOpen
                      ? dismissDesktopHotelDates(true)
                      : openHotelDates()
                  }
                  className={`${packageActionSegment} flex w-full max-w-sm items-center justify-between gap-2 text-start`}
                >
                  <span className="min-w-0 truncate">{hotelDatesSummary}</span>
                  <Calendar
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-slate-500"
                  />
                </button>
                <div>{errorBlock("hotel")}</div>
              </div>
            ) : null}
            <div className="w-full">{guidedPreviewPanel}</div>
            {isDesktopLanding ? searchDealsButton : null}
          </section>
        </>
      )}
      {warning}
      {(["origin", "destination"] as const).map((kind) => {
        const textKey =
          kind === "origin" ? "flightOriginText" : "flightDestinationText";
        const codeKey =
          kind === "origin" ? "flightOriginCode" : "flightDestinationCode";
        const inputRef =
          kind === "origin"
            ? flightOriginMobileInputRef
            : flightDestinationMobileInputRef;
        const launcherRef =
          kind === "origin"
            ? flightOriginMobileLauncherRef
            : flightDestinationMobileLauncherRef;
        return (
          <FlightMobilePickerShell
            key={kind}
            open={flightMobileAirport === kind}
            title={t(kind)}
            titleId={`deals-flight-mobile-${kind}-title`}
            dialogId={`deals-flight-mobile-${kind}-dialog`}
            launcherRef={launcherRef}
            onClose={() => setFlightMobileAirport(null)}
            contentClassName="px-4 py-5"
          >
            <div className="space-y-4 overflow-x-hidden">
              <label
                className={label}
                htmlFor={`deals-flight-mobile-${kind}-input`}
              >
                {t(kind)}
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  id={`deals-flight-mobile-${kind}-input`}
                  value={search[textKey]}
                  placeholder={t("cityOrAirport")}
                  autoComplete="off"
                  onChange={(event) => {
                    const value = event.target.value;
                    if (kind === "origin")
                      flightOriginUserInteractedRef.current = true;
                    setSearch((current) =>
                      kind === "destination"
                        ? {
                            ...applyAuthoritativeDestination(current, value),
                            flightDestinationCode: /^[a-z]{3}$/i.test(
                              value.trim(),
                            )
                              ? value.trim().toUpperCase()
                              : "",
                          }
                        : {
                            ...current,
                            [textKey]: value,
                            [codeKey]: /^[a-z]{3}$/i.test(value.trim())
                              ? value.trim().toUpperCase()
                              : "",
                          },
                    );
                    if (kind === "origin") setFlightOriginHighlight(0);
                    else setFlightDestinationHighlight(0);
                    if (value.trim().length < 2)
                      setAirportLists((all) => ({ ...all, [kind]: [] }));
                  }}
                  className={`${field} pe-10`}
                />
                {search[textKey] ? (
                  <button
                    type="button"
                    aria-label={t("clear")}
                    onClick={() => {
                      if (kind === "origin")
                        flightOriginUserInteractedRef.current = true;
                      setSearch((current) =>
                        kind === "destination"
                          ? {
                              ...applyAuthoritativeDestination(current, ""),
                              flightDestinationCode: "",
                            }
                          : { ...current, [textKey]: "", [codeKey]: "" },
                      );
                      setAirportLists((all) => ({ ...all, [kind]: [] }));
                      inputRef.current?.focus();
                    }}
                    className="focus-ring absolute end-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {flightSuggestionContent(kind)}
              </div>
            </div>
          </FlightMobilePickerShell>
        );
      })}
      <HotelDestinationMobilePicker
        open={hotelDestinationMobileOpen}
        value={displayedHotelDestination}
        titleId="deals-hotel-mobile-destination-title"
        inputId="deals-hotel-mobile-destination-input"
        launcherRef={hotelDestinationMobileLauncherRef}
        onChange={(value) => {
          setSearch((current) =>
            getIncludedProducts(current.mode).flight
              ? customizeInheritedField(current, "stayDestination", value)
              : applyAuthoritativeDestination(current, value),
          );
        }}
        onClear={() => {
          setHotelSuggestions([]);
        }}
        onClose={() => setHotelDestinationMobileOpen(false)}
      />
      <DesktopLandingPopover
        open={isDesktopLanding && cabinOpen}
        anchorRef={cabinLauncherRef}
        width={248}
        desiredHeight={180}
        align="end"
        marker="cabin"
        className="p-1.5"
      >
        <div role="listbox" aria-label={t("deals.cabinClass")}>
          {(["economy", "business", "first"] as const).map((cabin) => (
            <button
              key={cabin}
              type="button"
              role="option"
              aria-selected={search.flightCabinClass === cabin}
              onClick={() => {
                update("flightCabinClass", cabin);
                setCabinOpen(false);
                requestAnimationFrame(() =>
                  cabinLauncherRef.current?.focus({ preventScroll: true }),
                );
              }}
              className={`focus-ring flex min-h-10 w-full items-center rounded-[6px] px-3 text-start text-sm font-medium ${search.flightCabinClass === cabin ? "bg-blue-50 text-[#004BB8]" : "text-slate-800 hover:bg-slate-50"}`}
            >
              {t(cabin)}
            </button>
          ))}
        </div>
      </DesktopLandingPopover>
      <DealsFlightDatesPopover
        open={flightDatesOpen}
        anchorRef={flightDatesLauncherRef}
        desktopLanding={isDesktopLanding}
      >
        <div
          id="deals-flight-desktop-dates"
          role="dialog"
          aria-modal="false"
          aria-label={t("chooseTravelDates")}
        >
          {renderFlightDatesCalendar()}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => {
                setDraftFlightDepartureDate("");
                setDraftFlightReturnDate("");
              }}
              className="focus-ring min-h-10 rounded-xl px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-100"
            >
              {t("clear")}
            </button>
            <button
              type="button"
              disabled={!validDraftFlightRange}
              onClick={() => commitFlightDates()}
              className="focus-ring min-h-10 rounded-xl bg-[#004BB8] px-5 text-sm font-extrabold text-white hover:bg-[#021C2B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("done")}
            </button>
          </div>
        </div>
      </DealsFlightDatesPopover>
      <FlightMobilePickerShell
        open={mobileFlightDatesOpen}
        title={t("chooseTravelDates")}
        titleId="deals-flight-mobile-dates-title"
        dialogId="deals-flight-mobile-dates"
        launcherRef={flightDatesLauncherRef}
        onClose={closeMobileFlightDates}
        pickerMarker="flight-date"
        contentClassName="px-4 py-5"
        footer={(requestClose) => (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setDraftFlightDepartureDate("");
                setDraftFlightReturnDate("");
              }}
              className="focus-ring min-h-11 rounded-xl px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-100"
            >
              {t("clear")}
            </button>
            <button
              type="button"
              disabled={!validDraftFlightRange}
              onClick={() => {
                commitFlightDates(true);
                requestClose();
              }}
              className="focus-ring min-h-11 rounded-xl bg-[#004BB8] px-6 text-sm font-extrabold text-white hover:bg-[#021C2B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("done")}
            </button>
          </div>
        )}
      >
        {renderFlightDatesCalendar(true)}
      </FlightMobilePickerShell>
      <DealsFlightPopover
        open={travelersOpen}
        anchorRef={travelersLauncherRef}
        desktopLanding={isDesktopLanding}
      >
        <div
          id="deals-desktop-travellers"
          role="dialog"
          aria-modal="false"
          aria-label={travelersControlLabel}
          className="flex min-h-0 w-full flex-col"
        >
          <div className="min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain">
            {travelersPicker}
          </div>
          <div className="mt-4 flex shrink-0 justify-end border-t border-slate-100 bg-white pt-3">
            <button
              type="button"
              onClick={() => commitTravelers()}
              className="focus-ring min-h-10 rounded-xl bg-[#004BB8] px-5 text-sm font-extrabold text-white hover:bg-[#021C2B]"
            >
              {t("done")}
            </button>
          </div>
        </div>
      </DealsFlightPopover>
      <FlightMobilePickerShell
        open={mobileTravelersOpen}
        title={travelersControlLabel}
        titleId="deals-mobile-travellers-title"
        dialogId="deals-mobile-travellers"
        launcherRef={travelersLauncherRef}
        onClose={closeMobileTravelers}
        contentClassName="px-4 py-5"
        footer={(requestClose) => (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                commitTravelers(true);
                requestClose();
              }}
              className="focus-ring min-h-11 rounded-xl bg-[#004BB8] px-6 py-3 text-sm font-extrabold text-white hover:bg-[#021C2B]"
            >
              {t("done")}
            </button>
          </div>
        )}
      >
        {travelersPicker}
      </FlightMobilePickerShell>
      <DealsHotelDatesPopover
        open={hotelDatesOpen}
        anchorRef={hotelDatesLauncherRef}
        desktopLanding={isDesktopLanding}
      >
        <div
          id="deals-hotel-desktop-dates"
          role="dialog"
          aria-modal="false"
          aria-label={t(
            supportsStayDateOverride && !search.stayDatesLinked
              ? "deals.chooseStayDates"
              : "chooseTravelDates",
          )}
        >
          {renderHotelDatesCalendar()}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => {
                setDraftHotelCheckIn("");
                setDraftHotelCheckOut("");
              }}
              className="focus-ring min-h-10 rounded-xl px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-100"
            >
              {t("clear")}
            </button>
            <button
              type="button"
              disabled={!validDraftHotelRange}
              onClick={() => commitHotelDates()}
              className="focus-ring min-h-10 rounded-xl bg-[#004BB8] px-5 text-sm font-extrabold text-white hover:bg-[#021C2B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("done")}
            </button>
          </div>
        </div>
      </DealsHotelDatesPopover>
      <HotelMobilePickerShell
        open={mobileHotelDatesOpen}
        title={t(
          supportsStayDateOverride && !search.stayDatesLinked
            ? "deals.chooseStayDates"
            : "chooseTravelDates",
        )}
        titleId="deals-hotel-mobile-dates-title"
        dialogId="deals-hotel-mobile-dates"
        launcherRef={hotelDatesLauncherRef}
        onClose={closeMobileHotelDates}
        contentClassName="px-4 py-5"
        footer={(requestClose) => (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setDraftHotelCheckIn("");
                setDraftHotelCheckOut("");
              }}
              className="focus-ring min-h-11 rounded-xl px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-100"
            >
              {t("clear")}
            </button>
            <button
              type="button"
              disabled={!validDraftHotelRange}
              onClick={() => {
                commitHotelDates(true);
                requestClose();
              }}
              className="focus-ring min-h-11 rounded-xl bg-[#004BB8] px-6 text-sm font-extrabold text-white hover:bg-[#021C2B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("done")}
            </button>
          </div>
        )}
      >
        {renderHotelDatesCalendar(true)}
      </HotelMobilePickerShell>
      <DealsCarPopover
        open={carReturnLocationOpen}
        anchorRef={carReturnLocationLauncherRef}
        width={360}
        marker="return-location"
        desktopLanding={isDesktopLanding}
        onDismiss={dismissCarReturnLocation}
      >
        <div
          id="deals-car-desktop-return-location"
          role="dialog"
          aria-modal="false"
          aria-labelledby="deals-car-desktop-return-location-title"
        >
          <h3
            id="deals-car-desktop-return-location-title"
            className="mb-3 text-base font-extrabold text-slate-950"
          >
            {t("deals.returnLocation")}
          </h3>
          <label
            htmlFor="deals-car-desktop-return-location-input"
            className="sr-only"
          >
            {t("deals.returnLocation")}
          </label>
          <input
            ref={carReturnLocationInputRef}
            id="deals-car-desktop-return-location-input"
            value={draftCarReturnLocation}
            placeholder={t("carsSearch.returnLocationPlaceholder")}
            autoComplete="off"
            onChange={(event) => setDraftCarReturnLocation(event.target.value)}
            className={field}
          />
          <div className="mt-4 flex justify-end gap-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={dismissCarReturnLocation}
              className="focus-ring min-h-10 rounded-xl px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-100"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              disabled={!draftCarReturnLocation.trim()}
              onClick={commitCarReturnLocation}
              className="focus-ring min-h-10 rounded-xl bg-[#004BB8] px-5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("done")}
            </button>
          </div>
        </div>
      </DealsCarPopover>
      <DealsCarPopover
        open={carDatesOpen}
        anchorRef={carDatesLauncherRef}
        width={620}
        marker="dates"
        desktopLanding={isDesktopLanding}
      >
        <div
          id="deals-car-desktop-dates"
          role="dialog"
          aria-modal="false"
          aria-label={t("carsSearch.rentalDatePickerAria")}
        >
          <h3 className="mb-3 text-base font-extrabold text-slate-950">
            {t("carsSearch.chooseRentalDates")}
          </h3>
          {renderCarDatesCalendar()}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => {
                setDraftCarPickupDate("");
                setDraftCarReturnDate("");
              }}
              className="focus-ring min-h-10 rounded-xl px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-100"
            >
              {t("clear")}
            </button>
            <button
              type="button"
              disabled={!validDraftCarRange}
              onClick={() => commitCarDates()}
              className="focus-ring min-h-10 rounded-xl bg-[#004BB8] px-5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("done")}
            </button>
          </div>
        </div>
      </DealsCarPopover>
      <DealsCarPopover
        open={carTimesOpen}
        anchorRef={carTimesLauncherRef}
        width={320}
        marker="times"
        desktopLanding={isDesktopLanding}
      >
        <div
          id="deals-car-desktop-times"
          role="dialog"
          aria-modal="false"
          aria-label={t("carsSearch.pickupReturnTimeSelectorAria")}
        >
          {renderCarTimePicker()}
          <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
            <button
              type="button"
              disabled={!validDraftCarTimes}
              onClick={() => commitCarTimes()}
              className="focus-ring min-h-10 rounded-xl bg-[#004BB8] px-5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("done")}
            </button>
          </div>
        </div>
      </DealsCarPopover>
      {(["pickup", "return"] as const).map((kind) => {
        const pickup = kind === "pickup";
        const launcherRef = pickup
          ? carPickupLocationLauncherRef
          : carReturnLocationLauncherRef;
        const inputRef = pickup
          ? carPickupMobileInputRef
          : carReturnMobileInputRef;
        const value = pickup
          ? search.carPickupLocation
          : draftCarReturnLocation;
        const title = pickup
          ? t("carsSearch.pickupLocationLabel")
          : t("carsSearch.returnLocationPlaceholder");
        return (
          <FlightMobilePickerShell
            key={kind}
            open={mobileCarLocation === kind}
            title={title}
            titleId={`deals-car-mobile-${kind}-location-title`}
            dialogId={`deals-car-mobile-${kind}-location-dialog`}
            launcherRef={launcherRef}
            onClose={() => {
              if (!pickup) setDraftCarReturnLocation(search.carReturnLocation);
              setMobileCarLocation(null);
              restoreCarFocus(launcherRef);
            }}
            contentClassName="px-4 py-5"
            footer={(requestClose) => (
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (pickup)
                      setSearch((current) =>
                        customizeInheritedField(current, "carPickup", ""),
                      );
                    else setDraftCarReturnLocation("");
                    inputRef.current?.focus();
                  }}
                  className="focus-ring min-h-11 rounded-xl px-4 text-sm font-extrabold text-slate-700"
                >
                  {t("clear")}
                </button>
                <button
                  type="button"
                  disabled={!pickup && !draftCarReturnLocation.trim()}
                  onClick={() => {
                    if (!pickup)
                      setSearch((current) =>
                        setCarReturnMode(
                          current,
                          true,
                          draftCarReturnLocation.trim(),
                        ),
                      );
                    requestClose();
                  }}
                  className="focus-ring min-h-11 rounded-xl bg-[#004BB8] px-6 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("done")}
                </button>
              </div>
            )}
          >
            <label
              className={label}
              htmlFor={`deals-car-mobile-${kind}-location-input`}
            >
              {title}
            </label>
            <input
              ref={inputRef}
              id={`deals-car-mobile-${kind}-location-input`}
              value={value}
              placeholder={t(
                pickup
                  ? "carsSearch.pickupLocationPlaceholder"
                  : "carsSearch.returnLocationPlaceholder",
              )}
              autoComplete="off"
              onChange={(event) => {
                if (pickup) {
                  setSearch((current) =>
                    customizeInheritedField(
                      current,
                      "carPickup",
                      event.target.value,
                    ),
                  );
                } else setDraftCarReturnLocation(event.target.value);
              }}
              className={field}
            />
          </FlightMobilePickerShell>
        );
      })}
      <FlightMobilePickerShell
        open={mobileCarDatesOpen}
        title={t("carsSearch.chooseRentalDates")}
        titleId="deals-car-mobile-dates-title"
        dialogId="deals-car-mobile-dates"
        launcherRef={carDatesLauncherRef}
        onClose={closeMobileCarDates}
        contentClassName="overflow-x-hidden px-4 py-5"
        footer={(requestClose) => (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setDraftCarPickupDate("");
                setDraftCarReturnDate("");
              }}
              className="focus-ring min-h-11 rounded-xl px-4 text-sm font-extrabold text-slate-700"
            >
              {t("clear")}
            </button>
            <button
              type="button"
              disabled={!validDraftCarRange}
              onClick={() => {
                commitCarDates(true);
                requestClose();
              }}
              className="focus-ring min-h-11 rounded-xl bg-[#004BB8] px-6 text-sm font-extrabold text-white disabled:opacity-50"
            >
              {t("done")}
            </button>
          </div>
        )}
      >
        {renderCarDatesCalendar(true)}
      </FlightMobilePickerShell>
      <FlightMobilePickerShell
        open={mobileCarTimesOpen}
        title={t("carsSearch.pickupReturnTimeLabel")}
        titleId="deals-car-mobile-times-title"
        dialogId="deals-car-mobile-times"
        launcherRef={carTimesLauncherRef}
        onClose={closeMobileCarTimes}
        contentClassName="overflow-x-hidden px-4 py-5"
        footer={(requestClose) => (
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!validDraftCarTimes}
              onClick={() => {
                commitCarTimes(true);
                requestClose();
              }}
              className="focus-ring min-h-11 rounded-xl bg-[#004BB8] px-6 text-sm font-extrabold text-white disabled:opacity-50"
            >
              {t("done")}
            </button>
          </div>
        )}
      >
        {renderCarTimePicker(true)}
      </FlightMobilePickerShell>
      <FlightMobilePickerShell
        open={mobileCarDriverAgeOpen}
        title={t("carsSearch.driverAgeLabel")}
        titleId="deals-car-mobile-driver-age-title"
        dialogId="deals-car-mobile-driver-age"
        launcherRef={carDriverAgeLauncherRef}
        onClose={closeMobileCarDriverAge}
        contentClassName="overflow-x-hidden px-4 py-5"
        footer={(requestClose) => (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                update("carDriverAge", draftCarDriverAge);
                mobileCarDriverAgeCommittedRef.current = true;
                requestClose();
              }}
              className="focus-ring min-h-11 rounded-xl bg-[#004BB8] px-6 text-sm font-extrabold text-white"
            >
              {t("done")}
            </button>
          </div>
        )}
      >
        <div className="rounded-2xl border border-slate-200 p-1">
          {driverAgeOptions.map((age) => (
            <button
              key={age}
              type="button"
              onClick={() => setDraftCarDriverAge(age)}
              className={`focus-ring flex min-h-12 w-full items-center justify-between rounded-xl px-4 text-start text-sm font-bold ${draftCarDriverAge === age ? "bg-[#004BB8] text-white" : "text-slate-800 hover:bg-slate-50"}`}
            >
              {carDriverAgeLabel(age)}
              {draftCarDriverAge === age ? (
                <span aria-hidden="true">✓</span>
              ) : null}
            </button>
          ))}
        </div>
      </FlightMobilePickerShell>
    </form>
  );
}
