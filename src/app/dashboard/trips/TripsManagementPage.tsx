"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type TripStatus = "upcoming" | "past" | "cancelled";
type MyTrip = {
  id: string; tripType: string; status: TripStatus; providerName: string; providerConfirmationCode: string;
  origin: string | null; destination: string; departureDate: string; returnDate: string | null;
  travelerCount: number; currency: string; totalAmount: number | null;
  providerAction: { url: string; label: string; external: true } | null;
};
type Response = { trips: MyTrip[]; summary: Record<TripStatus | "total", number> };
const tabs: TripStatus[] = ["upcoming", "past", "cancelled"];

export function TripsManagementPage() {
  const [active, setActive] = useState<TripStatus>("upcoming");
  const [trips, setTrips] = useState<MyTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/dashboard/trips", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error();
      setTrips(((await response.json()) as Response).trips ?? []);
    } catch { setError("We could not load your trips. Please try again."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const shown = useMemo(() => trips.filter((trip) => trip.status === active), [active, trips]);

  return <section className="mx-auto w-full max-w-5xl px-4 py-8">
    <header className="mb-6"><p className="text-sm font-semibold uppercase tracking-wide text-[#0057b8]">Read-only partner itineraries</p><h1 className="text-3xl font-bold text-[#021c2b]">My Trips</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Trips shown here were completed with external travel providers. Kurioticket does not sell or manage reservations.</p></header>
    <div className="mb-6 flex gap-2" role="tablist" aria-label="Trip status">
      {tabs.map((tab) => <button key={tab} role="tab" aria-selected={active === tab} onClick={() => setActive(tab)} className={`rounded-full px-4 py-2 text-sm font-semibold ${active === tab ? "bg-[#004bb8] text-white" : "bg-slate-100 text-slate-700"}`}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}
    </div>
    {loading ? <p>Loading trips…</p> : null}
    {error ? <p role="alert">{error} <button className="underline" onClick={() => void load()}>Try again</button></p> : null}
    {!loading && !error && !shown.length ? <div className="rounded-2xl border border-slate-200 p-8 text-center"><h2 className="font-semibold">No {active} trips</h2><p className="mt-2 text-sm text-slate-600">Partner-confirmed trips will appear here after the provider confirms your reservation.</p></div> : null}
    <div className="grid gap-4">{shown.map((trip) => <TripCard key={trip.id} trip={trip} />)}</div>
  </section>;
}

function TripCard({ trip }: { trip: MyTrip }) {
  const route = trip.origin ? `${trip.origin} → ${trip.destination}` : trip.destination;
  const dates = trip.returnDate ? `${new Date(trip.departureDate).toLocaleDateString()} – ${new Date(trip.returnDate).toLocaleDateString()}` : new Date(trip.departureDate).toLocaleDateString();
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-[#0057b8]">{trip.providerName}</p><h2 className="text-xl font-bold text-[#021c2b]">{route}</h2><p className="text-sm text-slate-600">{dates}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{trip.status}</span></div>
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-slate-500">Provider confirmation</dt><dd className="font-semibold">{trip.providerConfirmationCode}</dd></div><div><dt className="text-slate-500">Travelers</dt><dd>{trip.travelerCount}</dd></div><div><dt className="text-slate-500">Price snapshot</dt><dd>{trip.totalAmount === null ? "Not available" : `${trip.currency} ${trip.totalAmount.toFixed(2)}`}</dd></div></dl>
    <p className="mt-4 text-sm text-slate-600">Your reservation is managed by {trip.providerName}. Changes, cancellations, refunds, check-in and travel documents are handled on the provider&apos;s website.</p>
    {trip.providerAction ? <a href={trip.providerAction.url} target="_blank" rel="noopener noreferrer external" className="mt-4 inline-flex rounded-lg bg-[#004bb8] px-4 py-2 text-sm font-semibold text-white" aria-label={`${trip.providerAction.label}, opens external website`}>{trip.providerAction.label} ↗</a> : <p className="mt-4 text-sm font-medium text-slate-700">Manage this trip using your provider confirmation.</p>}
  </article>;
}
