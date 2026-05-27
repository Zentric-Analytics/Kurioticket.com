"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import type { PublicHotelResult } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { HotelCard } from "@/components/results/HotelCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn, formatCurrency } from "@/lib/utils";

const messages = [
  "Searching hotel partners...",
  "Comparing total stay prices...",
  "Checking arrival convenience...",
  "Finding low-stress stays...",
];

export function HotelResultsClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [results, setResults] = useState<PublicHotelResult[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState(1200);
  const [minRating, setMinRating] = useState(3);
  const [destination, setDestination] = useState(() => params.get("destination") || "Tokyo");
  const [checkIn, setCheckIn] = useState(() => params.get("checkIn") || nextDate(28));
  const [checkOut, setCheckOut] = useState(() => params.get("checkOut") || nextDate(35));
  const [guests, setGuests] = useState(() => params.get("guests") || "2");
  const [rooms, setRooms] = useState(() => params.get("rooms") || "1");
  const [formError, setFormError] = useState("");

  const body = useMemo(
    () => ({
      destination: params.get("destination") || "Tokyo",
      checkIn: params.get("checkIn") || nextDate(28),
      checkOut: params.get("checkOut") || nextDate(35),
      guests: Number(params.get("guests") || 2),
      rooms: Number(params.get("rooms") || 1),
      sort: params.get("sort") || "cheapest",
    }),
    [params],
  );

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedDestination = destination.trim();
    const parsedGuests = Number.parseInt(guests, 10);
    const parsedRooms = Number.parseInt(rooms, 10);

    if (!normalizedDestination) {
      setFormError("Destination is required.");
      return;
    }
    if (!checkIn) {
      setFormError("Check-in date is required.");
      return;
    }
    if (!checkOut) {
      setFormError("Check-out date is required.");
      return;
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      setFormError("Check-out must be after check-in.");
      return;
    }
    if (!Number.isInteger(parsedGuests) || parsedGuests < 1 || parsedGuests > 12) {
      setFormError("Guests must be between 1 and 12.");
      return;
    }
    if (!Number.isInteger(parsedRooms) || parsedRooms < 1 || parsedRooms > 6) {
      setFormError("Rooms must be between 1 and 6.");
      return;
    }

    setFormError("");
    const query = new URLSearchParams({
      destination: normalizedDestination,
      checkIn,
      checkOut,
      guests: String(parsedGuests),
      rooms: String(parsedRooms),
      sort: body.sort,
    });
    router.push(`/hotels/results?${query.toString()}`);
  };

  useEffect(() => {
    let active = true;
    fetch("/api/hotels/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to search hotels.");
        return data as { results: PublicHotelResult[]; warnings?: string[] };
      })
      .then((data) => {
        if (!active) return;
        setResults(data.results);
        setWarnings(data.warnings || []);
        setMaxPrice(Math.max(300, Math.ceil(Math.max(...data.results.map((hotel) => hotel.totalPrice), 300) / 100) * 100));
      })
      .catch((searchError) => {
        if (!active) return;
        setError(searchError instanceof Error ? searchError.message : "Unable to search hotels.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [body]);

  useEffect(() => {
    if (!loading) return;
    const id = window.setInterval(() => setMessageIndex((current) => (current + 1) % messages.length), 1200);
    return () => window.clearInterval(id);
  }, [loading]);

  const filtered = results.filter((hotel) => hotel.totalPrice <= maxPrice && hotel.rating >= minRating);

  return (
    <main className="flex-1 pt-24 pb-8 sm:pt-28 lg:pt-28">
      <div className="sticky top-16 z-30 border-b border-border bg-white/95 backdrop-blur">
        <div className="page-shell py-3">
          <form className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end" onSubmit={handleSearchSubmit}>
            <label className="grid gap-1 md:col-span-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Destination</span>
              <input
                type="text"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder="Where are you staying?"
                className="h-12 rounded-xl border border-slate-300 bg-white px-3 text-[16px] text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500 md:h-11 md:text-sm"
              />
            </label>
            <label className="grid gap-1 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Check-in</span>
              <input
                type="date"
                value={checkIn}
                onChange={(event) => setCheckIn(event.target.value)}
                className="h-12 rounded-xl border border-slate-300 bg-white px-3 text-[16px] text-slate-900 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500 md:h-11 md:text-sm"
              />
            </label>
            <label className="grid gap-1 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Check-out</span>
              <input
                type="date"
                value={checkOut}
                onChange={(event) => setCheckOut(event.target.value)}
                className="h-12 rounded-xl border border-slate-300 bg-white px-3 text-[16px] text-slate-900 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500 md:h-11 md:text-sm"
              />
            </label>
            <label className="grid gap-1 md:col-span-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Guests</span>
              <input
                type="number"
                min={1}
                max={12}
                value={guests}
                onChange={(event) => setGuests(event.target.value)}
                className="h-12 rounded-xl border border-slate-300 bg-white px-3 text-[16px] text-slate-900 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500 md:h-11 md:text-sm"
              />
            </label>
            <label className="grid gap-1 md:col-span-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Rooms</span>
              <input
                type="number"
                min={1}
                max={6}
                value={rooms}
                onChange={(event) => setRooms(event.target.value)}
                className="h-12 rounded-xl border border-slate-300 bg-white px-3 text-[16px] text-slate-900 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500 md:h-11 md:text-sm"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="h-12 w-full rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 md:h-11"
              >
                Search hotels
              </button>
            </div>
            {formError ? (
              <p className="md:col-span-12 text-sm font-medium text-danger" role="alert">
                {formError}
              </p>
            ) : null}
          </form>
          <Button variant="secondary" className="w-fit md:hidden" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal size={17} />
            Filters
          </Button>
        </div>
      </div>

      <div className="page-shell grid gap-6 py-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <HotelFilters maxPrice={maxPrice} setMaxPrice={setMaxPrice} minRating={minRating} setMinRating={setMinRating} />
        </aside>
        <section className="min-w-0 space-y-4">
          {warnings.length ? (
            <div className="rounded-md border border-amber/30 bg-amber/10 p-3 text-sm text-amber">
              {warnings[0]}
            </div>
          ) : null}
          {loading ? (
            <div className="space-y-4">
              <div className="rounded-md border border-indigo-100 bg-indigo-50/70 p-4 text-sm font-semibold text-violet-700">
                {messages[messageIndex]}
              </div>
              <HotelSkeleton />
              <HotelSkeleton />
              <HotelSkeleton />
            </div>
          ) : error ? (
            <div className="rounded-md border border-danger/30 bg-red-50 p-4 text-danger">{error}</div>
          ) : (
            <>
              <p className="text-sm font-semibold text-muted">
                {filtered.length} stay option{filtered.length === 1 ? "" : "s"} found
              </p>
              {filtered.map((hotel) => (
                <HotelCard key={hotel.id} hotel={hotel} />
              ))}
            </>
          )}
        </section>
      </div>

      <div className={cn("fixed inset-0 z-50 bg-indigo-950/45 lg:hidden", filtersOpen ? "block" : "hidden")} onClick={() => setFiltersOpen(false)} />
      <aside
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 max-h-[86dvh] overflow-auto rounded-t-3xl bg-white p-5 shadow-2xl transition-transform lg:hidden",
          filtersOpen ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-indigo-950">Filters</h2>
          <Button variant="ghost" className="h-10 w-10 px-0" aria-label="Close filters" onClick={() => setFiltersOpen(false)}>
            <X size={20} />
          </Button>
        </div>
        <HotelFilters maxPrice={maxPrice} setMaxPrice={setMaxPrice} minRating={minRating} setMinRating={setMinRating} />
      </aside>
    </main>
  );
}

function HotelFilters({
  maxPrice,
  setMaxPrice,
  minRating,
  setMinRating,
}: {
  maxPrice: number;
  setMaxPrice: (value: number) => void;
  minRating: number;
  setMinRating: (value: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-[0_16px_40px_-24px_rgba(30,27,75,0.45)]">
      <h2 className="text-base font-bold text-indigo-950">Filters</h2>
      <div className="mt-5 grid gap-5">
        <label className="block">
          <span className="mb-2 flex items-center justify-between text-sm font-semibold text-muted">
            Total up to <span className="font-mono text-indigo-950">{formatCurrency(maxPrice)}</span>
          </span>
          <input className="w-full accent-violet-600" type="range" min={100} max={3000} step={25} value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} />
        </label>
        <label className="block">
          <span className="mb-2 flex items-center justify-between text-sm font-semibold text-muted">
            Rating from <span className="font-mono text-indigo-950">{minRating}+</span>
          </span>
          <input className="w-full accent-violet-600" type="range" min={1} max={5} step={0.5} value={minRating} onChange={(event) => setMinRating(Number(event.target.value))} />
        </label>
        <div className="grid gap-2 text-sm text-muted">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="accent-violet-600" defaultChecked />
            Late arrival friendly
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="accent-violet-600" />
            Airport convenience
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="accent-violet-600" />
            Flexible cancellation
          </label>
        </div>
      </div>
    </div>
  );
}

function HotelSkeleton() {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-[0_16px_40px_-24px_rgba(30,27,75,0.45)]">
      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        <Skeleton className="aspect-[16/10] md:aspect-auto" />
        <div className="space-y-3">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>
  );
}

function nextDate(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}
