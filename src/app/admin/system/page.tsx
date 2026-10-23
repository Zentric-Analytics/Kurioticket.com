import Link from "next/link";
import { AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { getSafeSystemStatus } from "@/lib/admin-data";
import { getAdminEmails } from "@/lib/env";

export const metadata = { title: "Admin System" };

export default async function AdminSystemPage() {
  const system = await getSafeSystemStatus();
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
    <AdminPageShell title="System" description="Safe operational status only. Secret values, database URLs, API keys, tokens, and raw environment variables are never displayed." actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/email-delivery" className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-black text-indigo-800 hover:bg-indigo-100">Email delivery</Link>
          <Link href="/admin/logs" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">View audit logs</Link>
        </div>
      }>
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

    </AdminPageShell>
  );
}
