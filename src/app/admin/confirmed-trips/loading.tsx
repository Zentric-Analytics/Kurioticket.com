import Link from "next/link";
import { AdminPageShell, AdminSectionCard } from "@/components/admin/AdminPageShell";

const metricLabels = ["Confirmed trips", "Tracked trips", "Upcoming", "Past", "Cancelled"];

export default function ConfirmedTripsLoading() {
  return (
    <AdminPageShell title="Trips" hideHeader>
      <AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">
        <div role="group" aria-label="Trip shortcuts" className="mb-3 flex min-w-0 flex-wrap items-center justify-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            <Link href="/admin/confirmed-trips/records" className="inline-flex min-h-9 items-center rounded-lg border border-indigo-200 bg-white px-3 text-sm font-semibold text-indigo-700">Browse confirmed trips</Link>
            <Link href="/admin/flight-status" className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">Flight status</Link>
          </div>
        </div>
        <div role="status" aria-live="polite" className="sr-only">Loading confirmed-trip information…</div>
        <div aria-busy="true" className="space-y-3">
          <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white px-4 py-3 sm:px-5 sm:py-4">
            <h2 className="text-base font-semibold text-slate-950">Trip overview</h2>
            <div aria-hidden="true" className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {metricLabels.map((label) => (
                <div key={label} className="rounded-xl border border-slate-200/80 bg-white px-3 py-3">
                  <p className="text-xs font-semibold text-slate-700">{label}</p>
                  <div className="mt-3 h-[26px] w-20 rounded bg-slate-100 motion-safe:animate-pulse" />
                  <div className="mt-2 h-3 w-3/4 rounded bg-slate-100 motion-safe:animate-pulse" />
                </div>
              ))}
            </div>
          </section>
          <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white px-4 py-3 sm:px-5 sm:py-4">
            <h2 className="text-base font-semibold text-slate-950">Trip directory</h2>
            <p className="mt-1 text-xs text-slate-600">Loading verified trip records…</p>
            <div aria-hidden="true" className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium text-slate-600">Confirmed by type · all time</span>
              {["Flights", "Hotels", "Cars"].map((label) => (
                <div key={label} className="flex h-8 min-w-20 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5">
                  <span className="text-xs text-slate-700">{label}</span>
                  <span className="h-3 w-4 rounded bg-slate-100 motion-safe:animate-pulse" />
                </div>
              ))}
            </div>
            <div aria-hidden="true" className="mt-3 grid min-w-0 grid-cols-1 gap-x-2 gap-y-2.5 sm:grid-cols-2 md:grid-cols-4 lg:gap-x-1.5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.05fr)_minmax(0,0.95fr)_minmax(0,1.15fr)_minmax(0,1.15fr)] 2xl:gap-x-2.5">
              {["Search trips", "Provider", "Travel type", "Trip status", "Time range", "Tracking", "From (UTC)", "To (UTC)"].map((label) => (
                <div key={label} className="min-w-0">
                  <p className="text-[11px] font-medium leading-4 text-slate-600">{label}</p>
                  <div className="mt-1 h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-100 motion-safe:animate-pulse" />
                </div>
              ))}
            </div>
            <div aria-hidden="true" className="mt-3 flex justify-end gap-2">
              <div className="h-9 w-20 rounded-lg bg-slate-100 motion-safe:animate-pulse" />
              <div className="h-9 w-24 rounded-lg bg-slate-100 motion-safe:animate-pulse" />
            </div>
            <div aria-hidden="true" className="mt-4 space-y-2 border-t border-slate-100 pt-3">
              {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-11 rounded-lg bg-slate-100 motion-safe:animate-pulse" />)}
            </div>
          </section>
          <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white px-4 py-3 sm:px-5 sm:py-4">
            <h2 className="text-base font-semibold text-slate-950">Related trip operations</h2>
            <div aria-hidden="true" className="mt-3 space-y-2">
              {["Detailed product and provider breakdowns", "Confirmation integration readiness", "Confirmation delivery health and alerts", "Flight status monitoring"].map((label) => (
                <div key={label} className="flex min-h-11 items-center rounded-xl border border-slate-200/80 bg-white px-3 text-sm font-medium text-slate-600">{label}</div>
              ))}
            </div>
          </section>
        </div>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
