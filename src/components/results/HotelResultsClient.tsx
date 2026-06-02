"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import type { PublicHotelResult } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { HotelCard } from "@/components/results/HotelCard";
import { HotelSearchBar } from "@/components/search/HotelSearchBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn, formatCurrency } from "@/lib/utils";

const messages = [
  "Searching hotel partners...",
  "Comparing total stay prices...",
  "Checking arrival convenience...",
  "Finding low-stress stays...",
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
  const resultMaxPrice = useMemo(() => getResultMaxPrice(results), [results]);
  const showFilteredEmptyState =
    !loading && !error && results.length > 0 && filtered.length === 0;

  const resetFilters = () => {
    setMaxPrice(resultMaxPrice);
    setMinRating(3);
    setFiltersOpen(false);
  };

  return (
    <main className="flex-1 pb-8 pt-6 sm:pt-8 lg:pt-8">
      <div className="sticky top-16 z-30 border-b border-border bg-white/95 backdrop-blur">
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
            className="mt-3 w-fit md:hidden"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal size={17} />
            Filters
          </Button>
        </div>
      </div>

      <div className="page-shell grid gap-6 py-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <HotelFilters
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            minRating={minRating}
            setMinRating={setMinRating}
          />
        </aside>
        <section className="min-w-0 space-y-4">
          {!loading && !error && warnings.length ? (
            <div className="rounded-md border border-amber/30 bg-amber/10 p-3 text-sm text-amber">
              Some provider checks may be limited for this hotel search. Review
              final availability, taxes, fees, and cancellation rules with the
              provider before booking.
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
            <div className="rounded-md border border-danger/30 bg-red-50 p-4 text-danger">
              {error}
            </div>
          ) : showFilteredEmptyState ? (
            <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-[0_16px_40px_-24px_rgba(30,27,75,0.45)]">
              <p className="text-lg font-bold text-indigo-950">
                No stays match these filters
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Try increasing the price range or lowering the rating filter to
                see more available hotel options.
              </p>
              <Button variant="secondary" className="mt-4" onClick={resetFilters}>
                Reset filters
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-muted">
                {filtered.length} stay option{filtered.length === 1 ? "" : "s"}{" "}
                found
              </p>
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
    <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-[0_16px_40px_-24px_rgba(30,27,75,0.45)]">
      <h2 className="text-base font-bold text-indigo-950">Filters</h2>
      <div className="mt-5 grid gap-5">
        <label className="block">
          <span className="mb-2 flex items-center justify-between text-sm font-semibold text-muted">
            Total up to{" "}
            <span className="font-mono text-indigo-950">
              {formatCurrency(maxPrice)}
            </span>
          </span>
          <input
            className="w-full accent-violet-600"
            type="range"
            min={100}
            max={3000}
            step={25}
            value={maxPrice}
            onChange={(event) => setMaxPrice(Number(event.target.value))}
          />
        </label>
        <label className="block">
          <span className="mb-2 flex items-center justify-between text-sm font-semibold text-muted">
            Rating from{" "}
            <span className="font-mono text-indigo-950">{minRating}+</span>
          </span>
          <input
            className="w-full accent-violet-600"
            type="range"
            min={1}
            max={5}
            step={0.5}
            value={minRating}
            onChange={(event) => setMinRating(Number(event.target.value))}
          />
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
