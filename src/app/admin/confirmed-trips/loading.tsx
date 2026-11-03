import Link from "next/link";
import { AdminPageShell, AdminSectionCard } from "@/components/admin/AdminPageShell";

const metricLabels = ["Confirmed trips", "Last 24h", "Upcoming", "Past", "Cancelled"];

export default function ConfirmedTripsLoading() {
  return (
    <AdminPageShell title="Confirmed Trips" hideHeader>
      <div role="group" aria-label="Confirmed Trips actions" className="mb-3 flex min-w-0 flex-wrap items-center justify-end gap-2">
        <Link href="/admin/confirmed-trips/records" className="inline-flex min-h-9 items-center justify-center rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2">
          Browse confirmed trips
        </Link>
        <Link href="/admin/flight-status" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2">
          Flight status
        </Link>
      </div>
      <AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">
        <section aria-labelledby="confirmed-trips-loading-title" aria-busy="true">
          <h2 id="confirmed-trips-loading-title" className="text-lg font-semibold text-slate-950">Trip overview</h2>
          <p role="status" aria-live="polite" className="mt-1 text-sm text-slate-600">Loading confirmed-trip information…</p>
          <div className="mt-3 min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-lg">
            <div aria-hidden="true" className="grid w-full min-w-[850px] grid-cols-5 gap-2">
              {metricLabels.map((label) => (
                <div key={label} className="flex h-full min-w-0 flex-col rounded-lg border border-slate-200/80 bg-white px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="h-5 w-5 shrink-0 rounded-md bg-slate-100 motion-safe:animate-pulse" />
                    <span className="min-w-0 break-words text-xs font-medium leading-4 text-slate-600">{label}</span>
                  </div>
                  <div className="mt-1 h-[26px] w-16 max-w-full rounded bg-slate-100 motion-safe:animate-pulse" />
                  <div className="mt-1 h-3 w-3/4 rounded bg-slate-100 motion-safe:animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
