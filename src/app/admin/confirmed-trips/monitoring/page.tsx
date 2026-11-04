import { FileCheck2, Plane } from "lucide-react";

import { AdminPageShell, AdminSectionCard } from "@/components/admin/AdminPageShell";
import { TripConfirmationsMonitoringPanel } from "@/components/admin/TripConfirmationsMonitoringPanel";
import { TripFlightStatusMonitoringPanel } from "@/components/admin/TripFlightStatusMonitoringPanel";
import { TripWorkspaceNavigation } from "@/components/admin/TripWorkspaceNavigation";
import { requireAdminSession } from "@/lib/auth-guards";

export const metadata = { title: "Admin Trip Monitoring" };

export default async function AdminTripMonitoringPage() {
  await requireAdminSession("/admin/confirmed-trips/monitoring");

  return (
    <AdminPageShell title="Trip monitoring" hideHeader>
      <AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">
        <TripWorkspaceNavigation active="monitoring" />
        <h1 className="sr-only">Trip monitoring</h1>

        <section aria-label="Trip monitoring details" className="min-w-0 pt-5">
          <div className="space-y-6">
            <section id="trip-confirmations-panel" aria-labelledby="trip-confirmations-title" className="min-w-0">
              <div className="mb-3 flex min-w-0 items-center gap-2 border-b border-slate-200/80 pb-2.5">
                <FileCheck2 size={17} className="shrink-0 text-indigo-700" aria-hidden="true" />
                <h3 id="trip-confirmations-title" className="text-sm font-semibold text-slate-900">Trip confirmations</h3>
              </div>
              <TripConfirmationsMonitoringPanel />
            </section>

            <section id="trip-flight-status-panel" aria-labelledby="trip-flight-status-title" className="min-w-0 border-t border-slate-200/80 pt-5">
              <div className="mb-3 flex min-w-0 items-center gap-2 border-b border-slate-200/80 pb-2.5">
                <Plane size={17} className="shrink-0 text-indigo-700" aria-hidden="true" />
                <h3 id="trip-flight-status-title" className="text-sm font-semibold text-slate-900">Flight status</h3>
              </div>
              <TripFlightStatusMonitoringPanel />
            </section>
          </div>
        </section>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
