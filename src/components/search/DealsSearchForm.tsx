"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { BedDouble, Calendar, Car, ChevronDown, Minus, Plane, Plus, Search } from "lucide-react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRouteProgress } from "@/components/layout/RouteProgress";
import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
import { HotelMobilePickerShell } from "@/components/search/HotelMobilePickerShell";
import { translations as en } from "@/lib/i18n/en";
import { driverAgeOptions, timeOptions } from "@/lib/cars/carsSearchUtils";
import {
  buildDealsResultsUrl, createDefaultDealsSearch, dealsPackageModes,
  getIncludedProducts, parseDealsSearchParams, validateDealsSearch,
  type DealsPackageMode, type DealsSearch, type DealsProduct,
} from "@/lib/deals/dealsSearchParams";
import { formatAirportLabel, type AirportOption } from "@/data/airports";
import { formatFlightsDateSummary, formatFlightsMonthHeading, formatFlightsWeekdays, normalizeFlightsCalendarLocale } from "@/lib/flights/dateFormatting";
import { normalizeHotelCalendarLocale } from "@/lib/hotelsDateFormatting";

type HotelSuggestion = { id: string; name: string; country: string; searchValue: string };
const modeKeys: Record<DealsPackageMode, string> = { "hotel-flight": "deals.package.hotelFlight", "hotel-flight-car": "deals.package.hotelFlightCar", "flight-car": "deals.package.flightCar", "hotel-car": "deals.package.hotelCar" };
const field = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-medium text-slate-900 outline-none focus:border-[#004BB8] focus:ring-2 focus:ring-[#004BB8]/20";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-slate-600";

const parseIsoDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number); const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day ? parsed : null;
};
const toIsoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const startOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addMonths = (date: Date, offset: number) => new Date(date.getFullYear(), date.getMonth() + offset, 1);
const buildMonthCells = (monthDate: Date) => { const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1); const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay()); return Array.from({ length: 42 }, (_, index) => { const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index); return { date, isCurrentMonth: date.getMonth() === monthDate.getMonth() }; }); };

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

