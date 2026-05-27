"use client";

import { useMemo, useState, type FormEvent } from "react";

import { useRouter } from "next/navigation";

import { BadgeCheck, BedDouble, ShieldCheck } from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

const toIsoDate = (date: Date) => date.toISOString().split("T")[0];

export default function HotelsLandingPage() {
  const router = useRouter();
  const todayIso = useMemo(() => toIsoDate(new Date()), []);
  const tomorrowIso = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return toIsoDate(tomorrow);
  }, []);

  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState(todayIso);
  const [checkOut, setCheckOut] = useState(tomorrowIso);
  const [guests, setGuests] = useState("2");
  const [rooms, setRooms] = useState("1");
  const [formError, setFormError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!destination.trim() || !checkIn || !checkOut) {
      setFormError("Please complete destination and stay dates to continue.");
      return;
    }

    if (checkOut <= checkIn) {
      setFormError("Check-out must be after check-in.");
      return;
    }

    const normalizedGuests = Math.max(1, Number(guests) || 1);
    const normalizedRooms = Math.max(1, Number(rooms) || 1);

    const params = new URLSearchParams({
      destination: destination.trim(),
      checkIn,
      checkOut,
      guests: String(normalizedGuests),
      rooms: String(normalizedRooms),
    });

    setFormError("");
    router.push(`/hotels/results?${params.toString()}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-indigo-50/70 via-white to-violet-50/50 text-slate-900">
      <AppHeader />

      <main className="flex-1 pb-12 pt-4 md:pt-8">
        <section className="page-shell">
          <div className="mx-auto w-full max-w-5xl">
            <div className="space-y-3 text-center md:space-y-4">
              <p className="inline-flex items-center rounded-full border border-indigo-100 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700 shadow-sm">
                Hotels
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                Find stays for your trip
              </h1>
              <p className="mx-auto max-w-2xl text-sm text-slate-600 md:text-base">
                Compare hotel options, review stay details, and continue with the provider when you are ready to book.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:p-5"
            >
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                <label className="space-y-1.5 lg:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Destination</span>
                  <input
                    required
                    value={destination}
                    onChange={(event) => setDestination(event.target.value)}
                    placeholder="City or property"
                    className="h-12 w-full rounded-xl border border-slate-300 px-3 text-[16px] text-slate-900 outline-none transition focus-visible:ring-4 focus-visible:ring-indigo-500/40 md:h-11 md:text-sm"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Check-in</span>
                  <input
                    required
                    type="date"
                    min={todayIso}
                    value={checkIn}
                    onChange={(event) => setCheckIn(event.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-300 px-3 text-[16px] text-slate-900 outline-none transition focus-visible:ring-4 focus-visible:ring-indigo-500/40 md:h-11 md:text-sm"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Check-out</span>
                  <input
                    required
                    type="date"
                    min={checkIn || todayIso}
                    value={checkOut}
                    onChange={(event) => setCheckOut(event.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-300 px-3 text-[16px] text-slate-900 outline-none transition focus-visible:ring-4 focus-visible:ring-indigo-500/40 md:h-11 md:text-sm"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3 lg:col-span-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Guests</span>
                    <input
                      required
                      type="number"
                      min={1}
                      value={guests}
                      onChange={(event) => setGuests(event.target.value)}
                      className="h-12 w-full rounded-xl border border-slate-300 px-3 text-[16px] text-slate-900 outline-none transition focus-visible:ring-4 focus-visible:ring-indigo-500/40 md:h-11 md:text-sm"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rooms</span>
                    <input
                      required
                      type="number"
                      min={1}
                      value={rooms}
                      onChange={(event) => setRooms(event.target.value)}
                      className="h-12 w-full rounded-xl border border-slate-300 px-3 text-[16px] text-slate-900 outline-none transition focus-visible:ring-4 focus-visible:ring-indigo-500/40 md:h-11 md:text-sm"
                    />
                  </label>

                  <button
                    type="submit"
                    className="col-span-2 inline-flex h-12 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/40 md:h-11 lg:col-span-1 lg:self-end"
                  >
                    Search hotels
                  </button>
                </div>
              </div>

              {formError ? <p className="mt-3 text-sm font-medium text-rose-600">{formError}</p> : null}
            </form>

            <section className="mt-5 grid gap-2.5 md:grid-cols-3">
              <article className="flex items-start gap-2 rounded-xl border border-slate-200/80 bg-white/80 p-3">
                <BedDouble className="mt-0.5 h-4 w-4 text-indigo-600" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Compare provider offers</h2>
                  <p className="text-xs text-slate-600">See multiple options in one search before deciding.</p>
                </div>
              </article>

              <article className="flex items-start gap-2 rounded-xl border border-slate-200/80 bg-white/80 p-3">
                <BadgeCheck className="mt-0.5 h-4 w-4 text-indigo-600" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Review stay details</h2>
                  <p className="text-xs text-slate-600">Check dates, room setup, and cancellation details.</p>
                </div>
              </article>

              <article className="flex items-start gap-2 rounded-xl border border-slate-200/80 bg-white/80 p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-indigo-600" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Continue with the provider</h2>
                  <p className="text-xs text-slate-600">Complete your booking directly with the selected provider.</p>
                </div>
              </article>
            </section>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
