"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, Plane } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type SearchTabsProps = {
  t: Record<string, string>;
  compactHero?: boolean;
};

type TabMode = "flights" | "hotels";

export function SearchTabs({ t, compactHero = false }: SearchTabsProps) {
  const router = useRouter();
  const [tab, setTab] = useState<TabMode>("flights");

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

  const wrapper = useMemo(
    () =>
      cn(
        "rounded-2xl border border-slate-200 bg-white p-3 sm:p-4",
        compactHero
          ? "shadow-none border-transparent bg-transparent p-0"
          : "shadow-sm"
      ),
    [compactHero]
  );

  return (
    <section className={wrapper}>
      <div className="mb-3 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setTab("flights")}
          className={cn(
            "focus-ring inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold",
            tab === "flights"
              ? "bg-white text-navy shadow-sm"
              : "text-slate-600"
          )}
        >
          <Plane size={16} />
          {t.flights || "Flights"}
        </button>

        <button
          type="button"
          onClick={() => setTab("hotels")}
          className={cn(
            "focus-ring inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold",
            tab === "hotels"
              ? "bg-white text-navy shadow-sm"
              : "text-slate-600"
          )}
        >
          <BedDouble size={16} />
          {t.hotels || "Hotels"}
        </button>
      </div>

      {tab === "flights" ? (
        <form
          className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(130px,1fr)_minmax(130px,1fr)_140px]"
          onSubmit={(event) => {
            event.preventDefault();

            const params = new URLSearchParams({
              tripType: "round-trip",
              origin: from.trim(),
              destination: to.trim(),
              departureDate,
              returnDate,
              travelers,
              cabinClass,
            });

            router.push(`/flights/results?${params.toString()}`);
          }}
        >
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            required
            placeholder={t.from || "From"}
            className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
          />

          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
            placeholder={t.to || "To"}
            className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
          />

          <input
            type="date"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
            className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
          />

          <input
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
          />

          <select
            value={travelers}
            onChange={(e) => setTravelers(e.target.value)}
            className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
          >
            <option value="1">1 Traveler</option>
            <option value="2">2 Travelers</option>
            <option value="3">3 Travelers</option>
            <option value="4">4 Travelers</option>
          </select>

          <select
            value={cabinClass}
            onChange={(e) => setCabinClass(e.target.value)}
            className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
          >
            <option value="economy">Economy</option>
            <option value="premium-economy">Premium economy</option>
            <option value="business">Business</option>
            <option value="first">First</option>
          </select>

          <Button type="submit" className="h-11 rounded-lg bg-[#5b21d6] text-white font-bold hover:bg-[#4c1d95]">
            {t.searchFlights || "Search Flights"}
          </Button>
        </form>
      ) : (
        <form
          className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(160px,1.2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(100px,0.8fr)_minmax(90px,0.7fr)_140px]"
          onSubmit={(event) => {
            event.preventDefault();

            const params = new URLSearchParams({
              destination,
              checkIn,
              checkOut,
              guests,
              rooms,
            });

            router.push(`/hotels/results?${params.toString()}`);
          }}
        >
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
            placeholder={t.destination || "Destination"}
            className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
          />

          <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />

          <select value={guests} onChange={(e) => setGuests(e.target.value)}>
            <option value="1">1 Adults</option>
            <option value="2">2 Adults</option>
            <option value="3">3 Adults</option>
            <option value="4">4 Adults</option>
          </select>

          <select value={rooms} onChange={(e) => setRooms(e.target.value)}>
            <option value="1">1 Room</option>
            <option value="2">2 Rooms</option>
            <option value="3">3 Rooms</option>
          </select>

          <Button type="submit" className="h-11 rounded-lg bg-[#5b21d6] text-white font-bold hover:bg-[#4c1d95]">
            {t.searchHotels || "Search Hotels"}
          </Button>
        </form>
      )}
    </section>
  );
}