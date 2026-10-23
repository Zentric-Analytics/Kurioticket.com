import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminPageShell";
import {
  AdminOverviewDashboard,
  AdminOverviewSecondary,
} from "@/components/admin/AdminOverviewDashboard";
import type { OverviewRange } from "@/components/admin/AdminOverviewControls";
import { adminNavigation } from "@/lib/adminNavigation";
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

  // All existing Admin Modules links remain available in the expanded
  // directory; Quick Actions is an additional presentation, not a replacement.
  const modules = adminNavigation.filter((item) =>
    [
      "/admin/users",
      "/admin/providers",
      "/admin/searches",
      "/admin/redirects",
      "/admin/support",
      "/admin/account-deletions",
      "/admin/content",
      "/admin/logs",
      "/admin/system",
    ].includes(item.href),
  );

  return (
    <AdminPageShell
      title="Operations Dashboard"
      description="Monitor Kurioticket operations, customer journeys, provider health, support and recorded administrative activity."
    >
      {overview.status === "ok" ? (
        <AdminOverviewDashboard
          data={overview.data}
          system={system}
          activity={activity}
          modules={modules}
          range={range}
        />
      ) : (
        <>
          <AdminEmptyState
            title="Operational summary unavailable"
            message="The canonical admin overview could not be loaded. No fallback or mocked operational totals are shown."
          />
          <AdminOverviewSecondary system={system} activity={activity} modules={modules} />
        </>
      )}
    </AdminPageShell>
  );
}
