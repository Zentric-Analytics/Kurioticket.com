"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";

type TripStatus = "upcoming" | "past" | "cancelled";
type MyTrip = {
  id: string; tripType: string; status: TripStatus; providerName: string; providerConfirmationCode: string;
  origin: string | null; destination: string; departureDate: string; returnDate: string | null;
  travelerCount: number; currency: string; totalAmount: number | null;
  providerAction: { url: string; label: string; external: true } | null;
  providerConfirmed: boolean; providerConfirmedAt: string | null;
};
type FlightStatus =
  | { dataAvailable: false; providerName: string }
  | {
      dataAvailable: true;
      providerName: string;
      status: "scheduled" | "delayed" | "departed" | "arrived" | "cancelled" | "unknown";
      flight: {
        flightNumber: string;
        carrierCode: string;
        originAirport: string;
        destinationAirport: string;
        scheduledDepartureAt: string;
        scheduledArrivalAt: string | null;
      };
      timing: {
        estimatedDepartureAt: string | null;
        actualDepartureAt: string | null;
        estimatedArrivalAt: string | null;
        actualArrivalAt: string | null;
      };
      lastUpdatedAt: string;
      freshness: "current" | "stale";
    };
type Response = { trips: MyTrip[]; summary: Record<TripStatus | "total", number> };
const tabs: TripStatus[] = ["upcoming", "past", "cancelled"];

export function TripsManagementPage() {
  const { locale, t: dictionary } = useLocale();
  const t = useCallback((key: string) => dictionary[key] ?? enTranslations[key] ?? key, [dictionary]);
  const format = useCallback((key: string, values: Record<string, string | number>) => Object.entries(values).reduce((message, [name, value]) => message.replaceAll(`{{${name}}}`, String(value)), t(key)), [t]);
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
    } catch { setError(t("accountDashboard.trips.metasearch.error")); }
    finally { setLoading(false); }
  }, [t]);
  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);
  const shown = useMemo(() => trips.filter((trip) => trip.status === active), [active, trips]);

  return <section className="mx-auto w-full max-w-5xl px-4 py-8">
    <header className="mb-6"><p className="text-sm font-semibold uppercase tracking-wide text-[#0057b8]">{t("accountDashboard.trips.metasearch.eyebrow")}</p><h1 className="text-3xl font-bold text-[#021c2b]">{t("accountDashboard.trips.title")}</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">{t("accountDashboard.trips.metasearch.description")}</p></header>
    <div className="mb-6 flex gap-2" role="tablist" aria-label={t("accountDashboard.trips.metasearch.tabsAriaLabel")}>
      {tabs.map((tab) => <button key={tab} role="tab" aria-selected={active === tab} onClick={() => setActive(tab)} className={`rounded-full px-4 py-2 text-sm font-semibold ${active === tab ? "bg-[#004bb8] text-white" : "bg-slate-100 text-slate-700"}`}>{t(`accountDashboard.trips.metasearch.tabs.${tab}`)}</button>)}
    </div>
    {loading ? <p>{t("accountDashboard.trips.metasearch.loading")}</p> : null}
    {error ? <p role="alert">{error} <button className="underline" onClick={() => void load()}>{t("accountDashboard.trips.metasearch.retry")}</button></p> : null}
    {!loading && !error && !shown.length ? <div className="rounded-2xl border border-slate-200 p-8 text-center"><h2 className="font-semibold">{format("accountDashboard.trips.metasearch.empty.title", { status: t(`accountDashboard.trips.metasearch.tabs.${active}`).toLocaleLowerCase(locale) })}</h2><p className="mt-2 text-sm text-slate-600">{t("accountDashboard.trips.metasearch.empty.body")}</p></div> : null}
    <div className="grid gap-4">{shown.map((trip) => <TripCard key={trip.id} trip={trip} locale={locale} t={t} format={format} />)}</div>
  </section>;
}

