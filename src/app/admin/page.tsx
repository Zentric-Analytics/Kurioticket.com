import {
  AdminActivityList,
  AdminEmptyState,
  AdminLinkButton,
  AdminMetricCard,
  AdminPageShell,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import {
  getAdminMetrics,
  getProviderStatuses,
  getRecentAdminActivity,
  getSafeSystemStatus,
  getSearchHealth,
} from "@/lib/admin-data";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const [metrics, providers, system, searchHealth, activity] = await Promise.all([
    getAdminMetrics(),
    getProviderStatuses(),
    getSafeSystemStatus(),
    getSearchHealth(),
    getRecentAdminActivity(),
  ]);
  const visibleActivity = activity.slice(0, 5);
  const healthDependencies = getHealthDependencies(system);
  const failedDependencies = healthDependencies.filter((dependency) => dependency.state === "failed");
  const warningDependencies = healthDependencies.filter((dependency) => dependency.state === "warning");
  const platformState = failedDependencies.length > 0 ? "Needs attention" : warningDependencies.length > 0 ? "Degraded" : "Healthy";
  const platformTone = failedDependencies.length > 0 ? "bad" : warningDependencies.length > 0 ? "warn" : "good";
  const providersNeedingAttention = providers.filter((provider) => !provider.searchEnabled).length;

  return (
    <AdminPageShell
      title="Operations Dashboard"
      description="Manage Kurioticket operations, users, provider health, searches, support, and audit logs."
    >
      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Platform Health</h2>
          <AdminSectionCard className="mt-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Overall state</p>
                <p className="mt-2 text-2xl font-extrabold text-slate-950">{platformState}</p>
              </div>
              <AdminStatusBadge tone={platformTone}>{platformState}</AdminStatusBadge>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <DependencySummary title="Failed dependencies" dependencies={failedDependencies} emptyLabel="None" tone="bad" />
              <DependencySummary title="Warning dependencies" dependencies={warningDependencies} emptyLabel="None" tone="warn" />
            </div>
          </AdminSectionCard>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-950">Operations Snapshot</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AdminMetricCard label="Active users" value={metrics.activeUsers} tone="good" />
            <AdminMetricCard label="Suspended users" value={metrics.suspendedUsers} tone="warn" />
            <AdminMetricCard label="Recent admin actions" value={metrics.recentAdminActions} hint="Last 7 days" tone="info" />
            <AdminMetricCard label="Providers needing attention" value={providersNeedingAttention} tone={providersNeedingAttention > 0 ? "warn" : "good"} />
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-950">Search Health</h2>
        <div className="mt-3">
          {searchHealth.hasLogs ? (
            <AdminSectionCard className="p-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.8fr]">
                <AdminMetricCard label="Failed searches" value={searchHealth.failedSearches} tone="bad" />
                <AdminMetricCard label="No-result searches" value={searchHealth.noResultSearches} tone="warn" />
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total recent searches</p>
                  <p className="mt-3 text-xl font-extrabold text-slate-800">{searchHealth.totalRecentSearches}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Last 7 days context</p>
                </div>
              </div>
              <div className="mt-5">
                <p className="text-sm font-semibold text-slate-950">Top products searched</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {searchHealth.topProducts.map((product) => (
                    <AdminStatusBadge key={product.label} tone="info">{product.label}: {product.count}</AdminStatusBadge>
                  ))}
                </div>
              </div>
            </AdminSectionCard>
          ) : (
            <AdminEmptyState title="Search analytics unavailable" message="Search analytics will appear after search logging records real user searches. No search counts are mocked." />
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">Provider Readiness</h2>
          <AdminLinkButton href="/admin/providers" size="sm">View Providers</AdminLinkButton>
        </div>
        <AdminSectionCard className="mt-3 divide-y divide-slate-100 p-0">
          {providers.map((provider) => (
            <div key={provider.product} className="flex items-center justify-between gap-4 p-4">
              <p className="font-semibold text-slate-950">{provider.product}</p>
              <AdminStatusBadge tone={provider.searchEnabled ? "good" : provider.credentialsPresent ? "warn" : "neutral"}>
                {provider.searchEnabled ? "Ready" : provider.credentialsPresent ? "Configured" : "Not connected"}
              </AdminStatusBadge>
            </div>
          ))}
        </AdminSectionCard>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">Admin Activity</h2>
          <AdminLinkButton href="/admin/logs" size="sm">View Audit Logs</AdminLinkButton>
        </div>
        <div className="mt-3"><AdminActivityList items={visibleActivity} /></div>
      </section>
    </AdminPageShell>
  );
}

type HealthDependency = { label: string; state: "failed" | "warning" };

function getHealthDependencies(system: Awaited<ReturnType<typeof getSafeSystemStatus>>): HealthDependency[] {
  return [
    !system.databaseConnected
      ? { label: "Database", state: system.databaseConfigured ? "warning" : "failed" }
      : null,
    !(system.authConfigured && system.sessionConfigured)
      ? { label: "Auth/session", state: "failed" }
      : null,
    !system.emailConfigured ? { label: "Email / Resend", state: "warning" } : null,
    !system.webhookConfigured ? { label: "Webhooks", state: "warning" } : null,
  ].filter((dependency): dependency is HealthDependency => Boolean(dependency));
}

function DependencySummary({
  title,
  dependencies,
  emptyLabel,
  tone,
}: {
  title: string;
  dependencies: HealthDependency[];
  emptyLabel: string;
  tone: "bad" | "warn";
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {dependencies.length > 0 ? (
          dependencies.map((dependency) => <AdminStatusBadge key={dependency.label} tone={tone}>{dependency.label}</AdminStatusBadge>)
        ) : (
          <AdminStatusBadge tone="good">{emptyLabel}</AdminStatusBadge>
        )}
      </div>
    </div>
  );
}
