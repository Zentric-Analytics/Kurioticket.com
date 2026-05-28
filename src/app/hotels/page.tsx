"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().split("T")[0];
};

export default function HotelsSearchPage() {
  const router = useRouter();

  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [rooms, setRooms] = useState("1");
  const [error, setError] = useState("");

  const popularCityLinks = useMemo(() => {
    const baseDate = new Date();
    const defaultCheckIn = addDays(baseDate, 21);
    const defaultCheckOut = addDays(baseDate, 24);
    const cities = ["Tokyo", "London", "Paris", "New York", "Dubai", "Singapore"];

    return cities.map((city) => ({
      city,
      href: `/hotels/results?${new URLSearchParams({
        destination: city,
        checkIn: defaultCheckIn,
        checkOut: defaultCheckOut,
        guests: "2",
        rooms: "1",
      }).toString()}`,
    }));
  }, []);

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
      <main className="page-shell flex-1 bg-gradient-to-b from-indigo-50/70 via-white to-white px-4 pb-16 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-10 md:space-y-12">
          <section className="relative overflow-hidden rounded-3xl border border-indigo-100/70 bg-gradient-to-br from-indigo-100/65 via-white to-violet-100/55 px-6 py-10 shadow-[0_20px_60px_-36px_rgba(79,70,229,0.55)] md:px-10 md:py-14">
            <div className="pointer-events-none absolute -left-12 top-4 h-44 w-44 rounded-full bg-indigo-300/25 blur-3xl" />
            <div className="pointer-events-none absolute right-0 top-10 h-40 w-40 rounded-full bg-violet-300/25 blur-3xl" />
            <div className="relative mx-auto max-w-3xl space-y-3 text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">Find stays for your trip</h1>
              <p className="text-base text-slate-600 md:text-lg">
                Search hotels by destination, dates, guests, and rooms, then compare available options on the results page.
              </p>
            </div>
          </section>

          <section className="mx-auto w-full max-w-5xl space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="overflow-visible rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_10px_28px_rgba(15,23,42,0.10)]">
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,1.15fr)_112px]">
                  <label className="rounded-xl border border-transparent bg-white px-3 py-2.5 transition hover:border-slate-200 focus-within:border-indigo-200 focus-within:bg-indigo-50/20">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Destination</span>
                    <input type="text" value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="City, area, or hotel" className="mt-1 h-7 w-full border-none bg-transparent p-0 text-[16px] text-slate-900 placeholder:text-slate-400 focus:outline-none md:text-sm" required />
                  </label>

                  <div className="rounded-xl border border-transparent bg-white px-3 py-2.5 transition hover:border-slate-200 focus-within:border-indigo-200 focus-within:bg-indigo-50/20">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Dates</span>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <label className="min-w-0">
                        <span className="sr-only">Check-in</span>
                        <input type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} className="h-7 w-full min-w-0 border-none bg-transparent p-0 text-[16px] text-slate-900 focus:outline-none md:text-sm" required />
                      </label>
                      <label className="min-w-0">
                        <span className="sr-only">Check-out</span>
                        <input type="date" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} className="h-7 w-full min-w-0 border-none bg-transparent p-0 text-[16px] text-slate-900 focus:outline-none md:text-sm" required />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-xl border border-transparent bg-white px-3 py-2.5 transition hover:border-slate-200 focus-within:border-indigo-200 focus-within:bg-indigo-50/20">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Guests / Rooms</span>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <label className="min-w-0">
                        <span className="sr-only">Guests</span>
                        <input type="number" min={1} max={12} value={guests} onChange={(event) => setGuests(event.target.value)} className="h-7 w-full min-w-0 border-none bg-transparent p-0 text-[16px] text-slate-900 focus:outline-none md:text-sm" required />
                      </label>
                      <label className="min-w-0">
                        <span className="sr-only">Rooms</span>
                        <input type="number" min={1} max={6} value={rooms} onChange={(event) => setRooms(event.target.value)} className="h-7 w-full min-w-0 border-none bg-transparent p-0 text-[16px] text-slate-900 focus:outline-none md:text-sm" required />
                      </label>
                    </div>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-1">
                    <button type="submit" className="h-full min-h-12 w-full rounded-xl bg-indigo-600 px-3 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40">
                      Find stays
                    </button>
                  </div>
                </div>
              </div>

              {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
            </form>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.5)]">
              <p className="text-sm font-medium text-slate-800">Compare provider offers</p>
              <p className="mt-1 text-sm text-slate-600">View hotel options from travel providers in one place.</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.5)]">
              <p className="text-sm font-medium text-slate-800">Review stay details</p>
              <p className="mt-1 text-sm text-slate-600">Check dates, guests, rooms, and pricing context before continuing.</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.5)]">
              <p className="text-sm font-medium text-slate-800">Continue with the provider</p>
              <p className="mt-1 text-sm text-slate-600">Choose an option, then complete booking with the provider.</p>
            </article>
          </section>

          <section className="space-y-3 rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-[0_12px_36px_-28px_rgba(15,23,42,0.5)] md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900 md:text-lg">Popular city stays</h2>
              <p className="text-sm text-slate-500">Quick start with common destinations</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {popularCityLinks.map((item) => (
                <Link key={item.city} href={item.href} className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100">
                  {item.city}
                </Link>
              ))}
            </div>
          </section>

          <section>
            <ol className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
              <li className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">1. Search your destination and dates</li>
              <li className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">2. Compare available hotel options</li>
              <li className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">3. Continue with the provider to complete booking</li>
            </ol>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