export function DealsSearchForm() {
  const params = useSearchParams(); const router = useRouter(); const { start } = useRouteProgress();
  const { t: dictionary, locale } = useLocale(); const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const [search, setSearch] = useState<DealsSearch>(() => params.size ? parseDealsSearchParams(params) : createDefaultDealsSearch());
  const [errors, setErrors] = useState<ReturnType<typeof validateDealsSearch>>({}); const [submitting, setSubmitting] = useState(false);
  const [airportLists, setAirportLists] = useState<Record<"origin" | "destination", AirportOption[]>>({ origin: [], destination: [] });
  const [hotelSuggestions, setHotelSuggestions] = useState<HotelSuggestion[]>([]);
  const dirty = useRef({ hotelDestination: Boolean(search.hotelDestination), hotelDates: params.has("hotelCheckIn"), carLocation: Boolean(search.carPickupLocation), carDates: params.has("carPickupDate") });
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
  const included = getIncludedProducts(search.mode);
  const update = <K extends keyof DealsSearch>(key: K, value: DealsSearch[K]) => setSearch((current) => ({ ...current, [key]: value }));

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
  const flightDatesSummary = useMemo(() => { const departure = parseIsoDate(search.flightDepartureDate); const returning = parseIsoDate(search.flightReturnDate); return departure && returning && !isBeforeToday(departure) && !isBeforeToday(returning) && returning >= departure ? formatFlightsDateSummary(departure, returning, calendarLocale) : t("travelDates"); }, [calendarLocale, isBeforeToday, search.flightDepartureDate, search.flightReturnDate, t]);
  const resetFlightDatesDraft = useCallback(() => { setDraftFlightDepartureDate(search.flightDepartureDate); setDraftFlightReturnDate(search.flightReturnDate); }, [search.flightDepartureDate, search.flightReturnDate]);
  const restoreFlightDatesFocus = () => requestAnimationFrame(() => flightDatesLauncherRef.current?.focus({ preventScroll: true }));
  const openFlightDates = () => { resetFlightDatesDraft(); const departure = parseIsoDate(search.flightDepartureDate); const validVisibleDeparture = departure && !isBeforeToday(departure) ? departure : todayLocal; setVisibleFlightMonth(new Date(validVisibleDeparture.getFullYear(), validVisibleDeparture.getMonth(), 1)); if (window.matchMedia("(max-width: 639px)").matches) setMobileFlightDatesOpen(true); else setFlightDatesOpen(true); };
  const dismissDesktopFlightDates = useCallback((restoreFocus = false) => { resetFlightDatesDraft(); setFlightDatesOpen(false); if (restoreFocus) restoreFlightDatesFocus(); }, [resetFlightDatesDraft]);
  const validDraftFlightRange = useMemo(() => { const departure = parseIsoDate(draftFlightDepartureDate); const returning = parseIsoDate(draftFlightReturnDate); return Boolean(departure && returning && !isBeforeToday(departure) && !isBeforeToday(returning) && returning >= departure); }, [draftFlightDepartureDate, draftFlightReturnDate, isBeforeToday]);
  const selectDraftFlightDate = (date: Date) => { if (isBeforeToday(date)) return; const selected = toIsoDate(date); const departure = parseIsoDate(draftFlightDepartureDate); if (!departure || isBeforeToday(departure) || draftFlightReturnDate) { setDraftFlightDepartureDate(selected); setDraftFlightReturnDate(""); } else if (selected < draftFlightDepartureDate) { setDraftFlightDepartureDate(selected); setDraftFlightReturnDate(""); } else setDraftFlightReturnDate(selected); };
  const commitFlightDates = (mobile = false) => { const departure = parseIsoDate(draftFlightDepartureDate); const returning = parseIsoDate(draftFlightReturnDate); if (!departure || !returning || isBeforeToday(departure) || isBeforeToday(returning) || returning < departure) return; const normalizedDeparture = toIsoDate(departure); const normalizedReturn = toIsoDate(returning); setSearch((current) => ({ ...current, flightDepartureDate: normalizedDeparture, flightReturnDate: normalizedReturn, ...!dirty.current.hotelDates ? { hotelCheckIn: normalizedDeparture, hotelCheckOut: normalizedReturn } : {}, ...!dirty.current.carDates ? { carPickupDate: normalizedDeparture, carReturnDate: normalizedReturn } : {} })); if (mobile) mobileFlightDatesCommittedRef.current = true; else { setFlightDatesOpen(false); restoreFlightDatesFocus(); } };
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

  const loadAirports = useCallback(async (kind: "origin" | "destination", query: string) => {
    if (query.trim().length < 2) return setAirportLists((all) => ({ ...all, [kind]: [] }));
    const response = await fetch(`/api/flights/places?${new URLSearchParams({ q: query, context: kind })}`); if (!response.ok) return;
    const payload = await response.json() as { suggestions?: AirportOption[] }; setAirportLists((all) => ({ ...all, [kind]: payload.suggestions?.slice(0, 6) ?? [] }));
  }, []);
  const loadHotels = useCallback(async (query: string) => {
    const response = await fetch(`/api/hotels/destinations?${new URLSearchParams({ q: query, limit: "8" })}`); if (!response.ok) return;
    const payload = await response.json() as { suggestions?: HotelSuggestion[] }; setHotelSuggestions(payload.suggestions?.slice(0, 8) ?? []);
  }, []);
  useEffect(() => { const id = setTimeout(() => void loadAirports("origin", search.flightOriginText), 250); return () => clearTimeout(id); }, [loadAirports, search.flightOriginText]);
  useEffect(() => { const id = setTimeout(() => void loadAirports("destination", search.flightDestinationText), 250); return () => clearTimeout(id); }, [loadAirports, search.flightDestinationText]);
  useEffect(() => { const id = setTimeout(() => void loadHotels(search.hotelDestination), 250); return () => clearTimeout(id); }, [loadHotels, search.hotelDestination]);

  const chooseAirport = (kind: "origin" | "destination", option: AirportOption) => {
    const text = formatAirportLabel(option); const codeKey = kind === "origin" ? "flightOriginCode" : "flightDestinationCode"; const textKey = kind === "origin" ? "flightOriginText" : "flightDestinationText";
    setSearch((current) => ({ ...current, [textKey]: text, [codeKey]: option.code.toUpperCase(), ...kind === "destination" && !dirty.current.hotelDestination ? { hotelDestination: option.city } : {}, ...kind === "destination" && !dirty.current.carLocation ? { carPickupLocation: option.city } : {} }));
    setAirportLists((all) => ({ ...all, [kind]: [] }));
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
      <div className={`grid grid-cols-7 ${mobile ? "gap-y-1.5" : "gap-y-0.5"}`}>{buildMonthCells(monthDate).map(({ date, isCurrentMonth }) => { const iso = toIsoDate(date); if (!isCurrentMonth) return <span key={iso} aria-hidden="true" className={mobile ? "h-11" : "h-10"} />; const disabled = isBeforeToday(date); const departure = iso === draftFlightDepartureDate; const returning = iso === draftFlightReturnDate; const inRange = Boolean(draftDeparture && draftReturn && date > draftDeparture && date < draftReturn && !disabled); const today = iso === toIsoDate(todayLocal); return <button key={iso} type="button" aria-label={`${t("selectDateAriaPrefix")} ${accessibleDateFormatter.format(date)}`} aria-pressed={departure || returning} aria-disabled={disabled} disabled={disabled} onClick={() => selectDraftFlightDate(date)} className={`focus-ring relative mx-auto flex items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed ${mobile ? "h-11 w-full max-w-11 text-[15px] font-semibold" : "h-10 w-10 text-sm font-medium"} ${disabled ? "text-slate-300" : "text-slate-800 hover:bg-[#004BB8]/10 hover:text-[#004BB8]"} ${today && !disabled ? "ring-1 ring-inset ring-[#004BB8]/20" : ""} ${inRange ? "bg-[#004BB8]/10 text-[#021C2B]" : ""} ${departure || returning ? "bg-[#004BB8] text-white ring-0 hover:bg-[#004BB8] hover:text-white" : ""}`}>{date.getDate()}{today && !departure && !returning && <span aria-hidden="true" className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[#004BB8]" />}</button>; })}</div>
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

  return <form onSubmit={submit} noValidate className="mx-auto w-full max-w-[1120px] rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_18px_46px_rgba(15,23,42,0.12)] sm:p-6">
    <fieldset><legend className="sr-only">{t("deals.packageLegend")}</legend><div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-4">{dealsPackageModes.map((mode) => <label key={mode} className={`shrink-0 cursor-pointer rounded-full border px-4 py-2 text-sm font-extrabold ${search.mode === mode ? "border-[#004BB8] bg-[#004BB8]/10 text-[#004BB8]" : "border-slate-200 text-slate-700"}`}><input className="sr-only" type="radio" name="packageMode" checked={search.mode === mode} onChange={() => update("mode", mode)} />{t(modeKeys[mode])}</label>)}</div></fieldset>
    {included.flight && <section aria-labelledby="deals-flight-heading" className="border-t border-slate-200 py-5"><h2 id="deals-flight-heading" className="mb-4 flex items-center gap-2 text-base font-extrabold text-[#021C2B]"><Plane className="h-5 w-5 text-[#004BB8]" />{t("flights")}</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {(["origin", "destination"] as const).map((kind) => { const textKey = kind === "origin" ? "flightOriginText" : "flightDestinationText"; const codeKey = kind === "origin" ? "flightOriginCode" : "flightDestinationCode"; return <div className="relative" key={kind}><label className={label} htmlFor={`flight-${kind}`}>{t(kind === "origin" ? "deals.originLabel" : "deals.destinationLabel")}</label><input id={`flight-${kind}`} role="combobox" aria-expanded={airportLists[kind].length > 0} aria-controls={`flight-${kind}-options`} value={search[textKey]} onChange={(e) => setSearch((current) => ({ ...current, [textKey]: e.target.value, [codeKey]: /^[a-z]{3}$/i.test(e.target.value.trim()) ? e.target.value.trim().toUpperCase() : "" }))} className={field} autoComplete="off" />{airportLists[kind].length > 0 && <ul id={`flight-${kind}-options`} role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border bg-white p-1 shadow-xl">{airportLists[kind].map((option) => <li key={option.code}><button type="button" className="w-full rounded-lg p-2 text-start text-sm hover:bg-slate-100" onClick={() => chooseAirport(kind, option)}>{formatAirportLabel(option)}</button></li>)}</ul>}</div>; })}
      <div className="min-w-0"><span className={label}>{t("travelDates")}</span><button ref={flightDatesLauncherRef} type="button" aria-expanded={flightDatesOpen || mobileFlightDatesOpen} aria-haspopup="dialog" aria-controls={mobileFlightDatesOpen ? "deals-flight-mobile-dates" : "deals-flight-desktop-dates"} aria-label={t("chooseTravelDates")} onClick={() => flightDatesOpen ? dismissDesktopFlightDates(true) : openFlightDates()} className={`${field} flex items-center justify-between gap-2 text-start`}><span className="min-w-0 truncate">{flightDatesSummary}</span><Calendar aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" /></button></div>
      <div className="min-w-0"><span className={label}>{t("deals.travelersCabinLabel")}</span><button ref={travelersLauncherRef} type="button" aria-expanded={travelersOpen || mobileTravelersOpen} aria-haspopup="dialog" aria-controls={mobileTravelersOpen ? "deals-flight-mobile-travelers" : "deals-flight-desktop-travelers"} onClick={() => travelersOpen ? dismissDesktopTravelers() : openTravelers()} className={`${field} flex items-center justify-between gap-2 text-start`}><span className="min-w-0 truncate">{travelerSummary}</span><ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${travelersOpen || mobileTravelersOpen ? "rotate-180" : ""}`} /></button></div>
    </div>{errorBlock("flight")}</section>}
    {included.hotel && <section aria-labelledby="deals-hotel-heading" className="border-t border-slate-200 py-5"><h2 id="deals-hotel-heading" className="mb-4 flex items-center gap-2 text-base font-extrabold text-[#021C2B]"><BedDouble className="h-5 w-5 text-[#004BB8]" />{t("hotels")}</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><div className="relative"><label className={label} htmlFor="hotel-destination">{t("deals.destinationLabel")}</label><input id="hotel-destination" role="combobox" aria-controls="hotel-destination-options" aria-expanded={hotelSuggestions.length > 0} value={search.hotelDestination} onChange={(e) => { dirty.current.hotelDestination = true; update("hotelDestination", e.target.value); }} className={field} autoComplete="off" />{hotelSuggestions.length > 0 && <ul id="hotel-destination-options" role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border bg-white p-1 shadow-xl">{hotelSuggestions.map((option) => <li key={option.id}><button type="button" className="w-full rounded-lg p-2 text-start text-sm hover:bg-slate-100" onClick={() => { dirty.current.hotelDestination = true; update("hotelDestination", option.searchValue); setHotelSuggestions([]); }}>{option.name}, {option.country}</button></li>)}</ul>}</div><div className="min-w-0"><span className={label}>{t("hotelSearchTravelDatesLabel")}</span><button ref={hotelDatesLauncherRef} type="button" aria-expanded={hotelDatesOpen || mobileHotelDatesOpen} aria-haspopup="dialog" aria-controls={mobileHotelDatesOpen ? "deals-hotel-mobile-dates" : "deals-hotel-desktop-dates"} aria-label={t("chooseTravelDates")} onClick={() => hotelDatesOpen ? dismissDesktopHotelDates(true) : openHotelDates()} className={`${field} flex items-center justify-between gap-2 text-start`}><span className="min-w-0 truncate">{hotelDatesSummary}</span><Calendar aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" /></button></div><div className="min-w-0"><span className={label}>{t("hotelSearchGuestsLabel")}</span><button ref={hotelGuestsLauncherRef} type="button" aria-expanded={hotelGuestsOpen || mobileHotelGuestsOpen} aria-haspopup="dialog" aria-controls={mobileHotelGuestsOpen ? "deals-hotel-mobile-guests" : "deals-hotel-desktop-guests"} aria-label={t("chooseGuestsAndRooms")} onClick={() => hotelGuestsOpen ? dismissDesktopHotelGuests(true) : openHotelGuests()} className={`${field} flex items-center justify-between gap-2 text-start`}><span className="min-w-0 truncate">{hotelGuestsSummary}</span><ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${hotelGuestsOpen || mobileHotelGuestsOpen ? "rotate-180" : ""}`} /></button></div></div>{errorBlock("hotel")}</section>}
    {included.car && <section aria-labelledby="deals-car-heading" className="border-t border-slate-200 py-5"><h2 id="deals-car-heading" className="mb-4 flex items-center gap-2 text-base font-extrabold text-[#021C2B]"><Car className="h-5 w-5 text-[#004BB8]" />{t("cars")}</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label><span className={label}>{t("carsSearch.pickupLocationLabel")}</span><input value={search.carPickupLocation} onChange={(e) => { dirty.current.carLocation = true; update("carPickupLocation", e.target.value); }} className={field} /></label><div className="grid grid-cols-2 gap-2"><label><span className={label}>{t("departureDate")}</span><input type="date" value={search.carPickupDate} onChange={(e) => { dirty.current.carDates = true; update("carPickupDate", e.target.value); }} className={field} /></label><label><span className={label}>{t("returnDate")}</span><input type="date" value={search.carReturnDate} onChange={(e) => { dirty.current.carDates = true; update("carReturnDate", e.target.value); }} className={field} /></label></div><div className="grid grid-cols-2 gap-2"><label><span className={label}>{t("carsSearch.pickupTimeLabel")}</span><select value={search.carPickupTime} onChange={(e) => update("carPickupTime", e.target.value)} className={field}>{timeOptions.map((v) => <option key={v}>{v}</option>)}</select></label><label><span className={label}>{t("carsSearch.returnTimeLabel")}</span><select value={search.carReturnTime} onChange={(e) => update("carReturnTime", e.target.value)} className={field}>{timeOptions.map((v) => <option key={v}>{v}</option>)}</select></label></div><label><span className={label}>{t("carsSearch.driverAgeLabel")}</span><select value={search.carDriverAge} onChange={(e) => update("carDriverAge", e.target.value)} className={field}>{driverAgeOptions.map((v) => <option key={v}>{v === "18-70" ? t("carsSearch.driverAgeAnyAgeRange") : v}</option>)}</select></label></div><label className="mt-3 flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={search.carReturnToDifferentLocation} onChange={(e) => update("carReturnToDifferentLocation", e.target.checked)} />{t("carsSearch.differentReturnLocation")}</label>{search.carReturnToDifferentLocation && <label className="mt-2 block max-w-md"><span className={label}>{t("carsSearch.returnLocationPlaceholder")}</span><input value={search.carReturnLocation} onChange={(e) => update("carReturnLocation", e.target.value)} className={field} /></label>}{errorBlock("car")}</section>}
    <div className="flex justify-end border-t border-slate-200 pt-5"><button type="submit" disabled={submitting} aria-busy={submitting} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#004BB8] px-8 text-sm font-extrabold text-white shadow-lg shadow-blue-900/20 hover:bg-[#021C2B] disabled:opacity-70 sm:w-auto"><Search className="h-4 w-4" />{t("deals.searchButton")}</button></div>
    <DealsFlightDatesPopover open={flightDatesOpen} anchorRef={flightDatesLauncherRef}><div id="deals-flight-desktop-dates" role="dialog" aria-modal="false" aria-label={t("chooseTravelDates")}>{renderFlightDatesCalendar()}<div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><button type="button" onClick={() => { setDraftFlightDepartureDate(""); setDraftFlightReturnDate(""); }} className="focus-ring min-h-10 rounded-xl px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-100">{t("clear")}</button><button type="button" disabled={!validDraftFlightRange} onClick={() => commitFlightDates()} className="focus-ring min-h-10 rounded-xl bg-[#004BB8] px-5 text-sm font-extrabold text-white hover:bg-[#021C2B] disabled:cursor-not-allowed disabled:opacity-50">{t("done")}</button></div></div></DealsFlightDatesPopover>
    <FlightMobilePickerShell open={mobileFlightDatesOpen} title={t("chooseTravelDates")} titleId="deals-flight-mobile-dates" launcherRef={flightDatesLauncherRef} onClose={closeMobileFlightDates} pickerMarker="flight-date" contentClassName="px-4 py-5" footer={(requestClose) => <div className="flex items-center justify-between"><button type="button" onClick={() => { setDraftFlightDepartureDate(""); setDraftFlightReturnDate(""); }} className="focus-ring min-h-11 rounded-xl px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-100">{t("clear")}</button><button type="button" disabled={!validDraftFlightRange} onClick={() => { commitFlightDates(true); requestClose(); }} className="focus-ring min-h-11 rounded-xl bg-[#004BB8] px-6 text-sm font-extrabold text-white hover:bg-[#021C2B] disabled:cursor-not-allowed disabled:opacity-50">{t("done")}</button></div>}>{renderFlightDatesCalendar(true)}</FlightMobilePickerShell>
    <DealsFlightPopover open={travelersOpen} anchorRef={travelersLauncherRef}><div id="deals-flight-desktop-travelers" role="dialog" aria-modal="false" aria-label={t("travelersCabinDialogLabel")}>{travelersPicker}<div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" onClick={() => commitTravelers()} className="focus-ring min-h-10 rounded-xl bg-[#004BB8] px-5 text-sm font-extrabold text-white hover:bg-[#021C2B]">{t("done")}</button></div></div></DealsFlightPopover>
    <FlightMobilePickerShell open={mobileTravelersOpen} title={t("travelersCabinDialogLabel")} titleId="deals-flight-mobile-travelers" launcherRef={travelersLauncherRef} onClose={closeMobileTravelers} pickerMarker="traveler-cabin" contentClassName="px-4 py-5" footer={(requestClose) => <div className="flex justify-end"><button type="button" onClick={() => { commitTravelers(true); requestClose(); }} className="focus-ring min-h-11 rounded-xl bg-[#004BB8] px-6 py-3 text-sm font-extrabold text-white hover:bg-[#021C2B]">{t("done")}</button></div>}>{travelersPicker}</FlightMobilePickerShell>
    <DealsHotelDatesPopover open={hotelDatesOpen} anchorRef={hotelDatesLauncherRef}><div id="deals-hotel-desktop-dates" role="dialog" aria-modal="false" aria-label={t("chooseTravelDates")}>{renderHotelDatesCalendar()}<div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><button type="button" onClick={() => { setDraftHotelCheckIn(""); setDraftHotelCheckOut(""); }} className="focus-ring min-h-10 rounded-xl px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-100">{t("clear")}</button><button type="button" disabled={!validDraftHotelRange} onClick={() => commitHotelDates()} className="focus-ring min-h-10 rounded-xl bg-[#004BB8] px-5 text-sm font-extrabold text-white hover:bg-[#021C2B] disabled:cursor-not-allowed disabled:opacity-50">{t("done")}</button></div></div></DealsHotelDatesPopover>
    <HotelMobilePickerShell open={mobileHotelDatesOpen} title={t("chooseTravelDates")} titleId="deals-hotel-mobile-dates" launcherRef={hotelDatesLauncherRef} onClose={closeMobileHotelDates} contentClassName="px-4 py-5" footer={(requestClose) => <div className="flex items-center justify-between"><button type="button" onClick={() => { setDraftHotelCheckIn(""); setDraftHotelCheckOut(""); }} className="focus-ring min-h-11 rounded-xl px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-100">{t("clear")}</button><button type="button" disabled={!validDraftHotelRange} onClick={() => { commitHotelDates(true); requestClose(); }} className="focus-ring min-h-11 rounded-xl bg-[#004BB8] px-6 text-sm font-extrabold text-white hover:bg-[#021C2B] disabled:cursor-not-allowed disabled:opacity-50">{t("done")}</button></div>}>{renderHotelDatesCalendar(true)}</HotelMobilePickerShell>
    <DealsHotelPopover open={hotelGuestsOpen} anchorRef={hotelGuestsLauncherRef}><div id="deals-hotel-desktop-guests" role="dialog" aria-modal="false" aria-label={t("guestsAndRooms")}>{hotelGuestsPicker}<div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" onClick={() => commitHotelGuests()} className="focus-ring min-h-10 rounded-xl bg-[#004BB8] px-5 text-sm font-extrabold text-white hover:bg-[#021C2B]">{t("done")}</button></div></div></DealsHotelPopover>
    <HotelMobilePickerShell open={mobileHotelGuestsOpen} title={t("guestsAndRooms")} titleId="deals-hotel-mobile-guests" launcherRef={hotelGuestsLauncherRef} onClose={closeMobileHotelGuests} contentClassName="px-4 py-5" footer={(requestClose) => <div className="flex justify-end"><button type="button" onClick={() => { commitHotelGuests(true); requestClose(); }} className="focus-ring min-h-11 rounded-xl bg-[#004BB8] px-6 py-3 text-sm font-extrabold text-white hover:bg-[#021C2B]">{t("done")}</button></div>}>{hotelGuestsPicker}</HotelMobilePickerShell>
  </form>;
}
