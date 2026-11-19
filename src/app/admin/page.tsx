import { redirect } from "next/navigation";
import { AdminPageShell, AdminSectionCard } from "@/components/admin/AdminPageShell";
import { AdminOverviewDashboard, AdminOverviewSecondary, SearchPerformanceSummary } from "@/components/admin/AdminOverviewDashboard";
import {
  AdminOverviewAutoRefresh,
  AdminOverviewRangeSelect,
  AdminOverviewRangeSensitive,
  AdminOverviewRangeTransitionProvider,
} from "@/components/admin/AdminOverviewControls";
import { PlatformOverviewSummary } from "@/components/admin/PlatformOverviewSummary";
import { requireAdminApiSession } from "@/lib/admin";
import { getRecentAdminActivity, getSafeSystemStatus } from "@/lib/admin-data";
import { resolveOverviewRange } from "@/lib/adminOverviewRange";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminOverview } from "@/services/adminOverviewService";
import { readPlatformSearchActivity } from "@/services/platformOperationsService";

export const metadata = { title: "Admin" };

type PageProps = { searchParams?: Promise<{ range?: string | string[]; from?: string | string[]; to?: string | string[] }> };

export default async function AdminPage({ searchParams }: PageProps) {
  await requireAdminSession("/admin");
  const access = await requireAdminApiSession();
  if ("response" in access && access.response) redirect("/dashboard");

  const reporting = resolveOverviewRange(await searchParams);
  const query = new URLSearchParams({ from: reporting.from.toISOString(), to: reporting.to.toISOString() });
  const [overview, system, activity, platform] = await Promise.all([
    getAdminOverview(query),
    getSafeSystemStatus(),
    getRecentAdminActivity(),
    readPlatformSearchActivity(reporting.from, reporting.to),
  ]);

  return (
    <AdminPageShell title="Operations Dashboard" hideHeader>
      <AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">
        <AdminOverviewRangeTransitionProvider period={reporting.period}>
          <AdminOverviewAutoRefresh />
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <span className="self-start rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
              {platform.environment === "staging" ? "Staging" : "Production"}
            </span>
            <div className="ml-auto min-w-0">
              <AdminOverviewRangeSelect period={reporting.period} nowDate={reporting.today} />
            </div>
          </div>
          {reporting.invalidCustom ? (
            <p role="alert" className="mb-3 text-xs text-rose-800">
              Choose valid UTC dates within a 90-day range. Showing the last 24 hours.
            </p>
          ) : null}
          <div className="mb-3 grid min-w-0 items-stretch gap-3 lg:grid-cols-2">
            <AdminOverviewRangeSensitive fill>
              <PlatformOverviewSummary data={platform} />
            </AdminOverviewRangeSensitive>
            {overview.status === "ok" ? (
              <AdminOverviewRangeSensitive fill>
                <SearchPerformanceSummary data={overview.data} />
              </AdminOverviewRangeSensitive>
            ) : (
              <section role="status" className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                <h2 className="text-[15px] font-semibold text-slate-950">Search Performance</h2>
                <p className="mt-2 text-sm text-slate-600">Search performance is unavailable.</p>
              </section>
            )}
          </div>
          {overview.status === "ok" ? (
            <AdminOverviewDashboard data={overview.data} system={system} activity={activity} />
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
        </AdminOverviewRangeTransitionProvider>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
