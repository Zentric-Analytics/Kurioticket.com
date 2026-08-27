"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { ArrowRightLeft, Calendar, ChevronDown, MapPin, UserRound, X } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
import { MobileAirportPicker } from "@/components/search/MobileAirportPicker";
import { MobileDatePickerDialog } from "@/components/search/MobileDateRangePicker";
import { MobileTravelerCabinPicker } from "@/components/search/MobileTravelerCabinPicker";
import { MultiCityFlightEditor } from "@/components/search/MultiCityFlightEditor";
import { Button } from "@/components/ui/Button";
import { MULTI_CITY_MAX_LEGS, MULTI_CITY_MIN_LEGS } from "@/lib/flights/flightSearchJourney";
import type { CabinClass, FlightSearchLeg, TripType } from "@/lib/types";

export type FlightEditSearchInitialValue = {
  tripType: TripType;
  legs: FlightSearchLeg[];
  departureDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  cabinClass: CabinClass;
};

export type FlightEditSearchValue = FlightEditSearchInitialValue;

type Props = {
  open: boolean;
  initialValue: FlightEditSearchInitialValue;
  launcherRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  onSearch: (value: FlightEditSearchValue) => void;
  presentation?: "fullscreen" | "bottom-sheet";
};

const today = () => { const date = new Date(); return new Date(date.getFullYear(), date.getMonth(), date.getDate()); };
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= today().toISOString().slice(0, 10);

