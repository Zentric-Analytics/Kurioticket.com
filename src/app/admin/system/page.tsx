import { AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { getSafeSystemStatus } from "@/lib/admin-data";
import { getAdminEmails } from "@/lib/env";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFeatureControlProductionAdmins } from "@/lib/env";
import { listFeatureControls } from "@/lib/feature-controls/service";
import { FeatureControlsPanel } from "@/components/admin/FeatureControlsPanel";

export const metadata = { title: "Admin System" };

export default async function AdminSystemPage() {
  const [system, featureControls, session] = await Promise.all([
    getSafeSystemStatus(),
    listFeatureControls(),
    getServerSession(authOptions),
  ]);
  const adminEmailCount = getAdminEmails().length;
  const rows = [
    ["App environment", system.appEnvironment, true],
    ["Database", system.databaseConnected ? "Connected" : system.databaseConfigured ? "Configured, disconnected" : "Disconnected", system.databaseConnected],
    ["Auth configured", system.authConfigured ? "Yes" : "No", system.authConfigured],
    ["Session secret configured", system.sessionConfigured ? "Yes" : "No", system.sessionConfigured],
    ["Email configured", system.emailConfigured ? "Yes" : "No", system.emailConfigured],
    ["Provider configs present", system.providerCredentialsPresent ? "Yes" : "No", system.providerCredentialsPresent],
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
        <h2 className="font-semibold text-slate-950">Feature Controls — {featureControls.environment}</h2>
        <p className="mt-2 text-sm text-slate-600">Authoritative product availability and operational kill switches. Production changes require explicit controller permission and an audited reason.</p>
        <div className="mt-5"><FeatureControlsPanel initialControls={featureControls.controls} environment={featureControls.environment} canControlProduction={getFeatureControlProductionAdmins().includes(session?.user?.email?.trim().toLowerCase() || "")} /></div>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
