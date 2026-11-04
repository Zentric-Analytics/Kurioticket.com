import Link from "next/link";
import { AdminPageShell, AdminSectionCard } from "@/components/admin/AdminPageShell";

const metricLabels = ["Confirmed trips", "Tracked trips", "Upcoming", "Past", "Cancelled"];

export default function ConfirmedTripsLoading() {
  return (
    <AdminPageShell title="Trips" hideHeader>
      <AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">
        <div role="group" aria-label="Trip shortcuts" className="mb-3 flex min-w-0 flex-wrap items-center justify-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            <Link href="/admin/confirmed-trips/monitoring" className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">Trip monitoring</Link>
          </div>
        </div>
        <div role="status" aria-live="polite" className="sr-only">Loading confirmed-trip information…</div>
        <div aria-busy="true" className="space-y-3">
          <section className="min-w-0">
            <h2 className="mb-3 text-base font-semibold text-slate-950">Trip overview</h2>
            <div aria-hidden="true" className="grid min-w-0 grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-5">
              {metricLabels.map((label, index) => (
                <div key={label} className={"border-slate-200/80 px-3 py-2.5 " +
                  (index < 4 ? "border-b lg:border-b-0 " : "") +
                  (index % 2 === 1 ? "sm:border-l " : "") +
                  (index > 0 ? "lg:border-l" : "")}>
                  <p className="text-xs font-semibold text-slate-700">{label}</p>
                  <div className="mt-2 h-[26px] w-20 rounded bg-slate-100 motion-safe:animate-pulse" />
                </div>
              ))}
            </div>
          </section>
          <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white px-4 py-3 sm:px-5 sm:py-4">
            <h2 className="text-base font-semibold text-slate-950">Trip directory</h2>
            <p className="mt-1 text-xs text-slate-600">Loading verified trip records for the selected filters…</p>
            <div aria-hidden="true" className="mt-3 grid min-w-0 grid-cols-1 gap-x-2 gap-y-2.5 sm:grid-cols-2 md:grid-cols-3 lg:gap-x-1.5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.95fr)_minmax(0,1fr)_minmax(0,1.15fr)] 2xl:gap-x-2.5">
              {["Search trips", "Provider", "Travel type", "Trip status", "Time range"].map((label) => (
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

        </div>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
