import { AdminPageShell, AdminSectionCard } from "@/components/admin/AdminPageShell";
import {
  AdminOverviewDashboard,
  AdminOverviewSecondary,
} from "@/components/admin/AdminOverviewDashboard";
import { AdminOverviewRangeTransitionProvider, type OverviewRange } from "@/components/admin/AdminOverviewControls";
import { getRecentAdminActivity, getSafeSystemStatus } from "@/lib/admin-data";
import { getAdminOverview } from "@/services/adminOverviewService";

import { redirect } from "next/navigation";
import { requireAdminApiSession } from "@/lib/admin";
import { requireAdminSession } from "@/lib/auth-guards";
import { readPlatformOperations } from "@/services/platformOperationsService";
import { PlatformOverviewSummary } from "@/components/admin/PlatformOverviewSummary";

export const metadata = { title: "Admin" };

type PageProps = { searchParams?: Promise<{ range?: string }> };

// Reporting controls only select valid windows; the backend remains the
// authority for environment scope, date validation and database totals.
export default async function AdminPage({ searchParams }: PageProps) {
  await requireAdminSession("/admin");
  const access=await requireAdminApiSession(); if ("response" in access && access.response) redirect("/dashboard");
  const selected = (await searchParams)?.range;
  // An unfiltered Overview shows the last 24 hours. Seven- and 30-day
  // windows are explicit choices preserved by the URL when selected.
  const range: OverviewRange = selected === "7d" || selected === "30d" ? selected : "24h";
  const query = new URLSearchParams();
  const to = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const durationMs = range === "30d" ? 30 * dayMs : range === "7d" ? 7 * dayMs : dayMs;
  query.set("from", new Date(to.getTime() - durationMs).toISOString());
  query.set("to", to.toISOString());

  const [overview, system, activity, platform] = await Promise.all([
    getAdminOverview(query),
    getSafeSystemStatus(),
    getRecentAdminActivity(),
    readPlatformOperations(range === "30d" ? 720 : range === "7d" ? 168 : 24),
  ]);

  return (
    <AdminPageShell
      title="Operations Dashboard"
      hideHeader
    >
      <AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">
        <PlatformOverviewSummary data={platform} hours={range === "30d" ? 720 : range === "7d" ? 168 : 24}/>
        {overview.status === "ok" ? (
          <AdminOverviewRangeTransitionProvider range={range}>
          <AdminOverviewDashboard
          data={overview.data}
          system={system}
          activity={activity}
          range={range}
        />
          </AdminOverviewRangeTransitionProvider>
      ) : (
        <>
          <section role="status" className="border-b border-slate-200/90 py-5">
            <h2 className="text-base font-bold text-slate-950">Operational summary unavailable</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The canonical admin overview could not be loaded. No fallback or mocked operational totals are shown.
            </p>
          </section>
          <AdminOverviewSecondary system={system} activity={activity} />
        </>
        )}
      </AdminSectionCard>
    </AdminPageShell>
  );
}
