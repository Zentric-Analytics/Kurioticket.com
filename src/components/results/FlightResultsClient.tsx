"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRightLeft, BadgeCheck, CalendarDays, Plane, Search, ShieldCheck, SlidersHorizontal, Sparkles, Users, X } from "lucide-react";
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState(1200);
  const [maxStops, setMaxStops] = useState(3);

  const body = useMemo(
    () => {
      const origin = params.get("origin")?.trim() || "";
      const destination = params.get("destination")?.trim() || "";
      const departureDate = params.get("departureDate")?.trim() || "";
      const tripType = params.get("tripType") || "round-trip";
      const returnDate = params.get("returnDate")?.trim() || "";
      const hasSearch = Boolean(origin && destination && departureDate && (tripType !== "round-trip" || returnDate));

      if (!hasSearch) return null;

      return {
        tripType,
        origin,
        destination,
        departureDate,
        returnDate,
        travelers: Number(params.get("travelers") || 1),
        cabinClass: params.get("cabinClass") || "economy",
        sort,
      };
    },
    [params, sort],
  );

  useEffect(() => {
    if (!body) return;

    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
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
          setMaxPrice(Math.max(500, Math.ceil(Math.max(...data.results.map((flight) => flight.price), 500) / 100) * 100));
        })
        .catch((searchError) => {
          if (!active) return;
          setError(searchError instanceof Error ? searchError.message : "Unable to search flights.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [body]);

  useEffect(() => {
    if (!loading) return;
    const id = window.setInterval(() => setMessageIndex((current) => (current + 1) % loadingMessages.length), 1100);
    return () => window.clearInterval(id);
  }, [loading]);

  const filtered = results.filter((flight) => flight.price <= maxPrice && flight.stops <= maxStops);

  if (!body) {
    return (
      <main className="flex-1 bg-[#f6f8fb]">
        <div className="page-shell py-10">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-black tracking-normal text-navy">Find hundreds of cheap flights with just one search!</h1>
            <EmptyStateFlightSearchBar />
          </div>
        </div>
      </main>
    );
  }

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

function EmptyStateFlightSearchBar() {
  const [tripType, setTripType] = useState("round-trip");
  const [baggage, setBaggage] = useState("0 bags");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [travelersClass, setTravelersClass] = useState("1 traveler, Economy");
  const [directOnly, setDirectOnly] = useState(false);

  return (
    <div className="mt-4 ml-0 mr-auto w-full max-w-[68rem] space-y-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SearchSelect
          label="Trip type"
          value={tripType}
          onChange={setTripType}
          options={[
            { value: "round-trip", label: "Round-trip" },
            { value: "one-way", label: "One-way" },
            { value: "multi-city", label: "Multi-city" },
          ]}
          variant="text"
        />
        <SearchSelect
          label="Baggage"
          value={baggage}
          onChange={setBaggage}
          options={[
            { value: "0 bags", label: "0 bags" },
            { value: "1 bag", label: "1 bag" },
            { value: "2 bags", label: "2 bags" },
          ]}
          variant="text"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
        <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-[minmax(112px,1fr)_40px_minmax(132px,1fr)_minmax(126px,0.9fr)_minmax(126px,0.9fr)_minmax(158px,0.95fr)_102px]">
          <SearchField label="From" placeholder="From" value={origin} onChange={setOrigin} />
          <SwapButton
            onSwap={() => {
              setOrigin(destination);
              setDestination(origin);
            }}
          />
          <SearchField label="To" placeholder="Where to?" value={destination} onChange={setDestination} />
          <DateField label="Departure" value={departureDate} onChange={setDepartureDate} />
          <DateField label="Return" value={returnDate} onChange={setReturnDate} />
          <SearchSelect
            label="Travelers & class"
            value={travelersClass}
            onChange={setTravelersClass}
            options={[
              { value: "1 traveler, Economy", label: "1 traveler, Economy" },
              { value: "2 travelers, Economy", label: "2 travelers, Economy" },
              { value: "1 traveler, Business", label: "1 traveler, Business" },
            ]}
            icon={<Users size={15} />}
          />
          <Button type="button" className="h-12 w-full rounded-xl px-4 xl:w-[102px]">
            <Search size={16} />
            Search
          </Button>
        </div>
      </div>

      <label htmlFor="direct-flights-only" className="inline-flex items-center gap-2 text-sm font-semibold text-muted">
        <input
          id="direct-flights-only"
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 accent-teal"
          checked={directOnly}
          onChange={(event) => setDirectOnly(event.target.checked)}
        />
        Direct flights only
      </label>
    </div>
  );
}

function SearchField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex h-12 min-w-[150px] items-center rounded-xl border border-slate-200 bg-white px-3 shadow-sm">
      <span className="sr-only">{label}</span>
      <input
        aria-label={label}
        className="w-full bg-transparent text-sm font-semibold text-navy outline-none placeholder:text-muted"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function SearchSelect({
  label,
  value,
  onChange,
  options,
  icon,
  variant = "default",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  icon?: ReactNode;
  variant?: "default" | "text";
}) {
  return (
    <label
      className={cn(
        "flex min-w-0 items-center gap-2",
        variant === "text"
          ? "h-9 w-auto rounded-lg bg-transparent px-1 text-navy"
          : "h-12 min-w-[168px] rounded-xl border border-slate-200 bg-white px-3 shadow-sm",
      )}
    >
      {icon ?? null}
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        className={cn(
          "w-full bg-transparent text-sm font-semibold outline-none",
          variant === "text" ? "pr-5 text-navy" : "text-navy",
        )}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex h-12 min-w-[150px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm">
      <CalendarDays size={15} className="text-muted" />
      <span className="sr-only">{label}</span>
      <input
        aria-label={label}
        className="w-full bg-transparent text-sm font-semibold text-navy outline-none"
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SwapButton({ onSwap }: { onSwap: () => void }) {
  return (
    <Button
      type="button"
      variant="secondary"
      className="h-12 w-full rounded-xl border-slate-200 px-2.5 xl:w-[40px]"
      aria-label="Swap origin and destination"
      onClick={onSwap}
    >
      <ArrowRightLeft size={16} />
    </Button>
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
