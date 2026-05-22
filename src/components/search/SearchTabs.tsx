"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
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

type AirportOption = { city: string; airport: string; code: string; lat: number; lon: number };

const BRAND_PURPLE = "#6d28d9";
const CURRENT_LOCATION_KEY = "__current_location__";

const AIRPORTS: AirportOption[] = [
  { city: "Lagos", airport: "Murtala Muhammed", code: "LOS", lat: 6.5774, lon: 3.3212 },
  { city: "Abuja", airport: "Nnamdi Azikiwe", code: "ABV", lat: 9.0068, lon: 7.2632 },
  { city: "London", airport: "Heathrow", code: "LHR", lat: 51.47, lon: -0.4543 },
  { city: "Dubai", airport: "Dubai International", code: "DXB", lat: 25.2532, lon: 55.3657 },
  { city: "Toronto", airport: "Pearson", code: "YYZ", lat: 43.6777, lon: -79.6248 },
  { city: "New York", airport: "John F. Kennedy", code: "JFK", lat: 40.6413, lon: -73.7781 },
  { city: "Paris", airport: "Charles de Gaulle", code: "CDG", lat: 49.0097, lon: 2.5479 },
  { city: "Doha", airport: "Hamad International", code: "DOH", lat: 25.2731, lon: 51.6081 },
  { city: "Istanbul", airport: "Istanbul Airport", code: "IST", lat: 41.2753, lon: 28.7519 },
];

const formatAirport = (item: AirportOption) => `${item.city} (${item.code})`;
const labelAirport = (item: AirportOption) => `${item.city} ${item.airport} ${item.code}`.toLowerCase();

