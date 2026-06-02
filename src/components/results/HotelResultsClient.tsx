"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Hotel, Info, SlidersHorizontal, X } from "lucide-react";
import type { PublicHotelResult } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { HotelCard } from "@/components/results/HotelCard";
import { HotelSearchBar } from "@/components/search/HotelSearchBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn, formatCurrency } from "@/lib/utils";

const messages = [
  "Searching trusted hotel partners...",
  "Comparing total stay prices...",
  "Checking room details and provider terms...",
  "Finding easy-to-compare stays...",
];

const getResultMaxPrice = (hotels: PublicHotelResult[]) =>
  Math.max(
    300,
    Math.ceil(Math.max(...hotels.map((hotel) => hotel.totalPrice), 300) / 100) *
      100,
  );

export function HotelResultsClient() {
  const params = useSearchParams();
  const [results, setResults] = useState<PublicHotelResult[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState(1200);
  const [minRating, setMinRating] = useState(3);
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

  useEffect(() => {
    let active = true;
    fetch("/api/hotels/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (response) => {
        const data = await response.json();
        if (data.warningCategory === "no_live_hotel_provider") {
          throw new Error(
            "Live hotel search is temporarily unavailable because Kurioticket is not connected to an approved live hotel provider for this search. We won’t show placeholder stays or unverified prices. Please try again later or start a new search.",
          );
        }
        if (!response.ok)
          throw new Error(data.error || "Unable to search hotels.");
        return data as { results: PublicHotelResult[]; warnings?: string[] };
      })
      .then((data) => {
        if (!active) return;
        setResults(data.results);
        setWarnings(data.warnings || []);
        setMaxPrice(getResultMaxPrice(data.results));
      })
      .catch((searchError) => {
        if (!active) return;
        setError(
          searchError instanceof Error
            ? searchError.message
            : "Unable to search hotels.",
        );
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
    const id = window.setInterval(
      () => setMessageIndex((current) => (current + 1) % messages.length),
      1200,
    );
    return () => window.clearInterval(id);
  }, [loading]);

  const filtered = results.filter(
    (hotel) => hotel.totalPrice <= maxPrice && hotel.rating >= minRating,
  );
  const nights = getNightCount(body.checkIn, body.checkOut);
  const resultMaxPrice = useMemo(() => getResultMaxPrice(results), [results]);
  const showFilteredEmptyState =
    !loading && !error && results.length > 0 && filtered.length === 0;
  const showNoResultsState = !loading && !error && results.length === 0;

  const resetFilters = () => {
    setMaxPrice(resultMaxPrice);
    setMinRating(3);
    setFiltersOpen(false);
  };

  return (
    <main className="flex-1 bg-gradient-to-b from-violet-50/55 via-white to-white pb-8 pt-5 sm:pt-7 lg:pt-8">
      <div className="sticky top-16 z-30 border-b border-indigo-100 bg-white/95 backdrop-blur">
        <div className="page-shell py-3">
          <HotelSearchBar
            key={`${body.destination}-${body.checkIn}-${body.checkOut}-${body.guests}-${body.rooms}-${body.sort}`}
            initialDestination={body.destination}
            initialCheckIn={body.checkIn}
            initialCheckOut={body.checkOut}
            initialGuests={body.guests}
            initialRooms={body.rooms}
            initialSort={body.sort}
            errorRole="alert"
          />
          <Button
            variant="secondary"
            className="mt-3 w-full rounded-xl border-indigo-100 md:hidden"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal size={17} />
            Filters
          </Button>
        </div>
      </div>

      <div className="page-shell grid gap-6 py-6 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr]">
        <aside className="hidden lg:block">
          <HotelFilters
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            minRating={minRating}
            setMinRating={setMinRating}
          />
        </aside>
        <section className="min-w-0 space-y-5">
          <div className="rounded-3xl border border-indigo-100 bg-white/90 p-5 shadow-[0_18px_55px_-34px_rgba(67,56,202,0.55)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-violet-800">
                  <Hotel size={14} />
                  Hotel comparison
                </div>
                <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-indigo-950 sm:text-3xl">
                  Stays in {body.destination}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Compare hotel prices, amenities, and provider details in one
                  place. Kurioticket may redirect you to a hotel provider to
                  review final availability and complete booking.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center md:min-w-[260px]">
                <SummaryStat label="Nights" value={String(nights)} />
                <SummaryStat label="Guests" value={String(body.guests)} />
                <SummaryStat label="Rooms" value={String(body.rooms)} />
              </div>
            </div>
          </div>

          {!loading && !error && warnings.length ? (
            <div className="flex items-start gap-3 rounded-2xl border border-amber/30 bg-amber/10 p-4 text-sm leading-6 text-amber">
              <Info size={18} className="mt-0.5 shrink-0" />
              <span>
                Some provider checks may be limited for this hotel search.
                Review final availability, taxes, fees, and cancellation rules
                with the provider before booking.
              </span>
            </div>
          ) : null}

          {loading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-white p-4 text-sm font-semibold text-violet-700 shadow-sm">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-violet-600" />
                {messages[messageIndex]}
              </div>
              <HotelSkeleton />
              <HotelSkeleton />
              <HotelSkeleton />
            </div>
          ) : error ? (
            <EmptyPanel
              icon={<AlertCircle size={22} />}
              title="Hotel search is temporarily unavailable"
              body={error}
              actionLabel="Try this search again"
              onAction={() => window.location.reload()}
            />
          ) : showNoResultsState ? (
            <EmptyPanel
              icon={<Hotel size={22} />}
              title="No hotel deals found"
              body="We could not find verified hotel options for this search. Try adjusting your destination, dates, guests, or rooms."
            />
          ) : showFilteredEmptyState ? (
            <EmptyPanel
              icon={<SlidersHorizontal size={22} />}
              title="No stays match these filters"
              body="Try increasing the price range or lowering the rating filter to see more available hotel options."
              actionLabel="Reset filters"
              onAction={resetFilters}
            />
          ) : (
            <>
              <div className="flex flex-col gap-2 rounded-2xl border border-indigo-100 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-indigo-950">
                  {filtered.length} stay option
                  {filtered.length === 1 ? "" : "s"} found
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  Sorted by {getSortLabel(body.sort)}
                </p>
              </div>
              {filtered.map((hotel) => (
                <HotelCard key={hotel.id} hotel={hotel} />
              ))}
            </>
          )}
        </section>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-50 bg-indigo-950/45 lg:hidden",
          filtersOpen ? "block" : "hidden",
        )}
        onClick={() => setFiltersOpen(false)}
      />
      <aside
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 max-h-[86dvh] overflow-auto rounded-t-3xl bg-white p-5 shadow-2xl transition-transform lg:hidden",
          filtersOpen ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-indigo-950">Filters</h2>
          <Button
            variant="ghost"
            className="h-10 w-10 px-0"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
          >
            <X size={20} />
          </Button>
        </div>
        <HotelFilters
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          minRating={minRating}
          setMinRating={setMinRating}
        />
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
    <div className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-[0_18px_55px_-34px_rgba(67,56,202,0.55)]">
      <div>
        <h2 className="text-base font-extrabold text-indigo-950">
          Refine results
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Keep the list focused on stays that fit your budget and quality
          preference.
        </p>
      </div>
      <div className="mt-5 grid gap-5">
        <label className="block rounded-2xl bg-violet-50/70 p-4">
          <span className="mb-3 flex items-center justify-between text-sm font-bold text-indigo-950">
            Total up to{" "}
            <span className="font-mono text-violet-700">
              {formatCurrency(maxPrice)}
            </span>
          </span>
          <input
            className="w-full accent-violet-700"
            type="range"
            min={100}
            max={3000}
            step={25}
            value={maxPrice}
            onChange={(event) => setMaxPrice(Number(event.target.value))}
          />
        </label>
        <label className="block rounded-2xl bg-violet-50/70 p-4">
          <span className="mb-3 flex items-center justify-between text-sm font-bold text-indigo-950">
            Rating from{" "}
            <span className="font-mono text-violet-700">{minRating}+</span>
          </span>
          <input
            className="w-full accent-violet-700"
            type="range"
            min={1}
            max={5}
            step={0.5}
            value={minRating}
            onChange={(event) => setMinRating(Number(event.target.value))}
          />
        </label>
        <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
          <p className="font-bold text-indigo-950">Quick comparison cues</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-violet-600" />{" "}
              Late-arrival score
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-violet-600" /> Total stay
              price
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-violet-600" /> Provider
              confirmation
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-violet-50 px-3 py-3 ring-1 ring-violet-100">
      <div className="text-xl font-extrabold text-indigo-950">{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </div>
  );
}

function EmptyPanel({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-[0_18px_55px_-34px_rgba(67,56,202,0.55)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
        {icon}
      </div>
      <p className="mt-4 text-xl font-extrabold text-indigo-950">{title}</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{body}</p>
      {actionLabel && onAction ? (
        <Button
          variant="secondary"
          className="mt-5 rounded-xl border-indigo-100"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

function getSortLabel(sortMode: unknown) {
  if (sortMode === "best") return "best value";
  if (sortMode === "rating") return "top rated";
  if (sortMode === "location") return "location";
  return "lowest price";
}

function getNightCount(checkIn: string, checkOut: string) {
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return Number.isFinite(nights) && nights > 0 ? nights : 1;
}

function HotelSkeleton() {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-[0_16px_40px_-24px_rgba(30,27,75,0.45)]">
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <Skeleton className="aspect-[16/10] md:aspect-auto md:min-h-[236px]" />
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
