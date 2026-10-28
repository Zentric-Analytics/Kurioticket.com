import { AdminPageShell, AdminSectionCard } from "@/components/admin/AdminPageShell";

const metricLabels = ["Confirmed trips", "Last 24h", "Upcoming", "Past", "Cancelled"];

export default function ConfirmedTripsLoading() {
  return (
    <AdminPageShell title="Confirmed Trips" description="Loading trusted provider-confirmed trip records.">
      <AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">
        <section aria-labelledby="confirmed-trips-loading-title" aria-busy="true">
          <h2 id="confirmed-trips-loading-title" className="text-lg font-semibold text-slate-950">Trip overview</h2>
          <p role="status" aria-live="polite" className="mt-1 text-sm text-slate-600">Loading confirmed-trip information…</p>
          <div aria-hidden="true" className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-5">
            {metricLabels.map((label) => (
              <div key={label} className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white px-3 py-3 sm:px-3.5">
                <div className="flex items-center gap-2">
                  <span className="h-8 w-8 shrink-0 rounded-lg bg-slate-100 motion-safe:animate-pulse" />
                  <span className="text-xs font-semibold leading-4 text-slate-600">{label}</span>
                </div>
                <div className="mt-2 h-7 w-16 max-w-full rounded bg-slate-100 motion-safe:animate-pulse" />
                <div className="mt-2 h-3 w-3/4 rounded bg-slate-100 motion-safe:animate-pulse" />
              </div>
            ))}
          </div>
        </section>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
