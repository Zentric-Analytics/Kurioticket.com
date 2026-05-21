"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CalendarDays, ChevronLeft, ChevronRight, Hotel, Plane, Repeat2, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Tab = "flights" | "hotels";
type ActiveDateField = "departureDate" | "returnDate" | null;

const PURPLE = "#6d28d9";

function toDateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function prettyDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function SearchTabs({
  t,
  compactHero = false,
}: {
  t: Record<string, string>;
  compactHero?: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("flights");
  const [tripType, setTripType] = useState("round-trip");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeDateField, setActiveDateField] = useState<ActiveDateField>(null);
  const [monthCursor, setMonthCursor] = useState(startOfMonth(new Date()));
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const defaults = useMemo(() => ({ guests: "2", rooms: "1" }), []);

  useEffect(() => {
    function onClickAway(event: MouseEvent) {
      if (!calendarRef.current || calendarRef.current.contains(event.target as Node)) return;
      setCalendarOpen(false);
      setActiveDateField(null);
    }
    if (calendarOpen) document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [calendarOpen]);

  function onFlightSubmit(formData: FormData) {
    const params = new URLSearchParams({
      tripType,
      origin: String(formData.get("origin") || ""),
      destination: String(formData.get("destination") || ""),
      departureDate: compactHero ? departureDate : String(formData.get("departureDate") || ""),
      returnDate: compactHero ? returnDate : String(formData.get("returnDate") || ""),
      travelers: String(formData.get("travelers") || "1"),
      cabinClass: String(formData.get("cabinClass") || "economy"),
    });
    router.push(`/flights/results?${params.toString()}`);
  }

  function onHotelSubmit(formData: FormData) {
    const params = new URLSearchParams({
      destination: String(formData.get("destination") || ""),
      checkIn: String(formData.get("checkIn") || ""),
      checkOut: String(formData.get("checkOut") || ""),
      guests: String(formData.get("guests") || "2"),
      rooms: String(formData.get("rooms") || "1"),
    });
    router.push(`/hotels/results?${params.toString()}`);
  }

  return (
    <div className={`w-full rounded-xl border bg-white ${compactHero ? "border-[#6d28d9] shadow-[0_14px_45px_rgba(2,36,96,0.16)]" : "border-slate-100 shadow-[0_18px_60px_rgba(15,23,42,0.12)]"}`}>
      <div className="flex w-full max-w-xs overflow-hidden rounded-t-xl border-b border-slate-200 bg-white">
        <button type="button" className={`focus-ring flex h-16 flex-1 items-center justify-center gap-2 border-b-2 text-base font-extrabold ${tab === "flights" ? "border-[#6d28d9] text-[#6d28d9]" : "border-transparent bg-slate-50 text-slate-700"}`} onClick={() => setTab("flights")}>
          <Plane size={18} />
          {t.flights}
        </button>
        <button type="button" className={`focus-ring flex h-16 flex-1 items-center justify-center gap-2 border-b-2 text-base font-extrabold ${tab === "hotels" ? "border-[#6d28d9] text-[#6d28d9]" : "border-transparent bg-slate-50 text-slate-700"}`} onClick={() => setTab("hotels")}>
          <Building2 size={18} />
          {t.hotels}
        </button>
      </div>

      {tab === "flights" ? (
        <form action={onFlightSubmit} className={`grid gap-6 ${compactHero ? "p-4 sm:p-5" : "p-5 sm:p-7"}`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="grid grid-cols-1 gap-3 text-sm font-bold text-slate-700 sm:flex">
              {["round-trip", "one-way", "multi-city"].map((value) => (
                <label key={value} className="flex cursor-pointer items-center gap-2 capitalize">
                  <input type="radio" name="tripType" checked={tripType === value} onChange={() => setTripType(value)} className="h-4 w-4 accent-[#6d28d9]" />
                  {value.replace("-", " ")}
                </label>
              ))}
            </div>
            <button type="button" onClick={() => setTab("hotels")} className="focus-ring inline-flex items-center gap-2 text-sm font-extrabold text-[#6d28d9]">
              <Hotel size={17} />
              {t.searchHotelsInstead}
            </button>
          </div>
          <div className={`grid overflow-visible rounded-xl border bg-white md:grid-cols-[1fr_auto_1fr] lg:grid-cols-[1fr_auto_1fr_1fr_1fr_1fr] ${compactHero ? "border-[#6d28d9]" : "border-slate-200"}`}>
            <SearchField label={t.from} name="origin" helper={t.cityAirport} placeholder={t.from} />
            <div className="hidden items-center justify-center border-slate-200 px-2 md:flex lg:border-r"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-100 bg-violet-50 text-[#6d28d9]"><Repeat2 size={18} /></span></div>
            <SearchField label={t.to} name="destination" helper={t.cityAirport} placeholder={t.to} />
            {compactHero ? (
              <div ref={calendarRef} className="relative border-t border-slate-200 p-4 lg:border-l lg:border-t-0">
                <DateDisplay label={t.departure} value={departureDate} helper={t.selectDate} onClick={() => { setActiveDateField("departureDate"); setCalendarOpen(true); }} />
                <input type="hidden" name="departureDate" value={departureDate} required />
                <DateDisplay label={t.return} value={returnDate} helper={tripType === "one-way" ? t.notNeeded : t.selectDate} disabled={tripType === "one-way"} onClick={() => { if (tripType !== "one-way") { setActiveDateField("returnDate"); setCalendarOpen(true); } }} className="mt-3 border-t border-slate-200 pt-3" />
                <input type="hidden" name="returnDate" value={tripType === "one-way" ? "" : returnDate} />
                {calendarOpen ? (
                  <FlightCalendar
                    monthCursor={monthCursor}
                    setMonthCursor={setMonthCursor}
                    departureDate={departureDate}
                    returnDate={returnDate}
                    activeField={activeDateField}
                    onSelect={(value) => {
                      if (activeDateField === "departureDate") {
                        setDepartureDate(value);
                        if (!returnDate || returnDate < value) setReturnDate("");
                        setActiveDateField("returnDate");
                      } else {
                        if (!departureDate || value < departureDate) {
                          setDepartureDate(value);
                          setReturnDate("");
                          setActiveDateField("returnDate");
                          return;
                        }
                        setReturnDate(value);
                        setCalendarOpen(false);
                        setActiveDateField(null);
                      }
                    }}
                  />
                ) : null}
              </div>
            ) : (
              <>
                <SearchField label={t.departure} name="departureDate" helper={t.selectDate} type="date" icon={<CalendarDays size={17} />} />
                <SearchField label={t.return} name="returnDate" helper={tripType === "one-way" ? t.notNeeded : t.selectDate} type="date" icon={<CalendarDays size={17} />} disabled={tripType === "one-way"} />
              </>
            )}
            <label className="block border-t border-slate-200 p-4 lg:border-l lg:border-t-0">
              <span className="block text-xs font-bold text-slate-600">{t.travelersClass}</span>
              <select name="travelers" defaultValue="1" className="mt-2 w-full bg-transparent text-lg font-extrabold text-slate-950 outline-none">
                <option value="1">{t.oneTraveler}</option><option value="2">{t.twoTravelers}</option><option value="3">{t.threeTravelers}</option><option value="4">{t.fourTravelers}</option>
              </select>
              <select name="cabinClass" defaultValue="economy" className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-600 outline-none">
                <option value="economy">{t.economy}</option><option value="premium-economy">{t.premiumEconomy}</option><option value="business">{t.business}</option><option value="first">{t.first}</option>
              </select>
            </label>
          </div>
          <div className={`${compactHero ? "flex justify-end" : "flex justify-center"}`}><Button size="lg" variant="primary" className={`w-full sm:w-auto ${compactHero ? "h-14 rounded-xl bg-[#6d28d9] px-16 text-base font-black text-white transition-colors duration-200 hover:bg-[#5b21b6]" : "bg-[#5b21d6] px-12 hover:bg-[#4c1d95]"}`}><Search size={18} />{t.searchFlights}</Button></div>
        </form>
      ) : (
        <form action={onHotelSubmit} className={`grid gap-6 ${compactHero ? "p-4 sm:p-5" : "p-5 sm:p-7"}`}>
          <div className={`grid overflow-hidden rounded-xl border bg-white md:grid-cols-2 lg:grid-cols-5 ${compactHero ? "border-[#6d28d9]" : "border-slate-200"}`}>
            <SearchField label={t.destination} name="destination" helper={t.cityHotelArea} placeholder={t.destination} />
            <SearchField label={t.checkIn} name="checkIn" type="date" helper={t.selectDate} icon={<CalendarDays size={17} />} />
            <SearchField label={t.checkOut} name="checkOut" type="date" helper={t.selectDate} icon={<CalendarDays size={17} />} />
            <SearchField label={t.guests} name="guests" type="number" defaultValue={defaults.guests} helper={t.adults} />
            <SearchField label={t.rooms} name="rooms" type="number" defaultValue={defaults.rooms} helper={t.room} />
          </div>
          <div className={`${compactHero ? "flex justify-end" : "flex justify-center"}`}><Button size="lg" variant="primary" className={`w-full sm:w-auto ${compactHero ? "h-14 rounded-xl bg-[#6d28d9] px-16 text-base font-black text-white hover:bg-[#5b21b6]" : "bg-[#5b21d6] px-12 hover:bg-[#4c1d95]"}`}><Search size={18} />{t.searchHotels}</Button></div>
        </form>
      )}
    </div>
  );
}

function FlightCalendar({ monthCursor, setMonthCursor, departureDate, returnDate, activeField, onSelect }: { monthCursor: Date; setMonthCursor: (date: Date) => void; departureDate: string; returnDate: string; activeField: ActiveDateField; onSelect: (value: string) => void; }) {
  const months = [monthCursor, new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1)];
  const todayValue = toDateValue(new Date());

  return <div className="absolute right-0 z-30 mt-3 w-[min(92vw,680px)] rounded-2xl border border-violet-100 bg-white p-3 shadow-2xl sm:p-5">
    <div className="mb-4 flex items-center justify-between">
      <div className="text-sm font-extrabold text-slate-700">{activeField === "returnDate" ? "Select return date" : "Select departure date"}</div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))} className="focus-ring rounded-full border border-violet-100 p-1.5 text-slate-700 hover:bg-violet-50"><ChevronLeft size={17} /></button>
        <button type="button" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))} className="focus-ring rounded-full border border-violet-100 p-1.5 text-slate-700 hover:bg-violet-50"><ChevronRight size={17} /></button>
      </div>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      {months.map((month) => <MonthGrid key={`${month.getFullYear()}-${month.getMonth()}`} month={month} todayValue={todayValue} departureDate={departureDate} returnDate={returnDate} onSelect={onSelect} />)}
    </div>
  </div>;
}