export function FlightEditSearchDrawer({ open, initialValue, launcherRef, onClose, onSearch, presentation = "fullscreen" }: Props) {
  const { locale } = useLocale();
  const [draft, setDraft] = useState(initialValue);
  const [airportPicker, setAirportPicker] = useState<"origin" | "destination" | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [travelerPickerOpen, setTravelerPickerOpen] = useState(false);
  const [multiCityAirportsValid, setMultiCityAirportsValid] = useState(true);
  const originRef = useRef<HTMLButtonElement>(null);
  const destinationRef = useRef<HTMLButtonElement>(null);
  const datesRef = useRef<HTMLButtonElement>(null);
  const travelersRef = useRef<HTMLButtonElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const finishClose = useCallback(() => {
    setDraft(initialValue);
    onClose();
    window.requestAnimationFrame(() => launcherRef?.current?.focus({ preventScroll: true }));
  }, [initialValue, launcherRef, onClose]);

  const closeDrawer = useCallback(() => {
    if (isClosing) return;
    if (presentation === "bottom-sheet") {
      setIsClosing(true);
      closeTimerRef.current = window.setTimeout(finishClose, 200);
      return;
    }
    finishClose();
  }, [finishClose, isClosing, presentation]);

  useEffect(() => {
    if (!open || presentation !== "bottom-sheet") return;
    const body = document.body;
    const root = document.documentElement;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const bodyStyle = body.getAttribute("style");
    const rootStyle = root.getAttribute("style");

    Object.assign(body.style, {
      left: `-${scrollX}px`,
      overflow: "hidden",
      overscrollBehavior: "none",
      position: "fixed",
      right: "0",
      top: `-${scrollY}px`,
      width: "100%",
    });
    Object.assign(root.style, { height: "100%", overflow: "hidden", overscrollBehavior: "none" });

    const restore = () => {
      if (bodyStyle === null) body.removeAttribute("style");
      else body.setAttribute("style", bodyStyle);
      if (rootStyle === null) root.removeAttribute("style");
      else root.setAttribute("style", rootStyle);
      window.scrollTo(scrollX, scrollY);
    };
    return restore;
  }, [open, presentation]);

  useEffect(() => {
    let frame = 0;
    if (open) {
      frame = window.requestAnimationFrame(() => {
        setIsClosing(false);
        setHasEntered(true);
      });
    }
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, [open, presentation]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !airportPicker && !datePickerOpen && !travelerPickerOpen) closeDrawer();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [airportPicker, closeDrawer, datePickerOpen, open, travelerPickerOpen]);

  const firstLeg = draft.legs[0] ?? { origin: "", destination: "", departureDate: draft.departureDate };
  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, 7 + index))), [locale]);
  const travelerTotal = draft.adults + draft.children + draft.infants;
  const validMultiCity = draft.legs.length >= MULTI_CITY_MIN_LEGS && draft.legs.length <= MULTI_CITY_MAX_LEGS && multiCityAirportsValid && draft.legs.every((leg, index) => /^[A-Z0-9]{3}$/.test(leg.origin) && /^[A-Z0-9]{3}$/.test(leg.destination) && leg.origin !== leg.destination && validDate(leg.departureDate) && (index === 0 || leg.departureDate >= draft.legs[index - 1].departureDate));
  const canSearch = draft.tripType === "multi-city" ? validMultiCity : Boolean(firstLeg.origin && firstLeg.destination && validDate(draft.departureDate) && (draft.tripType !== "round-trip" || draft.returnDate && draft.returnDate >= draft.departureDate));
  const fieldClass = "min-h-[70px] w-full min-w-0 rounded-[14px] border border-[#D8E1EC] bg-white px-4 py-3 text-start transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25";
  const field = (label: string, value: string, icon: React.ReactNode, trailing?: React.ReactNode) => <span className="block min-w-0"><span className="mb-1.5 block text-[11px] font-semibold uppercase leading-3 tracking-[0.08em] text-slate-500">{label}</span><span className="grid min-w-0 grid-cols-[22px_minmax(0,1fr)_20px] items-center gap-2.5" data-mobile-value-row>{icon}<span className="min-w-0 truncate text-[16px] font-semibold leading-5 text-slate-950">{value}</span>{trailing ?? <span aria-hidden="true" />}</span></span>;

  if (!open) return null;
  const bottomSheet = presentation === "bottom-sheet";
  return <>
    <div onPointerDown={(event) => { if (bottomSheet && event.target === event.currentTarget) closeDrawer(); }} data-flight-edit-presentation={presentation} className={`${bottomSheet ? `fixed inset-0 z-[10000] flex items-end overflow-hidden bg-slate-950/35 transition-opacity duration-200 sm:hidden ${isClosing || !hasEntered ? "opacity-0" : "opacity-100"}` : "fixed inset-0 z-[10000] min-h-[100dvh] overflow-hidden overscroll-contain bg-slate-50 sm:hidden"}`}>
      <form role="dialog" aria-modal="true" aria-labelledby="flight-mobile-search-title" onSubmit={(event) => { event.preventDefault(); if (canSearch) onSearch(draft); }} className={`flex min-h-0 w-full min-w-0 flex-col bg-slate-50 ${bottomSheet ? `h-[94dvh] max-h-[94dvh] overflow-hidden rounded-t-[22px] shadow-[0_-12px_36px_rgba(15,23,42,0.18)] transition-transform duration-200 ease-out ${isClosing || !hasEntered ? "translate-y-full" : "translate-y-0"}` : "h-full"}`}>
        <div className={`shrink-0 border-b border-slate-200/80 bg-white px-4 pb-2 ${bottomSheet ? "pt-2" : "pt-[calc(0.5rem+env(safe-area-inset-top))]"}`}><div className="flex min-h-11 items-center justify-between gap-3"><h2 id="flight-mobile-search-title" className="text-xl font-bold leading-6 tracking-[-0.01em] text-slate-950">Edit flight search</h2><button type="button" aria-label="Close edit search" onClick={closeDrawer} className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"><X className="h-5 w-5" aria-hidden="true" /></button></div></div>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"><div className="mx-auto flex w-full min-w-0 max-w-xl flex-col gap-3.5">
          <div role="radiogroup" aria-label="Trip type" data-mobile-trip-type-grid className="grid min-h-11 w-full min-w-0 grid-cols-3 items-stretch gap-1 rounded-[13px] bg-slate-100/75 p-1">{([['round-trip','Round-trip'],['one-way','One-way'],['multi-city','Multi-city']] as const).map(([value, label]) => <button key={value} type="button" role="radio" aria-checked={draft.tripType === value} onClick={() => setDraft((current) => ({ ...current, tripType: value, legs: value === "multi-city" && current.legs.length < 2 ? [firstLeg, { origin: firstLeg.destination, destination: "", departureDate: firstLeg.departureDate }] : current.legs }))} className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] px-1 text-[13px] font-semibold min-[360px]:text-sm ${draft.tripType === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}><span aria-hidden="true" className={`inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border ${draft.tripType === value ? "border-[#004BB8]" : "border-slate-300"}`}><span className={`h-2 w-2 rounded-full ${draft.tripType === value ? "bg-[#004BB8]" : "bg-transparent"}`} /></span>{label}</button>)}</div>
          {draft.tripType === "multi-city" ? <MultiCityFlightEditor legs={draft.legs} onChange={(legs) => setDraft((current) => ({ ...current, legs }))} minimumDate={today().toISOString().slice(0, 10)} presentation="homepage" onAirportValidityChange={setMultiCityAirportsValid} /> : <><div className="relative grid min-w-0 gap-3" data-mobile-route-fields><button ref={originRef} type="button" aria-haspopup="dialog" onClick={() => setAirportPicker("origin")} className={fieldClass} data-mobile-field="origin">{field("Origin", firstLeg.origin || "Choose origin", <MapPin className="h-5 w-5 text-slate-500" aria-hidden="true" />)}</button><button type="button" aria-label="Swap origin and destination" onClick={() => setDraft((current) => ({ ...current, legs: [{ ...firstLeg, origin: firstLeg.destination, destination: firstLeg.origin }, ...current.legs.slice(1)] }))} data-mobile-swap-control className="absolute left-1/2 top-1/2 z-10 inline-flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#D8E1EC] bg-white text-[#004BB8]"><ArrowRightLeft className="h-5 w-5" aria-hidden="true" /></button><button ref={destinationRef} type="button" aria-haspopup="dialog" onClick={() => setAirportPicker("destination")} className={fieldClass} data-mobile-field="destination">{field("Destination", firstLeg.destination || "Choose destination", <MapPin className="h-5 w-5 text-slate-500" aria-hidden="true" />)}</button></div><button ref={datesRef} type="button" onClick={() => setDatePickerOpen(true)} className={fieldClass} data-mobile-field="dates">{field("Travel dates", draft.returnDate && draft.tripType === "round-trip" ? `${draft.departureDate} – ${draft.returnDate}` : draft.departureDate, <Calendar className="h-5 w-5 text-slate-500" aria-hidden="true" />)}</button></>}
          <button ref={travelersRef} type="button" onClick={() => setTravelerPickerOpen(true)} className={fieldClass} data-mobile-field="travelers">{field("Travelers and cabin", `${travelerTotal} ${travelerTotal === 1 ? "traveler" : "travelers"}, ${draft.cabinClass.replace("-", " ")}`, <UserRound className="h-5 w-5 text-slate-500" aria-hidden="true" />, <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden="true" />)}</button>
          <Button type="submit" disabled={!canSearch} className="mt-1 h-[54px] w-full rounded-[14px] bg-[#004BB8] text-base font-semibold text-white">Search</Button>
        </div></div>
      </form>
    </div>
    <MobileAirportPicker open={airportPicker === "origin"} field="origin" title="Choose origin" inputId="edit-flight-origin" value={firstLeg.origin} selectedCode={firstLeg.origin} launcherRef={originRef} locale={locale} onCommit={(option) => { if (option) setDraft((current) => ({ ...current, legs: [{ ...firstLeg, origin: option.code }, ...current.legs.slice(1)] })); }} onClose={() => setAirportPicker(null)} />
    <MobileAirportPicker open={airportPicker === "destination"} field="destination" title="Choose destination" inputId="edit-flight-destination" value={firstLeg.destination} selectedCode={firstLeg.destination} launcherRef={destinationRef} locale={locale} onCommit={(option) => { if (option) setDraft((current) => ({ ...current, legs: [{ ...firstLeg, destination: option.code }, ...current.legs.slice(1)] })); }} onClose={() => setAirportPicker(null)} />
    <MobileDatePickerDialog open={datePickerOpen} title="Travel dates" titleId="edit-flight-dates-title" dialogId="edit-flight-dates" launcherRef={datesRef} startDate={draft.departureDate} endDate={draft.returnDate ?? ""} rangeRequired={draft.tripType === "round-trip"} locale={locale} weekdays={weekdays} labels={{ selectDates: "Select dates", start: "Departure", end: "Return", done: "Done", selectDatePrefix: "Select" }} isDateDisabled={(date) => date < today()} onCommit={(departureDate, returnDate) => setDraft((current) => ({ ...current, departureDate, returnDate: current.tripType === "round-trip" ? returnDate : undefined, legs: [{ ...firstLeg, departureDate }, ...current.legs.slice(1)] }))} onClose={() => setDatePickerOpen(false)} />
    {/* eslint-disable-next-line react/no-children-prop -- `children` below is a traveler label inside a strings object. */}
    <FlightMobilePickerShell open={travelerPickerOpen} title="Travelers and cabin" titleId="edit-flight-travelers-title" dialogId="edit-flight-travelers" launcherRef={travelersRef} pickerMarker="traveler-cabin" onClose={() => setTravelerPickerOpen(false)} footer={<Button type="button" className="h-12 w-full" onClick={() => setTravelerPickerOpen(false)}>Done</Button>}><MobileTravelerCabinPicker adults={draft.adults} children={draft.children} infants={draft.infants} cabinClass={draft.cabinClass === "premium-economy" ? "economy" : draft.cabinClass} strings={{ travelers: "Travelers", adults: "Adults", adultDescription: "18 years and above", children: "Children", childDescription: "2 to 17 years", infants: "Infants", infantDescription: "Under 2 years", cabinClass: "Cabin class", economy: "Economy", business: "Business", first: "First", tip: "Tip", baggageTip: "Baggage allowance may vary by airline.", decrease: (label) => `Decrease ${label}`, increase: (label) => `Increase ${label}` }} onAdultsChange={(adults) => setDraft((current) => ({ ...current, adults }))} onChildrenChange={(children) => setDraft((current) => ({ ...current, children }))} onInfantsChange={(infants) => setDraft((current) => ({ ...current, infants }))} onCabinClassChange={(cabinClass) => setDraft((current) => ({ ...current, cabinClass }))} /></FlightMobilePickerShell>
  </>;
}
