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
      hideHeader
    >
      <section aria-labelledby="system-status-heading" className="max-w-[880px] border-b border-slate-200 pb-4 pt-0">
        <h2 id="system-status-heading" className="text-[15px] font-semibold text-[#0F172A]">System Status</h2>
        <dl className="mt-2 divide-y divide-slate-200">
          {statusRows.map(([label, value, tone]) => (
            <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3">
              <dt className="min-w-0 text-[13px] font-normal leading-5 text-[#475569]">{label}</dt>
              <dd className="justify-self-end whitespace-nowrap"><AdminStatusBadge tone={tone}>{value}</AdminStatusBadge></dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="configuration-readiness-heading" className="max-w-[880px] pb-4 pt-4">
        <h2 id="configuration-readiness-heading" className="text-[15px] font-semibold text-[#0F172A]">Configuration Readiness</h2>
        <p className="mt-1 text-xs leading-5 text-[#64748B]">Configured credentials indicate presence only, not successful service operation.</p>
        <dl className="mt-2 divide-y divide-slate-200">
          {configurationRows.map(([label, value, tone]) => (
            <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3">
              <dt className="min-w-0 text-[13px] font-normal leading-5 text-[#475569]">{label}</dt>
              <dd className="justify-self-end whitespace-nowrap"><AdminStatusBadge tone={tone}>{value}</AdminStatusBadge></dd>
            </div>
          ))}
        </dl>
      </section>
    </AdminPageShell>
  );
}
