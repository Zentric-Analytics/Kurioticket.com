"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRightLeft, BedDouble, Calendar, Car, ChevronDown, MapPin, Minus, Plane, Plus, Search, X } from "lucide-react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRouteProgress } from "@/components/layout/RouteProgress";
import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
import { HotelDestinationMobilePicker } from "@/components/search/HotelDestinationMobilePicker";
import { HotelMobilePickerShell } from "@/components/search/HotelMobilePickerShell";
import { translations as en } from "@/lib/i18n/en";
import { driverAgeOptions, timeOptions } from "@/lib/cars/carsSearchUtils";
import {
  buildDealsResultsUrl, createDefaultDealsSearch, dealsPackageModes,
  getIncludedProducts, parseDealsSearchParams, validateDealsSearch,
  type DealsFlightTripType, type DealsPackageMode, type DealsSearch, type DealsProduct,
} from "@/lib/deals/dealsSearchParams";
import { formatAirportLabel, getAirportByCode, getLocalizedAirportCountryName, getLocalizedCityName, type AirportOption } from "@/data/airports";
import { getLocalizedHotelDestinationCityName, getLocalizedHotelDestinationDetail } from "@/data/hotelDestinations";
import { formatFlightsDateSummary, formatFlightsMonthHeading, formatFlightsWeekdays, normalizeFlightsCalendarLocale } from "@/lib/flights/dateFormatting";
import { normalizeHotelCalendarLocale } from "@/lib/hotelsDateFormatting";

type HotelSuggestion = { id: string; name: string; country: string; searchValue: string; countryCode?: string; region?: string; kind?: string };
type DealsPlacesApiResponse = { defaultOriginAirport?: AirportOption | null };
type LocationApiResponse = { source?: "ipinfo-lite" | "fallback"; countryCode?: string | null };
const modeKeys: Record<DealsPackageMode, string> = { "hotel-flight": "deals.package.hotelFlight", "hotel-flight-car": "deals.package.hotelFlightCar", "flight-car": "deals.package.flightCar", "hotel-car": "deals.package.hotelCar" };
const field = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-medium text-slate-900 outline-none focus:border-[#004BB8] focus:ring-2 focus:ring-[#004BB8]/20";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-slate-600";
const connectedShell = "grid gap-3 sm:gap-0 sm:rounded-2xl sm:bg-white sm:ring-1 sm:ring-slate-200";
const connectedSegment = "relative min-w-0 transition-colors sm:min-h-[68px] sm:px-4 sm:py-2 sm:hover:bg-slate-50 sm:focus-within:z-10 sm:focus-within:bg-[#004BB8]/8 sm:focus-within:ring-1 sm:focus-within:ring-inset sm:focus-within:ring-[#004BB8]/20";
const connectedField = "sm:min-h-7 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:focus:border-0 sm:focus:ring-0";

const parseIsoDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number); const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day ? parsed : null;
};
const toIsoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const startOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addMonths = (date: Date, offset: number) => new Date(date.getFullYear(), date.getMonth() + offset, 1);
const buildMonthCells = (monthDate: Date) => { const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1); const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay()); return Array.from({ length: 42 }, (_, index) => { const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index); return { date, isCurrentMonth: date.getMonth() === monthDate.getMonth() }; }); };
const getCarsIntlLocale = (locale: string) => { const normalized = locale.toLowerCase(); if (normalized.startsWith("hi")) return "hi-IN"; if (normalized.startsWith("tr")) return "tr-TR"; if (normalized.startsWith("pl")) return "pl-PL"; return locale; };
const formatCarTimeLabel = (time: string, locale: string) => { const [hour, minute] = time.split(":").map(Number); return Number.isNaN(hour) || Number.isNaN(minute) ? time : new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(new Date(2024, 0, 1, hour, minute)); };
const normalizeLocationCountryHint = (value: string | null | undefined) => { const countryCode = value?.trim().toUpperCase() || ""; return /^[A-Z]{2}$/.test(countryCode) ? countryCode : ""; };
const normalizeAirportCode = (value: string | null | undefined) => { const code = value?.trim().toUpperCase() || ""; return /^[A-Z]{3}$/.test(code) ? code : ""; };
const dealsIncludesFlights = (mode: DealsPackageMode) => getIncludedProducts(mode).flight;
const buildFlightOriginPatch = (option: AirportOption, locale: string) => { if (!option.city?.trim()) return null; const code = normalizeAirportCode(option.code); if (!code) return null; const text = formatAirportLabel({ ...option, code }, locale).trim(); return text ? { flightOriginText: text, flightOriginCode: code } : null; };

function DealsCarPopover({ open, anchorRef, width: preferredWidth, marker, children }: { open: boolean; anchorRef: RefObject<HTMLElement | null>; width: number; marker: "dates" | "times"; children: ReactNode }) {
  const [position, setPosition] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const desktop = window.matchMedia("(min-width: 640px)");
    const updatePosition = () => {
      if (!desktop.matches || !anchorRef.current) return setPosition(null);
      const gutter = 16; const gap = 12; const rect = anchorRef.current.getBoundingClientRect(); const width = Math.min(preferredWidth, window.innerWidth - gutter * 2);
      const below = window.innerHeight - rect.bottom - gap - gutter; const above = rect.top - gap - gutter; const openAbove = below < 360 && above > below; const maxHeight = Math.max(180, Math.min(openAbove ? above : below, window.innerHeight - gutter * 2));
      setPosition({ left: Math.min(Math.max(gutter, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - gutter), top: openAbove ? Math.max(gutter, rect.top - gap - maxHeight) : rect.bottom + gap, width, maxHeight });
    };
    updatePosition(); window.addEventListener("resize", updatePosition); window.addEventListener("scroll", updatePosition, true); desktop.addEventListener("change", updatePosition);
    return () => { window.removeEventListener("resize", updatePosition); window.removeEventListener("scroll", updatePosition, true); desktop.removeEventListener("change", updatePosition); };
  }, [anchorRef, open, preferredWidth]);
  if (!open || !position || typeof document === "undefined") return null;
  return createPortal(<div {...(marker === "dates" ? { "data-deals-car-dates-popover": true } : { "data-deals-car-times-popover": true })} className="fixed z-[1200] hidden overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.24)] sm:block" style={position}>{children}</div>, document.body);
}

function DealsFlightDatesPopover({ open, anchorRef, children }: { open: boolean; anchorRef: RefObject<HTMLElement | null>; children: ReactNode }) {
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null);
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const desktop = window.matchMedia("(min-width: 640px)");
    const updatePosition = () => { if (!desktop.matches || !anchorRef.current) return setPosition(null); const gutter = 16; const rect = anchorRef.current.getBoundingClientRect(); const width = Math.min(690, window.innerWidth - gutter * 2); const expectedHeight = Math.min(560, window.innerHeight - gutter * 2); setPosition({ left: Math.min(Math.max(gutter, rect.right - width), window.innerWidth - width - gutter), top: Math.max(gutter, Math.min(rect.bottom + 10, window.innerHeight - expectedHeight - gutter)), width }); };
    updatePosition(); window.addEventListener("resize", updatePosition); window.addEventListener("scroll", updatePosition, true); desktop.addEventListener("change", updatePosition);
    return () => { window.removeEventListener("resize", updatePosition); window.removeEventListener("scroll", updatePosition, true); desktop.removeEventListener("change", updatePosition); };
  }, [anchorRef, open]);
  if (!open || !position || typeof document === "undefined") return null;
  return createPortal(<div data-deals-flight-dates-popover className="fixed z-[1000] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.18)]" style={position}>{children}</div>, document.body);
}

function DealsHotelDatesPopover({ open, anchorRef, children }: { open: boolean; anchorRef: RefObject<HTMLElement | null>; children: ReactNode }) {
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null);
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const desktop = window.matchMedia("(min-width: 640px)");
    const updatePosition = () => { if (!desktop.matches || !anchorRef.current) return setPosition(null); const gutter = 16; const rect = anchorRef.current.getBoundingClientRect(); const width = Math.min(640, window.innerWidth - gutter * 2); const expectedHeight = Math.min(560, window.innerHeight - gutter * 2); setPosition({ left: Math.min(Math.max(gutter, rect.right - width), window.innerWidth - width - gutter), top: Math.max(gutter, Math.min(rect.bottom + 10, window.innerHeight - expectedHeight - gutter)), width }); };
    updatePosition(); window.addEventListener("resize", updatePosition); window.addEventListener("scroll", updatePosition, true); desktop.addEventListener("change", updatePosition);
    return () => { window.removeEventListener("resize", updatePosition); window.removeEventListener("scroll", updatePosition, true); desktop.removeEventListener("change", updatePosition); };
  }, [anchorRef, open]);
  if (!open || !position || typeof document === "undefined") return null;
  return createPortal(<div data-deals-hotel-dates-popover className="fixed z-[1000] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.18)]" style={position}>{children}</div>, document.body);
}

function DealsFlightPopover({ open, anchorRef, children }: { open: boolean; anchorRef: RefObject<HTMLElement | null>; children: ReactNode }) {
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const desktop = window.matchMedia("(min-width: 640px)");
    const updatePosition = () => {
      if (!desktop.matches || !anchorRef.current) return setPosition(null);
      const gutter = 16; const rect = anchorRef.current.getBoundingClientRect(); const width = Math.min(360, window.innerWidth - gutter * 2);
      setPosition({ left: Math.min(Math.max(gutter, rect.right - width), window.innerWidth - width - gutter), top: rect.bottom + 10, width });
    };
    updatePosition(); window.addEventListener("resize", updatePosition); window.addEventListener("scroll", updatePosition, true); desktop.addEventListener("change", updatePosition);
    return () => { window.removeEventListener("resize", updatePosition); window.removeEventListener("scroll", updatePosition, true); desktop.removeEventListener("change", updatePosition); };
  }, [anchorRef, open]);

  if (!open || !position || typeof document === "undefined") return null;
  return createPortal(<div data-deals-flight-travellers-popover className="fixed z-[1000] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.18)]" style={position}>{children}</div>, document.body);
}

function DealsHotelPopover({ open, anchorRef, children }: { open: boolean; anchorRef: RefObject<HTMLElement | null>; children: ReactNode }) {
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const desktop = window.matchMedia("(min-width: 640px)");
    const updatePosition = () => {
      if (!desktop.matches || !anchorRef.current) return setPosition(null);
      const gutter = 16; const rect = anchorRef.current.getBoundingClientRect(); const width = Math.min(360, window.innerWidth - gutter * 2); const expectedHeight = Math.min(480, window.innerHeight - gutter * 2);
      setPosition({ left: Math.min(Math.max(gutter, rect.right - width), window.innerWidth - width - gutter), top: Math.max(gutter, Math.min(rect.bottom + 10, window.innerHeight - gutter - expectedHeight)), width });
    };
    updatePosition(); window.addEventListener("resize", updatePosition); window.addEventListener("scroll", updatePosition, true); desktop.addEventListener("change", updatePosition);
    return () => { window.removeEventListener("resize", updatePosition); window.removeEventListener("scroll", updatePosition, true); desktop.removeEventListener("change", updatePosition); };
  }, [anchorRef, open]);

  if (!open || !position || typeof document === "undefined") return null;
  return createPortal(<div data-deals-hotel-guests-popover className="fixed z-[1000] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.18)]" style={position}>{children}</div>, document.body);
}

function DealsDestinationPopover({ open, anchorRef, width: desiredWidth, marker, children }: { open: boolean; anchorRef: RefObject<HTMLElement | null>; width: number; marker: string; children: ReactNode }) {
  const [position, setPosition] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const desktop = window.matchMedia("(min-width: 640px)");
    const updatePosition = () => {
      if (!desktop.matches || !anchorRef.current) return setPosition(null);
      const gutter = 16; const gap = 8; const rect = anchorRef.current.getBoundingClientRect(); const width = Math.min(desiredWidth, window.innerWidth - gutter * 2);
      const below = window.innerHeight - rect.bottom - gap - gutter; const above = rect.top - gap - gutter; const useAbove = below < 240 && above > below;
      const maxHeight = Math.max(160, Math.min(352, useAbove ? above : below));
      setPosition({ left: Math.min(Math.max(gutter, rect.left), window.innerWidth - width - gutter), top: useAbove ? Math.max(gutter, rect.top - gap - maxHeight) : rect.bottom + gap, width, maxHeight });
    };
    updatePosition(); window.addEventListener("resize", updatePosition); window.addEventListener("scroll", updatePosition, true); desktop.addEventListener("change", updatePosition);
    return () => { window.removeEventListener("resize", updatePosition); window.removeEventListener("scroll", updatePosition, true); desktop.removeEventListener("change", updatePosition); };
  }, [anchorRef, desiredWidth, open]);
  if (!open || !position || typeof document === "undefined") return null;
  return createPortal(<div data-deals-destination-popover={marker} className="fixed z-[1100] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,0.22)]" style={position}>{children}</div>, document.body);
}

