"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, CalendarDays, Plane, Search } from "lucide-react";

type Tab = "flights" | "hotels";
type TripType = "round-trip" | "one-way" | "multi-city";

export function SearchTabs() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("flights");
  const [tripType, setTripType] = useState<TripType>("round-trip");

  function onFlightSubmit(formData: FormData) {
    const params = new URLSearchParams({
      tripType,
      origin: "LOS",
      destination: "DXB",
      departureDate: "2026-06-11",
      returnDate: "2026-06-17",
      travelers: String(formData.get("travelers") || "1"),
      cabinClass: String(formData.get("cabinClass") || "economy"),
    });

    router.push(`/flights/results?${params.toString()}`);
  }

  function onHotelSubmit() {
    const params = new URLSearchParams({
      destination: "Dubai, UAE",
      checkIn: "2026-06-11",
      checkOut: "2026-06-17",
      guests: "1",
      rooms: "1",
    });

    router.push(`/hotels/results?${params.toString()}`);
  }

  return (
    <div className="w-full">
      <div className="mb-2 inline-flex rounded-full border border-violet-100 bg-white p-1 shadow-sm">
        <button
          type="button"
          className={`focus-ring inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition ${tab === "flights" ? "bg-[#6d28d9] text-white" : "text-slate-700 hover:bg-slate-100"}`}
          onClick={() => setTab("flights")}
        >
          <Plane size={15} />
          Flights
        </button>
        <button
          type="button"
          className={`focus-ring inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition ${tab === "hotels" ? "bg-[#6d28d9] text-white" : "text-slate-700 hover:bg-slate-100"}`}
          onClick={() => setTab("hotels")}
        >
          <BedDouble size={15} />
          Hotels
        </button>
      </div>

      {tab === "flights" ? (
        <form action={onFlightSubmit} className="space-y-2">
          <div className="grid grid-cols-1 gap-2 text-xs font-bold text-slate-700 sm:flex sm:gap-4">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="tripType" checked={tripType === "round-trip"} onChange={() => setTripType("round-trip")} className="h-4 w-4 accent-[#6d28d9]" />
              Round Trip
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="tripType" checked={tripType === "one-way"} onChange={() => setTripType("one-way")} className="h-4 w-4 accent-[#6d28d9]" />
              One Way
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="tripType" checked={tripType === "multi-city"} onChange={() => setTripType("multi-city")} className="h-4 w-4 accent-[#6d28d9]" />
              Multi City
            </label>
          </div>

          <div className="grid overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
            <FlightField label="FROM" value="LOS" subtext="Lagos, Nigeria" />
            <FlightField label="TO" value="DXB" subtext="Dubai, UAE" />
            <DateFlightField label="DEPARTURE" value="Jun 11, 2026" subtext="Thursday" />
            <DateFlightField label="RETURN" value="Jun 17, 2026" subtext="Wednesday" />
            <FlightField label="TRAVELERS & CLASS" value="1 Traveler" subtext="Economy" />

            <div className="p-2">
              <button
                type="submit"
                className="focus-ring inline-flex h-full min-h-[72px] w-full items-center justify-center gap-2 rounded-xl bg-[#5b21d6] px-6 text-sm font-black text-white transition hover:bg-[#4c1d95]"
              >
                <Search size={16} />
                Search Flights
              </button>
            </div>
          </div>

          <input type="hidden" name="travelers" value="1" />
          <input type="hidden" name="cabinClass" value="economy" />
        </form>
      ) : (
        <div className="rounded-2xl border border-violet-100 bg-white p-3 shadow-sm">
          <button
            type="button"
            onClick={onHotelSubmit}
            className="focus-ring inline-flex h-11 items-center justify-center rounded-xl bg-[#5b21d6] px-5 text-sm font-black text-white transition hover:bg-[#4c1d95]"
          >
            Search Hotels
          </button>
        </div>
      )}
    </div>
  );
}

function FlightField({ label, value, subtext }: { label: string; value: string; subtext: string }) {
  return (
    <div className="flex min-h-[72px] flex-col justify-center border-t border-violet-100 px-3 py-2 first:border-t-0 lg:border-l lg:border-t-0 lg:first:border-l-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <span className="mt-0.5 text-lg font-black leading-tight text-slate-950">{value}</span>
      <span className="text-xs font-semibold text-slate-600">{subtext}</span>
    </div>
  );
}


function DateFlightField({ label, value, subtext }: { label: string; value: string; subtext: string }) {
  return (
    <div className="flex min-h-[72px] flex-col justify-center border-t border-violet-100 px-3.5 py-2.5 first:border-t-0 lg:border-l lg:border-t-0 lg:first:border-l-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <div className="mt-1 inline-flex items-center gap-2.5">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-50 text-[#6d28d9]">
          <CalendarDays size={14} />
        </span>
        <span className="text-[17px] font-black leading-tight text-slate-950">{value}</span>
      </div>
      <span className="mt-1 text-xs font-semibold text-slate-600">{subtext}</span>
    </div>
  );
}
