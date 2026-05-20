"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  BedDouble,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plane,
  Search,
  Users,
} from "lucide-react";

type Tab = "flights" | "hotels";
type TripType = "round-trip" | "one-way" | "multi-city";
type PickerTarget = "departure" | "return";
type LocationOption = { city: string; country: string; code: string };

const LOCATION_OPTIONS: LocationOption[] = [
  { city: "Lagos", country: "Nigeria", code: "LOS" },
  { city: "Abuja", country: "Nigeria", code: "ABV" },
  { city: "Dubai", country: "UAE", code: "DXB" },
  { city: "London", country: "United Kingdom", code: "LHR" },
  { city: "Paris", country: "France", code: "CDG" },
  { city: "New York", country: "USA", code: "JFK" },
];

export function SearchTabs() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("flights");
  const [tripType, setTripType] = useState<TripType>("round-trip");

  const [originInput, setOriginInput] = useState("Lagos");
  const [destinationInput, setDestinationInput] = useState("Dubai");
  const [originCode, setOriginCode] = useState("LOS");
  const [destinationCode, setDestinationCode] = useState("DXB");
  const [activeLocationField, setActiveLocationField] = useState<"origin" | "destination" | null>(null);

  const [travelers, setTravelers] = useState(1);
  const [cabinClass, setCabinClass] = useState("economy");
  const [isTravelerOpen, setIsTravelerOpen] = useState(false);

  const [departureDate, setDepartureDate] = useState(new Date(2026, 5, 11));
  const [returnDate, setReturnDate] = useState(new Date(2026, 5, 17));
  const [viewDate, setViewDate] = useState(new Date(2026, 5, 1));
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>("departure");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const departureFieldRef = useRef<HTMLButtonElement | null>(null);
  const returnFieldRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setActiveLocationField(null);
        setIsTravelerOpen(false);
        setIsCalendarOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const locationQuery = activeLocationField === "origin" ? originInput : destinationInput;
  const locationSuggestions = useMemo(() => {
    const normalized = locationQuery.trim().toLowerCase();
    if (!normalized) return LOCATION_OPTIONS;
    return LOCATION_OPTIONS.filter((location) =>
      [location.city, location.country, location.code].some((piece) => piece.toLowerCase().includes(normalized)),
    );
  }, [locationQuery]);

  function onFlightSubmit() {
    const params = new URLSearchParams({
      tripType,
      origin: originCode,
      destination: destinationCode,
      departureDate: format(departureDate, "yyyy-MM-dd"),
      returnDate: format(returnDate, "yyyy-MM-dd"),
      travelers: String(travelers),
      cabinClass,
    });
    router.push(`/flights/results?${params.toString()}`);
  }

  function onHotelSubmit() {
    const params = new URLSearchParams({
      destination: destinationInput,
      checkIn: format(departureDate, "yyyy-MM-dd"),
      checkOut: format(returnDate, "yyyy-MM-dd"),
      guests: String(travelers),
      rooms: "1",
    });
    router.push(`/hotels/results?${params.toString()}`);
  }

  function onDaySelect(day: Date) {
    if (pickerTarget === "departure") {
      setDepartureDate(day);
      if (isAfter(day, returnDate)) setReturnDate(day);
      setPickerTarget("return");
      return;
    }
    if (isBefore(day, departureDate)) setDepartureDate(day);
    else {
      setReturnDate(day);
      setIsCalendarOpen(false);
    }
  }

  function selectLocation(location: LocationOption) {
    if (activeLocationField === "origin") {
      setOriginInput(location.city);
      setOriginCode(location.code);
    } else {
      setDestinationInput(location.city);
      setDestinationCode(location.code);
    }
    setActiveLocationField(null);
  }


  return (
    <div className="w-full" ref={rootRef}>
      <div className="mb-2 inline-flex rounded-full border border-violet-100 bg-white p-1 shadow-sm">
        <button type="button" className={`focus-ring inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition ${tab === "flights" ? "bg-[#6d28d9] text-white" : "text-slate-700 hover:bg-slate-100"}`} onClick={() => setTab("flights")}><Plane size={15} /> Flights</button>
        <button type="button" className={`focus-ring inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition ${tab === "hotels" ? "bg-[#6d28d9] text-white" : "text-slate-700 hover:bg-slate-100"}`} onClick={() => setTab("hotels")}><BedDouble size={15} /> Hotels</button>
      </div>

      {tab === "flights" ? (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 text-xs font-bold text-slate-700 sm:flex sm:gap-4">
            {(["round-trip", "one-way", "multi-city"] as const).map((value) => (
              <label key={value} className="inline-flex items-center gap-2"><input type="radio" name="tripType" checked={tripType === value} onChange={() => setTripType(value)} className="h-4 w-4 accent-[#6d28d9]" />{value === "round-trip" ? "Round Trip" : value === "one-way" ? "One Way" : "Multi City"}</label>
            ))}
          </div>

          <div className="relative grid overflow-visible rounded-2xl border border-violet-100 bg-white shadow-sm lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
            <LocationField label="FROM" value={originInput} code={originCode} onFocus={() => { setActiveLocationField("origin"); setIsCalendarOpen(false); setIsTravelerOpen(false); }} onChange={(value) => { setOriginInput(value); setOriginCode(value.toUpperCase().slice(0, 3)); setActiveLocationField("origin"); }} />
            <LocationField label="TO" value={destinationInput} code={destinationCode} onFocus={() => { setActiveLocationField("destination"); setIsCalendarOpen(false); setIsTravelerOpen(false); }} onChange={(value) => { setDestinationInput(value); setDestinationCode(value.toUpperCase().slice(0, 3)); setActiveLocationField("destination"); }} />

            <DateTriggerField label="DEPARTURE" value={format(departureDate, "MMM dd, yyyy")} subtext={format(departureDate, "EEEE")} isActive={isCalendarOpen && pickerTarget === "departure"} buttonRef={departureFieldRef} onClick={() => { setPickerTarget("departure"); setIsCalendarOpen(true); setActiveLocationField(null); setIsTravelerOpen(false); }} />
            <DateTriggerField label="RETURN" value={format(returnDate, "MMM dd, yyyy")} subtext={format(returnDate, "EEEE")} isActive={isCalendarOpen && pickerTarget === "return"} buttonRef={returnFieldRef} onClick={() => { setPickerTarget("return"); setIsCalendarOpen(true); setActiveLocationField(null); setIsTravelerOpen(false); }} />

            <TravelerField travelers={travelers} cabinClass={cabinClass} isOpen={isTravelerOpen} onToggle={() => { setIsTravelerOpen((v) => !v); setActiveLocationField(null); setIsCalendarOpen(false); }} onIncrement={() => setTravelers((v) => Math.min(9, v + 1))} onDecrement={() => setTravelers((v) => Math.max(1, v - 1))} onClassChange={(value) => { setCabinClass(value); setIsTravelerOpen(false); }} />

            <div className="p-2"><button type="button" onClick={onFlightSubmit} className="focus-ring inline-flex h-full min-h-[72px] w-full items-center justify-center gap-2 rounded-xl bg-[#5b21d6] px-6 text-sm font-black text-white transition hover:bg-[#4c1d95]"><Search size={16} /> Search Flights</button></div>

            {activeLocationField ? (
              <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-full rounded-2xl border border-violet-100 bg-white p-2 shadow-[0_12px_30px_rgba(15,23,42,0.14)] lg:w-[40%] max-h-64 overflow-y-auto">
                {locationSuggestions.length ? locationSuggestions.map((location) => (
                  <button key={`${location.city}-${location.code}`} type="button" onClick={() => selectLocation(location)} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-violet-50">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"><MapPin size={14} className="text-[#6d28d9]" /> {location.city}, {location.country}</span>
                    <span className="text-xs font-bold text-slate-500">{location.code}</span>
                  </button>
                )) : <div className="px-3 py-2 text-sm font-medium text-slate-500">No matches found. Try city, country, or airport code.</div>}
              </div>
            ) : null}

            {isCalendarOpen ? (
              <div className={`absolute top-[calc(100%+8px)] z-30 w-[min(100%,620px)] max-w-[calc(100vw-2rem)] rounded-2xl border border-violet-100 bg-white p-3 shadow-[0_16px_36px_rgba(15,23,42,0.16)] sm:p-4 ${pickerTarget === "departure" ? "left-0 lg:left-[33%]" : "right-0 lg:right-[10%]"}`}>
                <BookingCalendar viewDate={viewDate} setViewDate={setViewDate} departureDate={departureDate} returnDate={returnDate} onDaySelect={onDaySelect} />
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-violet-100 bg-white p-3 shadow-sm"><button type="button" onClick={onHotelSubmit} className="focus-ring inline-flex h-11 items-center justify-center rounded-xl bg-[#5b21d6] px-5 text-sm font-black text-white transition hover:bg-[#4c1d95]">Search Hotels</button></div>
      )}
    </div>
  );
}

function LocationField({ label, value, code, onFocus, onChange }: { label: string; value: string; code: string; onFocus: () => void; onChange: (value: string) => void }) {
  return (
    <label className="flex min-h-[72px] flex-col justify-center border-t border-violet-100 px-3 py-2 first:border-t-0 lg:border-l lg:border-t-0 lg:first:border-l-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <input value={value} onFocus={onFocus} onChange={(event) => onChange(event.target.value)} className="mt-0.5 bg-transparent text-base font-semibold leading-tight text-slate-950 outline-none" />
      <span className="text-xs font-semibold text-slate-600">{code}</span>
    </label>
  );
}

function DateTriggerField({ label, value, subtext, isActive, onClick, buttonRef }: { label: string; value: string; subtext: string; isActive: boolean; onClick: () => void; buttonRef?: React.RefObject<HTMLButtonElement | null> }) {
  return (
    <button ref={buttonRef} type="button" onClick={onClick} className={`flex min-h-[72px] w-full flex-col justify-center border-t border-violet-100 px-4 py-2.5 text-left transition first:border-t-0 lg:border-l lg:border-t-0 lg:first:border-l-0 ${isActive ? "bg-violet-50/60" : "hover:bg-slate-50"}`}>
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <div className="mt-1.5 inline-flex items-center gap-2.5"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-[#6d28d9]"><CalendarDays size={13} /></span><span className="text-[15px] font-medium leading-tight text-slate-900">{value}</span></div>
      <span className="mt-1 text-xs font-medium text-slate-500">{subtext}</span>
    </button>
  );
}

function TravelerField({ travelers, cabinClass, isOpen, onToggle, onIncrement, onDecrement, onClassChange }: { travelers: number; cabinClass: string; isOpen: boolean; onToggle: () => void; onIncrement: () => void; onDecrement: () => void; onClassChange: (value: string) => void }) {
  return (
    <div className="relative flex min-h-[72px] flex-col justify-center border-t border-violet-100 px-3 py-2 first:border-t-0 lg:border-l lg:border-t-0 lg:first:border-l-0">
      <button type="button" onClick={onToggle} className="text-left">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">TRAVELERS & CLASS</span>
        <div className="mt-1.5 inline-flex items-center gap-2.5"><Users size={14} className="text-[#6d28d9]" /><span className="text-sm font-semibold text-slate-900">{travelers} Traveler{travelers > 1 ? "s" : ""}</span><ChevronDown size={14} className="text-slate-500" /></div>
        <div className="text-xs font-medium text-slate-500">{cabinClass.replace("-", " ")}</div>
      </button>
      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-full min-w-[220px] rounded-2xl border border-violet-100 bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.14)]">
          <div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-700">Travelers</span><div className="inline-flex items-center gap-2"><button type="button" onClick={onDecrement} className="h-8 w-8 rounded-full border border-slate-200 text-base font-semibold transition hover:border-violet-200 hover:bg-violet-50">-</button><span className="w-5 text-center text-sm font-semibold">{travelers}</span><button type="button" onClick={onIncrement} className="h-8 w-8 rounded-full border border-slate-200 text-base font-semibold transition hover:border-violet-200 hover:bg-violet-50">+</button></div></div>
          <select value={cabinClass} onChange={(event) => onClassChange(event.target.value)} className="mt-3 w-full rounded-lg border border-violet-100 px-3 py-2 text-sm font-medium text-slate-800 outline-none">
            <option value="economy">Economy</option><option value="premium-economy">Premium Economy</option><option value="business">Business</option><option value="first">First</option>
          </select>
        </div>
      ) : null}
    </div>
  );
}

