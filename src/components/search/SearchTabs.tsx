"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CalendarDays, Hotel, Plane, Repeat2, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Tab = "flights" | "hotels";

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
  const defaults = useMemo(() => ({ guests: "2", rooms: "1" }), []);

  function onFlightSubmit(formData: FormData) {
    const params = new URLSearchParams({
      tripType,
      origin: String(formData.get("origin") || ""),
      destination: String(formData.get("destination") || ""),
      departureDate: String(formData.get("departureDate") || ""),
      returnDate: String(formData.get("returnDate") || ""),
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
    <div className={`w-full rounded-xl border bg-white ${compactHero ? "border-[#f2b203] shadow-[0_14px_45px_rgba(2,36,96,0.16)]" : "border-slate-100 shadow-[0_18px_60px_rgba(15,23,42,0.12)]"}`}>
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
          <div className={`grid overflow-hidden rounded-xl border bg-white md:grid-cols-[1fr_auto_1fr] lg:grid-cols-[1fr_auto_1fr_1fr_1fr_1fr] ${compactHero ? "border-[#f2b203]" : "border-slate-200"}`}>
            <SearchField label={t.from} name="origin" helper={t.cityAirport} placeholder={t.from} />
            <div className="hidden items-center justify-center border-slate-200 px-2 md:flex lg:border-r"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-100 bg-violet-50 text-[#6d28d9]"><Repeat2 size={18} /></span></div>
            <SearchField label={t.to} name="destination" helper={t.cityAirport} placeholder={t.to} />
            <SearchField label={t.departure} name="departureDate" helper={t.selectDate} type="date" icon={<CalendarDays size={17} />} />
            <SearchField label={t.return} name="returnDate" helper={tripType === "one-way" ? t.notNeeded : t.selectDate} type="date" icon={<CalendarDays size={17} />} disabled={tripType === "one-way"} />
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
          <div className={`${compactHero ? "flex justify-end" : "flex justify-center"}`}><Button size="lg" variant="primary" className={`w-full sm:w-auto ${compactHero ? "h-14 rounded-xl bg-[#0057b8] px-16 text-base font-black hover:bg-[#004b9d]" : "bg-[#5b21d6] px-12 hover:bg-[#4c1d95]"}`}><Search size={18} />{t.searchFlights}</Button></div>
        </form>
      ) : (
        <form action={onHotelSubmit} className={`grid gap-6 ${compactHero ? "p-4 sm:p-5" : "p-5 sm:p-7"}`}>
          <div className={`grid overflow-hidden rounded-xl border bg-white md:grid-cols-2 lg:grid-cols-5 ${compactHero ? "border-[#f2b203]" : "border-slate-200"}`}>
            <SearchField label={t.destination} name="destination" helper={t.cityHotelArea} placeholder={t.destination} />
            <SearchField label={t.checkIn} name="checkIn" type="date" helper={t.selectDate} icon={<CalendarDays size={17} />} />
            <SearchField label={t.checkOut} name="checkOut" type="date" helper={t.selectDate} icon={<CalendarDays size={17} />} />
            <SearchField label={t.guests} name="guests" type="number" defaultValue={defaults.guests} helper={t.adults} />
            <SearchField label={t.rooms} name="rooms" type="number" defaultValue={defaults.rooms} helper={t.room} />
          </div>
          <div className={`${compactHero ? "flex justify-end" : "flex justify-center"}`}><Button size="lg" variant="primary" className={`w-full sm:w-auto ${compactHero ? "h-14 rounded-xl bg-[#0057b8] px-16 text-base font-black hover:bg-[#004b9d]" : "bg-[#5b21d6] px-12 hover:bg-[#4c1d95]"}`}><Search size={18} />{t.searchHotels}</Button></div>
        </form>
      )}
    </div>
  );
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
