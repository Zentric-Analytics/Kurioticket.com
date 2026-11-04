import Link from "next/link";
import { ArrowLeft, ChevronDown, FileCheck2, Plane } from "lucide-react";

import { AdminPageShell, AdminSectionCard } from "@/components/admin/AdminPageShell";
import { TripConfirmationsMonitoringPanel } from "@/components/admin/TripConfirmationsMonitoringPanel";
import { TripFlightStatusMonitoringPanel } from "@/components/admin/TripFlightStatusMonitoringPanel";
import { requireAdminSession } from "@/lib/auth-guards";

export const metadata = { title: "Admin Trip Monitoring" };

type Props = { searchParams?: Promise<{ panel?: string | string[] }> };

export default async function AdminTripMonitoringPage({ searchParams }: Props) {
  await requireAdminSession("/admin/confirmed-trips/monitoring");
  const requestedPanel = (await searchParams)?.panel;
  const panel = typeof requestedPanel === "string" ? requestedPanel : "";
  const showConfirmations = panel === "confirmations" || panel === "delivery";
  const showFlightStatus = panel === "flight";

  return (
    <AdminPageShell title="Trip monitoring" hideHeader>
      <AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">
        <nav aria-label="Trip monitoring navigation" className="mb-3 flex min-w-0 items-center">
          <Link href="/admin/confirmed-trips" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1.5 text-[13px] font-semibold text-slate-700 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            <ArrowLeft size={16} aria-hidden="true" /> Back to Trips
          </Link>
        </nav>
        <section aria-labelledby="trip-monitoring-title" className="min-w-0">
          <h2 id="trip-monitoring-title" className="mb-3 text-base font-semibold text-slate-950">Trip monitoring</h2>
          <div className="space-y-2">
            <details id="trip-confirmations-panel" open={showConfirmations} className="group min-w-0 rounded-xl border border-slate-200/80 bg-white">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-center gap-2"><FileCheck2 size={17} className="shrink-0 text-indigo-700" aria-hidden="true" /> Trip confirmations</span>
                <ChevronDown size={17} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="min-w-0 border-t border-slate-100 p-3">
                <TripConfirmationsMonitoringPanel expandDelivery={panel === "delivery"} />
              </div>
            </details>
            <details id="trip-flight-status-panel" open={showFlightStatus} className="group min-w-0 rounded-xl border border-slate-200/80 bg-white">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-center gap-2"><Plane size={17} className="shrink-0 text-indigo-700" aria-hidden="true" /> Flight status</span>
                <ChevronDown size={17} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="min-w-0 border-t border-slate-100 p-3">
                <TripFlightStatusMonitoringPanel />
              </div>
            </details>
          </div>
        </section>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
