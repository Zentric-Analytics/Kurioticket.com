import Link from "next/link";
import { ArrowLeft, ChevronDown, FileCheck2, Plane } from "lucide-react";

import { AdminPageShell, AdminSectionCard } from "@/components/admin/AdminPageShell";

export default function TripMonitoringLoading() {
  return (
    <AdminPageShell title="Trip monitoring" hideHeader>
      <AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">
        <nav aria-label="Trip monitoring navigation" className="mb-3 flex min-w-0 items-center">
          <Link href="/admin/confirmed-trips" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1.5 text-[13px] font-semibold text-slate-700">
            <ArrowLeft size={16} aria-hidden="true" /> Back to Trips
          </Link>
        </nav>
        <div role="status" aria-live="polite" className="sr-only">Loading trip monitoring…</div>
        <section aria-labelledby="trip-monitoring-loading-title" aria-busy="true" className="min-w-0">
          <h2 id="trip-monitoring-loading-title" className="mb-3 text-base font-semibold text-slate-950">Trip monitoring</h2>
          <div aria-hidden="true" className="space-y-2">
            {[
              { label: "Trip confirmations", Icon: FileCheck2 },
              { label: "Flight status", Icon: Plane },
            ].map(({ label, Icon }) => (
              <div key={label} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                <span className="flex items-center gap-2"><Icon size={17} className="text-indigo-700" aria-hidden="true" />{label}</span>
                <ChevronDown size={17} className="text-slate-400" aria-hidden="true" />
              </div>
            ))}
          </div>
        </section>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