function BookingCalendar({ viewDate, setViewDate, departureDate, returnDate, onDaySelect }: { viewDate: Date; setViewDate: (date: Date) => void; departureDate: Date; returnDate: Date; onDaySelect: (day: Date) => void }) {
  const months = [viewDate, addMonths(viewDate, 1)];
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {months.map((month) => {
        const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }) });
        return (
          <div key={month.toISOString()} className="rounded-xl border border-violet-100 p-2.5 sm:p-3">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-base font-bold text-slate-900">{format(month, "MMMM yyyy")}</h3><div className="flex items-center gap-1"><button type="button" onClick={() => setViewDate(addMonths(viewDate, -1))} className="rounded-full p-1.5 hover:bg-slate-100"><ChevronLeft size={16} /></button><button type="button" onClick={() => setViewDate(addMonths(viewDate, 1))} className="rounded-full p-1.5 hover:bg-slate-100"><ChevronRight size={16} /></button></div></div>
            <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-bold text-slate-500">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => <span key={d}>{d}</span>)}</div>
            <div className="grid grid-cols-7 gap-1.5">{days.map((day) => { const selected = isSameDay(day, departureDate) || isSameDay(day, returnDate); const inRange = isAfter(day, departureDate) && isBefore(day, returnDate); const inMonth = isSameMonth(day, month); return <button key={day.toISOString()} type="button" onClick={() => onDaySelect(day)} className={`h-10 rounded-lg text-sm font-medium transition ${!inMonth ? "text-slate-300" : "text-slate-700 hover:bg-violet-50"} ${inRange ? "bg-violet-50" : ""} ${selected ? "bg-[#6d28d9] text-white" : ""}`}>{format(day, "d")}</button>; })}</div>
          </div>
        );
      })}
    </div>
  );
}