const toDateValue = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const parseDateValue = (value: string) => { if (!value) return null; const [year, month, day] = value.split("-").map(Number); if (!year || !month || !day) return null; return new Date(year, month - 1, day); };
const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1);
const isSameDay = (left: Date, right: Date) => left.toDateString() === right.toDateString();
const monthTitle = (date: Date) => date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
const toRad = (value: number) => (value * Math.PI) / 180;
const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export function SearchTabs({ t, compactHero = false }: SearchTabsProps) {
  const router = useRouter();
  const datePickerRef = useRef<HTMLDivElement>(null);
  const departureFieldRef = useRef<HTMLDivElement>(null);
  const returnFieldRef = useRef<HTMLDivElement>(null);
  const fromWrapRef = useRef<HTMLDivElement>(null);
  const toWrapRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<TabMode>("flights");
  const [tripType, setTripType] = useState<TripType>("round-trip");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [fromOpen, setFromOpen] = useState(false); const [toOpen, setToOpen] = useState(false);
  const [fromHighlight, setFromHighlight] = useState(0); const [toHighlight, setToHighlight] = useState(0);
  const [locationBusy, setLocationBusy] = useState(false);
  const [departureDate, setDepartureDate] = useState(""); const [returnDate, setReturnDate] = useState("");
  const [travelers, setTravelers] = useState("1"); const [cabinClass, setCabinClass] = useState("economy");
  const [destination, setDestination] = useState(""); const [checkIn, setCheckIn] = useState(""); const [checkOut, setCheckOut] = useState(""); const [guests, setGuests] = useState("1"); const [rooms, setRooms] = useState("1");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeDateField, setActiveDateField] = useState<DateField>("departure");
  const [currentMonth, setCurrentMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [flightFormError, setFlightFormError] = useState("");

  const today = useMemo(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()); }, []);

  const fromSuggestions = useMemo(() => AIRPORTS.filter((a) => labelAirport(a).includes(from.toLowerCase())).slice(0, 7), [from]);
  const toSuggestions = useMemo(() => AIRPORTS.filter((a) => labelAirport(a).includes(to.toLowerCase())).slice(0, 7), [to]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!datePickerRef.current?.contains(event.target as Node)) setIsCalendarOpen(false);
      if (!fromWrapRef.current?.contains(event.target as Node)) setFromOpen(false);
      if (!toWrapRef.current?.contains(event.target as Node)) setToOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const departure = parseDateValue(departureDate); const returning = parseDateValue(returnDate);
  const wrapper = cn("rounded-2xl bg-white", compactHero ? "p-0" : "border border-slate-200 p-4");
  const tripTypeLabel = (mode: TripType) => mode === "round-trip" ? t.tripRound || "Round-trip" : mode === "one-way" ? t.tripOneWay || "One-way" : t.tripMulti || "Multi-city";

  const applyLocation = async () => {
    if (!navigator.geolocation) return;
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      const nearest = AIRPORTS.reduce((best, current) => distanceKm(latitude, longitude, current.lat, current.lon) < distanceKm(latitude, longitude, best.lat, best.lon) ? current : best, AIRPORTS[0]);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
        const data = (await response.json()) as { address?: { city?: string; town?: string; village?: string } };
        const city = data.address?.city || data.address?.town || data.address?.village || nearest.city;
        setFrom(`${city} (${nearest.code})`);
      } catch {
        setFrom(formatAirport(nearest));
      } finally {
        setFromOpen(false);
        setLocationBusy(false);
      }
    }, () => setLocationBusy(false));
  };

  const selectDay = (day: Date) => { if (day < today) return; setFlightFormError(""); const value = toDateValue(day); if (activeDateField === "departure") { setDepartureDate(value); if (returning && day > returning) setReturnDate(""); if (tripType !== "one-way") setActiveDateField("return"); if (tripType === "one-way") setIsCalendarOpen(false); return; } if (departure && day < departure) { setDepartureDate(value); setReturnDate(""); setActiveDateField("return"); return; } setReturnDate(value); setIsCalendarOpen(false); };
  const openCalendar = (field: DateField) => { setFlightFormError(""); setActiveDateField(field); const anchor = field === "departure" ? departure : returning; setCurrentMonth(new Date((anchor || today).getFullYear(), (anchor || today).getMonth(), 1)); setIsCalendarOpen(true); };
  const handleFlightSubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!departureDate) { setFlightFormError(t.departureDateRequired || "Please select a departure date."); setActiveDateField("departure"); openCalendar("departure"); return; } if (tripType !== "one-way" && !returnDate) { setFlightFormError(t.returnDateRequired || "Please select a return date."); setActiveDateField("return"); openCalendar("return"); return; } setFlightFormError(""); const params = new URLSearchParams({ tripType, origin: from.trim(), destination: to.trim(), departureDate, returnDate: tripType === "one-way" ? "" : returnDate, travelers, cabinClass }); router.push(`/flights/results?${params.toString()}`); };

  const onKeyNav = (event: KeyboardEvent<HTMLInputElement>, isFrom: boolean) => {
    const list = isFrom ? fromSuggestions : toSuggestions;
    const active = isFrom ? fromHighlight : toHighlight;
    const setActive = isFrom ? setFromHighlight : setToHighlight;
    const setValue = isFrom ? setFrom : setTo;
    const setOpen = isFrom ? setFromOpen : setToOpen;
    if (!list.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((active + 1) % list.length); }
    if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive((active - 1 + list.length) % list.length); }
    if (event.key === "Enter" && (isFrom ? fromOpen : toOpen)) { event.preventDefault(); setValue(formatAirport(list[active])); setOpen(false); }
    if (event.key === "Escape") setOpen(false);
  };

  const renderMonth = (monthStart: Date) => (<div key={monthStart.toISOString()} className="w-full min-w-[260px]"><h4 className="mb-3 text-center text-sm font-bold text-slate-900">{monthTitle(monthStart)}</h4><div className="mb-3 grid grid-cols-7 place-items-center text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">{["Su","Mo","Tu","We","Th","Fr","Sa"].map((label) => <span key={label} className="w-9">{label}</span>)}</div><div className="grid grid-cols-7 gap-1.5">{Array.from({ length: new Date(monthStart.getFullYear(), monthStart.getMonth(), 1).getDay() + new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate() }, (_, idx) => idx - new Date(monthStart.getFullYear(), monthStart.getMonth(), 1).getDay() + 1).map((value, idx) => { if (value < 1) return <span key={`empty-${idx}`} className="h-10" />; const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), value); const isPast = date < today; const isSelected = (departure && isSameDay(date, departure)) || (returning && isSameDay(date, returning)); const inRange = departure && returning && date > departure && date < returning; return <button key={toDateValue(date)} type="button" onClick={() => selectDay(date)} disabled={isPast} className={cn("h-10 rounded-lg text-sm transition-colors duration-150", isPast && "cursor-not-allowed text-slate-300", !isPast && !isSelected && !inRange && "text-slate-700 hover:bg-violet-50", inRange && "bg-violet-100 text-[#4c1d95]", isSelected && "text-white")} style={isSelected ? { backgroundColor: BRAND_PURPLE } : undefined}>{value}</button>; })}</div></div>);

  return <section className={wrapper}><div className="mb-3 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1"><button type="button" onClick={() => setTab("flights")} className={cn("focus-ring inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold", tab === "flights" ? "bg-white text-navy shadow-sm" : "text-slate-600")}>{t.flights || "Flights"}</button><button type="button" onClick={() => setTab("hotels")} className={cn("focus-ring inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold", tab === "hotels" ? "bg-white text-navy shadow-sm" : "text-slate-600")}>{t.hotels || "Hotels"}</button></div>{tab === "flights" ? <><div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">{(["round-trip","one-way","multi-city"] as TripType[]).map((mode) => <button key={mode} type="button" onClick={() => setTripType(mode)} className={cn("focus-ring rounded-full px-3 py-1.5 capitalize", tripType === mode ? "bg-violet-100 text-[#5b21d6]" : "bg-slate-100 text-slate-700")}>{tripTypeLabel(mode)}</button>)}<button type="button" onClick={() => setTab("hotels")} className="ml-auto text-[#5b21d6] underline-offset-2 hover:underline">{t.searchHotelsInstead || "Search hotels instead"}</button></div><form className="relative grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(130px,1fr)_minmax(130px,1fr)_140px]" onSubmit={handleFlightSubmit}>
    <div className="relative" ref={fromWrapRef}><input value={from} onChange={(event) => { setFrom(event.target.value); setFromOpen(true); setFromHighlight(0); }} onFocus={() => setFromOpen(true)} onKeyDown={(event) => onKeyNav(event, true)} required placeholder={t.from || "From"} className="focus-ring h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold" />{fromOpen ? <div className="absolute z-40 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg"><button type="button" onClick={applyLocation} className="w-full px-3 py-2 text-left text-sm font-semibold text-[#5b21d6] hover:bg-violet-50">{locationBusy ? "Detecting current location..." : "Use my current location"}</button>{fromSuggestions.map((item, index) => <button key={item.code} type="button" onMouseEnter={() => setFromHighlight(index)} onClick={() => { setFrom(formatAirport(item)); setFromOpen(false); }} className={cn("w-full px-3 py-2 text-left text-sm", fromHighlight === index ? "bg-violet-100 text-[#4c1d95]" : "hover:bg-violet-50")}>{formatAirport(item)}</button>)}</div> : null}</div>
    <div className="relative" ref={toWrapRef}><input value={to} onChange={(event) => { setTo(event.target.value); setToOpen(true); setToHighlight(0); }} onFocus={() => setToOpen(true)} onKeyDown={(event) => onKeyNav(event, false)} required placeholder={t.to || "To"} className="focus-ring h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold" />{toOpen ? <div className="absolute z-40 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">{toSuggestions.map((item, index) => <button key={item.code} type="button" onMouseEnter={() => setToHighlight(index)} onClick={() => { setTo(formatAirport(item)); setToOpen(false); }} className={cn("w-full px-3 py-2 text-left text-sm", toHighlight === index ? "bg-violet-100 text-[#4c1d95]" : "hover:bg-violet-50")}>{formatAirport(item)}</button>)}</div> : null}</div>
            <div className="relative" ref={departureFieldRef}><button type="button" onClick={() => openCalendar("departure")} className="focus-ring flex h-11 w-full items-center rounded-lg border border-slate-300 px-3 text-left text-sm font-semibold text-slate-700">{departureDate || t.selectDate || "Select date"}</button></div><div className="relative" ref={returnFieldRef}><button type="button" onClick={() => openCalendar("return")} disabled={tripType === "one-way"} className="focus-ring flex h-11 w-full items-center rounded-lg border border-slate-300 px-3 text-left text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">{returnDate || (tripType === "one-way" ? t.notNeeded || "Not needed" : t.selectDate || "Select date")}</button></div>{flightFormError ? <p className="text-sm font-semibold text-red-600">{flightFormError}</p> : null}
            {isCalendarOpen ? <div ref={datePickerRef} className={cn("absolute z-30 mt-2 w-[min(94vw,44rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.16)] md:p-5", "md:translate-y-0")} style={{ top: activeDateField === "departure" ? departureFieldRef.current?.offsetTop ? `${departureFieldRef.current.offsetTop + 52}px` : undefined : returnFieldRef.current?.offsetTop ? `${returnFieldRef.current.offsetTop + 52}px` : undefined, left: activeDateField === "departure" ? departureFieldRef.current?.offsetLeft : Math.max(0, (returnFieldRef.current?.offsetLeft || 0) - 320) }}><div className="mb-4 flex items-center justify-between"><button type="button" onClick={() => setCurrentMonth((prev) => addMonths(prev, -1))} className="focus-ring rounded-full border border-slate-200 px-2.5 py-1 text-slate-700 hover:bg-violet-50" aria-label="Previous month">←</button><button type="button" onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))} className="focus-ring rounded-full border border-slate-200 px-2.5 py-1 text-slate-700 hover:bg-violet-50" aria-label="Next month">→</button></div><div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-8"><div className="self-start">{renderMonth(currentMonth)}</div><div className="hidden self-start md:block">{renderMonth(addMonths(currentMonth, 1))}</div></div></div> : null}
