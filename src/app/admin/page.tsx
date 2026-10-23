import { AdminPageShell } from "@/components/admin/AdminPageShell";
import {
  AdminOverviewDashboard,
  AdminOverviewSecondary,
} from "@/components/admin/AdminOverviewDashboard";
import type { OverviewRange } from "@/components/admin/AdminOverviewControls";
import { getRecentAdminActivity, getSafeSystemStatus } from "@/lib/admin-data";
import { getAdminOverview } from "@/services/adminOverviewService";

export const metadata = { title: "Admin" };

type PageProps = { searchParams?: Promise<{ range?: string }> };

// Reporting controls only select valid windows; the backend remains the
// authority for environment scope, date validation and database totals.
export default async function AdminPage({ searchParams }: PageProps) {
  const selected = (await searchParams)?.range;
  const range: OverviewRange = selected === "24h" || selected === "30d" ? selected : "7d";
  const query = new URLSearchParams();
  if (range !== "7d") {
    const to = new Date();
    const durationMs = range === "24h" ? 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    query.set("from", new Date(to.getTime() - durationMs).toISOString());
    query.set("to", to.toISOString());
  }

  const [overview, system, activity] = await Promise.all([
    getAdminOverview(query),
    getSafeSystemStatus(),
    getRecentAdminActivity(),
  ]);

  return (
    <AdminPageShell
      title="Operations Dashboard"
      hideHeader
    >
      {overview.status === "ok" ? (
        <AdminOverviewDashboard
          data={overview.data}
          system={system}
          activity={activity}
          range={range}
        />
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
    </AdminPageShell>
  );
}
