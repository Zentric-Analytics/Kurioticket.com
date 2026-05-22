"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CalendarDays, Hotel, Plane, Repeat2, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Tab = "flights" | "hotels";

export function SearchTabs() {
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
    <div className="w-full rounded-xl border border-slate-100 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
      <div className="flex w-full max-w-xs overflow-hidden rounded-t-xl border-b border-slate-200 bg-white">
        <button
          type="button"
          className={`focus-ring flex h-16 flex-1 items-center justify-center gap-2 border-b-2 text-base font-extrabold ${tab === "flights" ? "border-[#6d28d9] text-[#6d28d9]" : "border-transparent bg-slate-50 text-slate-700"}`}
          onClick={() => setTab("flights")}
        >
          <Plane size={18} />
          Flights
        </button>
        <button
          type="button"
          className={`focus-ring flex h-16 flex-1 items-center justify-center gap-2 border-b-2 text-base font-extrabold ${tab === "hotels" ? "border-[#6d28d9] text-[#6d28d9]" : "border-transparent bg-slate-50 text-slate-700"}`}
          onClick={() => setTab("hotels")}
        >
          <Building2 size={18} />
          Hotels
        </button>
      </div>

      {tab === "flights" ? (
        <form action={onFlightSubmit} className="grid gap-6 p-5 sm:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="grid grid-cols-1 gap-3 text-sm font-bold text-slate-700 sm:flex">
            {["round-trip", "one-way", "multi-city"].map((value) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 capitalize">
                <input
                  type="radio"
                  name="tripType"
                  checked={tripType === value}
                  onChange={() => setTripType(value)}
                  className="h-4 w-4 accent-[#6d28d9]"
                />
                {value.replace("-", " ")}
              </label>
            ))}
            </div>
            <button type="button" onClick={() => setTab("hotels")} className="focus-ring inline-flex items-center gap-2 text-sm font-extrabold text-[#6d28d9]">
              <Hotel size={17} />
              Search hotels instead
            </button>
          </div>
          <div className="grid overflow-hidden rounded-xl border border-slate-200 bg-white md:grid-cols-[1fr_auto_1fr] lg:grid-cols-[1fr_auto_1fr_1fr_1fr_1fr]">
            <SearchField label="From" name="origin" helper="City or airport" placeholder="From city or airport" />
            <div className="hidden items-center justify-center border-slate-200 px-2 md:flex lg:border-r">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-100 bg-violet-50 text-[#6d28d9]">
                <Repeat2 size={18} />
              </span>
            </div>
            <SearchField label="To" name="destination" helper="City or airport" placeholder="To city or airport" />
            <SearchField label="Departure date" name="departureDate" helper="Choose departure date" placeholder="YYYY-MM-DD" type="date" icon={<CalendarDays size={17} />} />
            <SearchField label="Return date" name="returnDate" helper={tripType === "one-way" ? "Not needed" : "Choose return date"} placeholder="YYYY-MM-DD" type="date" icon={<CalendarDays size={17} />} disabled={tripType === "one-way"} />
            <label className="block border-t border-slate-200 p-4 lg:border-l lg:border-t-0">
              <span className="block text-xs font-bold text-slate-600">Travelers & Class</span>
              <select name="travelers" defaultValue="1" className="mt-2 w-full bg-transparent text-lg font-extrabold text-slate-950 outline-none">
                <option value="1">1 Traveler</option>
                <option value="2">2 Travelers</option>
                <option value="3">3 Travelers</option>
                <option value="4">4 Travelers</option>
              </select>
              <select name="cabinClass" defaultValue="economy" className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-600 outline-none">
                <option value="economy">Economy</option>
                <option value="premium-economy">Premium economy</option>
                <option value="business">Business</option>
                <option value="first">First</option>
              </select>
            </label>
          </div>
          <div className="flex justify-center">
            <Button size="lg" variant="primary" className="w-full bg-[#5b21d6] px-12 hover:bg-[#4c1d95] sm:w-auto">
              <Search size={18} />
              Search Flights
            </Button>
          </div>
        </form>
      ) : (
        <form action={onHotelSubmit} className="grid gap-6 p-5 sm:p-7">
          <div className="grid overflow-hidden rounded-xl border border-slate-200 bg-white md:grid-cols-2 lg:grid-cols-5">
            <SearchField label="Destination" name="destination" helper="City or hotel area" placeholder="Destination" />
            <SearchField label="Check-in" name="checkIn" type="date" helper="Select date" icon={<CalendarDays size={17} />} />
            <SearchField label="Check-out" name="checkOut" type="date" helper="Select date" icon={<CalendarDays size={17} />} />
            <SearchField label="Guests" name="guests" type="number" defaultValue={defaults.guests} helper="Adults" />
            <SearchField label="Rooms" name="rooms" type="number" defaultValue={defaults.rooms} helper="Room" />
          </div>
          <div className="flex justify-center">
            <Button size="lg" variant="primary" className="w-full bg-[#5b21d6] px-12 hover:bg-[#4c1d95] sm:w-auto">
              <Search size={18} />
              Search Hotels
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function SearchField({
  label,
  name,
  defaultValue,
  helper,
  placeholder,
  type = "text",
  icon,
  disabled,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  helper: string;
  placeholder?: string;
  type?: string;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="block border-t border-slate-200 p-4 first:border-t-0 md:border-l md:border-t-0 md:first:border-l-0">
      <span className="flex items-center justify-between gap-2 text-xs font-bold text-slate-600">
        {label}
        {icon ? <span className="text-[#6d28d9]">{icon}</span> : null}
      </span>
      <Input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        disabled={disabled}
        required={!disabled}
        className="mt-1 h-9 border-0 bg-transparent px-0 text-lg font-extrabold uppercase shadow-none placeholder:text-slate-400 focus-visible:shadow-none"
      />
      <span className="block truncate text-sm font-semibold text-slate-600">{helper}</span>
    </label>
  );
}
