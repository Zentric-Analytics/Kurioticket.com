import Link from "next/link";
import { AdminPageShell, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { getSafeSystemStatus } from "@/lib/admin-data";
import { getAdminEmails } from "@/lib/env";

export const metadata = { title: "Admin System" };

export default async function AdminSystemPage() {
  const system = await getSafeSystemStatus();
  const adminEmailCount = getAdminEmails().length;
  const statusRows = [
    ["Application environment", system.appEnvironment, "neutral"],
    ["Database connectivity", system.databaseConnected ? "Connected" : system.databaseConfigured ? "Configured, disconnected" : "Disconnected", system.databaseConnected ? "good" : "neutral"],
    ["Authentication configuration", system.authConfigured ? "Configured" : "Not configured", system.authConfigured ? "good" : "neutral"],
  ] as const;
  const configurationRows = [
    ["Email configured", system.emailConfigured ? "Yes" : "No", system.emailConfigured ? "good" : "neutral"],
    ["Provider configs present", system.providerCredentialsPresent ? "Yes" : "No", system.providerCredentialsPresent ? "good" : "neutral"],
    ["ADMIN_EMAILS configured", system.adminEmailsConfigured ? "Yes" : "No", system.adminEmailsConfigured ? "good" : "neutral"],
    ["Configured admin count", String(adminEmailCount), adminEmailCount > 0 ? "info" : "neutral"],
  ] as const;

  return (
    <AdminPageShell
      title="System"
      description="Read-only configuration and connectivity status. Secret values, database URLs, API keys, tokens, and raw environment variables are never displayed."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/system/cms-health" className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-black text-indigo-800 hover:bg-indigo-100">CMS Health</Link>
          <Link href="/admin/email-delivery" className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-black text-indigo-800 hover:bg-indigo-100">Email delivery</Link>
          <Link href="/admin/logs" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">View audit logs</Link>
        </div>
      }
    >
      <section aria-labelledby="system-status-heading" className="border-b border-slate-200 py-4">
        <h2 id="system-status-heading" className="text-base font-semibold text-slate-950">System Status</h2>
        <dl className="mt-2">
          {statusRows.map(([label, value, tone]) => (
            <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-slate-100 py-3 last:border-b-0">
              <dt className="min-w-0 text-sm text-slate-700">{label}</dt>
              <dd><AdminStatusBadge tone={tone}>{value}</AdminStatusBadge></dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="configuration-readiness-heading" className="py-4">
        <h2 id="configuration-readiness-heading" className="text-base font-semibold text-slate-950">Configuration Readiness</h2>
        <p className="mt-1 text-sm text-slate-500">Configured credentials indicate presence only, not successful service operation.</p>
        <dl className="mt-2">
          {configurationRows.map(([label, value, tone]) => (
            <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-slate-100 py-3 last:border-b-0">
              <dt className="min-w-0 text-sm text-slate-700">{label}</dt>
              <dd><AdminStatusBadge tone={tone}>{value}</AdminStatusBadge></dd>
            </div>
          ))}
        </dl>
      </section>
    </AdminPageShell>
  );
}
