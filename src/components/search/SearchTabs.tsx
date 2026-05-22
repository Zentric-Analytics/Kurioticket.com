"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type TabMode = "flights" | "hotels";
type TripType = "round-trip" | "one-way" | "multi-city";
type DateField = "departure" | "return";

type SearchTabsProps = {
  t: Record<string, string>;
  compactHero?: boolean;
};

const BRAND_PURPLE = "#6d28d9";

const toDateValue = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateValue = (value: string) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1);
const isSameDay = (left: Date, right: Date) => left.toDateString() === right.toDateString();
const monthTitle = (date: Date) => date.toLocaleDateString(undefined, { month: "long", year: "numeric" });

export function SearchTabs({ t, compactHero = false }: SearchTabsProps) {
  const router = useRouter();
  const datePickerRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<TabMode>("flights");
  const [tripType, setTripType] = useState<TripType>("round-trip");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [travelers, setTravelers] = useState("1");
  const [cabinClass, setCabinClass] = useState("economy");

  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("1");
  const [rooms, setRooms] = useState("1");

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeDateField, setActiveDateField] = useState<DateField>("departure");
  const [currentMonth, setCurrentMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!datePickerRef.current?.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const departure = parseDateValue(departureDate);
  const returning = parseDateValue(returnDate);

  const wrapper = cn("rounded-2xl bg-white", compactHero ? "p-0" : "border border-slate-200 p-4");

  const tripTypeLabel = (mode: TripType) => {
    if (mode === "round-trip") return t.tripRound || "Round-trip";
    if (mode === "one-way") return t.tripOneWay || "One-way";
    return t.tripMulti || "Multi-city";
  };

  const openCalendar = (field: DateField) => {
    setActiveDateField(field);
    const anchor = field === "departure" ? departure : returning;
    setCurrentMonth(new Date((anchor || today).getFullYear(), (anchor || today).getMonth(), 1));
    setIsCalendarOpen(true);
  };

  const selectDay = (day: Date) => {
    if (day < today) return;
    const value = toDateValue(day);

    if (activeDateField === "departure") {
      setDepartureDate(value);
      if (returning && day > returning) {
        setReturnDate("");
      }
      if (tripType !== "one-way") setActiveDateField("return");
      if (tripType === "one-way") setIsCalendarOpen(false);
      return;
    }

    if (departure && day < departure) {
      setDepartureDate(value);
      setReturnDate("");
      setActiveDateField("return");
      return;
    }

    setReturnDate(value);
    setIsCalendarOpen(false);
  };

  const renderMonth = (monthStart: Date) => {
    const firstDayOffset = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1).getDay();
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    const slots = Array.from({ length: firstDayOffset + daysInMonth }, (_, idx) => idx - firstDayOffset + 1);

    return (
      <div key={monthStart.toISOString()} className="w-full min-w-[260px]">
        <h4 className="mb-3 text-center text-sm font-bold text-slate-900">{monthTitle(monthStart)}</h4>
        <div className="mb-3 grid grid-cols-7 place-items-center text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((label) => (
            <span key={label} className="w-9">{label}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {slots.map((value, idx) => {
            if (value < 1) return <span key={`empty-${idx}`} className="h-10" />;

            const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), value);
            const isPast = date < today;
            const isSelected = (departure && isSameDay(date, departure)) || (returning && isSameDay(date, returning));
            const inRange = departure && returning && date > departure && date < returning;

            return (
              <button
                key={toDateValue(date)}
                type="button"
                onClick={() => selectDay(date)}
                disabled={isPast}
                className={cn(
                  "h-10 rounded-lg text-sm transition-colors duration-150",
                  isPast && "cursor-not-allowed text-slate-300",
                  !isPast && !isSelected && !inRange && "text-slate-700 hover:bg-violet-50",
                  inRange && "bg-violet-100 text-[#4c1d95]",
                  isSelected && "text-white",
                )}
                style={isSelected ? { backgroundColor: BRAND_PURPLE } : undefined}
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <section className={wrapper}>
      <div className="mb-3 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button type="button" onClick={() => setTab("flights")} className={cn("focus-ring inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold", tab === "flights" ? "bg-white text-navy shadow-sm" : "text-slate-600")}>{t.flights || "Flights"}</button>
        <button type="button" onClick={() => setTab("hotels")} className={cn("focus-ring inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold", tab === "hotels" ? "bg-white text-navy shadow-sm" : "text-slate-600")}>{t.hotels || "Hotels"}</button>
      </div>

      {tab === "flights" ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
            {(["round-trip", "one-way", "multi-city"] as TripType[]).map((mode) => (
              <button key={mode} type="button" onClick={() => setTripType(mode)} className={cn("focus-ring rounded-full px-3 py-1.5 capitalize", tripType === mode ? "bg-violet-100 text-[#5b21d6]" : "bg-slate-100 text-slate-700")}>{tripTypeLabel(mode)}</button>
            ))}
            <button type="button" onClick={() => setTab("hotels")} className="ml-auto text-[#5b21d6] underline-offset-2 hover:underline">{t.searchHotelsInstead || "Search hotels instead"}</button>
          </div>

          <form className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(130px,1fr)_minmax(130px,1fr)_140px]" onSubmit={(event) => {
            event.preventDefault();
            const params = new URLSearchParams({ tripType, origin: from.trim(), destination: to.trim(), departureDate, returnDate: tripType === "one-way" ? "" : returnDate, travelers, cabinClass });
            router.push(`/flights/results?${params.toString()}`);
          }}>
            <input value={from} onChange={(event) => setFrom(event.target.value)} required placeholder={t.from || "From"} className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold" />
            <input value={to} onChange={(event) => setTo(event.target.value)} required placeholder={t.to || "To"} className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold" />

            <div className="relative">
              <button type="button" onClick={() => openCalendar("departure")} className="focus-ring flex h-11 w-full items-center rounded-lg border border-slate-300 px-3 text-left text-sm font-semibold text-slate-700">
                {departureDate || t.selectDate || "Select date"}
              </button>
            </div>
            <div className="relative" ref={datePickerRef}>
              <button type="button" onClick={() => openCalendar("return")} disabled={tripType === "one-way"} className="focus-ring flex h-11 w-full items-center rounded-lg border border-slate-300 px-3 text-left text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                {returnDate || (tripType === "one-way" ? t.notNeeded || "Not needed" : t.selectDate || "Select date")}
              </button>
              {isCalendarOpen ? (
                <div className={cn("absolute top-full z-30 mt-2 w-[min(94vw,44rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.16)] md:p-5", activeDateField === "departure" ? "left-[-100%] md:left-0" : "right-0")}>
                  <div className="mb-4 flex items-center justify-between">
                    <button type="button" onClick={() => setCurrentMonth((prev) => addMonths(prev, -1))} className="focus-ring rounded-full border border-slate-200 px-2.5 py-1 text-slate-700 hover:bg-violet-50" aria-label="Previous month">←</button>
                    <button type="button" onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))} className="focus-ring rounded-full border border-slate-200 px-2.5 py-1 text-slate-700 hover:bg-violet-50" aria-label="Next month">→</button>
                  </div>
                  <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-8">
                    <div className="self-start">{renderMonth(currentMonth)}</div>
                    <div className="hidden self-start md:block">{renderMonth(addMonths(currentMonth, 1))}</div>
                  </div>
                </div>
              ) : null}
            </div>

            <select value={travelers} onChange={(event) => setTravelers(event.target.value)} className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold">
              <option value="1">{t.oneTraveler || "1 Traveler"}</option><option value="2">{t.twoTravelers || "2 Travelers"}</option><option value="3">{t.threeTravelers || "3 Travelers"}</option><option value="4">{t.fourTravelers || "4 Travelers"}</option>
            </select>
            <select value={cabinClass} onChange={(event) => setCabinClass(event.target.value)} className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold">
              <option value="economy">{t.economy || "Economy"}</option><option value="premium-economy">{t.premiumEconomy || "Premium economy"}</option><option value="business">{t.business || "Business"}</option><option value="first">{t.first || "First"}</option>
            </select>
            <Button type="submit" className="h-11 rounded-lg bg-[#5b21d6] font-bold text-white hover:bg-[#4c1d95]">{t.searchFlights || "Search Flights"}</Button>
          </form>
        </>
      ) : (
        <form className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(160px,1.2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(100px,0.8fr)_minmax(90px,0.7fr)_140px]" onSubmit={(event) => {
          event.preventDefault();
          const params = new URLSearchParams({ destination, checkIn, checkOut, guests, rooms });
          router.push(`/hotels/results?${params.toString()}`);
        }}>
          <input value={destination} onChange={(event) => setDestination(event.target.value)} required placeholder={t.destination || "Destination"} className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold" />
          <input type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} required className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold" />
          <input type="date" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} required className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold" />
          <select value={guests} onChange={(event) => setGuests(event.target.value)} className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"><option value="1">1 {t.adults || "Adults"}</option><option value="2">2 {t.adults || "Adults"}</option><option value="3">3 {t.adults || "Adults"}</option><option value="4">4 {t.adults || "Adults"}</option></select>
          <select value={rooms} onChange={(event) => setRooms(event.target.value)} className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"><option value="1">1 {t.room || "Room"}</option><option value="2">2 {t.rooms || "Rooms"}</option><option value="3">3 {t.rooms || "Rooms"}</option></select>
          <Button type="submit" className="h-11 rounded-lg bg-[#5b21d6] font-bold text-white hover:bg-[#4c1d95]">{t.searchHotels || "Search Hotels"}</Button>
        </form>
      )}
    </section>
  );
}