function TripCard({ trip, locale, t, format }: { trip: MyTrip; locale: string; t: (key: string) => string; format: (key: string, values: Record<string, string | number>) => string }) {
  const route = trip.origin ? `${trip.origin} → ${trip.destination}` : trip.destination;
  const dates = trip.returnDate ? `${new Date(trip.departureDate).toLocaleDateString(locale)} – ${new Date(trip.returnDate).toLocaleDateString(locale)}` : new Date(trip.departureDate).toLocaleDateString(locale);
  const actionLabel = format("accountDashboard.trips.metasearch.manageWith", { provider: trip.providerName });
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <div><p className="text-xs text-slate-500">{t("accountDashboard.trips.metasearch.provider")}</p><p className="font-semibold text-[#0057b8]">{trip.providerName}</p></div>
          {trip.providerConfirmed ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">{t("accountDashboard.trips.metasearch.providerConfirmed")}</span> : null}
        </div>
        <h2 className="mt-1 text-xl font-bold text-[#021c2b]">{route}</h2>
        <p className="text-sm text-slate-600">{dates}</p>
        {trip.providerConfirmed && trip.providerConfirmedAt ? <p className="mt-1 text-xs font-medium text-emerald-700">{format("accountDashboard.trips.metasearch.confirmedAt", { date: new Date(trip.providerConfirmedAt).toLocaleString(locale) })}</p> : null}
      </div>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{t(`accountDashboard.trips.metasearch.tabs.${trip.status}`)}</span>
    </div>
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-slate-500">{t("accountDashboard.trips.metasearch.providerConfirmation")}</dt><dd className="font-semibold">{trip.providerConfirmationCode}</dd></div><div><dt className="text-slate-500">{t("accountDashboard.trips.metasearch.travelers")}</dt><dd>{trip.travelerCount}</dd></div><div><dt className="text-slate-500">{t("accountDashboard.trips.metasearch.priceSnapshot")}</dt><dd>{trip.totalAmount === null ? t("accountDashboard.trips.metasearch.priceUnavailable") : `${trip.currency} ${trip.totalAmount.toFixed(2)}`}</dd></div></dl>
    {trip.tripType === "flight" && trip.status === "upcoming" ? <FlightStatusPanel tripId={trip.id} locale={locale} t={t} format={format} /> : null}
    <p className="mt-4 text-sm text-slate-600">{format("accountDashboard.trips.metasearch.disclaimer", { provider: trip.providerName })}</p>
    {trip.providerAction ? <a href={trip.providerAction.url} target="_blank" rel="noopener noreferrer external" className="mt-4 inline-flex rounded-lg bg-[#004bb8] px-4 py-2 text-sm font-semibold text-white" aria-label={format("accountDashboard.trips.metasearch.externalAriaLabel", { label: actionLabel })}>{actionLabel} ↗</a> : <p className="mt-4 text-sm font-medium text-slate-700">{t("accountDashboard.trips.metasearch.noProviderUrl")}</p>}
  </article>;
}

function FlightStatusPanel({ tripId, locale, t, format }: { tripId: string; locale: string; t: (key: string) => string; format: (key: string, values: Record<string, string | number>) => string }) {
  const [status, setStatus] = useState<FlightStatus | null>(null);
  useEffect(() => {
    let disposed = false;
    let controller: AbortController | null = null;
    const refresh = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch(`/api/dashboard/trips/${encodeURIComponent(tripId)}/flight-status`, {
          headers: { Accept: "application/json" }, signal: controller.signal, cache: "no-store",
        });
        if (!disposed && response.ok) setStatus(await response.json() as FlightStatus);
      } catch { /* keep the last verified provider snapshot visible */ }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 60_000);
    return () => { disposed = true; controller?.abort(); window.clearInterval(interval); };
  }, [tripId]);

  if (!status) return null;
  if (!status.dataAvailable) {
    return <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("accountDashboard.trips.metasearch.flightStatus")}</p><p className="mt-1 text-sm text-slate-600">{t("accountDashboard.trips.metasearch.flightStatusUnavailable")}</p></div>;
  }

  const times = [
    [t("accountDashboard.trips.metasearch.estimatedDeparture"), status.timing.estimatedDepartureAt],
    [t("accountDashboard.trips.metasearch.actualDeparture"), status.timing.actualDepartureAt],
    [t("accountDashboard.trips.metasearch.estimatedArrival"), status.timing.estimatedArrivalAt],
    [t("accountDashboard.trips.metasearch.actualArrival"), status.timing.actualArrivalAt],
  ] as const;
  return <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("accountDashboard.trips.metasearch.flightStatus")}</p><p className="mt-1 font-semibold text-slate-900">{status.flight.carrierCode} {status.flight.flightNumber} · {status.flight.originAirport} → {status.flight.destinationAirport}</p></div>
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.status === "cancelled" ? "bg-rose-50 text-rose-700" : status.status === "delayed" ? "bg-amber-50 text-amber-700" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>{status.status[0].toUpperCase() + status.status.slice(1)}</span>
    </div>
    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">{times.filter(([, value]) => value).map(([label, value]) => <div key={label}><span className="text-slate-500">{label}: </span><span className="font-medium text-slate-900">{new Date(value as string).toLocaleString(locale)}</span></div>)}</div>
    <p className="mt-3 text-xs text-slate-500">{format("accountDashboard.trips.metasearch.flightStatusUpdated", { date: new Date(status.lastUpdatedAt).toLocaleString(locale) })}</p>
    {status.freshness === "stale" ? <p className="mt-1 text-xs font-semibold text-amber-700">{t("accountDashboard.trips.metasearch.flightStatusStale")}</p> : null}
  </div>;
}
