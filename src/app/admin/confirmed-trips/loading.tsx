import { AdminPageShell, AdminSectionCard } from "@/components/admin/AdminPageShell";
import { TripWorkspaceNavigation } from "@/components/admin/TripWorkspaceNavigation";

const metricLabels = ["Confirmed trips", "Tracked trips", "Upcoming", "Past", "Cancelled"];

export default function ConfirmedTripsLoading() {
  return (
    <AdminPageShell title="Trips" hideHeader>
      <AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">
        <TripWorkspaceNavigation active="trips" />
        <div role="status" aria-live="polite" className="sr-only">Loading confirmed-trip information…</div>
        <div aria-busy="true" className="space-y-10 pt-6">
          <section aria-label="Trip summary" className="min-w-0">
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
          <section aria-label="Trip records" className="min-w-0">
            <div aria-hidden="true" className="flex min-w-0 flex-wrap items-end gap-x-2 gap-y-2.5">
              {[
                ["Search trips", "sm:w-[180px]"],
                ["Provider", "sm:w-[135px]"],
                ["Travel type", "sm:w-[110px]"],
                ["Trip status", "sm:w-[120px]"],
                ["Identity", "sm:w-[135px]"],
                ["Time range", "sm:w-[120px]"],
              ].map(([label, width]) => (
                <div key={label} className={"min-w-0 w-full " + width}>
                  <p className="text-[11px] font-medium leading-4 text-slate-600">{label}</p>
                  <div className="mt-1 h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-100 motion-safe:animate-pulse" />
                </div>
              ))}
              <div className="h-8 w-20 rounded-md bg-slate-100 motion-safe:animate-pulse" />
            </div>
            <div aria-hidden="true" className="mt-2 overflow-hidden rounded-lg border border-slate-200">
              <div className="grid min-w-[1080px] grid-cols-8 gap-0 border-b border-slate-200/80 bg-slate-50/90">
                {["CREATED", "TYPE", "TRIP", "TRAVEL DATES", "PROVIDER", "IDENTITY", "STATUS", "ACTION"].map((label) => (
                  <div key={label} className="px-3 py-2.5 text-[10px] font-semibold tracking-[0.08em] text-slate-500">{label}</div>
                ))}
              </div>
              {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-12 border-t border-slate-100 bg-white motion-safe:animate-pulse" />)}
            </div>
          </section>

        </div>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
