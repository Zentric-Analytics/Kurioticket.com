"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Calendar, ChevronDown, Minus, Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().split("T")[0];
};

const formatShortDate = (isoDate: string) => {
  if (!isoDate) return "";

  const [year, month, day] = isoDate.split("-");

  if (!year || !month || !day) return "";

  const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));

  if (Number.isNaN(parsedDate.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsedDate);
};

const clampNumber = (value: string, min: number, max: number) => {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) return min;

  return Math.max(min, Math.min(max, parsed));
};

export default function HotelsSearchPage() {
  const router = useRouter();

  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [rooms, setRooms] = useState("1");
  const [error, setError] = useState("");
  const [datesOpen, setDatesOpen] = useState(false);
  const [guestsRoomsOpen, setGuestsRoomsOpen] = useState(false);

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

  const travelDatesSummary = useMemo(() => {
    const checkInSummary = formatShortDate(checkIn);
    const checkOutSummary = formatShortDate(checkOut);

    if (!checkInSummary) return "Travel dates";
    if (checkOutSummary) return `${checkInSummary} — ${checkOutSummary}`;

    return checkInSummary;
  }, [checkIn, checkOut]);

  const guestsRoomsSummary = useMemo(() => {
    const normalizedGuests = clampNumber(guests, 1, 12);
    const normalizedRooms = clampNumber(rooms, 1, 6);

    return `${normalizedGuests} ${normalizedGuests === 1 ? "guest" : "guests"} · ${normalizedRooms} ${normalizedRooms === 1 ? "room" : "rooms"}`;
  }, [guests, rooms]);

  const updateGuests = (nextValue: number) => {
    setGuests(String(Math.max(1, Math.min(12, nextValue))));
  };

  const updateRooms = (nextValue: number) => {
    setRooms(String(Math.max(1, Math.min(6, nextValue))));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedDestination = destination.trim();
    const parsedGuests = Number.parseInt(guests, 10);
    const parsedRooms = Number.parseInt(rooms, 10);
    const normalizedGuests = Number.isNaN(parsedGuests) ? 1 : Math.max(1, Math.min(12, parsedGuests));
    const normalizedRooms = Number.isNaN(parsedRooms) ? 1 : Math.max(1, Math.min(6, parsedRooms));

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

    const params = new URLSearchParams({
      destination: trimmedDestination,
      checkIn,
      checkOut,
      guests: String(normalizedGuests),
      rooms: String(normalizedRooms),
    });

    setGuests(String(normalizedGuests));
    setRooms(String(normalizedRooms));
    setError("");
    router.push(`/hotels/results?${params.toString()}`);
  };

  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 bg-gradient-to-b from-indigo-50/70 via-white to-white px-4 pb-16 pt-8 sm:pt-10 sm:px-6 lg:px-8 lg:pt-12">
        <div className="mx-auto max-w-6xl space-y-8 md:space-y-10">
          <section className="mx-auto w-full max-w-6xl space-y-3">
            <p className="px-1 text-sm font-medium text-slate-600">Find available stays</p>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="overflow-visible rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_10px_28px_rgba(15,23,42,0.10)]">
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,1.15fr)_112px]">
                  <label className="min-h-[54px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:rounded-l-xl lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0">
                    <span className="mb-1 block text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600">Destination</span>
                    <input
                      type="text"
                      value={destination}
                      onChange={(event) => setDestination(event.target.value)}
                      placeholder="City, area, or hotel"
                      className="h-8 w-full rounded-md border-0 bg-transparent px-0 text-[16px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:outline-none md:text-sm"
                      required
                    />
                  </label>

                  <div className="relative min-h-[54px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0">
                    <span className="mb-1 block text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600">Travel dates</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDatesOpen((prev) => !prev);
                        setGuestsRoomsOpen(false);
                      }}
                      aria-expanded={datesOpen}
                      aria-haspopup="dialog"
                      aria-label="Choose travel dates"
                      className="flex h-8 w-full items-center gap-2 rounded-md border-0 bg-transparent px-0 text-left text-[16px] text-slate-900 outline-none transition-colors focus:outline-none md:text-sm"
                    >
                      <Calendar size={16} className="shrink-0 text-slate-500" />
                      <span className="truncate">{travelDatesSummary}</span>
                    </button>

                    {datesOpen ? (
                      <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 w-full rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_20px_45px_rgba(15,23,42,0.16)] sm:right-auto sm:w-[min(92vw,360px)] sm:p-4">
                        <p className="text-sm font-semibold text-slate-900">Choose travel dates</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="min-w-0">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Check-in</span>
                            <input
                              type="date"
                              value={checkIn}
                              onChange={(event) => setCheckIn(event.target.value)}
                              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[16px] text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 md:text-sm"
                              required
                            />
                          </label>
                          <label className="min-w-0">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Check-out</span>
                            <input
                              type="date"
                              value={checkOut}
                              onChange={(event) => setCheckOut(event.target.value)}
                              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[16px] text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 md:text-sm"
                              required
                            />
                          </label>
                        </div>
                        <div className="mt-4 flex items-center justify-end border-t border-slate-200 pt-3">
                          <button
                            type="button"
                            onClick={() => setDatesOpen(false)}
                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-700/40"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="relative min-h-[54px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0">
                    <span className="mb-1 block text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600">Guests / Rooms</span>
                    <button
                      type="button"
                      onClick={() => {
                        setGuestsRoomsOpen((prev) => !prev);
                        setDatesOpen(false);
                      }}
                      aria-expanded={guestsRoomsOpen}
                      aria-haspopup="dialog"
                      aria-label="Choose guests and rooms"
                      className="flex h-8 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent px-0 text-left text-[16px] text-slate-900 outline-none transition-colors focus:outline-none md:text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Users size={16} className="shrink-0 text-slate-500" />
                        <span className="truncate">{guestsRoomsSummary}</span>
                      </span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${guestsRoomsOpen ? "rotate-180" : ""}`} />
                    </button>

                    {guestsRoomsOpen ? (
                      <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 w-full rounded-xl border border-slate-200 bg-white p-3 shadow-[0_14px_32px_rgba(15,23,42,0.14)] sm:right-auto sm:w-[min(92vw,320px)]">
                        <div className="space-y-3">
                          {[
                            {
                              key: "guests",
                              label: "Guests",
                              value: clampNumber(guests, 1, 12),
                              min: 1,
                              max: 12,
                              onDecrement: () => updateGuests(clampNumber(guests, 1, 12) - 1),
                              onIncrement: () => updateGuests(clampNumber(guests, 1, 12) + 1),
                            },
                            {
                              key: "rooms",
                              label: "Rooms",
                              value: clampNumber(rooms, 1, 6),
                              min: 1,
                              max: 6,
                              onDecrement: () => updateRooms(clampNumber(rooms, 1, 6) - 1),
                              onIncrement: () => updateRooms(clampNumber(rooms, 1, 6) + 1),
                            },
                          ].map((row) => {
                            const canDecrement = row.value > row.min;
                            const canIncrement = row.value < row.max;

                            return (
                              <div key={row.key} className="flex items-center justify-between gap-3">
                                <span className="text-sm font-semibold text-slate-900">{row.label}</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={row.onDecrement}
                                    disabled={!canDecrement}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className="min-w-6 text-center text-sm font-semibold text-slate-900">{row.value}</span>
                                  <button
                                    type="button"
                                    onClick={row.onIncrement}
                                    disabled={!canIncrement}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 flex justify-end border-t border-slate-200 pt-3">
                          <button
                            type="button"
                            onClick={() => setGuestsRoomsOpen(false)}
                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-700/40"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="sm:col-span-2 lg:col-span-1">
                    <button type="submit" className="h-full min-h-12 w-full rounded-xl bg-indigo-600 px-3 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 active:bg-indigo-700">
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