<select value={travelers} onChange={(event) => setTravelers(event.target.value)} className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"><option value="1">{t.oneTraveler || "1 Traveler"}</option><option value="2">{t.twoTravelers || "2 Travelers"}</option><option value="3">{t.threeTravelers || "3 Travelers"}</option><option value="4">{t.fourTravelers || "4 Travelers"}</option></select><select value={cabinClass} onChange={(event) => setCabinClass(event.target.value)} className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"><option value="economy">{t.economy || "Economy"}</option><option value="premium-economy">{t.premiumEconomy || "Premium economy"}</option><option value="business">{t.business || "Business"}</option><option value="first">{t.first || "First"}</option></select><Button type="submit" className="h-11 rounded-lg bg-[#5b21d6] font-bold text-white hover:bg-[#4c1d95]">{t.searchFlights || "Search Flights"}</Button></form></> : <form className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(160px,1.2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(100px,0.8fr)_minmax(90px,0.7fr)_140px]" onSubmit={(event) => { event.preventDefault(); const params = new URLSearchParams({ destination, checkIn, checkOut, guests, rooms }); router.push(`/hotels/results?${params.toString()}`); }}><input value={destination} onChange={(event) => setDestination(event.target.value)} required placeholder={t.destination || "Destination"} className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold" /><input type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} required className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold" /><input type="date" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} required className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold" /><select value={guests} onChange={(event) => setGuests(event.target.value)} className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"><option value="1">1 {t.adults || "Adults"}</option><option value="2">2 {t.adults || "Adults"}</option><option value="3">3 {t.adults || "Adults"}</option><option value="4">4 {t.adults || "Adults"}</option></select><select value={rooms} onChange={(event) => setRooms(event.target.value)} className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"><option value="1">1 {t.room || "Room"}</option><option value="2">2 {t.rooms || "Rooms"}</option><option value="3">3 {t.rooms || "Rooms"}</option></select><Button type="submit" className="h-11 rounded-lg bg-[#5b21d6] font-bold text-white hover:bg-[#4c1d95]">{t.searchHotels || "Search Hotels"}</Button></form>}</section>;
}
