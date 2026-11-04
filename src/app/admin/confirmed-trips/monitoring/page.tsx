import Link from "next/link";
import { ArrowLeft, FileCheck2, Plane } from "lucide-react";

import { AdminPageShell, AdminSectionCard } from "@/components/admin/AdminPageShell";
import { TripConfirmationsMonitoringPanel } from "@/components/admin/TripConfirmationsMonitoringPanel";
import { TripFlightStatusMonitoringPanel } from "@/components/admin/TripFlightStatusMonitoringPanel";
import { requireAdminSession } from "@/lib/auth-guards";

export const metadata = { title: "Admin Trip Monitoring" };

export default async function AdminTripMonitoringPage() {
  await requireAdminSession("/admin/confirmed-trips/monitoring");

  return (
    <AdminPageShell title="Trip monitoring" hideHeader>
      <AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">
        <nav aria-label="Trip monitoring navigation" className="mb-3 flex min-w-0 items-center">
          <Link href="/admin/confirmed-trips" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1.5 text-[13px] font-semibold text-slate-700 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            <ArrowLeft size={16} aria-hidden="true" /> Back to Trips
          </Link>
        </nav>

        <section aria-labelledby="trip-monitoring-title" className="min-w-0">
          <h2 id="trip-monitoring-title" className="mb-4 text-base font-semibold text-slate-950">Trip monitoring</h2>

          <div className="space-y-4">
            <section id="trip-confirmations-panel" aria-labelledby="trip-confirmations-title" className="min-w-0 rounded-xl border border-slate-200/80 bg-white">
              <div className="flex min-h-11 items-center gap-2 border-b border-slate-100 px-3 py-2.5">
                <FileCheck2 size={17} className="shrink-0 text-indigo-700" aria-hidden="true" />
                <h3 id="trip-confirmations-title" className="text-sm font-semibold text-slate-800">Trip confirmations</h3>
              </div>
              <div className="min-w-0 p-3">
                <TripConfirmationsMonitoringPanel />
              </div>
            </section>

            <section id="trip-flight-status-panel" aria-labelledby="trip-flight-status-title" className="min-w-0 rounded-xl border border-slate-200/80 bg-white">
              <div className="flex min-h-11 items-center gap-2 border-b border-slate-100 px-3 py-2.5">
                <Plane size={17} className="shrink-0 text-indigo-700" aria-hidden="true" />
                <h3 id="trip-flight-status-title" className="text-sm font-semibold text-slate-800">Flight status</h3>
              </div>
              <div className="min-w-0 p-3">
                <TripFlightStatusMonitoringPanel />
              </div>
            </section>
          </div>
        </section>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
