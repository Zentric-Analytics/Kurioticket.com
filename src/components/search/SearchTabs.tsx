"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, CalendarDays, MapPin, Plane, Search, Users } from "lucide-react";


type Tab = "flights" | "hotels";

export function SearchTabs() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("flights");

  function onFlightSubmit(formData: FormData) {
    const params = new URLSearchParams({
      tripType: "round-trip",
      origin: "",
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
      checkIn: String(formData.get("departureDate") || ""),
      checkOut: String(formData.get("returnDate") || ""),
      guests: String(formData.get("travelers") || "2"),
      rooms: "1",
    });

    router.push(`/hotels/results?${params.toString()}`);
  }

  return (
    <div className="w-full">
      <div className="mb-3 inline-flex rounded-full border border-violet-100 bg-white p-1 shadow-sm">
        <button
          type="button"
          className={`focus-ring inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition ${tab === "flights" ? "bg-[#6d28d9] text-white" : "text-slate-700 hover:bg-slate-100"}`}
          onClick={() => setTab("flights")}
        >
          <Plane size={16} />
          Flights
        </button>
        <button
          type="button"
          className={`focus-ring inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition ${tab === "hotels" ? "bg-[#6d28d9] text-white" : "text-slate-700 hover:bg-slate-100"}`}
          onClick={() => setTab("hotels")}
        >
          <BedDouble size={16} />
          Hotels
        </button>
      </div>

      <form
        action={tab === "flights" ? onFlightSubmit : onHotelSubmit}
        className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto]"
      >
        <FieldWrap icon={<MapPin size={18} />} label="Destination">
          <input
            name="destination"
            placeholder={tab === "flights" ? "Where to?" : "City, area, or hotel"}
            required
            className="h-7 w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400"
          />
        </FieldWrap>

        <FieldWrap icon={<CalendarDays size={18} />} label={tab === "flights" ? "Dates" : "Check-in / Check-out"}>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              name="departureDate"
              aria-label={tab === "flights" ? "Departure date" : "Check-in date"}
              required
              className="h-7 w-full bg-transparent text-sm font-semibold text-slate-950 outline-none"
            />
            <input
              type="date"
              name="returnDate"
              aria-label={tab === "flights" ? "Return date" : "Check-out date"}
              required
              className="h-7 w-full bg-transparent text-sm font-semibold text-slate-950 outline-none"
            />
          </div>
        </FieldWrap>

        <FieldWrap icon={<Users size={18} />} label={tab === "flights" ? "Travelers & Class" : "Guests"}>
          <div className="grid grid-cols-2 gap-2">
            <select name="travelers" defaultValue="1" className="h-7 w-full bg-transparent text-sm font-semibold text-slate-950 outline-none">
              <option value="1">1 Traveler</option>
              <option value="2">2 Travelers</option>
              <option value="3">3 Travelers</option>
              <option value="4">4 Travelers</option>
            </select>
            <select
              name="cabinClass"
              defaultValue="economy"
              disabled={tab === "hotels"}
              className="h-7 w-full bg-transparent text-sm font-semibold text-slate-950 outline-none disabled:text-slate-400"
            >
              <option value="economy">Economy</option>
              <option value="premium-economy">Premium</option>
              <option value="business">Business</option>
              <option value="first">First</option>
            </select>
          </div>
        </FieldWrap>

        <button
          type="submit"
          className="focus-ring inline-flex h-[84px] w-full items-center justify-center gap-2 rounded-2xl bg-[#5b21d6] px-7 text-base font-black text-white transition hover:bg-[#4c1d95] lg:h-auto"
        >
          <Search size={18} />
          Search
        </button>
      </form>
    </div>
  );
}

function FieldWrap({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="flex min-h-[84px] flex-col justify-center rounded-2xl border border-violet-100 bg-white px-4 shadow-sm">
      <span className="mb-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        <span className="text-[#6d28d9]">{icon}</span>
        {label}
      </span>
      {children}
    </label>
  );
}