export function DealsSearchForm() {
  const params = useSearchParams(); const router = useRouter(); const { start } = useRouteProgress();
  const { t: dictionary, locale } = useLocale(); const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const [search, setSearch] = useState<DealsSearch>(() => params.size ? parseDealsSearchParams(params) : createDefaultDealsSearch());
  const [errors, setErrors] = useState<ReturnType<typeof validateDealsSearch>>({}); const [submitting, setSubmitting] = useState(false);
  const [airportLists, setAirportLists] = useState<Record<"origin" | "destination", AirportOption[]>>({ origin: [], destination: [] });
  const [hotelSuggestions, setHotelSuggestions] = useState<HotelSuggestion[]>([]);
  const [flightOriginOpen, setFlightOriginOpen] = useState(false);
  const [flightDestinationOpen, setFlightDestinationOpen] = useState(false);
  const [flightOriginLoading, setFlightOriginLoading] = useState(false);
  const [flightDestinationLoading, setFlightDestinationLoading] = useState(false);
  const [flightOriginHighlight, setFlightOriginHighlight] = useState(0);
  const [flightDestinationHighlight, setFlightDestinationHighlight] = useState(0);
  const [flightMobileAirport, setFlightMobileAirport] = useState<"origin" | "destination" | null>(null);
  const [hotelDestinationOpen, setHotelDestinationOpen] = useState(false);
  const [hotelDestinationLoading, setHotelDestinationLoading] = useState(false);
  const [hotelDestinationHighlight, setHotelDestinationHighlight] = useState(0);
  const [hotelDestinationMobileOpen, setHotelDestinationMobileOpen] = useState(false);
  const flightOriginWrapRef = useRef<HTMLDivElement>(null); const flightOriginInputRef = useRef<HTMLInputElement>(null); const flightOriginMobileLauncherRef = useRef<HTMLButtonElement>(null); const flightOriginMobileInputRef = useRef<HTMLInputElement>(null);
  const flightDestinationWrapRef = useRef<HTMLDivElement>(null); const flightDestinationInputRef = useRef<HTMLInputElement>(null); const flightDestinationMobileLauncherRef = useRef<HTMLButtonElement>(null); const flightDestinationMobileInputRef = useRef<HTMLInputElement>(null);
  const hotelDestinationWrapRef = useRef<HTMLDivElement>(null); const hotelDestinationInputRef = useRef<HTMLInputElement>(null); const hotelDestinationMobileLauncherRef = useRef<HTMLButtonElement>(null);
  const dirty = useRef({ hotelDestination: Boolean(search.hotelDestination), hotelDates: params.has("hotelCheckIn"), carLocation: Boolean(search.carPickupLocation), carDates: params.has("carPickupDate") });
  const flightOriginUserInteractedRef = useRef(false);
  const flightDefaultOriginRequestedRef = useRef(false);
  const firstError = useRef<HTMLDivElement>(null);
  const flightDatesLauncherRef = useRef<HTMLButtonElement>(null);
  const mobileFlightDatesCommittedRef = useRef(false);
  const [flightDatesOpen, setFlightDatesOpen] = useState(false);
  const [mobileFlightDatesOpen, setMobileFlightDatesOpen] = useState(false);
  const [draftFlightDepartureDate, setDraftFlightDepartureDate] = useState(search.flightDepartureDate);
  const [draftFlightReturnDate, setDraftFlightReturnDate] = useState(search.flightReturnDate);
  const [visibleFlightMonth, setVisibleFlightMonth] = useState(() => { const today = new Date(); return new Date(today.getFullYear(), today.getMonth(), 1); });
  const hotelDatesLauncherRef = useRef<HTMLButtonElement>(null);
  const mobileHotelDatesCommittedRef = useRef(false);
  const [hotelDatesOpen, setHotelDatesOpen] = useState(false);
  const [mobileHotelDatesOpen, setMobileHotelDatesOpen] = useState(false);
  const [draftHotelCheckIn, setDraftHotelCheckIn] = useState(search.hotelCheckIn);
  const [draftHotelCheckOut, setDraftHotelCheckOut] = useState(search.hotelCheckOut);
  const [visibleHotelMonth, setVisibleHotelMonth] = useState(() => { const today = new Date(); return new Date(today.getFullYear(), today.getMonth(), 1); });
  const travelersLauncherRef = useRef<HTMLButtonElement>(null);
  const mobileTravelersCommittedRef = useRef(false);
  const [travelersOpen, setTravelersOpen] = useState(false);
  const [mobileTravelersOpen, setMobileTravelersOpen] = useState(false);
  const [draftAdults, setDraftAdults] = useState(search.flightAdults);
  const [draftChildren, setDraftChildren] = useState(search.flightChildren);
  const [draftInfants, setDraftInfants] = useState(search.flightInfants);
  const [draftCabin, setDraftCabin] = useState<DealsSearch["flightCabinClass"]>(search.flightCabinClass);
  const hotelGuestsLauncherRef = useRef<HTMLButtonElement>(null);
  const mobileHotelGuestsCommittedRef = useRef(false);
  const [hotelGuestsOpen, setHotelGuestsOpen] = useState(false);
  const [mobileHotelGuestsOpen, setMobileHotelGuestsOpen] = useState(false);
  const [draftHotelAdults, setDraftHotelAdults] = useState(search.hotelAdults);
  const [draftHotelChildren, setDraftHotelChildren] = useState(search.hotelChildren);
  const [draftHotelRooms, setDraftHotelRooms] = useState(search.hotelRooms);
  const [draftHotelPetFriendly, setDraftHotelPetFriendly] = useState(search.hotelPetFriendly);
  const carPickupLocationRef = useRef<HTMLInputElement>(null); const carReturnLocationRef = useRef<HTMLInputElement>(null);
  const carPickupLocationLauncherRef = useRef<HTMLButtonElement>(null); const carReturnLocationLauncherRef = useRef<HTMLButtonElement>(null);
  const carPickupMobileInputRef = useRef<HTMLInputElement>(null); const carReturnMobileInputRef = useRef<HTMLInputElement>(null);
  const carDatesLauncherRef = useRef<HTMLButtonElement>(null); const carTimesLauncherRef = useRef<HTMLButtonElement>(null); const carDriverAgeLauncherRef = useRef<HTMLButtonElement>(null);
  const mobileCarDatesCommittedRef = useRef(false); const mobileCarTimesCommittedRef = useRef(false); const mobileCarDriverAgeCommittedRef = useRef(false);
  const [mobileCarLocation, setMobileCarLocation] = useState<"pickup" | "return" | null>(null);
  const [carDatesOpen, setCarDatesOpen] = useState(false); const [mobileCarDatesOpen, setMobileCarDatesOpen] = useState(false);
  const [draftCarPickupDate, setDraftCarPickupDate] = useState(search.carPickupDate); const [draftCarReturnDate, setDraftCarReturnDate] = useState(search.carReturnDate);
  const [visibleCarMonth, setVisibleCarMonth] = useState(() => { const today = new Date(); return new Date(today.getFullYear(), today.getMonth(), 1); });
  const [carTimesOpen, setCarTimesOpen] = useState(false); const [mobileCarTimesOpen, setMobileCarTimesOpen] = useState(false);
  const [draftCarPickupTime, setDraftCarPickupTime] = useState(search.carPickupTime); const [draftCarReturnTime, setDraftCarReturnTime] = useState(search.carReturnTime);
  const [mobileCarDriverAgeOpen, setMobileCarDriverAgeOpen] = useState(false); const [draftCarDriverAge, setDraftCarDriverAge] = useState(search.carDriverAge);
  const included = getIncludedProducts(search.mode);
  const update = <K extends keyof DealsSearch>(key: K, value: DealsSearch[K]) => setSearch((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!dealsIncludesFlights(search.mode) || search.flightOriginText.trim() || search.flightOriginCode.trim() || flightOriginUserInteractedRef.current || flightDefaultOriginRequestedRef.current) return;
    flightDefaultOriginRequestedRef.current = true;
    const controller = new AbortController();
    const loadDefaultOrigin = async () => {
      let countryHint = "";
      try {
        const locationResponse = await fetch("/api/location", { signal: controller.signal, cache: "no-store" });
        if (locationResponse.ok) {
          const payload = (await locationResponse.json()) as LocationApiResponse;
          countryHint = payload.source === "ipinfo-lite" ? normalizeLocationCountryHint(payload.countryCode) : "";
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
      if (controller.signal.aborted) return;
      try {
        const request = new URLSearchParams({ default: "true", context: "origin" });
        if (countryHint) request.set("countryCode", countryHint);
        if (typeof navigator !== "undefined" && navigator.language) request.set("locale", navigator.language);
        const placesResponse = await fetch(`/api/flights/places?${request.toString()}`, { signal: controller.signal, cache: "no-store" });
        if (!placesResponse.ok) return;
        const payload = (await placesResponse.json()) as DealsPlacesApiResponse;
        const patch = payload.defaultOriginAirport ? buildFlightOriginPatch(payload.defaultOriginAirport, locale) : null;
        if (!patch || controller.signal.aborted) return;
        setSearch((current) => {
          if (!dealsIncludesFlights(current.mode) || current.flightOriginText.trim() || current.flightOriginCode.trim() || flightOriginUserInteractedRef.current) return current;
          return { ...current, ...patch };
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    };
    void loadDefaultOrigin();
    return () => controller.abort();
  }, [locale, search.flightOriginCode, search.flightOriginText, search.mode]);

  const swapDealsFlightAirports = () => {
    flightOriginUserInteractedRef.current = true;
    setSearch((current) => {
      const currentIncluded = getIncludedProducts(current.mode);
      const newDestination = getAirportByCode(current.flightOriginCode)?.city ?? current.flightOriginText;

      return {
        ...current,
        flightOriginText: current.flightDestinationText,
        flightOriginCode: current.flightDestinationCode,
        flightDestinationText: current.flightOriginText,
        flightDestinationCode: current.flightOriginCode,
        ...currentIncluded.hotel && !dirty.current.hotelDestination ? { hotelDestination: newDestination } : {},
        ...currentIncluded.car && !dirty.current.carLocation ? { carPickupLocation: newDestination } : {},
      };
    });
    setFlightOriginOpen(false); setFlightDestinationOpen(false); setFlightMobileAirport(null);
    setFlightOriginHighlight(0); setFlightDestinationHighlight(0);
    setFlightOriginLoading(false); setFlightDestinationLoading(false);
    setAirportLists({ origin: [], destination: [] });
  };

  const calendarLocale = useMemo(() => normalizeFlightsCalendarLocale(locale), [locale]);
  const accessibleDateFormatter = useMemo(() => new Intl.DateTimeFormat(calendarLocale, { month: "long", day: "numeric", year: "numeric" }), [calendarLocale]);
  const weekdays = useMemo(() => formatFlightsWeekdays(calendarLocale), [calendarLocale]);
  const [todayLocal, setTodayLocal] = useState(() => startOfLocalDay(new Date()));
  const isBeforeToday = useCallback((date: Date) => startOfLocalDay(date).getTime() < todayLocal.getTime(), [todayLocal]);
  useEffect(() => {
    let midnightTimeout: number | undefined;

    const refreshTodayLocal = () => {
      const nextToday = startOfLocalDay(new Date());
      setTodayLocal((current) => current.getTime() === nextToday.getTime() ? current : nextToday);
    };
    const scheduleMidnightRefresh = () => {
      if (midnightTimeout !== undefined) window.clearTimeout(midnightTimeout);
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      midnightTimeout = window.setTimeout(() => {
        refreshTodayLocal();
        scheduleMidnightRefresh();
      }, nextMidnight.getTime() - now.getTime() + 1_000);
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
  const flightDatesSummary = useMemo(() => { const departure = parseIsoDate(search.flightDepartureDate); const returning = parseIsoDate(search.flightReturnDate); if (!departure || isBeforeToday(departure)) return t("travelDates"); if (search.flightTripType === "one-way") return formatFlightsDateSummary(departure, null, calendarLocale); return returning && !isBeforeToday(returning) && returning >= departure ? formatFlightsDateSummary(departure, returning, calendarLocale) : t("travelDates"); }, [calendarLocale, isBeforeToday, search.flightDepartureDate, search.flightReturnDate, search.flightTripType, t]);
  const resetFlightDatesDraft = useCallback(() => { setDraftFlightDepartureDate(search.flightDepartureDate); setDraftFlightReturnDate(search.flightTripType === "round-trip" ? search.flightReturnDate : ""); }, [search.flightDepartureDate, search.flightReturnDate, search.flightTripType]);
  const restoreFlightDatesFocus = () => requestAnimationFrame(() => flightDatesLauncherRef.current?.focus({ preventScroll: true }));
  const openFlightDates = () => { resetFlightDatesDraft(); const departure = parseIsoDate(search.flightDepartureDate); const validVisibleDeparture = departure && !isBeforeToday(departure) ? departure : todayLocal; setVisibleFlightMonth(new Date(validVisibleDeparture.getFullYear(), validVisibleDeparture.getMonth(), 1)); if (window.matchMedia("(max-width: 639px)").matches) setMobileFlightDatesOpen(true); else setFlightDatesOpen(true); };
  const dismissDesktopFlightDates = useCallback((restoreFocus = false) => { resetFlightDatesDraft(); setFlightDatesOpen(false); if (restoreFocus) restoreFlightDatesFocus(); }, [resetFlightDatesDraft]);
  const validDraftFlightRange = useMemo(() => { const departure = parseIsoDate(draftFlightDepartureDate); if (!departure || isBeforeToday(departure)) return false; if (search.flightTripType === "one-way") return draftFlightReturnDate === ""; const returning = parseIsoDate(draftFlightReturnDate); return Boolean(returning && !isBeforeToday(returning) && returning >= departure); }, [draftFlightDepartureDate, draftFlightReturnDate, isBeforeToday, search.flightTripType]);
  const selectDraftFlightDate = (date: Date) => { if (isBeforeToday(date)) return; const selected = toIsoDate(date); if (search.flightTripType === "one-way") { setDraftFlightDepartureDate(selected); setDraftFlightReturnDate(""); return; } const departure = parseIsoDate(draftFlightDepartureDate); if (!departure || isBeforeToday(departure) || draftFlightReturnDate) { setDraftFlightDepartureDate(selected); setDraftFlightReturnDate(""); } else if (selected < draftFlightDepartureDate) { setDraftFlightDepartureDate(selected); setDraftFlightReturnDate(""); } else setDraftFlightReturnDate(selected); };
  const commitFlightDates = (mobile = false) => { const departure = parseIsoDate(draftFlightDepartureDate); if (!departure || isBeforeToday(departure)) return; const normalizedDeparture = toIsoDate(departure); if (search.flightTripType === "one-way") setSearch((current) => ({ ...current, flightDepartureDate: normalizedDeparture, flightReturnDate: "" })); else { const returning = parseIsoDate(draftFlightReturnDate); if (!returning || isBeforeToday(returning) || returning < departure) return; const normalizedReturn = toIsoDate(returning); setSearch((current) => ({ ...current, flightDepartureDate: normalizedDeparture, flightReturnDate: normalizedReturn, ...!dirty.current.hotelDates ? { hotelCheckIn: normalizedDeparture, hotelCheckOut: normalizedReturn } : {}, ...!dirty.current.carDates ? { carPickupDate: normalizedDeparture, carReturnDate: normalizedReturn } : {} })); } if (mobile) mobileFlightDatesCommittedRef.current = true; else { setFlightDatesOpen(false); restoreFlightDatesFocus(); } };
  const setDealsFlightTripType = (nextTripType: DealsFlightTripType) => { setSearch((current) => ({ ...current, flightTripType: nextTripType, flightReturnDate: "" })); setDraftFlightReturnDate(""); };
  const closeMobileFlightDates = useCallback(() => { if (!mobileFlightDatesCommittedRef.current) resetFlightDatesDraft(); mobileFlightDatesCommittedRef.current = false; setMobileFlightDatesOpen(false); restoreFlightDatesFocus(); }, [resetFlightDatesDraft]);

  const hotelCalendarLocale = useMemo(() => normalizeHotelCalendarLocale(locale), [locale]);
  const hotelWeekdays = useMemo(() => hotelCalendarLocale === "th-TH-u-ca-gregory" ? ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"] : Array.from({ length: 7 }, (_, day) => new Intl.DateTimeFormat(hotelCalendarLocale, { weekday: "short" }).format(new Date(2024, 0, 7 + day))), [hotelCalendarLocale]);
  const hotelAccessibleDateFormatter = useMemo(() => new Intl.DateTimeFormat(hotelCalendarLocale, { month: "long", day: "numeric", year: "numeric" }), [hotelCalendarLocale]);
  const hotelDatesSummary = useMemo(() => { const checkIn = parseIsoDate(search.hotelCheckIn); const checkOut = parseIsoDate(search.hotelCheckOut); if (!checkIn || !checkOut || isBeforeToday(checkIn) || isBeforeToday(checkOut) || checkOut <= checkIn) return t("hotelSearchDatePlaceholder"); const formatter = new Intl.DateTimeFormat(hotelCalendarLocale, { month: "short", day: "numeric" }); return t("hotelSearch.dateRange").replace("{{checkIn}}", formatter.format(checkIn)).replace("{{checkOut}}", formatter.format(checkOut)); }, [hotelCalendarLocale, isBeforeToday, search.hotelCheckIn, search.hotelCheckOut, t]);
  const resetHotelDatesDraft = useCallback(() => { setDraftHotelCheckIn(search.hotelCheckIn); setDraftHotelCheckOut(search.hotelCheckOut); }, [search.hotelCheckIn, search.hotelCheckOut]);
  const restoreHotelDatesFocus = () => requestAnimationFrame(() => hotelDatesLauncherRef.current?.focus({ preventScroll: true }));
  const openHotelDates = () => { resetHotelDatesDraft(); const checkIn = parseIsoDate(search.hotelCheckIn); const visibleDate = checkIn && !isBeforeToday(checkIn) ? checkIn : todayLocal; setVisibleHotelMonth(new Date(visibleDate.getFullYear(), visibleDate.getMonth(), 1)); if (window.matchMedia("(max-width: 639px)").matches) setMobileHotelDatesOpen(true); else setHotelDatesOpen(true); };
  const dismissDesktopHotelDates = useCallback((restoreFocus = false) => { resetHotelDatesDraft(); setHotelDatesOpen(false); if (restoreFocus) restoreHotelDatesFocus(); }, [resetHotelDatesDraft]);
  const validDraftHotelRange = useMemo(() => { const checkIn = parseIsoDate(draftHotelCheckIn); const checkOut = parseIsoDate(draftHotelCheckOut); return Boolean(checkIn && checkOut && !isBeforeToday(checkIn) && !isBeforeToday(checkOut) && checkOut > checkIn); }, [draftHotelCheckIn, draftHotelCheckOut, isBeforeToday]);
  const selectDraftHotelDate = (date: Date) => { if (isBeforeToday(date)) return; const selected = toIsoDate(date); const checkIn = parseIsoDate(draftHotelCheckIn); if (!checkIn || isBeforeToday(checkIn) || draftHotelCheckOut) { setDraftHotelCheckIn(selected); setDraftHotelCheckOut(""); } else if (selected <= draftHotelCheckIn) { setDraftHotelCheckIn(selected); setDraftHotelCheckOut(""); } else setDraftHotelCheckOut(selected); };
  const commitHotelDates = (mobile = false) => { const checkIn = parseIsoDate(draftHotelCheckIn); const checkOut = parseIsoDate(draftHotelCheckOut); if (!checkIn || !checkOut || isBeforeToday(checkIn) || isBeforeToday(checkOut) || checkOut <= checkIn) return; const normalizedCheckIn = toIsoDate(checkIn); const normalizedCheckOut = toIsoDate(checkOut); dirty.current.hotelDates = true; setSearch((current) => ({ ...current, hotelCheckIn: normalizedCheckIn, hotelCheckOut: normalizedCheckOut })); if (mobile) mobileHotelDatesCommittedRef.current = true; else { setHotelDatesOpen(false); restoreHotelDatesFocus(); } };
  const closeMobileHotelDates = useCallback(() => { if (!mobileHotelDatesCommittedRef.current) resetHotelDatesDraft(); mobileHotelDatesCommittedRef.current = false; setMobileHotelDatesOpen(false); restoreHotelDatesFocus(); }, [resetHotelDatesDraft]);

  const cabinLabel = search.flightCabinClass === "business" ? t("business") : search.flightCabinClass === "first" ? t("first") : t("economy");
  const travelerSummary = useMemo(() => {
    const japanese = locale.toLowerCase().startsWith("ja"); const separator = japanese ? "、" : locale === "zh-cn" ? "，" : ", ";
    const part = (count: number, singular: string, plural: string) => japanese ? `${singular}${count}名` : `${count} ${count === 1 ? singular : plural}`;
    const parts = [part(search.flightAdults, t("adultSingular"), t("adultPlural"))];
    if (search.flightChildren) parts.push(part(search.flightChildren, t("childSingular"), t("childPlural")));
    if (search.flightInfants) parts.push(part(search.flightInfants, t("infantSingular"), t("infantPlural")));
    return [...parts, cabinLabel].join(separator);
  }, [cabinLabel, locale, search.flightAdults, search.flightChildren, search.flightInfants, t]);
  const restoreTravelersFocus = () => requestAnimationFrame(() => travelersLauncherRef.current?.focus({ preventScroll: true }));
  const resetTravelersDraft = useCallback(() => { setDraftAdults(search.flightAdults); setDraftChildren(search.flightChildren); setDraftInfants(search.flightInfants); setDraftCabin(search.flightCabinClass); }, [search.flightAdults, search.flightCabinClass, search.flightChildren, search.flightInfants]);
  const openTravelers = () => { resetTravelersDraft(); if (window.matchMedia("(max-width: 639px)").matches) setMobileTravelersOpen(true); else setTravelersOpen(true); };
  const dismissDesktopTravelers = useCallback(() => { resetTravelersDraft(); setTravelersOpen(false); restoreTravelersFocus(); }, [resetTravelersDraft]);
  const normalizeTravelersDraft = () => { const adults = Math.max(1, Math.min(9, draftAdults)); const children = Math.max(0, Math.min(9 - adults, draftChildren)); const infants = Math.max(0, Math.min(adults, 9 - adults - children, draftInfants)); return { adults, children, infants, cabin: draftCabin === "business" || draftCabin === "first" ? draftCabin : "economy" as const }; };
  const commitTravelers = (mobile = false) => { const normalized = normalizeTravelersDraft(); setSearch((current) => ({ ...current, flightAdults: normalized.adults, flightChildren: normalized.children, flightInfants: normalized.infants, flightCabinClass: normalized.cabin })); if (mobile) mobileTravelersCommittedRef.current = true; else { setTravelersOpen(false); restoreTravelersFocus(); } };
  const closeMobileTravelers = useCallback(() => { if (!mobileTravelersCommittedRef.current) resetTravelersDraft(); mobileTravelersCommittedRef.current = false; setMobileTravelersOpen(false); restoreTravelersFocus(); }, [resetTravelersDraft]);

  const hotelGuestsSummary = useMemo(() => {
    const guests = Math.max(1, Math.min(12, search.hotelAdults + search.hotelChildren));
    const rooms = Math.max(1, Math.min(6, search.hotelRooms));
    const values = { guests, guestLabel: t(guests === 1 ? "guestSingular" : "guestPlural"), rooms, roomLabel: t(rooms === 1 ? "roomSingular" : "roomPlural") };
    const summary = Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{{${key}}}`, String(value)), t("hotelSearch.guestsRoomsSummary"));
    return search.hotelPetFriendly ? t("hotelSearch.guestsRoomsPetsSummary").replace("{{guests}}", String(guests)).replace("{{guestLabel}}", values.guestLabel).replace("{{rooms}}", String(rooms)).replace("{{roomLabel}}", values.roomLabel).replace("{{pets}}", t("petFriendly")) : summary;
  }, [search.hotelAdults, search.hotelChildren, search.hotelPetFriendly, search.hotelRooms, t]);
  const restoreHotelGuestsFocus = () => requestAnimationFrame(() => hotelGuestsLauncherRef.current?.focus({ preventScroll: true }));
  const resetHotelGuestsDraft = useCallback(() => { setDraftHotelAdults(search.hotelAdults); setDraftHotelChildren(search.hotelChildren); setDraftHotelRooms(search.hotelRooms); setDraftHotelPetFriendly(search.hotelPetFriendly); }, [search.hotelAdults, search.hotelChildren, search.hotelPetFriendly, search.hotelRooms]);
  const openHotelGuests = () => { resetHotelGuestsDraft(); if (window.matchMedia("(max-width: 639px)").matches) setMobileHotelGuestsOpen(true); else setHotelGuestsOpen(true); };
  const dismissDesktopHotelGuests = useCallback((restoreFocus = false) => { resetHotelGuestsDraft(); setHotelGuestsOpen(false); if (restoreFocus) restoreHotelGuestsFocus(); }, [resetHotelGuestsDraft]);
  const commitHotelGuests = (mobile = false) => { const adults = Math.max(1, Math.min(12, draftHotelAdults)); const children = Math.max(0, Math.min(12 - adults, draftHotelChildren)); const rooms = Math.max(1, Math.min(6, draftHotelRooms)); setSearch((current) => ({ ...current, hotelAdults: adults, hotelChildren: children, hotelRooms: rooms, hotelPetFriendly: draftHotelPetFriendly })); if (mobile) mobileHotelGuestsCommittedRef.current = true; else { setHotelGuestsOpen(false); restoreHotelGuestsFocus(); } };
  const closeMobileHotelGuests = useCallback(() => { if (!mobileHotelGuestsCommittedRef.current) resetHotelGuestsDraft(); mobileHotelGuestsCommittedRef.current = false; setMobileHotelGuestsOpen(false); restoreHotelGuestsFocus(); }, [resetHotelGuestsDraft]);

  const carIntlLocale = useMemo(() => getCarsIntlLocale(locale), [locale]);
  const carWeekdays = useMemo(() => Array.from({ length: 7 }, (_, day) => new Intl.DateTimeFormat(carIntlLocale, { weekday: "short" }).format(new Date(2024, 0, 7 + day))), [carIntlLocale]);
  const carAccessibleDateFormatter = useMemo(() => new Intl.DateTimeFormat(carIntlLocale, { month: "long", day: "numeric", year: "numeric" }), [carIntlLocale]);
  const carShortDateFormatter = useMemo(() => new Intl.DateTimeFormat(carIntlLocale, { month: "short", day: "numeric" }), [carIntlLocale]);
  const carDatesSummary = useMemo(() => { const pickup = parseIsoDate(search.carPickupDate); const returning = parseIsoDate(search.carReturnDate); return pickup && returning && !isBeforeToday(pickup) && !isBeforeToday(returning) && returning >= pickup ? `${carShortDateFormatter.format(pickup)} — ${carShortDateFormatter.format(returning)}` : t("carsSearch.rentalDatePlaceholder"); }, [carShortDateFormatter, isBeforeToday, search.carPickupDate, search.carReturnDate, t]);
  const carTimesSummary = useMemo(() => timeOptions.includes(search.carPickupTime) && timeOptions.includes(search.carReturnTime) ? t("carsSearch.pickupReturnTimeSummary").replace("{pickupTime}", formatCarTimeLabel(search.carPickupTime, carIntlLocale)).replace("{returnTime}", formatCarTimeLabel(search.carReturnTime, carIntlLocale)) : t("carsSearch.pickupReturnTimeLabel"), [carIntlLocale, search.carPickupTime, search.carReturnTime, t]);
  const carDriverAgeLabel = (age: string) => age === "18-70" ? t("carsSearch.driverAgeAnyAgeRange") : age;
  const resetCarDatesDraft = useCallback(() => { setDraftCarPickupDate(search.carPickupDate); setDraftCarReturnDate(search.carReturnDate); }, [search.carPickupDate, search.carReturnDate]);
  const resetCarTimesDraft = useCallback(() => { setDraftCarPickupTime(search.carPickupTime); setDraftCarReturnTime(search.carReturnTime); }, [search.carPickupTime, search.carReturnTime]);
  const restoreCarFocus = (ref: RefObject<HTMLButtonElement | null>) => requestAnimationFrame(() => ref.current?.focus({ preventScroll: true }));
  const closeOtherDealsPickers = () => { setFlightOriginOpen(false); setFlightDestinationOpen(false); setFlightMobileAirport(null); setHotelDestinationOpen(false); setHotelDestinationMobileOpen(false); dismissDesktopFlightDates(); setMobileFlightDatesOpen(false); dismissDesktopHotelDates(); setMobileHotelDatesOpen(false); setTravelersOpen(false); setMobileTravelersOpen(false); setHotelGuestsOpen(false); setMobileHotelGuestsOpen(false); };
  const closeCarMobilePickers = () => { setMobileCarLocation(null); setMobileCarDatesOpen(false); setMobileCarTimesOpen(false); setMobileCarDriverAgeOpen(false); };
  const openCarLocation = (kind: "pickup" | "return") => { closeOtherDealsPickers(); resetCarDatesDraft(); resetCarTimesDraft(); setCarDatesOpen(false); setCarTimesOpen(false); closeCarMobilePickers(); setMobileCarLocation(kind); };
  const openCarDates = () => { resetCarDatesDraft(); resetCarTimesDraft(); closeOtherDealsPickers(); closeCarMobilePickers(); setCarTimesOpen(false); const pickup = parseIsoDate(search.carPickupDate); const visible = pickup && !isBeforeToday(pickup) ? pickup : todayLocal; setVisibleCarMonth(new Date(visible.getFullYear(), visible.getMonth(), 1)); if (window.matchMedia("(max-width: 639px)").matches) setMobileCarDatesOpen(true); else setCarDatesOpen(true); };
  const dismissCarDates = useCallback((focus = false) => { resetCarDatesDraft(); setCarDatesOpen(false); if (focus) restoreCarFocus(carDatesLauncherRef); }, [resetCarDatesDraft]);
  const openCarTimes = () => { resetCarTimesDraft(); resetCarDatesDraft(); closeOtherDealsPickers(); closeCarMobilePickers(); setCarDatesOpen(false); if (window.matchMedia("(max-width: 639px)").matches) setMobileCarTimesOpen(true); else setCarTimesOpen(true); };
  const dismissCarTimes = useCallback((focus = false) => { resetCarTimesDraft(); setCarTimesOpen(false); if (focus) restoreCarFocus(carTimesLauncherRef); }, [resetCarTimesDraft]);
  const openCarDriverAge = () => { setDraftCarDriverAge(search.carDriverAge); closeOtherDealsPickers(); resetCarDatesDraft(); resetCarTimesDraft(); setCarDatesOpen(false); setCarTimesOpen(false); closeCarMobilePickers(); setMobileCarDriverAgeOpen(true); };
  const validDraftCarRange = useMemo(() => { const pickup = parseIsoDate(draftCarPickupDate); const returning = parseIsoDate(draftCarReturnDate); return Boolean(pickup && returning && !isBeforeToday(pickup) && !isBeforeToday(returning) && returning >= pickup); }, [draftCarPickupDate, draftCarReturnDate, isBeforeToday]);
  const selectDraftCarDate = (date: Date) => { if (isBeforeToday(date)) return; const selected = toIsoDate(date); const pickup = parseIsoDate(draftCarPickupDate); if (!pickup || isBeforeToday(pickup) || draftCarReturnDate) { setDraftCarPickupDate(selected); setDraftCarReturnDate(""); } else if (selected < draftCarPickupDate) { setDraftCarPickupDate(selected); setDraftCarReturnDate(""); } else setDraftCarReturnDate(selected); };
  const commitCarDates = (mobile = false) => { const pickup = parseIsoDate(draftCarPickupDate); const returning = parseIsoDate(draftCarReturnDate); if (!pickup || !returning || isBeforeToday(pickup) || isBeforeToday(returning) || returning < pickup) return; dirty.current.carDates = true; setSearch((current) => ({ ...current, carPickupDate: toIsoDate(pickup), carReturnDate: toIsoDate(returning) })); if (mobile) mobileCarDatesCommittedRef.current = true; else { setCarDatesOpen(false); restoreCarFocus(carDatesLauncherRef); } };
  const invalidSameDayCarTimes = search.carPickupDate === search.carReturnDate && draftCarReturnTime <= draftCarPickupTime;
  const validDraftCarTimes = timeOptions.includes(draftCarPickupTime) && timeOptions.includes(draftCarReturnTime) && !invalidSameDayCarTimes;
  const commitCarTimes = (mobile = false) => { if (!validDraftCarTimes) return; setSearch((current) => ({ ...current, carPickupTime: draftCarPickupTime, carReturnTime: draftCarReturnTime })); if (mobile) mobileCarTimesCommittedRef.current = true; else { setCarTimesOpen(false); restoreCarFocus(carTimesLauncherRef); } };
  const closeMobileCarDates = useCallback(() => { if (!mobileCarDatesCommittedRef.current) resetCarDatesDraft(); mobileCarDatesCommittedRef.current = false; setMobileCarDatesOpen(false); restoreCarFocus(carDatesLauncherRef); }, [resetCarDatesDraft]);
  const closeMobileCarTimes = useCallback(() => { if (!mobileCarTimesCommittedRef.current) resetCarTimesDraft(); mobileCarTimesCommittedRef.current = false; setMobileCarTimesOpen(false); restoreCarFocus(carTimesLauncherRef); }, [resetCarTimesDraft]);
  const closeMobileCarDriverAge = () => { if (!mobileCarDriverAgeCommittedRef.current) setDraftCarDriverAge(search.carDriverAge); mobileCarDriverAgeCommittedRef.current = false; setMobileCarDriverAgeOpen(false); restoreCarFocus(carDriverAgeLauncherRef); };

  useEffect(() => { if (!mobileCarLocation) return; const timer = window.setTimeout(() => { const input = mobileCarLocation === "pickup" ? carPickupMobileInputRef.current : carReturnMobileInputRef.current; input?.focus(); input?.select(); }, 80); return () => window.clearTimeout(timer); }, [mobileCarLocation]);
  useEffect(() => {
    if (!carDatesOpen && !carTimesOpen) return;
    const onPointerDown = (event: PointerEvent) => { const target = event.target; if (!(target instanceof Node)) return; if (carDatesOpen && !carDatesLauncherRef.current?.contains(target) && !(target instanceof Element && target.closest("[data-deals-car-dates-popover]"))) dismissCarDates(); if (carTimesOpen && !carTimesLauncherRef.current?.contains(target) && !(target instanceof Element && target.closest("[data-deals-car-times-popover]"))) dismissCarTimes(); };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key !== "Escape") return; event.preventDefault(); if (carDatesOpen) dismissCarDates(true); if (carTimesOpen) dismissCarTimes(true); };
    document.addEventListener("pointerdown", onPointerDown); document.addEventListener("keydown", onKeyDown); return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [carDatesOpen, carTimesOpen, dismissCarDates, dismissCarTimes]);

  useEffect(() => {
    if (!travelersOpen) return;
    const dismissOnPointer = (event: MouseEvent) => { const target = event.target; if (target instanceof Node && !travelersLauncherRef.current?.contains(target) && !(target instanceof Element && target.closest("[data-deals-flight-travellers-popover]"))) dismissDesktopTravelers(); };
    const dismissOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); dismissDesktopTravelers(); } };
    document.addEventListener("mousedown", dismissOnPointer); document.addEventListener("keydown", dismissOnEscape);
    return () => { document.removeEventListener("mousedown", dismissOnPointer); document.removeEventListener("keydown", dismissOnEscape); };
  }, [dismissDesktopTravelers, travelersOpen]);

  useEffect(() => {
    if (!flightDatesOpen) return;
    const dismissOnPointer = (event: PointerEvent) => { const target = event.target; if (target instanceof Node && !flightDatesLauncherRef.current?.contains(target) && !(target instanceof Element && target.closest("[data-deals-flight-dates-popover]"))) dismissDesktopFlightDates(); };
    const dismissOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); dismissDesktopFlightDates(true); } };
    document.addEventListener("pointerdown", dismissOnPointer); document.addEventListener("keydown", dismissOnEscape);
    return () => { document.removeEventListener("pointerdown", dismissOnPointer); document.removeEventListener("keydown", dismissOnEscape); };
  }, [dismissDesktopFlightDates, flightDatesOpen]);

  useEffect(() => {
    if (!hotelDatesOpen) return;
    const dismissOnPointer = (event: PointerEvent) => { const target = event.target; if (target instanceof Node && !hotelDatesLauncherRef.current?.contains(target) && !(target instanceof Element && target.closest("[data-deals-hotel-dates-popover]"))) dismissDesktopHotelDates(); };
    const dismissOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); dismissDesktopHotelDates(true); } };
    document.addEventListener("pointerdown", dismissOnPointer); document.addEventListener("keydown", dismissOnEscape);
    return () => { document.removeEventListener("pointerdown", dismissOnPointer); document.removeEventListener("keydown", dismissOnEscape); };
  }, [dismissDesktopHotelDates, hotelDatesOpen]);

  useEffect(() => {
    if (!hotelGuestsOpen) return;
    const dismissOnPointer = (event: PointerEvent) => { const target = event.target; if (target instanceof Node && !hotelGuestsLauncherRef.current?.contains(target) && !(target instanceof Element && target.closest("[data-deals-hotel-guests-popover]"))) dismissDesktopHotelGuests(); };
    const dismissOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); dismissDesktopHotelGuests(true); } };
    document.addEventListener("pointerdown", dismissOnPointer); document.addEventListener("keydown", dismissOnEscape);
    return () => { document.removeEventListener("pointerdown", dismissOnPointer); document.removeEventListener("keydown", dismissOnEscape); };
  }, [dismissDesktopHotelGuests, hotelGuestsOpen]);

  const closeUnrelatedPickers = useCallback(() => {
    resetFlightDatesDraft(); setFlightDatesOpen(false); setMobileFlightDatesOpen(false);
    resetTravelersDraft(); setTravelersOpen(false); setMobileTravelersOpen(false);
    resetHotelDatesDraft(); setHotelDatesOpen(false); setMobileHotelDatesOpen(false);
    resetHotelGuestsDraft(); setHotelGuestsOpen(false); setMobileHotelGuestsOpen(false);
  }, [resetFlightDatesDraft, resetHotelDatesDraft, resetHotelGuestsDraft, resetTravelersDraft]);
  const openFlightAirport = (kind: "origin" | "destination", mobile = false) => {
    closeUnrelatedPickers(); setHotelDestinationOpen(false); setHotelDestinationMobileOpen(false);
    setFlightOriginOpen(!mobile && kind === "origin"); setFlightDestinationOpen(!mobile && kind === "destination"); setFlightMobileAirport(mobile ? kind : null);
  };
  const openHotelDestination = (mobile = false) => {
    closeUnrelatedPickers(); setFlightOriginOpen(false); setFlightDestinationOpen(false); setFlightMobileAirport(null);
    setHotelDestinationOpen(!mobile); setHotelDestinationMobileOpen(mobile);
  };

  useEffect(() => {
    const dismiss = (event: PointerEvent) => { const target = event.target; if (!(target instanceof Node)) return; if (target instanceof Element && target.closest("[data-deals-destination-popover]")) return; if (!flightOriginWrapRef.current?.contains(target)) setFlightOriginOpen(false); if (!flightDestinationWrapRef.current?.contains(target)) setFlightDestinationOpen(false); if (!hotelDestinationWrapRef.current?.contains(target)) setHotelDestinationOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setFlightOriginOpen(false); setFlightDestinationOpen(false); setHotelDestinationOpen(false); } };
    document.addEventListener("pointerdown", dismiss); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, []);

  useEffect(() => {
    const query = search.flightOriginText.trim();
    if ((!flightOriginOpen && flightMobileAirport !== "origin") || query.length < 2) return;
    const controller = new AbortController(); const id = window.setTimeout(async () => { setFlightOriginLoading(true); try { const response = await fetch(`/api/flights/places?${new URLSearchParams({ q: query, context: "origin" })}`, { signal: controller.signal, cache: "no-store" }); if (!response.ok) throw new Error(); const payload = await response.json() as { suggestions?: AirportOption[] }; setAirportLists((all) => ({ ...all, origin: payload.suggestions?.slice(0, 8) ?? [] })); setFlightOriginHighlight(0); } catch { if (!controller.signal.aborted) setAirportLists((all) => ({ ...all, origin: [] })); } finally { if (!controller.signal.aborted) setFlightOriginLoading(false); } }, 220); return () => { clearTimeout(id); controller.abort(); };
  }, [flightMobileAirport, flightOriginOpen, search.flightOriginText]);
  useEffect(() => {
    const query = search.flightDestinationText.trim();
    if ((!flightDestinationOpen && flightMobileAirport !== "destination") || query.length < 2) return;
    const controller = new AbortController(); const id = window.setTimeout(async () => { setFlightDestinationLoading(true); try { const response = await fetch(`/api/flights/places?${new URLSearchParams({ q: query, context: "destination" })}`, { signal: controller.signal, cache: "no-store" }); if (!response.ok) throw new Error(); const payload = await response.json() as { suggestions?: AirportOption[] }; setAirportLists((all) => ({ ...all, destination: payload.suggestions?.slice(0, 8) ?? [] })); setFlightDestinationHighlight(0); } catch { if (!controller.signal.aborted) setAirportLists((all) => ({ ...all, destination: [] })); } finally { if (!controller.signal.aborted) setFlightDestinationLoading(false); } }, 220); return () => { clearTimeout(id); controller.abort(); };
  }, [flightDestinationOpen, flightMobileAirport, search.flightDestinationText]);
  useEffect(() => {
    if (!hotelDestinationOpen) return;
    const query = search.hotelDestination.trim(); const controller = new AbortController(); const id = window.setTimeout(async () => { setHotelDestinationLoading(true); try { const request = new URLSearchParams({ limit: "8" }); if (query) request.set("q", query); const response = await fetch(`/api/hotels/destinations?${request}`, { signal: controller.signal, cache: "no-store" }); if (!response.ok) throw new Error(); const payload = await response.json() as { suggestions?: HotelSuggestion[] }; setHotelSuggestions(payload.suggestions?.filter((option) => option?.id && option?.name && option?.country && option?.searchValue).slice(0, 8) ?? []); setHotelDestinationHighlight(0); } catch { if (!controller.signal.aborted) setHotelSuggestions([]); } finally { if (!controller.signal.aborted) setHotelDestinationLoading(false); } }, query ? 180 : 0); return () => { clearTimeout(id); controller.abort(); };
  }, [hotelDestinationOpen, search.hotelDestination]);
  useEffect(() => { if (!flightMobileAirport) return; const frame = requestAnimationFrame(() => (flightMobileAirport === "origin" ? flightOriginMobileInputRef : flightDestinationMobileInputRef).current?.focus()); return () => cancelAnimationFrame(frame); }, [flightMobileAirport]);

  const chooseAirport = (kind: "origin" | "destination", option: AirportOption) => {
    if (kind === "origin") flightOriginUserInteractedRef.current = true;
    const text = formatAirportLabel(option, locale); const codeKey = kind === "origin" ? "flightOriginCode" : "flightDestinationCode"; const textKey = kind === "origin" ? "flightOriginText" : "flightDestinationText";
    setSearch((current) => ({ ...current, [textKey]: text, [codeKey]: option.code.toUpperCase(), ...kind === "destination" && !dirty.current.hotelDestination ? { hotelDestination: option.city } : {}, ...kind === "destination" && !dirty.current.carLocation ? { carPickupLocation: option.city } : {} }));
    setAirportLists((all) => ({ ...all, [kind]: [] })); setFlightOriginOpen(false); setFlightDestinationOpen(false); setFlightMobileAirport(null); if (kind === "origin") setFlightOriginHighlight(0); else setFlightDestinationHighlight(0);
  };
  const submit = (event: FormEvent) => { event.preventDefault(); if (submitting) return; const found = validateDealsSearch(search); setErrors(found); if (Object.keys(found).length) { requestAnimationFrame(() => firstError.current?.scrollIntoView({ behavior: "smooth", block: "center" })); return; } setSubmitting(true); start(); router.push(buildDealsResultsUrl(search)); };
  const errorBlock = (product: DealsProduct) => errors[product] ? <div ref={firstError} role="alert" aria-live="polite" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{Object.values(errors[product] ?? {}).map(t).join(" ")}</div> : null;
  const travelersPicker = <div className="w-full space-y-4">
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {([
        ["adults", t("adults"), t("adultAgeRange"), draftAdults, 1],
        ["children", t("children"), t("childAgeRange"), draftChildren, 0],
        ["infants", t("infantsOnLap"), t("under2"), draftInfants, 0],
      ] as const).map(([key, rowLabel, description, count, minimum]) => {
        const total = draftAdults + draftChildren + draftInfants; const canDecrease = count > minimum; const canIncrease = total < 9 && (key !== "infants" || draftInfants < draftAdults);
        const ariaName = (translationKey: string) => t(translationKey).replace("{{label}}", rowLabel);
        return <div key={key} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0">
          <span className="min-w-0"><span className="block font-extrabold text-slate-950">{rowLabel}</span><span className="block text-xs font-medium text-slate-500">{description}</span></span>
          <span className="flex shrink-0 items-center gap-2">
            <button type="button" aria-label={ariaName("deals.decreaseCountAria")} disabled={!canDecrease} onClick={() => { if (key === "adults") { const adults = Math.max(1, draftAdults - 1); setDraftAdults(adults); setDraftInfants((current) => Math.min(current, adults)); } else if (key === "children") setDraftChildren((current) => Math.max(0, current - 1)); else setDraftInfants((current) => Math.max(0, current - 1)); }} className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 hover:border-[#004BB8] hover:text-[#004BB8] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300 sm:h-10 sm:w-10"><Minus className="h-4 w-4" aria-hidden="true" /></button>
            <span className="min-w-7 text-center font-extrabold tabular-nums text-slate-950">{count}</span>
            <button type="button" aria-label={ariaName("deals.increaseCountAria")} disabled={!canIncrease} onClick={() => { if (total >= 9) return; if (key === "adults") setDraftAdults((current) => current + 1); else if (key === "children") setDraftChildren((current) => current + 1); else if (draftInfants < draftAdults) setDraftInfants((current) => current + 1); }} className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 hover:border-[#004BB8] hover:text-[#004BB8] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300 sm:h-10 sm:w-10"><Plus className="h-4 w-4" aria-hidden="true" /></button>
          </span>
        </div>;
      })}
    </div>
    <div><p className="mb-2 text-xs font-extrabold uppercase tracking-[0.1em] text-slate-600">{t("cabinClass")}</p><div className="grid grid-cols-3 gap-2">{(["economy", "business", "first"] as const).map((cabin) => <button key={cabin} type="button" aria-pressed={draftCabin === cabin} onClick={() => setDraftCabin(cabin)} className={`focus-ring min-h-11 rounded-xl border px-2 text-sm font-bold transition-colors ${draftCabin === cabin ? "border-[#004BB8] bg-[#004BB8] text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-[#004BB8] hover:text-[#004BB8]"}`}>{t(cabin)}</button>)}</div></div>
  </div>;
  const hotelGuestsPicker = <div className="w-full space-y-4">
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {([
        ["adults", t("adults"), t("adultAgeRange"), draftHotelAdults, 1],
        ["children", t("children"), t("childAgeRange"), draftHotelChildren, 0],
        ["rooms", t("rooms"), t("hotelRoomsHelper"), draftHotelRooms, 1],
      ] as const).map(([key, rowLabel, description, count, minimum]) => {
        const canDecrease = count > minimum; const canIncrease = key === "rooms" ? count < 6 : draftHotelAdults + draftHotelChildren < 12;
        const ariaName = (translationKey: string) => t(translationKey).replace("{{label}}", rowLabel);
        return <div key={key} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0">
          <span className="min-w-0"><span className="block font-extrabold text-slate-950">{rowLabel}</span><span className="block text-xs font-medium text-slate-500">{description}</span></span>
          <span className="flex shrink-0 items-center gap-2">
            <button type="button" aria-label={ariaName("deals.decreaseCountAria")} disabled={!canDecrease} onClick={() => { if (key === "adults") setDraftHotelAdults((current) => Math.max(1, current - 1)); else if (key === "children") setDraftHotelChildren((current) => Math.max(0, current - 1)); else setDraftHotelRooms((current) => Math.max(1, current - 1)); }} className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 hover:border-[#004BB8] hover:text-[#004BB8] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300 sm:h-10 sm:w-10"><Minus className="h-4 w-4" aria-hidden="true" /></button>
            <span className="min-w-7 text-center font-extrabold tabular-nums text-slate-950">{count}</span>
            <button type="button" aria-label={ariaName("deals.increaseCountAria")} disabled={!canIncrease} onClick={() => { if (!canIncrease) return; if (key === "adults") setDraftHotelAdults((current) => current + 1); else if (key === "children") setDraftHotelChildren((current) => current + 1); else setDraftHotelRooms((current) => current + 1); }} className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 hover:border-[#004BB8] hover:text-[#004BB8] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300 sm:h-10 sm:w-10"><Plus className="h-4 w-4" aria-hidden="true" /></button>
          </span>
        </div>;
      })}
    </div>
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
      <span className="min-w-0"><span className="block font-extrabold text-slate-950">{t("petFriendly")}</span><span className="block text-xs font-medium text-slate-500">{t("onlyShowPetFriendlyStays")}</span></span>
      <input type="checkbox" checked={draftHotelPetFriendly} onChange={(event) => setDraftHotelPetFriendly(event.target.checked)} className="focus-ring h-6 w-6 shrink-0 rounded border-slate-300 text-[#004BB8]" />
    </label>
  </div>;

  const renderFlightDatesCalendar = (mobile = false) => {
    const draftDeparture = parseIsoDate(draftFlightDepartureDate); const draftReturn = parseIsoDate(draftFlightReturnDate);
    const renderMonth = (monthDate: Date) => <section key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`} aria-label={formatFlightsMonthHeading(monthDate, calendarLocale)} className="min-w-0">
      <h3 className={`${mobile ? "mb-1 text-start text-[17px] font-bold" : "mb-2.5 text-center text-sm font-medium"} text-slate-950`}>{formatFlightsMonthHeading(monthDate, calendarLocale)}</h3>
      <div className={`grid grid-cols-7 text-center font-semibold text-slate-500 ${mobile ? "text-xs" : "mb-1.5 text-[10px]"}`}>{weekdays.map((weekday, index) => <span key={`${weekday}-${index}`} className="py-2">{weekday}</span>)}</div>
      <div className={`grid grid-cols-7 ${mobile ? "gap-y-1.5" : "gap-y-0.5"}`}>{buildMonthCells(monthDate).map(({ date, isCurrentMonth }) => { const iso = toIsoDate(date); if (!isCurrentMonth) return <span key={iso} aria-hidden="true" className={mobile ? "h-11" : "h-10"} />; const disabled = isBeforeToday(date); const departure = iso === draftFlightDepartureDate; const returning = search.flightTripType === "round-trip" && iso === draftFlightReturnDate; const inRange = search.flightTripType === "round-trip" && Boolean(draftDeparture && draftReturn && date > draftDeparture && date < draftReturn && !disabled); const today = iso === toIsoDate(todayLocal); return <button key={iso} type="button" aria-label={`${t("selectDateAriaPrefix")} ${accessibleDateFormatter.format(date)}`} aria-pressed={departure || returning} aria-disabled={disabled} disabled={disabled} onClick={() => selectDraftFlightDate(date)} className={`focus-ring relative mx-auto flex items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed ${mobile ? "h-11 w-full max-w-11 text-[15px] font-semibold" : "h-10 w-10 text-sm font-medium"} ${disabled ? "text-slate-300" : "text-slate-800 hover:bg-[#004BB8]/10 hover:text-[#004BB8]"} ${today && !disabled ? "ring-1 ring-inset ring-[#004BB8]/20" : ""} ${inRange ? "bg-[#004BB8]/10 text-[#021C2B]" : ""} ${departure || returning ? "bg-[#004BB8] text-white ring-0 hover:bg-[#004BB8] hover:text-white" : ""}`}>{date.getDate()}{today && !departure && !returning && <span aria-hidden="true" className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[#004BB8]" />}</button>; })}</div>
    </section>;
    if (mobile) return <div className="mx-auto w-full max-w-xl space-y-8 pb-2">{Array.from({ length: 12 }, (_, offset) => renderMonth(addMonths(todayLocal, offset)))}</div>;
    return <div className="mx-auto w-full max-w-2xl"><div className="mb-3 flex items-center justify-between gap-3"><button type="button" aria-label={t("previousMonth")} onClick={() => setVisibleFlightMonth((month) => addMonths(month, -1))} className="focus-ring rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:text-[#004BB8]">{t("previousMonthShort")}</button><button type="button" aria-label={t("nextMonth")} onClick={() => setVisibleFlightMonth((month) => addMonths(month, 1))} className="focus-ring rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:text-[#004BB8]">{t("nextMonthShort")}</button></div><div className="grid grid-cols-1 gap-5 min-[700px]:grid-cols-2">{[0, 1].map((offset) => renderMonth(addMonths(visibleFlightMonth, offset)))}</div></div>;
  };

  const renderHotelDatesCalendar = (mobile = false) => {
    const draftCheckIn = parseIsoDate(draftHotelCheckIn); const draftCheckOut = parseIsoDate(draftHotelCheckOut);
    const renderMonth = (monthDate: Date) => <section key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`} aria-label={monthDate.toLocaleDateString(hotelCalendarLocale, { month: "long", year: "numeric" })} className="min-w-0">
      <h3 className={`${mobile ? "mb-1 text-start text-[17px] font-bold" : "mb-2.5 text-center text-sm font-medium"} text-slate-950`}>{monthDate.toLocaleDateString(hotelCalendarLocale, { month: "long", year: "numeric" })}</h3>
      <div className={`grid grid-cols-7 text-center font-semibold text-slate-500 ${mobile ? "text-xs" : "mb-1.5 text-[10px]"}`}>{hotelWeekdays.map((weekday, index) => <span key={`${weekday}-${index}`} className="py-2">{weekday}</span>)}</div>
      <div className={`grid grid-cols-7 ${mobile ? "gap-y-1.5" : "gap-y-0.5"}`}>{buildMonthCells(monthDate).map(({ date, isCurrentMonth }) => { const iso = toIsoDate(date); if (!isCurrentMonth) return <span key={iso} aria-hidden="true" className={mobile ? "h-11" : "h-10"} />; const disabled = isBeforeToday(date); const checkIn = iso === draftHotelCheckIn; const checkOut = iso === draftHotelCheckOut; const inRange = Boolean(draftCheckIn && draftCheckOut && date > draftCheckIn && date < draftCheckOut && !disabled); const today = iso === toIsoDate(todayLocal); return <button key={iso} type="button" aria-label={`${t("hotelResults.selectDateAriaPrefix")} ${hotelAccessibleDateFormatter.format(date)}`} aria-pressed={checkIn || checkOut} aria-disabled={disabled} disabled={disabled} onClick={() => selectDraftHotelDate(date)} className={`focus-ring relative mx-auto flex items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed ${mobile ? "h-11 w-full max-w-11 text-[15px] font-semibold" : "h-10 w-10 text-sm font-medium"} ${disabled ? "text-slate-300" : "text-slate-800 hover:bg-[#004BB8]/10 hover:text-[#004BB8]"} ${today && !disabled ? "ring-1 ring-inset ring-[#004BB8]/20" : ""} ${inRange ? "bg-[#004BB8]/10 text-[#021C2B]" : ""} ${checkIn || checkOut ? "bg-[#004BB8] text-white ring-0 hover:bg-[#004BB8] hover:text-white" : ""}`}>{date.getDate()}{today && !checkIn && !checkOut && <span aria-hidden="true" className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[#004BB8]" />}</button>; })}</div>
    </section>;
    if (mobile) return <div className="mx-auto w-full max-w-xl space-y-8 pb-2">{Array.from({ length: 12 }, (_, offset) => renderMonth(addMonths(todayLocal, offset)))}</div>;
    return <div className="mx-auto w-full max-w-2xl"><div className="mb-3 flex items-center justify-between gap-3"><button type="button" aria-label={t("previousMonth")} onClick={() => setVisibleHotelMonth((month) => addMonths(month, -1))} className="focus-ring rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:text-[#004BB8]">{t("previousMonthShort")}</button><button type="button" aria-label={t("nextMonth")} onClick={() => setVisibleHotelMonth((month) => addMonths(month, 1))} className="focus-ring rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:text-[#004BB8]">{t("nextMonthShort")}</button></div><div className="grid grid-cols-1 gap-5 min-[700px]:grid-cols-2">{[0, 1].map((offset) => renderMonth(addMonths(visibleHotelMonth, offset)))}</div></div>;
  };

  const renderCarDatesCalendar = (mobile = false) => {
    const pickup = parseIsoDate(draftCarPickupDate); const returning = parseIsoDate(draftCarReturnDate);
    const renderMonth = (monthDate: Date) => <section key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`} aria-label={monthDate.toLocaleDateString(carIntlLocale, { month: "long", year: "numeric" })} className="min-w-0"><h3 className={`${mobile ? "mb-1 text-start text-[17px] font-bold" : "mb-2 text-center text-sm font-semibold"} text-slate-950`}>{monthDate.toLocaleDateString(carIntlLocale, { month: "long", year: "numeric" })}</h3><div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500">{carWeekdays.map((weekday, index) => <span key={`${weekday}-${index}`} className="py-2">{weekday}</span>)}</div><div className="grid grid-cols-7 gap-y-1">{buildMonthCells(monthDate).map(({ date, isCurrentMonth }) => { const iso = toIsoDate(date); if (!isCurrentMonth) return <span key={iso} aria-hidden="true" className={mobile ? "h-11" : "h-9"} />; const disabled = isBeforeToday(date); const isPickup = iso === draftCarPickupDate; const isReturn = iso === draftCarReturnDate; const inRange = Boolean(pickup && returning && date > pickup && date < returning && !disabled); return <button key={iso} type="button" aria-label={`${t("carsSearch.selectDateAriaPrefix")} ${carAccessibleDateFormatter.format(date)}`} aria-pressed={isPickup || isReturn} aria-disabled={disabled} disabled={disabled} onClick={() => selectDraftCarDate(date)} className={`focus-ring mx-auto flex items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed ${mobile ? "h-11 w-full max-w-11 text-[15px] font-semibold" : "h-9 w-9 text-sm"} ${disabled ? "text-slate-300" : "text-slate-800 hover:bg-[#004BB8]/10"} ${inRange ? "rounded-lg bg-[#004BB8]/10" : ""} ${isPickup || isReturn ? "bg-[#004BB8] text-white hover:bg-[#004BB8]" : ""}`}>{date.getDate()}</button>; })}</div></section>;
    return <div className="min-w-0"><div className="mb-3 flex items-center justify-between gap-2"><button type="button" aria-label={t("carsSearch.previousMonth")} onClick={() => setVisibleCarMonth((month) => addMonths(month, -1))} className="focus-ring min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold">{t("carsSearch.previousMonthShort")}</button><button type="button" aria-label={t("carsSearch.nextMonth")} onClick={() => setVisibleCarMonth((month) => addMonths(month, 1))} className="focus-ring min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold">{t("carsSearch.nextMonthShort")}</button></div><div className={`grid min-w-0 grid-cols-1 gap-6 ${mobile ? "" : "min-[560px]:grid-cols-2"}`}>{[0, 1].map((offset) => renderMonth(addMonths(visibleCarMonth, offset)))}</div></div>;
  };
  const renderCarTimePicker = (mobile = false) => <div className={`grid min-w-0 ${mobile ? "gap-6" : "gap-3"}`}>{(["pickup", "return"] as const).map((kind) => { const value = kind === "pickup" ? draftCarPickupTime : draftCarReturnTime; const setValue = kind === "pickup" ? setDraftCarPickupTime : setDraftCarReturnTime; return <section key={kind} className="min-w-0"><label className={label} htmlFor={mobile ? undefined : `deals-car-${kind}-time`}>{t(kind === "pickup" ? "carsSearch.pickupTimeLabel" : "carsSearch.returnTimeLabel")}</label>{mobile ? <div className="max-h-[36dvh] overflow-y-auto rounded-2xl border border-slate-200 p-1">{timeOptions.map((time) => <button key={time} type="button" onClick={() => setValue(time)} className={`focus-ring flex min-h-11 w-full items-center justify-between rounded-xl px-4 text-start text-sm font-bold ${value === time ? "bg-[#004BB8] text-white" : "text-slate-800 hover:bg-slate-50"}`}>{formatCarTimeLabel(time, carIntlLocale)}{value === time ? <span aria-hidden="true">✓</span> : null}</button>)}</div> : <select id={`deals-car-${kind}-time`} value={value} onChange={(event) => setValue(event.target.value)} className={field}>{timeOptions.map((time) => <option key={time} value={time}>{formatCarTimeLabel(time, carIntlLocale)}</option>)}</select>}</section>; })}{invalidSameDayCarTimes ? <p role="alert" className="text-sm font-semibold text-rose-600">{t("carsSearch.error.sameDayDropoffAfterPickup")}</p> : null}</div>;

  const flightSuggestionContent = (kind: "origin" | "destination") => {
    const query = (kind === "origin" ? search.flightOriginText : search.flightDestinationText).trim(); const loading = kind === "origin" ? flightOriginLoading : flightDestinationLoading; const options = airportLists[kind]; const highlight = kind === "origin" ? flightOriginHighlight : flightDestinationHighlight; const setHighlight = kind === "origin" ? setFlightOriginHighlight : setFlightDestinationHighlight;
    if (query.length < 2) return <p className="px-4 py-6 text-center text-sm font-medium text-slate-500">{t("startTypingCityAirportOrCode")}</p>;
    if (loading) return <p className="px-4 py-6 text-center text-sm font-medium text-slate-500">{t("searchingAirportsAndCities")}</p>;
    if (!options.length) return <p className="px-4 py-6 text-center text-sm font-medium text-slate-500">{t("noMatchingAirportsOrCities")}</p>;
    return <ul id={`deals-flight-${kind}-listbox`} role="listbox" className="divide-y divide-slate-100">{options.map((option, index) => <li key={`${option.code}-${index}`} role="presentation"><button id={`deals-flight-${kind}-option-${index}`} type="button" role="option" aria-selected={highlight === index} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setHighlight(index)} onClick={() => chooseAirport(kind, option)} className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-start transition-colors ${highlight === index ? "bg-blue-50" : "hover:bg-slate-50"}`}><MapPin className="h-5 w-5 shrink-0 text-[#004BB8]" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold text-slate-950">{getLocalizedCityName(option.city, locale)}</span><span className="block truncate text-xs font-medium text-slate-500">{option.name}{getLocalizedAirportCountryName(option, locale) ? ` · ${getLocalizedAirportCountryName(option, locale)}` : ""}</span></span><span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{option.code.toUpperCase()}</span></button></li>)}</ul>;
  };
  const handleFlightKey = (kind: "origin" | "destination", event: React.KeyboardEvent<HTMLInputElement>) => {
    const options = airportLists[kind]; const open = kind === "origin" ? flightOriginOpen : flightDestinationOpen; const highlight = kind === "origin" ? flightOriginHighlight : flightDestinationHighlight; const setHighlight = kind === "origin" ? setFlightOriginHighlight : setFlightDestinationHighlight;
    if (event.key === "Escape") { if (kind === "origin") setFlightOriginOpen(false); else setFlightDestinationOpen(false); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); openFlightAirport(kind); if (options.length) setHighlight((highlight + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length); return; }
    if (event.key === "Enter" && open && options[highlight]) { event.preventDefault(); chooseAirport(kind, options[highlight]); }
  };
  const hotelSuggestionContent = <>{hotelDestinationLoading ? <p className="px-4 py-6 text-center text-sm font-medium text-slate-500">{t("findingDestinations")}</p> : hotelSuggestions.length ? <ul id="deals-hotel-destination-listbox" role="listbox" className="divide-y divide-slate-100">{hotelSuggestions.map((option, index) => <li key={option.id} role="presentation"><button id={`deals-hotel-destination-option-${index}`} type="button" role="option" aria-selected={hotelDestinationHighlight === index} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setHotelDestinationHighlight(index)} onClick={() => { dirty.current.hotelDestination = true; update("hotelDestination", option.searchValue); setHotelDestinationOpen(false); setHotelDestinationHighlight(0); }} className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-start ${hotelDestinationHighlight === index ? "bg-blue-50" : "hover:bg-slate-50"}`}><span className="min-w-0"><span className="block truncate text-sm font-extrabold text-slate-950">{getLocalizedHotelDestinationCityName(option.name, locale)}</span><span className="block truncate text-xs font-medium text-slate-500">{getLocalizedHotelDestinationDetail({ ...option, countryCode: option.countryCode ?? "" }, locale)}</span></span>{option.kind ? <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600">{t(`hotelDestinationKind.${option.kind}`)}</span> : null}</button></li>)}</ul> : <p className="px-4 py-6 text-center text-sm font-medium text-slate-500">{search.hotelDestination.trim() ? t("noMatchingDestinationsYet") : t("searchCityAreaLandmark")}</p>}</>;
  const searchDealsButton = <button type="submit" disabled={submitting} aria-busy={submitting} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#004BB8] px-8 text-sm font-extrabold text-white shadow-lg shadow-blue-900/20 hover:bg-[#021C2B] disabled:opacity-70 sm:w-auto"><Search className="h-4 w-4" />{t("deals.searchButton")}</button>;

  return <form onSubmit={submit} noValidate className="mx-auto w-full max-w-[1120px] rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_18px_46px_rgba(15,23,42,0.12)] sm:px-6 sm:py-4 lg:py-3">
    <fieldset><legend className="sr-only">{t("deals.packageLegend")}</legend><div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-3 sm:pb-2">{dealsPackageModes.map((mode) => <label key={mode} className={`shrink-0 cursor-pointer rounded-full border px-4 py-2 text-sm font-extrabold ${search.mode === mode ? "border-[#004BB8] bg-[#004BB8]/10 text-[#004BB8]" : "border-slate-200 text-slate-700"}`}><input className="sr-only" type="radio" name="packageMode" checked={search.mode === mode} onChange={() => update("mode", mode)} />{t(modeKeys[mode])}</label>)}</div></fieldset>
    {included.flight && <section aria-labelledby="deals-flight-heading" className="border-t border-slate-200 py-4 sm:py-3 lg:py-2"><div><h2 id="deals-flight-heading" className="mb-0.5 flex items-center gap-2 text-base font-extrabold text-[#021C2B]"><Plane className="h-5 w-5 text-[#004BB8]" />{t("flights")}</h2><div role="radiogroup" aria-label={t("tripType")} className="mb-1 inline-flex items-center gap-3 rounded-lg px-0.5 py-1 sm:gap-1 sm:rounded-full sm:bg-transparent sm:p-0.5">{(["round-trip", "one-way"] as const).map((value) => <button key={value} type="button" role="radio" aria-checked={search.flightTripType === value} onClick={() => setDealsFlightTripType(value)} onKeyDown={(event) => { if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key)) return; event.preventDefault(); setDealsFlightTripType(value === "round-trip" ? "one-way" : "round-trip"); }} className={`focus-ring group inline-flex min-h-8 items-center gap-2 rounded-lg px-1.5 py-1 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100/70 hover:text-slate-950 sm:min-h-9 sm:flex-none sm:justify-center sm:px-3.5 sm:py-2 sm:font-bold ${search.flightTripType === value ? "bg-[#004BB8]/8 text-[#004BB8] ring-1 ring-[#004BB8]/10 sm:bg-[#004BB8]/8 sm:text-[#004BB8] sm:shadow-none" : ""}`}><span aria-hidden="true" className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border bg-white transition-colors ${search.flightTripType === value ? "border-[#004BB8]" : "border-slate-300 group-hover:border-slate-400"}`}><span className={`h-1.5 w-1.5 rounded-full bg-[#004BB8] transition-opacity ${search.flightTripType === value ? "opacity-100" : "opacity-0"}`} /></span><span>{t(value === "round-trip" ? "roundTrip" : "oneWay")}</span></button>)}</div></div><div className={`${connectedShell} lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]`}>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] lg:items-stretch lg:gap-0 lg:border-e lg:border-slate-200">
        {(["origin", "destination"] as const).map((kind, index) => { const textKey = kind === "origin" ? "flightOriginText" : "flightDestinationText"; const codeKey = kind === "origin" ? "flightOriginCode" : "flightDestinationCode"; const open = kind === "origin" ? flightOriginOpen : flightDestinationOpen; const loading = kind === "origin" ? flightOriginLoading : flightDestinationLoading; const highlight = kind === "origin" ? flightOriginHighlight : flightDestinationHighlight; const wrapRef = kind === "origin" ? flightOriginWrapRef : flightDestinationWrapRef; const inputRef = kind === "origin" ? flightOriginInputRef : flightDestinationInputRef; const launcherRef = kind === "origin" ? flightOriginMobileLauncherRef : flightDestinationMobileLauncherRef; return <Fragment key={kind}><div ref={wrapRef} className={`${connectedSegment} sm:border-b sm:border-slate-200 lg:border-b-0 ${open ? "sm:z-20 sm:bg-[#004BB8]/8 sm:ring-1 sm:ring-inset sm:ring-[#004BB8]/20" : ""}`} data-deals-flight-destination={kind}><label className={label} htmlFor={`deals-flight-${kind}`}>{t(kind)}</label><div className="relative hidden sm:block"><input ref={inputRef} id={`deals-flight-${kind}`} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`deals-flight-${kind}-listbox`} aria-activedescendant={open && airportLists[kind][highlight] ? `deals-flight-${kind}-option-${highlight}` : undefined} value={search[textKey]} placeholder={t("cityOrAirport")} onFocus={() => openFlightAirport(kind)} onKeyDown={(event) => handleFlightKey(kind, event)} onChange={(event) => { const value = event.target.value; if (kind === "origin") flightOriginUserInteractedRef.current = true; openFlightAirport(kind); setSearch((current) => ({ ...current, [textKey]: value, [codeKey]: /^[a-z]{3}$/i.test(value.trim()) ? value.trim().toUpperCase() : "" })); if (kind === "origin") setFlightOriginHighlight(0); else setFlightDestinationHighlight(0); if (value.trim().length < 2) setAirportLists((all) => ({ ...all, [kind]: [] })); }} className={`${field} ${connectedField} pe-10`} autoComplete="off" />{search[textKey] ? <button type="button" aria-label={t("clear")} onMouseDown={(event) => event.preventDefault()} onClick={() => { if (kind === "origin") flightOriginUserInteractedRef.current = true; setSearch((current) => ({ ...current, [textKey]: "", [codeKey]: "" })); setAirportLists((all) => ({ ...all, [kind]: [] })); if (kind === "origin") { setFlightOriginLoading(false); setFlightOriginHighlight(0); } else { setFlightDestinationLoading(false); setFlightDestinationHighlight(0); } inputRef.current?.focus(); }} className="focus-ring absolute end-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" aria-hidden="true" /></button> : null}</div><button ref={launcherRef} type="button" aria-haspopup="dialog" aria-expanded={flightMobileAirport === kind} onClick={() => openFlightAirport(kind, true)} className={`${field} flex items-center justify-between gap-2 text-start sm:hidden`}><span className={`min-w-0 truncate ${search[textKey] ? "text-slate-900" : "text-slate-400"}`}>{search[textKey] || t("cityOrAirport")}</span><ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" /></button><DealsDestinationPopover open={open} anchorRef={wrapRef} width={390} marker={`flight-${kind}`}>{flightSuggestionContent(kind)}</DealsDestinationPopover>{loading ? <span className="sr-only" aria-live="polite">{t("searchingAirportsAndCities")}</span> : null}</div>{index === 0 ? <div className="relative z-10 -my-2 flex h-4 items-center justify-center lg:my-0 lg:h-auto lg:before:absolute lg:before:left-1/2 lg:before:top-3 lg:before:h-[calc(100%-1.5rem)] lg:before:w-px lg:before:-translate-x-1/2 lg:before:bg-slate-200/90"><button type="button" onClick={swapDealsFlightAirports} aria-label={t("swapOriginDestination") || "Swap origin and destination"} className="focus-ring relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 focus-visible:border-[#004BB8] focus-visible:ring-2 focus-visible:ring-[#004BB8]/25 lg:text-[#004BB8] lg:shadow-[0_4px_12px_rgba(15,23,42,0.12)]"><ArrowRightLeft className="h-4 w-4" aria-hidden="true" /></button></div> : null}</Fragment>; })}
      </div>
      <div className={`${connectedSegment} sm:border-e sm:border-b sm:border-slate-200 lg:border-b-0 lg:last:border-e-0 ${flightDatesOpen ? "sm:z-20 sm:bg-[#004BB8]/8 sm:ring-1 sm:ring-inset sm:ring-[#004BB8]/20" : ""}`}><span className={label}>{t("travelDates")}</span><button ref={flightDatesLauncherRef} type="button" aria-expanded={flightDatesOpen || mobileFlightDatesOpen} aria-haspopup="dialog" aria-controls={mobileFlightDatesOpen ? "deals-flight-mobile-dates" : "deals-flight-desktop-dates"} aria-label={t("chooseTravelDates")} onClick={() => flightDatesOpen ? dismissDesktopFlightDates(true) : openFlightDates()} className={`${field} ${connectedField} flex items-center justify-between gap-2 text-start`}><span className="min-w-0 truncate">{flightDatesSummary}</span><Calendar aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" /></button></div>
      <div className={`${connectedSegment} sm:border-e sm:border-b sm:border-slate-200 lg:border-b-0 lg:last:border-e-0 ${travelersOpen ? "sm:z-20 sm:bg-[#004BB8]/8 sm:ring-1 sm:ring-inset sm:ring-[#004BB8]/20" : ""}`}><span className={label}>{t("deals.travelersCabinLabel")}</span><button ref={travelersLauncherRef} type="button" aria-expanded={travelersOpen || mobileTravelersOpen} aria-haspopup="dialog" aria-controls={mobileTravelersOpen ? "deals-flight-mobile-travelers" : "deals-flight-desktop-travelers"} onClick={() => travelersOpen ? dismissDesktopTravelers() : openTravelers()} className={`${field} ${connectedField} flex items-center justify-between gap-2 text-start`}><span className="min-w-0 truncate">{travelerSummary}</span><ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${travelersOpen || mobileTravelersOpen ? "rotate-180" : ""}`} /></button></div>
    </div>{errorBlock("flight")}</section>}
    {included.hotel && <section aria-labelledby="deals-hotel-heading" className="border-t border-slate-200 py-4 sm:py-3 lg:py-2"><h2 id="deals-hotel-heading" className="mb-2 flex items-center gap-2 text-base font-extrabold text-[#021C2B] lg:mb-1"><BedDouble className="h-5 w-5 text-[#004BB8]" />{t("hotels")}</h2><div className={`${connectedShell} sm:grid-cols-2 lg:grid-cols-3`}><div ref={hotelDestinationWrapRef} className={`${connectedSegment} sm:border-e sm:border-b sm:border-slate-200 lg:border-b-0 ${hotelDestinationOpen ? "sm:z-20 sm:bg-[#004BB8]/8 sm:ring-1 sm:ring-inset sm:ring-[#004BB8]/20" : ""}`} data-deals-hotel-destination><label className={label} htmlFor="deals-hotel-destination">{t("hotelSearchDestinationLabel")}</label><div className="relative hidden sm:block"><input ref={hotelDestinationInputRef} id="deals-hotel-destination" role="combobox" aria-autocomplete="list" aria-controls="deals-hotel-destination-listbox" aria-expanded={hotelDestinationOpen} aria-activedescendant={hotelDestinationOpen && hotelSuggestions[hotelDestinationHighlight] ? `deals-hotel-destination-option-${hotelDestinationHighlight}` : undefined} value={search.hotelDestination} placeholder={t("hotelSearchDestinationPlaceholder")} onFocus={() => openHotelDestination()} onChange={(event) => { dirty.current.hotelDestination = true; update("hotelDestination", event.target.value); setHotelDestinationHighlight(0); openHotelDestination(); }} onKeyDown={(event) => { if (event.key === "Escape") return setHotelDestinationOpen(false); if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); openHotelDestination(); if (hotelSuggestions.length) setHotelDestinationHighlight((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + hotelSuggestions.length) % hotelSuggestions.length); } else if (event.key === "Enter" && hotelDestinationOpen && hotelSuggestions[hotelDestinationHighlight]) { event.preventDefault(); const option = hotelSuggestions[hotelDestinationHighlight]; dirty.current.hotelDestination = true; update("hotelDestination", option.searchValue); setHotelDestinationOpen(false); setHotelDestinationHighlight(0); } }} className={`${field} ${connectedField} pe-10`} autoComplete="off" />{search.hotelDestination ? <button type="button" aria-label={t("clearDestination")} onMouseDown={(event) => event.preventDefault()} onClick={() => { dirty.current.hotelDestination = true; update("hotelDestination", ""); setHotelSuggestions([]); setHotelDestinationLoading(false); setHotelDestinationHighlight(0); hotelDestinationInputRef.current?.focus(); }} className="focus-ring absolute end-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" aria-hidden="true" /></button> : null}</div><button ref={hotelDestinationMobileLauncherRef} type="button" aria-haspopup="dialog" aria-expanded={hotelDestinationMobileOpen} onClick={() => openHotelDestination(true)} className={`${field} flex items-center justify-between gap-2 text-start sm:hidden`}><span className={`min-w-0 truncate ${search.hotelDestination ? "text-slate-900" : "text-slate-400"}`}>{search.hotelDestination || t("hotelSearchDestinationPlaceholder")}</span><ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" /></button><DealsDestinationPopover open={hotelDestinationOpen} anchorRef={hotelDestinationWrapRef} width={436} marker="hotel">{hotelSuggestionContent}</DealsDestinationPopover></div><div className={`${connectedSegment} sm:border-e sm:border-b sm:border-slate-200 lg:border-b-0 lg:last:border-e-0 ${hotelDatesOpen ? "sm:z-20 sm:bg-[#004BB8]/8 sm:ring-1 sm:ring-inset sm:ring-[#004BB8]/20" : ""}`}><span className={label}>{t("hotelSearchTravelDatesLabel")}</span><button ref={hotelDatesLauncherRef} type="button" aria-expanded={hotelDatesOpen || mobileHotelDatesOpen} aria-haspopup="dialog" aria-controls={mobileHotelDatesOpen ? "deals-hotel-mobile-dates" : "deals-hotel-desktop-dates"} aria-label={t("chooseTravelDates")} onClick={() => hotelDatesOpen ? dismissDesktopHotelDates(true) : openHotelDates()} className={`${field} ${connectedField} flex items-center justify-between gap-2 text-start`}><span className="min-w-0 truncate">{hotelDatesSummary}</span><Calendar aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" /></button></div><div className={`${connectedSegment} sm:border-e sm:border-b sm:border-slate-200 lg:border-b-0 lg:last:border-e-0 ${hotelGuestsOpen ? "sm:z-20 sm:bg-[#004BB8]/8 sm:ring-1 sm:ring-inset sm:ring-[#004BB8]/20" : ""}`}><span className={label}>{t("hotelSearchGuestsLabel")}</span><button ref={hotelGuestsLauncherRef} type="button" aria-expanded={hotelGuestsOpen || mobileHotelGuestsOpen} aria-haspopup="dialog" aria-controls={mobileHotelGuestsOpen ? "deals-hotel-mobile-guests" : "deals-hotel-desktop-guests"} aria-label={t("chooseGuestsAndRooms")} onClick={() => hotelGuestsOpen ? dismissDesktopHotelGuests(true) : openHotelGuests()} className={`${field} ${connectedField} flex items-center justify-between gap-2 text-start`}><span className="min-w-0 truncate">{hotelGuestsSummary}</span><ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${hotelGuestsOpen || mobileHotelGuestsOpen ? "rotate-180" : ""}`} /></button></div></div>{errorBlock("hotel")}</section>}
    {included.car && <section aria-labelledby="deals-car-heading" className="border-t border-slate-200 py-4 sm:py-3 lg:py-2">
      <h2 id="deals-car-heading" className="mb-2 flex items-center gap-2 text-base font-extrabold text-[#021C2B] lg:mb-1"><Car className="h-5 w-5 text-[#004BB8]" />{t("cars")}</h2>
      <div className={`${connectedShell} sm:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.8fr)]`}>
        <div className={`${connectedSegment} rounded-xl border border-slate-200 bg-slate-50/50 p-3 sm:rounded-none sm:border-0 sm:border-e sm:border-b sm:border-slate-200 sm:bg-transparent sm:px-4 sm:py-2 lg:border-b-0`}>
          <span className={label}>{t("carsSearch.pickupLocationLabel")}</span>
          <div className="relative hidden sm:block"><input ref={carPickupLocationRef} aria-label={t("carsSearch.pickupLocationLabel")} value={search.carPickupLocation} placeholder={t("carsSearch.pickupLocationPlaceholder")} autoComplete="off" onChange={(event) => { dirty.current.carLocation = true; update("carPickupLocation", event.target.value); }} className={`${field} ${connectedField} truncate pe-10`} />{search.carPickupLocation ? <button type="button" aria-label={t("carsSearch.clearPickupLocation")} onMouseDown={(event) => event.preventDefault()} onClick={() => { dirty.current.carLocation = true; update("carPickupLocation", ""); carPickupLocationRef.current?.focus(); }} className="focus-ring absolute end-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" aria-hidden="true" /></button> : null}</div>
          <button ref={carPickupLocationLauncherRef} type="button" aria-haspopup="dialog" aria-expanded={mobileCarLocation === "pickup"} onClick={() => openCarLocation("pickup")} className={`${field} flex items-center justify-between gap-2 text-start sm:hidden`}><span className={`min-w-0 truncate ${search.carPickupLocation ? "text-slate-900" : "text-slate-400"}`}>{search.carPickupLocation || t("carsSearch.pickupLocationPlaceholder")}</span><ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" /></button>
          {search.carReturnToDifferentLocation ? <div className="mt-2 border-t border-slate-200 pt-2"><div className="relative hidden sm:block"><input ref={carReturnLocationRef} aria-label={t("carsSearch.returnLocationPlaceholder")} value={search.carReturnLocation} placeholder={t("carsSearch.returnLocationPlaceholder")} autoComplete="off" onChange={(event) => update("carReturnLocation", event.target.value)} className={`${field} ${connectedField} truncate pe-10`} />{search.carReturnLocation ? <button type="button" aria-label={t("carsSearch.clearReturnLocation")} onMouseDown={(event) => event.preventDefault()} onClick={() => { update("carReturnLocation", ""); carReturnLocationRef.current?.focus(); }} className="focus-ring absolute end-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" aria-hidden="true" /></button> : null}</div><button ref={carReturnLocationLauncherRef} type="button" aria-haspopup="dialog" aria-expanded={mobileCarLocation === "return"} onClick={() => openCarLocation("return")} className={`${field} flex items-center justify-between gap-2 text-start sm:hidden`}><span className={`min-w-0 truncate ${search.carReturnLocation ? "text-slate-900" : "text-slate-400"}`}>{search.carReturnLocation || t("carsSearch.returnLocationPlaceholder")}</span><ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" /></button></div> : <p className="mt-2 truncate border-t border-slate-200 pt-2 text-sm font-semibold text-slate-500">{t("carsSearch.returnToSameLocation")}</p>}
        </div>
        <div className={`${connectedSegment} sm:border-e sm:border-b sm:border-slate-200 lg:border-b-0 lg:last:border-e-0 ${carDatesOpen ? "sm:z-20 sm:bg-[#004BB8]/8 sm:ring-1 sm:ring-inset sm:ring-[#004BB8]/20" : ""}`}><span className={label}>{t("carsSearch.rentalDatesLabel")}</span><button ref={carDatesLauncherRef} type="button" aria-haspopup="dialog" aria-expanded={carDatesOpen || mobileCarDatesOpen} aria-controls={mobileCarDatesOpen ? "deals-car-mobile-dates" : "deals-car-desktop-dates"} aria-label={t("carsSearch.chooseRentalDatesAria")} onClick={() => carDatesOpen ? dismissCarDates(true) : openCarDates()} className={`${field} ${connectedField} flex items-center justify-between gap-2 text-start`}><span className="min-w-0 truncate">{carDatesSummary}</span><Calendar className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" /></button></div>
        <div className={`${connectedSegment} sm:border-e sm:border-b sm:border-slate-200 lg:border-b-0 lg:last:border-e-0 ${carTimesOpen ? "sm:z-20 sm:bg-[#004BB8]/8 sm:ring-1 sm:ring-inset sm:ring-[#004BB8]/20" : ""}`}><span className={label}>{t("carsSearch.pickupReturnTimeLabel")}</span><button ref={carTimesLauncherRef} type="button" aria-haspopup="dialog" aria-expanded={carTimesOpen || mobileCarTimesOpen} aria-controls={mobileCarTimesOpen ? "deals-car-mobile-times" : "deals-car-desktop-times"} aria-label={t("carsSearch.choosePickupReturnTimesAria")} onClick={() => carTimesOpen ? dismissCarTimes(true) : openCarTimes()} className={`${field} ${connectedField} flex items-center justify-between gap-2 text-start`}><span className="min-w-0 truncate">{carTimesSummary}</span><ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${carTimesOpen || mobileCarTimesOpen ? "rotate-180" : ""}`} aria-hidden="true" /></button></div>
        <div className={`${connectedSegment} sm:border-e sm:border-b sm:border-slate-200 lg:border-b-0 lg:last:border-e-0`}><span className={label}>{t("carsSearch.driverAgeLabel")}</span><select value={search.carDriverAge} onChange={(event) => update("carDriverAge", event.target.value)} aria-label={t("carsSearch.driverAgeLabel")} className={`${field} ${connectedField} hidden sm:block`}>{driverAgeOptions.map((age) => <option key={age} value={age}>{carDriverAgeLabel(age)}</option>)}</select><button ref={carDriverAgeLauncherRef} type="button" aria-haspopup="dialog" aria-expanded={mobileCarDriverAgeOpen} onClick={openCarDriverAge} className={`${field} flex items-center justify-between gap-2 text-start sm:hidden`}><span className="truncate">{carDriverAgeLabel(search.carDriverAge)}</span><ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" /></button></div>
      </div>
      {errorBlock("car")}
      <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800"><input type="checkbox" checked={search.carReturnToDifferentLocation} onChange={(event) => setSearch((current) => ({ ...current, carReturnToDifferentLocation: event.target.checked, ...event.target.checked ? {} : { carReturnLocation: "" } }))} className="focus-ring h-5 w-5 rounded border-slate-300 text-[#004BB8]" />{t("carsSearch.differentReturnLocation")}</label>
        <div className="flex justify-end">{searchDealsButton}</div>
      </div>
    </section>}
    {!included.car && <div className="flex justify-end border-t border-slate-200 pt-3">{searchDealsButton}</div>}
    {(["origin", "destination"] as const).map((kind) => { const textKey = kind === "origin" ? "flightOriginText" : "flightDestinationText"; const codeKey = kind === "origin" ? "flightOriginCode" : "flightDestinationCode"; const inputRef = kind === "origin" ? flightOriginMobileInputRef : flightDestinationMobileInputRef; const launcherRef = kind === "origin" ? flightOriginMobileLauncherRef : flightDestinationMobileLauncherRef; return <FlightMobilePickerShell key={kind} open={flightMobileAirport === kind} title={t(kind)} titleId={`deals-flight-mobile-${kind}-title`} launcherRef={launcherRef} onClose={() => setFlightMobileAirport(null)} contentClassName="px-4 py-5"><div className="space-y-4 overflow-x-hidden"><label className={label} htmlFor={`deals-flight-mobile-${kind}-input`}>{t(kind)}</label><div className="relative"><input ref={inputRef} id={`deals-flight-mobile-${kind}-input`} value={search[textKey]} placeholder={t("cityOrAirport")} autoComplete="off" onChange={(event) => { const value = event.target.value; if (kind === "origin") flightOriginUserInteractedRef.current = true; setSearch((current) => ({ ...current, [textKey]: value, [codeKey]: /^[a-z]{3}$/i.test(value.trim()) ? value.trim().toUpperCase() : "" })); if (kind === "origin") setFlightOriginHighlight(0); else setFlightDestinationHighlight(0); if (value.trim().length < 2) setAirportLists((all) => ({ ...all, [kind]: [] })); }} className={`${field} pe-10`} />{search[textKey] ? <button type="button" aria-label={t("clear")} onClick={() => { if (kind === "origin") flightOriginUserInteractedRef.current = true; setSearch((current) => ({ ...current, [textKey]: "", [codeKey]: "" })); setAirportLists((all) => ({ ...all, [kind]: [] })); inputRef.current?.focus(); }} className="focus-ring absolute end-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" aria-hidden="true" /></button> : null}</div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{flightSuggestionContent(kind)}</div></div></FlightMobilePickerShell>; })}
    <HotelDestinationMobilePicker open={hotelDestinationMobileOpen} value={search.hotelDestination} titleId="deals-hotel-mobile-destination-title" inputId="deals-hotel-mobile-destination-input" launcherRef={hotelDestinationMobileLauncherRef} onChange={(value) => { dirty.current.hotelDestination = true; update("hotelDestination", value); }} onClear={() => { dirty.current.hotelDestination = true; setHotelSuggestions([]); }} onClose={() => setHotelDestinationMobileOpen(false)} />
    <DealsFlightDatesPopover open={flightDatesOpen} anchorRef={flightDatesLauncherRef}><div id="deals-flight-desktop-dates" role="dialog" aria-modal="false" aria-label={t("chooseTravelDates")}>{renderFlightDatesCalendar()}<div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><button type="button" onClick={() => { setDraftFlightDepartureDate(""); setDraftFlightReturnDate(""); }} className="focus-ring min-h-10 rounded-xl px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-100">{t("clear")}</button><button type="button" disabled={!validDraftFlightRange} onClick={() => commitFlightDates()} className="focus-ring min-h-10 rounded-xl bg-[#004BB8] px-5 text-sm font-extrabold text-white hover:bg-[#021C2B] disabled:cursor-not-allowed disabled:opacity-50">{t("done")}</button></div></div></DealsFlightDatesPopover>
    <FlightMobilePickerShell open={mobileFlightDatesOpen} title={t("chooseTravelDates")} titleId="deals-flight-mobile-dates" launcherRef={flightDatesLauncherRef} onClose={closeMobileFlightDates} pickerMarker="flight-date" contentClassName="px-4 py-5" footer={(requestClose) => <div className="flex items-center justify-between"><button type="button" onClick={() => { setDraftFlightDepartureDate(""); setDraftFlightReturnDate(""); }} className="focus-ring min-h-11 rounded-xl px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-100">{t("clear")}</button><button type="button" disabled={!validDraftFlightRange} onClick={() => { commitFlightDates(true); requestClose(); }} className="focus-ring min-h-11 rounded-xl bg-[#004BB8] px-6 text-sm font-extrabold text-white hover:bg-[#021C2B] disabled:cursor-not-allowed disabled:opacity-50">{t("done")}</button></div>}>{renderFlightDatesCalendar(true)}</FlightMobilePickerShell>
    <DealsFlightPopover open={travelersOpen} anchorRef={travelersLauncherRef}><div id="deals-flight-desktop-travelers" role="dialog" aria-modal="false" aria-label={t("travelersCabinDialogLabel")}>{travelersPicker}<div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" onClick={() => commitTravelers()} className="focus-ring min-h-10 rounded-xl bg-[#004BB8] px-5 text-sm font-extrabold text-white hover:bg-[#021C2B]">{t("done")}</button></div></div></DealsFlightPopover>
    <FlightMobilePickerShell open={mobileTravelersOpen} title={t("travelersCabinDialogLabel")} titleId="deals-flight-mobile-travelers" launcherRef={travelersLauncherRef} onClose={closeMobileTravelers} pickerMarker="traveler-cabin" contentClassName="px-4 py-5" footer={(requestClose) => <div className="flex justify-end"><button type="button" onClick={() => { commitTravelers(true); requestClose(); }} className="focus-ring min-h-11 rounded-xl bg-[#004BB8] px-6 py-3 text-sm font-extrabold text-white hover:bg-[#021C2B]">{t("done")}</button></div>}>{travelersPicker}</FlightMobilePickerShell>
    <DealsHotelDatesPopover open={hotelDatesOpen} anchorRef={hotelDatesLauncherRef}><div id="deals-hotel-desktop-dates" role="dialog" aria-modal="false" aria-label={t("chooseTravelDates")}>{renderHotelDatesCalendar()}<div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><button type="button" onClick={() => { setDraftHotelCheckIn(""); setDraftHotelCheckOut(""); }} className="focus-ring min-h-10 rounded-xl px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-100">{t("clear")}</button><button type="button" disabled={!validDraftHotelRange} onClick={() => commitHotelDates()} className="focus-ring min-h-10 rounded-xl bg-[#004BB8] px-5 text-sm font-extrabold text-white hover:bg-[#021C2B] disabled:cursor-not-allowed disabled:opacity-50">{t("done")}</button></div></div></DealsHotelDatesPopover>
    <HotelMobilePickerShell open={mobileHotelDatesOpen} title={t("chooseTravelDates")} titleId="deals-hotel-mobile-dates" launcherRef={hotelDatesLauncherRef} onClose={closeMobileHotelDates} contentClassName="px-4 py-5" footer={(requestClose) => <div className="flex items-center justify-between"><button type="button" onClick={() => { setDraftHotelCheckIn(""); setDraftHotelCheckOut(""); }} className="focus-ring min-h-11 rounded-xl px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-100">{t("clear")}</button><button type="button" disabled={!validDraftHotelRange} onClick={() => { commitHotelDates(true); requestClose(); }} className="focus-ring min-h-11 rounded-xl bg-[#004BB8] px-6 text-sm font-extrabold text-white hover:bg-[#021C2B] disabled:cursor-not-allowed disabled:opacity-50">{t("done")}</button></div>}>{renderHotelDatesCalendar(true)}</HotelMobilePickerShell>
    <DealsHotelPopover open={hotelGuestsOpen} anchorRef={hotelGuestsLauncherRef}><div id="deals-hotel-desktop-guests" role="dialog" aria-modal="false" aria-label={t("guestsAndRooms")}>{hotelGuestsPicker}<div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" onClick={() => commitHotelGuests()} className="focus-ring min-h-10 rounded-xl bg-[#004BB8] px-5 text-sm font-extrabold text-white hover:bg-[#021C2B]">{t("done")}</button></div></div></DealsHotelPopover>
    <HotelMobilePickerShell open={mobileHotelGuestsOpen} title={t("guestsAndRooms")} titleId="deals-hotel-mobile-guests" launcherRef={hotelGuestsLauncherRef} onClose={closeMobileHotelGuests} contentClassName="px-4 py-5" footer={(requestClose) => <div className="flex justify-end"><button type="button" onClick={() => { commitHotelGuests(true); requestClose(); }} className="focus-ring min-h-11 rounded-xl bg-[#004BB8] px-6 py-3 text-sm font-extrabold text-white hover:bg-[#021C2B]">{t("done")}</button></div>}>{hotelGuestsPicker}</HotelMobilePickerShell>
    <DealsCarPopover open={carDatesOpen} anchorRef={carDatesLauncherRef} width={620} marker="dates"><div id="deals-car-desktop-dates" role="dialog" aria-modal="false" aria-label={t("carsSearch.rentalDatePickerAria")}><h3 className="mb-3 text-base font-extrabold text-slate-950">{t("carsSearch.chooseRentalDates")}</h3>{renderCarDatesCalendar()}<div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><button type="button" onClick={() => { setDraftCarPickupDate(""); setDraftCarReturnDate(""); }} className="focus-ring min-h-10 rounded-xl px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-100">{t("clear")}</button><button type="button" disabled={!validDraftCarRange} onClick={() => commitCarDates()} className="focus-ring min-h-10 rounded-xl bg-[#004BB8] px-5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50">{t("done")}</button></div></div></DealsCarPopover>
    <DealsCarPopover open={carTimesOpen} anchorRef={carTimesLauncherRef} width={320} marker="times"><div id="deals-car-desktop-times" role="dialog" aria-modal="false" aria-label={t("carsSearch.pickupReturnTimeSelectorAria")}>{renderCarTimePicker()}<div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" disabled={!validDraftCarTimes} onClick={() => commitCarTimes()} className="focus-ring min-h-10 rounded-xl bg-[#004BB8] px-5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50">{t("done")}</button></div></div></DealsCarPopover>
    {(["pickup", "return"] as const).map((kind) => { const pickup = kind === "pickup"; const launcherRef = pickup ? carPickupLocationLauncherRef : carReturnLocationLauncherRef; const inputRef = pickup ? carPickupMobileInputRef : carReturnMobileInputRef; const value = pickup ? search.carPickupLocation : search.carReturnLocation; const key = pickup ? "carPickupLocation" : "carReturnLocation"; const title = pickup ? t("carsSearch.pickupLocationLabel") : t("carsSearch.returnLocationPlaceholder"); return <FlightMobilePickerShell key={kind} open={mobileCarLocation === kind} title={title} titleId={`deals-car-mobile-${kind}-location`} launcherRef={launcherRef} onClose={() => { setMobileCarLocation(null); restoreCarFocus(launcherRef); }} contentClassName="px-4 py-5" footer={(requestClose) => <div className="flex items-center justify-between gap-3"><button type="button" onClick={() => { if (pickup) dirty.current.carLocation = true; update(key, ""); inputRef.current?.focus(); }} className="focus-ring min-h-11 rounded-xl px-4 text-sm font-extrabold text-slate-700">{t("clear")}</button><button type="button" onClick={requestClose} className="focus-ring min-h-11 rounded-xl bg-[#004BB8] px-6 text-sm font-extrabold text-white">{t("done")}</button></div>}><label className={label} htmlFor={`deals-car-mobile-${kind}-location-input`}>{title}</label><input ref={inputRef} id={`deals-car-mobile-${kind}-location-input`} value={value} placeholder={t(pickup ? "carsSearch.pickupLocationPlaceholder" : "carsSearch.returnLocationPlaceholder")} autoComplete="off" onChange={(event) => { if (pickup) dirty.current.carLocation = true; update(key, event.target.value); }} className={field} /></FlightMobilePickerShell>; })}
    <FlightMobilePickerShell open={mobileCarDatesOpen} title={t("carsSearch.chooseRentalDates")} titleId="deals-car-mobile-dates" launcherRef={carDatesLauncherRef} onClose={closeMobileCarDates} contentClassName="overflow-x-hidden px-4 py-5" footer={(requestClose) => <div className="flex items-center justify-between gap-3"><button type="button" onClick={() => { setDraftCarPickupDate(""); setDraftCarReturnDate(""); }} className="focus-ring min-h-11 rounded-xl px-4 text-sm font-extrabold text-slate-700">{t("clear")}</button><button type="button" disabled={!validDraftCarRange} onClick={() => { commitCarDates(true); requestClose(); }} className="focus-ring min-h-11 rounded-xl bg-[#004BB8] px-6 text-sm font-extrabold text-white disabled:opacity-50">{t("done")}</button></div>}>{renderCarDatesCalendar(true)}</FlightMobilePickerShell>
    <FlightMobilePickerShell open={mobileCarTimesOpen} title={t("carsSearch.pickupReturnTimeLabel")} titleId="deals-car-mobile-times" launcherRef={carTimesLauncherRef} onClose={closeMobileCarTimes} contentClassName="overflow-x-hidden px-4 py-5" footer={(requestClose) => <div className="flex justify-end"><button type="button" disabled={!validDraftCarTimes} onClick={() => { commitCarTimes(true); requestClose(); }} className="focus-ring min-h-11 rounded-xl bg-[#004BB8] px-6 text-sm font-extrabold text-white disabled:opacity-50">{t("done")}</button></div>}>{renderCarTimePicker(true)}</FlightMobilePickerShell>
    <FlightMobilePickerShell open={mobileCarDriverAgeOpen} title={t("carsSearch.driverAgeLabel")} titleId="deals-car-mobile-driver-age" launcherRef={carDriverAgeLauncherRef} onClose={closeMobileCarDriverAge} contentClassName="overflow-x-hidden px-4 py-5" footer={(requestClose) => <div className="flex justify-end"><button type="button" onClick={() => { update("carDriverAge", draftCarDriverAge); mobileCarDriverAgeCommittedRef.current = true; requestClose(); }} className="focus-ring min-h-11 rounded-xl bg-[#004BB8] px-6 text-sm font-extrabold text-white">{t("done")}</button></div>}><div className="rounded-2xl border border-slate-200 p-1">{driverAgeOptions.map((age) => <button key={age} type="button" onClick={() => setDraftCarDriverAge(age)} className={`focus-ring flex min-h-12 w-full items-center justify-between rounded-xl px-4 text-start text-sm font-bold ${draftCarDriverAge === age ? "bg-[#004BB8] text-white" : "text-slate-800 hover:bg-slate-50"}`}>{carDriverAgeLabel(age)}{draftCarDriverAge === age ? <span aria-hidden="true">✓</span> : null}</button>)}</div></FlightMobilePickerShell>
  </form>;
}
