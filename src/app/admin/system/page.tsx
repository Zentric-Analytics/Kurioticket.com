import { AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { getSafeSystemStatus } from "@/lib/admin-data";

export const metadata = { title: "Admin System" };

export default async function AdminSystemPage() {
  const system = await getSafeSystemStatus();
  const rows = [
    ["App environment", system.appEnvironment, true],
    ["Database", system.databaseConnected ? "Connected" : system.databaseConfigured ? "Configured, disconnected" : "Disconnected", system.databaseConnected],
    ["Auth configured", system.authConfigured ? "Yes" : "No", system.authConfigured],
    ["Session secret configured", system.sessionConfigured ? "Yes" : "No", system.sessionConfigured],
    ["Email configured", system.emailConfigured ? "Yes" : "No", system.emailConfigured],
    ["Provider configs present", system.providerCredentialsPresent ? "Yes" : "No", system.providerCredentialsPresent],
    ["Webhook configured", system.webhookConfigured ? "Yes" : "No", system.webhookConfigured],
    ["Admin emails configured", system.adminEmailsConfigured ? "Yes" : "No", system.adminEmailsConfigured],
  ] as const;

  return (
    <AdminPageShell title="System" description="Safe operational status only. Secret values, database URLs, API keys, tokens, and raw environment variables are never displayed.">
      <AdminSectionCard className="p-5">
        <div className="grid gap-3 md:grid-cols-2">
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
    </AdminPageShell>
  );
}
