import { FileCheck2, Plane } from "lucide-react";

import { AdminPageShell, AdminSectionCard } from "@/components/admin/AdminPageShell";
import { TripWorkspaceNavigation } from "@/components/admin/TripWorkspaceNavigation";

function SkeletonLine({ className }: { className: string }) {
  return <div className={"rounded bg-slate-100 motion-safe:animate-pulse " + className} />;
}

function SkeletonPanel({ rows = 3 }: { rows?: number }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-3 sm:p-4">
      <SkeletonLine className="h-4 w-40" />
      <SkeletonLine className="mt-2 h-3 w-64 max-w-full" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonLine key={index} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function TripMonitoringLoading() {
  return (
    <AdminPageShell title="Trip monitoring" hideHeader>
      <AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">
        <TripWorkspaceNavigation active="monitoring" />
        <h1 className="sr-only">Trip monitoring</h1>
        <div role="status" aria-live="polite" className="sr-only">Loading trip monitoring…</div>

        <section aria-label="Trip monitoring details" aria-busy="true" className="min-w-0 pt-6">
          <div className="space-y-6">
            <section id="trip-flight-status-panel" aria-labelledby="trip-flight-status-title" className="min-w-0">
              <div className="mb-3 flex min-w-0 items-center gap-2 border-b border-slate-200/80 pb-2.5">
                <Plane size={17} className="shrink-0 text-indigo-700" aria-hidden="true" />
                <h3 id="trip-flight-status-title" className="text-sm font-semibold text-slate-900">Flight status</h3>
              </div>

              <div aria-hidden="true" className="min-w-0 space-y-4">
                <section className="min-w-0">
                  <div className="grid min-w-[960px] grid-cols-6 gap-2 overflow-hidden">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="rounded-lg border border-slate-200/80 bg-white px-3 py-2.5">
                        <SkeletonLine className="h-3 w-20" />
                        <SkeletonLine className="mt-2 h-6 w-12" />
                        <SkeletonLine className="mt-2 h-3 w-24" />
                      </div>
                    ))}
                  </div>
                </section>
                <SkeletonPanel rows={4} />
                <div className="grid min-w-0 items-start gap-3 lg:grid-cols-2">
                  <SkeletonPanel rows={2} />
                  <SkeletonPanel rows={2} />
                </div>
                <SkeletonPanel rows={2} />
              </div>
            </section>
          </div>

            <section id="trip-confirmations-panel" aria-labelledby="trip-confirmations-title" className="min-w-0 border-t border-slate-200/80 pt-5">
              <div className="mb-3 flex min-w-0 items-center gap-2 border-b border-slate-200/80 pb-2.5">
                <FileCheck2 size={17} className="shrink-0 text-indigo-700" aria-hidden="true" />
                <h3 id="trip-confirmations-title" className="text-sm font-semibold text-slate-900">Trip confirmations</h3>
              </div>

              <div aria-hidden="true" className="min-w-0 space-y-4">
                <section aria-label="Confirmed trip breakdowns" className="min-w-0">
                  <div className="grid items-start gap-3 lg:grid-cols-2">
                    <SkeletonPanel rows={2} />
                    <SkeletonPanel rows={2} />
                  </div>
                </section>
                <SkeletonPanel rows={3} />
                <SkeletonPanel rows={3} />
              </div>
            </section>
          </div>
        </section>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
