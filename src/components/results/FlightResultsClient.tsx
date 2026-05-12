"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, Plane, ShieldCheck, SlidersHorizontal, Sparkles, X } from "lucide-react";
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
    <main className="flex-1 bg-[#f6f8fb]">
      <div className="sticky top-20 z-30 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur">
        <div className="page-shell flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-teal-dark">
              <Plane size={16} />
              {body.origin} to {body.destination}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-normal text-navy md:text-3xl">
              {body.departureDate} {body.tripType === "round-trip" ? `to ${body.returnDate}` : ""}
            </h1>
            <p className="mt-1 text-sm font-semibold text-muted">
              {body.travelers} traveler{body.travelers === 1 ? "" : "s"} · {String(body.cabinClass).replace("-", " ")} · live provider search
            </p>
          </div>
          <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {sortModes.map((mode) => (
              <button
                key={mode.value}
                className={cn(
                  "focus-ring h-10 rounded-lg px-3 text-sm font-bold transition",
                  sort === mode.value ? "bg-white text-navy shadow-sm ring-1 ring-slate-200" : "text-muted hover:bg-white/70 hover:text-navy",
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
            <Button variant="secondary" className="border-slate-200 md:hidden" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal size={17} />
              Filters
            </Button>
          </div>
        </div>
      </div>

      <div className="page-shell grid gap-6 py-6 lg:grid-cols-[300px_1fr]">
        <aside className="hidden lg:block">
          <Filters maxPrice={maxPrice} setMaxPrice={setMaxPrice} maxStops={maxStops} setMaxStops={setMaxStops} />
        </aside>

        <section className="min-w-0 space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <InsightCard icon={<BadgeCheck size={18} />} label="Cheapest-first" value="Default ranking" />
            <InsightCard icon={<ShieldCheck size={18} />} label="Confidence scoring" value="Value, risk, comfort" />
            <InsightCard icon={<Sparkles size={18} />} label="Premium signals" value="Calm decision support" />
          </div>

          {warnings.length ? (
            <div className="rounded-xl border border-amber/30 bg-amber/10 p-4 text-sm font-semibold text-amber">
              {warnings[0]}
            </div>
          ) : null}

          {loading ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-teal/20 bg-white p-5 text-sm font-bold text-teal-dark shadow-sm">
                {loadingMessages[messageIndex]}
              </div>
              <FlightCardSkeleton />
              <FlightCardSkeleton />
              <FlightCardSkeleton />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-danger/30 bg-red-50 p-5 text-danger">{error}</div>
          ) : (
            <>
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-navy">
                  {filtered.length} option{filtered.length === 1 ? "" : "s"} found
                </p>
                <p className="text-sm font-semibold text-muted">Sorted by {sortModes.find((mode) => mode.value === sort)?.label}</p>
              </div>
              {filtered.length ? (
                filtered.map((flight) => <FlightCard key={flight.id} flight={flight} />)
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm font-semibold text-muted shadow-sm">
                  No flights match these filters. Widen your price or stops range to see more live options.
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <div className={cn("fixed inset-0 z-50 bg-navy/40 lg:hidden", filtersOpen ? "block" : "hidden")} onClick={() => setFiltersOpen(false)} />
      <aside
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 max-h-[86dvh] overflow-auto rounded-t-2xl bg-white p-5 shadow-xl transition-transform lg:hidden",
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-navy">Refine Results</h2>
          <p className="mt-1 text-xs font-semibold text-muted">Keep the shortlist calm and decision-ready.</p>
        </div>
        <SlidersHorizontal className="text-teal" size={21} />
      </div>
      <div className="mt-6 grid gap-6">
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
        <div className="grid gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-muted">
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

function InsightCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal">{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-navy">{label}</p>
        <p className="truncate text-xs font-semibold text-muted">{value}</p>
      </div>
    </div>
  );
}

function nextDate(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}
