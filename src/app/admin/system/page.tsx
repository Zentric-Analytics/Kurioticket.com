import { AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { getSafeSystemStatus } from "@/lib/admin-data";
import { getAdminEmails } from "@/lib/env";
import { withOptionalDb } from "@/lib/prisma";

export const metadata = { title: "Admin System" };

export default async function AdminSystemPage() {
  const [system, flags] = await Promise.all([
    getSafeSystemStatus(),
    withOptionalDb((db) => db.featureFlag.findMany({ orderBy: { key: "asc" }, take: 50 }), []),
  ]);
  const adminEmailCount = getAdminEmails().length;
  const rows = [
    ["App environment", system.appEnvironment, true],
    ["Database", system.databaseConnected ? "Connected" : system.databaseConfigured ? "Configured, disconnected" : "Disconnected", system.databaseConnected],
    ["Auth configured", system.authConfigured ? "Yes" : "No", system.authConfigured],
    ["Session secret configured", system.sessionConfigured ? "Yes" : "No", system.sessionConfigured],
    ["Email configured", system.emailConfigured ? "Yes" : "No", system.emailConfigured],
    ["Provider configs present", system.providerCredentialsPresent ? "Yes" : "No", system.providerCredentialsPresent],
    ["Webhook configured", system.webhookConfigured ? "Yes" : "No", system.webhookConfigured],
  ] as const;

  return (
    <AdminPageShell title="System" description="Safe operational status only. Secret values, database URLs, API keys, tokens, and raw environment variables are never displayed.">
      <AdminSectionCard className="p-5">
        <h2 className="font-semibold text-slate-950">System Status</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {rows.map(([label, value, ok]) => (
            <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
              <span className="text-sm font-semibold text-slate-600">{label}</span>
              <AdminStatusBadge tone={ok ? "good" : "neutral"}>{value}</AdminStatusBadge>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <AdminStatusBadge tone="good">No secrets shown</AdminStatusBadge>
          <AdminStatusBadge>Database URL hidden</AdminStatusBadge>
          <AdminStatusBadge>API keys hidden</AdminStatusBadge>
        </div>
      </AdminSectionCard>

      <AdminSectionCard className="p-5">
        <h2 className="font-semibold text-slate-950">Admin Configuration</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
            <span className="text-sm font-semibold text-slate-600">ADMIN_EMAILS configured</span>
            <AdminStatusBadge tone={system.adminEmailsConfigured ? "good" : "neutral"}>{system.adminEmailsConfigured ? "Yes" : "No"}</AdminStatusBadge>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
            <span className="text-sm font-semibold text-slate-600">Configured admin count</span>
            <AdminStatusBadge tone={adminEmailCount > 0 ? "info" : "neutral"}>{adminEmailCount}</AdminStatusBadge>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard className="p-5">
        <h2 className="font-semibold text-slate-950">Feature Flags</h2>
        {flags.length === 0 ? <p className="mt-2 text-sm text-slate-600">No feature flags configured yet.</p> : (
          <div className="mt-3 grid gap-2">
            {flags.map((flag) => (
              <div key={flag.id} className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="font-semibold text-slate-950">{flag.key}</span>
                <AdminStatusBadge tone={flag.enabled ? "good" : "neutral"}>{flag.enabled ? "Enabled" : "Disabled"} / {flag.scope}</AdminStatusBadge>
              </div>
            ))}
          </div>
        )}
      </AdminSectionCard>
    </AdminPageShell>
  );
}
