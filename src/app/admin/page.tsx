import {
  AdminActivityList,
  AdminEmptyState,
  AdminMetricCard,
  AdminPageShell,
  AdminProviderStatusCard,
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

  return (
    <AdminPageShell
      title="Operations Dashboard"
      description="Manage Kurioticket operations, users, provider health, searches, support, and audit logs."
    >
      <section>
        <h2 className="text-lg font-semibold text-slate-950">Operations Snapshot</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AdminMetricCard label="Total users" value={metrics.totalUsers} />
          <AdminMetricCard label="Active users" value={metrics.activeUsers} tone="good" />
          <AdminMetricCard label="Suspended users" value={metrics.suspendedUsers} tone="warn" />
          <AdminMetricCard label="Admin users" value={metrics.adminUsers} tone="info" />
          <AdminMetricCard label="Recent searches" value={metrics.recentSearches} hint="Last 7 days" />
          <AdminMetricCard label="Recent admin actions" value={metrics.recentAdminActions} hint="Last 7 days" />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-950">Provider Readiness</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {providers.map((provider) => <AdminProviderStatusCard key={provider.product} {...provider} />)}
        </div>
      </section>

      <section className="mt-8 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Search Health</h2>
          <div className="mt-3">
            {searchHealth.hasLogs ? (
              <AdminSectionCard className="p-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <AdminMetricCard label="Total recent searches" value={searchHealth.totalRecentSearches} />
                  <AdminMetricCard label="No-result searches" value={searchHealth.noResultSearches} tone="warn" />
                  <AdminMetricCard label="Failed searches" value={searchHealth.failedSearches} tone="bad" />
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
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-950">Platform Health</h2>
          <AdminSectionCard className="mt-3 p-5">
            <div className="grid gap-3">
              <HealthRow label="Database" ok={system.databaseConnected} fallback={system.databaseConfigured ? "Configured, not connected" : "Not configured"} />
              <HealthRow label="Auth/session" ok={system.authConfigured && system.sessionConfigured} fallback="Not fully configured" />
              <HealthRow label="Email / Resend" ok={system.emailConfigured} fallback="Unavailable" />
              <HealthRow label="Provider credentials" ok={system.providerCredentialsPresent} fallback="Not present" />
              <HealthRow label="Webhooks" ok={system.webhookConfigured} fallback="Unavailable" />
            </div>
          </AdminSectionCard>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-950">Admin Activity</h2>
        <div className="mt-3"><AdminActivityList items={activity} /></div>
      </section>
    </AdminPageShell>
  );
}

function HealthRow({ label, ok, fallback }: { label: string; ok: boolean; fallback: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm">
      <span className="font-semibold text-slate-600">{label}</span>
      <AdminStatusBadge tone={ok ? "good" : "neutral"}>{ok ? "Available" : fallback}</AdminStatusBadge>
    </div>
  );
}
