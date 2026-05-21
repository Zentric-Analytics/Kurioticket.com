"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, Plane, Repeat2, ShieldCheck, SlidersHorizontal, Sparkles, X } from "lucide-react";
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
  const router = useRouter();

  const [sort, setSort] = useState<SortMode>((params.get("sort") as SortMode) || "cheapest");
  const [results, setResults] = useState<PublicFlightResult[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState(1200);
  const [maxStops, setMaxStops] = useState(3);
  const [tripTypeInput, setTripTypeInput] = useState(params.get("tripType") || "round-trip");
  const [originInput, setOriginInput] = useState(params.get("origin") || "");
  const [destinationInput, setDestinationInput] = useState(params.get("destination") || "");

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

    const id = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % loadingMessages.length);
    }, 1100);

    return () => window.clearInterval(id);
  }, [loading]);

  const filtered = results.filter((flight) => flight.price <= maxPrice && flight.stops <= maxStops);

  if (!body) {
    return (
      <main className="flex-1 bg-[#f6f8fb] py-6 lg:py-8">
        <section className="page-shell">
          <div className="relative overflow-hidden rounded-2xl bg-slate-900">
            <div className="relative h-[320px] sm:h-[360px] lg:h-[410px]">
              <Image
                src="https://images.pexels.com/photos/615060/pexels-photo-615060.jpeg?cs=srgb&dl=pexels-christine-renard-198055-615060.jpg&fm=jpg"
                alt="Airplane wing over a river canyon landscape"
                fill
                sizes="100vw"
                className="object-cover object-center"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-900/45 to-slate-900/15" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 to-transparent" />

              <div className="absolute left-6 top-6 z-10 max-w-2xl sm:left-8 sm:top-8 lg:left-10 lg:top-10">
                <p className="text-sm font-bold uppercase tracking-wide text-white/85">Flights</p>
                <h1 className="mt-2 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
                  Find hundreds of cheap flights with just one search!
                </h1>
              </div>
            </div>
          </div>

          <div className="relative z-20 -mt-14 px-3 pb-4 sm:-mt-16 sm:px-6 lg:-mt-20 lg:px-10">
            <form
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.18)] sm:p-5"
              onSubmit={(event) => {
                event.preventDefault();

                const formData = new FormData(event.currentTarget);
                const nextParams = new URLSearchParams({
                  tripType: tripTypeInput,
                  origin: originInput.trim() || String(formData.get("origin") || ""),
                  destination: destinationInput.trim() || String(formData.get("destination") || ""),
                  departureDate: String(formData.get("departureDate") || ""),
                  returnDate: String(formData.get("returnDate") || ""),
                  travelers: String(formData.get("travelers") || "1"),
                  cabinClass: String(formData.get("cabinClass") || "economy"),
                });

                router.push(`/flights/results?${nextParams.toString()}`);
              }}
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(120px,1.05fr)_minmax(150px,1.2fr)_52px_minmax(150px,1.2fr)_minmax(135px,1fr)_minmax(135px,1fr)_minmax(130px,1fr)_minmax(145px,1fr)_auto] lg:items-end">
                <label className="grid gap-1">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-slate-600">Trip type</span>
                  <select
                    id="tripType"
                    name="tripType"
                    value={tripTypeInput}
                    onChange={(event) => setTripTypeInput(event.target.value)}
                    className="focus-ring h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900"
                  >
                    <option value="round-trip">Round-trip</option>
                    <option value="one-way">One-way</option>
                    <option value="multi-city">Multi-city</option>
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-slate-600">From</span>
                  <input
                    name="origin"
                    required
                    value={originInput}
                    onChange={(event) => setOriginInput(event.target.value)}
                    placeholder="From"
                    className="focus-ring h-12 w-full min-w-0 rounded-lg border border-slate-300 px-3 text-sm font-bold text-slate-900 placeholder:font-semibold placeholder:text-slate-400"
                  />
                </label>

                <div className="flex items-end justify-center pb-0.5">
                  <button
                    type="button"
                    aria-label="Swap origin and destination"
                    onClick={() => {
                      const currentOrigin = originInput;
                      setOriginInput(destinationInput);
                      setDestinationInput(currentOrigin);
                    }}
                    className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Repeat2 size={18} />
                  </button>
                </div>

                <label className="grid gap-1">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-slate-600">To</span>
                  <input
                    name="destination"
                    required
                    value={destinationInput}
                    onChange={(event) => setDestinationInput(event.target.value)}
                    placeholder="To?"
                    className="focus-ring h-12 w-full min-w-0 rounded-lg border border-slate-300 px-3 text-sm font-bold text-slate-900 placeholder:font-semibold placeholder:text-slate-400"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-slate-600">Departure</span>
                  <input
                    name="departureDate"
                    required
                    type="date"
                    aria-label="Departure"
                    className="focus-ring h-12 w-full min-w-0 rounded-lg border border-slate-300 px-3 text-sm font-bold text-slate-900"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-slate-600">Return</span>
                  <input
                    name="returnDate"
                    type="date"
                    disabled={tripTypeInput !== "round-trip"}
                    required={tripTypeInput === "round-trip"}
                    aria-label="Return"
                    className="focus-ring h-12 w-full min-w-0 rounded-lg border border-slate-300 px-3 text-sm font-bold text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-slate-600">Travelers</span>
                  <select
                    name="travelers"
                    defaultValue="1"
                    className="focus-ring h-12 w-full min-w-0 rounded-lg border border-slate-300 px-3 text-sm font-bold text-slate-900"
                    aria-label="Travelers"
                  >
                    <option value="1">1 adult</option>
                    <option value="2">2 adults</option>
                    <option value="3">3 adults</option>
                    <option value="4">4 adults</option>
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-slate-600">Cabin class</span>
                  <select
                    name="cabinClass"
                    defaultValue="economy"
                    className="focus-ring h-12 w-full min-w-0 rounded-lg border border-slate-300 px-3 text-sm font-bold text-slate-900"
                    aria-label="Cabin class"
                  >
                    <option value="economy">Economy</option>
                    <option value="premium-economy">Premium Economy</option>
                    <option value="business">Business</option>
                    <option value="first">First</option>
                  </select>
                </label>

                <div className="flex">
                  <Button type="submit" className="h-12 w-full rounded-lg bg-[#0a66c2] px-7 font-bold text-white hover:bg-[#085aa9] lg:min-w-[120px]">
                    Search
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </section>
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

function InsightCard({ icon, label, value }: { icon: ReactNode; label: string; value?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal">{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-navy">{label}</p>
        {value ? <p className="truncate text-xs font-semibold text-muted">{value}</p> : null}
      </div>
    </div>
  );
}