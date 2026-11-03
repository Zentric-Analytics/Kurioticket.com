import Link from "next/link";
import { AdminPageShell, AdminSectionCard } from "@/components/admin/AdminPageShell";

const metricLabels = ["Confirmed trips", "Tracked trips", "Upcoming", "Past", "Cancelled"];
const categoryLabels = ["Flights", "Hotels", "Cars"];

export default function ConfirmedTripsLoading() {
  return (
    <AdminPageShell title="Trips" hideHeader>
      <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-semibold tracking-tight text-slate-950">Trips</p>
          <p className="mt-1 text-[13px] leading-5 text-slate-600">View verified provider-confirmed trips across flights, hotels, and cars.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/confirmed-trips/records" className="inline-flex min-h-9 items-center rounded-lg border border-indigo-200 bg-white px-3 text-sm font-semibold text-indigo-700">Browse confirmed trips</Link>
          <Link href="/admin/flight-status" className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">Flight status</Link>
        </div>
      </div>
      <div role="status" aria-live="polite" className="sr-only">Loading confirmed-trip information…</div>
      <div aria-busy="true" className="space-y-3">
        <AdminSectionCard className="min-w-0 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-slate-950">Trip overview</h2>
          <div aria-hidden="true" className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {metricLabels.map((label) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-xs font-semibold text-slate-700">{label}</p>
                <div className="mt-3 h-[26px] w-20 rounded bg-slate-100 motion-safe:animate-pulse" />
                <div className="mt-2 h-3 w-3/4 rounded bg-slate-100 motion-safe:animate-pulse" />
              </div>
            ))}
          </div>
        </AdminSectionCard>
        <AdminSectionCard className="min-w-0 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-slate-950">Trips by category</h2>
          <div aria-hidden="true" className="mt-3 grid min-w-0 gap-3 lg:grid-cols-3">
            {categoryLabels.map((label) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-3.5">
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                <div className="mt-3 h-6 w-2/3 rounded bg-slate-100 motion-safe:animate-pulse" />
                <div className="mt-2 h-6 w-4/5 rounded bg-slate-100 motion-safe:animate-pulse" />
                <div className="mt-3 h-9 rounded-lg bg-slate-100 motion-safe:animate-pulse" />
              </div>
            ))}
          </div>
        </AdminSectionCard>
        <AdminSectionCard className="min-w-0 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-slate-950">Trip directory</h2>
          <p className="mt-1 text-xs text-slate-600">Loading verified trip records…</p>
          <div aria-hidden="true" className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="h-9 rounded-lg bg-slate-100 lg:col-span-2 motion-safe:animate-pulse" />
            <div className="h-9 rounded-lg bg-slate-100 lg:col-span-2 motion-safe:animate-pulse" />
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-9 rounded-lg bg-slate-100 motion-safe:animate-pulse" />)}
          </div>
          <div aria-hidden="true" className="mt-4 space-y-2 border-t border-slate-100 pt-3">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-11 rounded-lg bg-slate-100 motion-safe:animate-pulse" />)}
          </div>
        </AdminSectionCard>
        <AdminSectionCard className="min-w-0 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-slate-950">Related trip operations</h2>
          <div aria-hidden="true" className="mt-3 space-y-2">
            {["Detailed product and provider breakdowns", "Confirmation integration readiness", "Confirmation delivery health and alerts", "Flight status monitoring"].map((label) => (
              <div key={label} className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600">{label}</div>
            ))}
          </div>
        </AdminSectionCard>
      </div>
    </AdminPageShell>
  );
}