function MonthGrid({ month, todayValue, departureDate, returnDate, onSelect }: { month: Date; todayValue: string; departureDate: string; returnDate: string; onSelect: (value: string) => void; }) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = Array.from({ length: firstDay }, () => null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(month.getFullYear(), month.getMonth(), day));

  return <div>
    <div className="mb-2 text-center text-sm font-extrabold text-slate-900">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
    <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500">{"SMTWTFS".split("").map((letter) => <span key={letter}>{letter}</span>)}</div>
    <div className="mt-1 grid grid-cols-7 gap-1">
      {cells.map((date, idx) => {
        if (!date) return <span key={`e-${idx}`} className="h-10" />;
        const value = toDateValue(date);
        const isDisabled = value < todayValue;
        const inRange = departureDate && returnDate && value > departureDate && value < returnDate;
        const isEdge = value === departureDate || value === returnDate;
        return <button key={value} type="button" disabled={isDisabled} onClick={() => onSelect(value)} className={`h-10 rounded-lg text-sm font-bold ${isDisabled ? "cursor-not-allowed text-slate-300" : "text-slate-800 hover:bg-violet-50"} ${inRange ? "bg-violet-100 text-violet-900" : ""} ${isEdge ? "bg-violet-700 text-white hover:bg-violet-700" : ""}`} style={isEdge ? { backgroundColor: PURPLE } : undefined}>{date.getDate()}</button>;
      })}
    </div>
  </div>;
}

