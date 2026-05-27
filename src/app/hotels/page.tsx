"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

export default function HotelsSearchPage() {
  const router = useRouter();

  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [rooms, setRooms] = useState("1");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedDestination = destination.trim();
    const guestCount = Number(guests);
    const roomCount = Number(rooms);

    if (!trimmedDestination) {
      setError("Please enter a destination.");
      return;
    }

    if (!checkIn) {
      setError("Please select a check-in date.");
      return;
    }

    if (!checkOut) {
      setError("Please select a check-out date.");
      return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      setError("Check-out must be after check-in.");
      return;
    }

    if (Number.isNaN(guestCount) || guestCount < 1 || guestCount > 12) {
      setError("Guests must be between 1 and 12.");
      return;
    }

    if (Number.isNaN(roomCount) || roomCount < 1 || roomCount > 6) {
      setError("Rooms must be between 1 and 6.");
      return;
    }

    const params = new URLSearchParams({
      destination: trimmedDestination,
      checkIn,
      checkOut,
      guests: String(guestCount),
      rooms: String(roomCount),
    });

    setError("");
    router.push(`/hotels/results?${params.toString()}`);
  };

  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 px-4 pb-16 pt-36 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl space-y-8">
          <div className="space-y-3 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              Find stays for your trip
            </h1>
            <p className="mx-auto max-w-2xl text-base text-slate-600 md:text-lg">
              Search hotels by destination, dates, guests, and rooms, then compare available options on the results page.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <label className="block lg:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Destination</span>
                  <input
                    type="text"
                    value={destination}
                    onChange={(event) => setDestination(event.target.value)}
                    placeholder="City, area, or hotel"
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-[16px] text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/40 md:h-11 md:text-sm"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Check-in</span>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(event) => setCheckIn(event.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-[16px] text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/40 md:h-11 md:text-sm"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Check-out</span>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(event) => setCheckOut(event.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-[16px] text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/40 md:h-11 md:text-sm"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Guests</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={guests}
                    onChange={(event) => setGuests(event.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-[16px] text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/40 md:h-11 md:text-sm"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Rooms</span>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={rooms}
                    onChange={(event) => setRooms(event.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-[16px] text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/40 md:h-11 md:text-sm"
                    required
                  />
                </label>
              </div>

              {error ? <p className="text-sm text-rose-600">{error}</p> : null}

              <button
                type="submit"
                className="h-12 rounded-xl bg-indigo-600 px-5 text-[16px] font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/40 md:h-11 md:text-sm"
              >
                Search hotels
              </button>
            </form>
          </div>

          <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
            <p className="rounded-xl border border-slate-200 bg-white p-3">Compare provider offers.</p>
            <p className="rounded-xl border border-slate-200 bg-white p-3">Review stay details.</p>
            <p className="rounded-xl border border-slate-200 bg-white p-3">Continue with the provider.</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
