"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import type { PublicFlightResult, SortMode } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { FlightCard } from "@/components/results/FlightCard";
import { FlightCardSkeleton } from "@/components/ui/Skeleton";
import { cn, formatCurrency } from "@/lib/utils";

const loadingMessages = [
  "Searching airlines...",
  "Comparing prices...",
  "Checking best-value routes...",
  "Finding cheaper options...",
  "Analyzing layover quality...",
  "Comparing baggage-inclusive fares...",
];

const sortModes: Array<{ label: string; value: SortMode }> = [
  { label: "Cheapest", value: "cheapest" },
  { label: "Best Value", value: "best" },
  { label: "Fastest", value: "fastest" },
  { label: "Fewest Stops", value: "stops" },
];

export function FlightResultsClient() {
  const params = useSearchParams();
  const [sort, setSort] = useState<SortMode>((params.get("sort") as SortMode) || "cheapest");
  const [results, setResults] = useState<PublicFlightResult[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState(1200);
  const [maxStops, setMaxStops] = useState(3);

  const body = useMemo(
    () => ({
      tripType: params.get("tripType") || "round-trip",
      origin: params.get("origin") || "IAH",
      destination: params.get("destination") || "HND",
      departureDate: params.get("departureDate") || nextDate(28),
      returnDate: params.get("returnDate") || nextDate(35),
      travelers: Number(params.get("travelers") || 1),
      cabinClass: params.get("cabinClass") || "economy",
      sort,
    }),
    [params, sort],
  );

  useEffect(() => {
    let active = true;
    fetch("/api/flights/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to search flights.");
        return data as { results: PublicFlightResult[]; warnings?: string[] };
      })
      .then((data) => {
        if (!active) return;
        setResults(data.results);
        setWarnings(data.warnings || []);
        setMaxPrice(Math.max(500, Math.ceil(Math.max(...data.results.map((flight) => flight.price), 500) / 100) * 100));
      })
      .catch((searchError) => {
        if (!active) return;
        setError(searchError instanceof Error ? searchError.message : "Unable to search flights.");
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
    const id = window.setInterval(() => setMessageIndex((current) => (current + 1) % loadingMessages.length), 1100);
    return () => window.clearInterval(id);
  }, [loading]);

  const filtered = results.filter((flight) => flight.price <= maxPrice && flight.stops <= maxStops);

  return (
    <main className="flex-1">
      <div className="sticky top-16 z-30 border-b border-border bg-white/95 backdrop-blur">
        <div className="page-shell flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-muted">
              {body.origin} to {body.destination}
            </p>
            <h1 className="text-xl font-bold text-navy md:text-2xl">
              {body.departureDate} {body.tripType === "round-trip" ? `to ${body.returnDate}` : ""}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {sortModes.map((mode) => (
              <button
                key={mode.value}
                className={cn(
                  "focus-ring h-10 rounded-md border px-3 text-sm font-semibold",
                  sort === mode.value ? "border-teal bg-teal/10 text-teal-dark" : "border-border bg-white text-muted",
                )}
                onClick={() => {
                  setLoading(true);
                  setError("");
                  setSort(mode.value);
                }}
              >
                {mode.label}
              </button>
            ))}
            <Button variant="secondary" className="md:hidden" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal size={17} />
              Filters
            </Button>
          </div>
        </div>
      </div>

      <div className="page-shell grid gap-6 py-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <Filters maxPrice={maxPrice} setMaxPrice={setMaxPrice} maxStops={maxStops} setMaxStops={setMaxStops} />
        </aside>

        <section className="min-w-0 space-y-4">
          {warnings.length ? (
            <div className="rounded-md border border-amber/30 bg-amber/10 p-3 text-sm text-amber">
              {warnings[0]}
            </div>
          ) : null}

          {loading ? (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-white p-4 text-sm font-semibold text-teal-dark">
                {loadingMessages[messageIndex]}
              </div>
              <FlightCardSkeleton />
              <FlightCardSkeleton />
              <FlightCardSkeleton />
            </div>
          ) : error ? (
            <div className="rounded-md border border-danger/30 bg-red-50 p-4 text-danger">{error}</div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-muted">
                  {filtered.length} option{filtered.length === 1 ? "" : "s"} found
                </p>
                <p className="text-sm text-muted">Sorted by {sortModes.find((mode) => mode.value === sort)?.label}</p>
              </div>
              {filtered.map((flight) => (
                <FlightCard key={flight.id} flight={flight} />
              ))}
            </>
          )}
        </section>
      </div>

      <div className={cn("fixed inset-0 z-50 bg-navy/40 lg:hidden", filtersOpen ? "block" : "hidden")} onClick={() => setFiltersOpen(false)} />
      <aside
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 max-h-[86dvh] overflow-auto rounded-t-lg bg-white p-4 shadow-xl transition-transform lg:hidden",
          filtersOpen ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-navy">Filters</h2>
          <Button variant="ghost" className="h-10 w-10 px-0" aria-label="Close filters" onClick={() => setFiltersOpen(false)}>
            <X size={20} />
          </Button>
        </div>
        <Filters maxPrice={maxPrice} setMaxPrice={setMaxPrice} maxStops={maxStops} setMaxStops={setMaxStops} />
      </aside>
    </main>
  );
}

function Filters({
  maxPrice,
  setMaxPrice,
  maxStops,
  setMaxStops,
}: {
  maxPrice: number;
  setMaxPrice: (value: number) => void;
  maxStops: number;
  setMaxStops: (value: number) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-navy">Filters</h2>
      <div className="mt-5 grid gap-5">
        <label className="block">
          <span className="mb-2 flex items-center justify-between text-sm font-semibold text-muted">
            Price up to <span className="font-mono text-navy">{formatCurrency(maxPrice)}</span>
          </span>
          <input className="w-full accent-teal" type="range" min={100} max={2000} step={25} value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} />
        </label>
        <label className="block">
          <span className="mb-2 flex items-center justify-between text-sm font-semibold text-muted">
            Stops up to <span className="font-mono text-navy">{maxStops}</span>
          </span>
          <input className="w-full accent-teal" type="range" min={0} max={3} step={1} value={maxStops} onChange={(event) => setMaxStops(Number(event.target.value))} />
        </label>
        <div className="grid gap-2 text-sm text-muted">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="accent-teal" defaultChecked />
            Baggage included where available
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="accent-teal" />
            Evening departures
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="accent-teal" />
            Low-risk connections
          </label>
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