function DateDisplay({ label, value, helper, disabled, onClick, className = "" }: { label: string; value: string; helper: string; disabled?: boolean; onClick: () => void; className?: string; }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`w-full text-left ${disabled ? "cursor-not-allowed opacity-60" : ""} ${className}`}>
    <span className="flex items-center justify-between gap-2 text-xs font-bold text-slate-600">{label}<span className="text-[#6d28d9]"><CalendarDays size={17} /></span></span>
    <span className="mt-1 block h-10 text-lg font-extrabold uppercase text-slate-950">{value ? prettyDate(value) : "Select date"}</span>
    <span className="block truncate text-sm font-semibold text-slate-600">{helper}</span>
  </button>;
}

function SearchField({ label, name, defaultValue, helper, placeholder, type = "text", icon, disabled }: { label: string; name: string; defaultValue?: string; helper: string; placeholder?: string; type?: string; icon?: ReactNode; disabled?: boolean; }) {
  return (
    <label className="block border-t border-slate-200 p-4 first:border-t-0 md:border-l md:border-t-0 md:first:border-l-0">
      <span className="flex items-center justify-between gap-2 text-xs font-bold text-slate-600">{label}{icon ? <span className="text-[#6d28d9]">{icon}</span> : null}</span>
      <Input name={name} type={type} placeholder={placeholder} defaultValue={defaultValue} disabled={disabled} required={!disabled} className="mt-1 h-10 rounded-none border-0 bg-transparent px-0 text-lg font-extrabold uppercase shadow-none placeholder:text-slate-400 focus-visible:shadow-none" />
      <span className="block truncate text-sm font-semibold text-slate-600">{helper}</span>
    </label>
  );
}
