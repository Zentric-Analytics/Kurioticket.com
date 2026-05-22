"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { type DateRange } from "react-day-picker";
import { useState } from "react";

import { DateRangePicker } from "@/components/search/DateRangePicker";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type TabMode = "flights" | "hotels";

type TripType = "round-trip" | "one-way" | "multi-city";

type SearchTabsProps = {
  t: Record<string, string>;
  compactHero?: boolean;
};

export function SearchTabs({ t, compactHero = false }: SearchTabsProps) {
  const router = useRouter();

  const [tab, setTab] = useState<TabMode>("flights");
  const [tripType, setTripType] = useState<TripType>("round-trip");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [flightDateRange, setFlightDateRange] = useState<DateRange | undefined>();
  const [travelers, setTravelers] = useState("1");
  const [cabinClass, setCabinClass] = useState("economy");

  const [destination, setDestination] = useState("");
  const [hotelDateRange, setHotelDateRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState("1");
  const [rooms, setRooms] = useState("1");
  const departureDate = flightDateRange?.from ? format(flightDateRange.from, "yyyy-MM-dd") : "";
  const returnDate = flightDateRange?.to ? format(flightDateRange.to, "yyyy-MM-dd") : "";
  const checkIn = hotelDateRange?.from ? format(hotelDateRange.from, "yyyy-MM-dd") : "";
  const checkOut = hotelDateRange?.to ? format(hotelDateRange.to, "yyyy-MM-dd") : "";


  const wrapper = cn(
    "rounded-2xl bg-white",
    compactHero ? "p-0" : "border border-slate-200 p-4",
  );

  const tripTypeLabel = (mode: TripType) => {
    if (mode === "round-trip") {
      return t.tripRound || "Round-trip";
    }

    if (mode === "one-way") {
      return t.tripOneWay || "One-way";
    }

    return t.tripMulti || "Multi-city";
  };

  return (
    <section className={wrapper}>
      <div className="mb-3 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setTab("flights")}
          className={cn(
            "focus-ring inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold",
            tab === "flights" ? "bg-white text-navy shadow-sm" : "text-slate-600",
          )}
        >
          {t.flights || "Flights"}
        </button>

        <button
          type="button"
          onClick={() => setTab("hotels")}
          className={cn(
            "focus-ring inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold",
            tab === "hotels" ? "bg-white text-navy shadow-sm" : "text-slate-600",
          )}
        >
          {t.hotels || "Hotels"}
        </button>
      </div>

      {tab === "flights" ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
            {(["round-trip", "one-way", "multi-city"] as TripType[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTripType(mode)}
                className={cn(
                  "focus-ring rounded-full px-3 py-1.5 capitalize",
                  tripType === mode ? "bg-violet-100 text-[#5b21d6]" : "bg-slate-100 text-slate-700",
                )}
              >
                {tripTypeLabel(mode)}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setTab("hotels")}
              className="ml-auto text-[#5b21d6] underline-offset-2 hover:underline"
            >
              {t.searchHotelsInstead || "Search hotels instead"}
            </button>
          </div>

          <form
            className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(130px,1fr)_minmax(130px,1fr)_140px]"
            onSubmit={(event) => {
              event.preventDefault();

              const params = new URLSearchParams({
                tripType,
                origin: from.trim(),
                destination: to.trim(),
                departureDate,
                returnDate: tripType === "one-way" ? "" : returnDate,
                travelers,
                cabinClass,
              });

              router.push(`/flights/results?${params.toString()}`);
            }}
          >
            <input
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              required
              placeholder={t.from || "From"}
              className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
            />

            <input
              value={to}
              onChange={(event) => setTo(event.target.value)}
              required
              placeholder={t.to || "To"}
              className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
            />

            <DateRangePicker
              label={t.departure || "Departure"}
              placeholder={t.departure || "Departure"}
              value={flightDateRange}
              onChange={setFlightDateRange}
            />

            <DateRangePicker
              label={t.return || "Return"}
              placeholder={tripType === "one-way" ? t.notNeeded || "Not needed" : t.return || "Return"}
              value={flightDateRange}
              onChange={setFlightDateRange}
              disabled={tripType === "one-way"}
            />

            <select
              value={travelers}
              onChange={(event) => setTravelers(event.target.value)}
              className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
            >
              <option value="1">{t.oneTraveler || "1 Traveler"}</option>
              <option value="2">{t.twoTravelers || "2 Travelers"}</option>
              <option value="3">{t.threeTravelers || "3 Travelers"}</option>
              <option value="4">{t.fourTravelers || "4 Travelers"}</option>
            </select>

            <select
              value={cabinClass}
              onChange={(event) => setCabinClass(event.target.value)}
              className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
            >
              <option value="economy">{t.economy || "Economy"}</option>
              <option value="premium-economy">{t.premiumEconomy || "Premium economy"}</option>
              <option value="business">{t.business || "Business"}</option>
              <option value="first">{t.first || "First"}</option>
            </select>

            <Button
              type="submit"
              className="h-11 rounded-lg bg-[#5b21d6] font-bold text-white hover:bg-[#4c1d95]"
            >
              {t.searchFlights || "Search Flights"}
            </Button>
          </form>
        </>
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
            onChange={(event) => setDestination(event.target.value)}
            required
            placeholder={t.destination || "Destination"}
            className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
          />

          <DateRangePicker
            label={t.checkIn || "Check-in"}
            placeholder={t.checkIn || "Check-in"}
            value={hotelDateRange}
            onChange={setHotelDateRange}
          />

          <DateRangePicker
            label={t.checkOut || "Check-out"}
            placeholder={t.checkOut || "Check-out"}
            value={hotelDateRange}
            onChange={setHotelDateRange}
          />

          <select
            value={guests}
            onChange={(event) => setGuests(event.target.value)}
            className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
          >
            <option value="1">1 {t.adults || "Adults"}</option>
            <option value="2">2 {t.adults || "Adults"}</option>
            <option value="3">3 {t.adults || "Adults"}</option>
            <option value="4">4 {t.adults || "Adults"}</option>
          </select>

          <select
            value={rooms}
            onChange={(event) => setRooms(event.target.value)}
            className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
          >
            <option value="1">1 {t.room || "Room"}</option>
            <option value="2">2 {t.rooms || "Rooms"}</option>
            <option value="3">3 {t.rooms || "Rooms"}</option>
          </select>

          <Button
            type="submit"
            className="h-11 rounded-lg bg-[#5b21d6] font-bold text-white hover:bg-[#4c1d95]"
          >
            {t.searchHotels || "Search Hotels"}
          </Button>
        </form>
      )}
    </section>
  );
}
