import Link from "next/link";
import { AdminPageShell, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { getSafeSystemStatus } from "@/lib/admin-data";
import { getAdminEmails } from "@/lib/env";

export const metadata = { title: "Admin System" };

type AttentionItem = { label: string; detail: string; href?: string; actionLabel?: string };

export default async function AdminSystemPage() {
  const system = await getSafeSystemStatus();
  const adminEmailCount = getAdminEmails().length;
  // A successful database query is a real connectivity signal. Other rows
  // reflect configuration presence; they do not prove a service is healthy.
  const databaseLabel = system.databaseConnected
    ? "Connected"
    : system.databaseConfigured ? "Configured, disconnected" : "Disconnected";
  const configurationRows = [
    ["Authentication configuration", system.authConfigured, "Configured", "Not configured"],
    ["Email configured", system.emailConfigured, "Yes", "No"],
    ["Provider configs present", system.providerCredentialsPresent, "Yes", "No"],
    ["ADMIN_EMAILS configured", system.adminEmailsConfigured, "Yes", "No"],
  ] as const;

  const configurationGapCount =
    Number(!system.databaseConfigured) +
    Number(!system.authConfigured) +
    Number(!system.emailConfigured) +
    Number(!system.providerCredentialsPresent) +
    Number(!system.adminEmailsConfigured);

  const attention: AttentionItem[] = [];
  if (!system.databaseConnected) {
    attention.push({
      label: "Database connectivity unavailable",
      detail: system.databaseConfigured
        ? "The database is configured, but its connectivity check did not succeed. Check database availability and application connectivity in the deployment environment."
        : "A database connection is not configured. Managed in deployment configuration; no secret values are editable here.",
    });
  }
  if (!system.authConfigured) attention.push({
    label: "Authentication configuration missing",
    detail: "The server authentication secret was not found. Managed in deployment configuration; ask an authorized operator to restore it.",
  });
  if (!system.emailConfigured) attention.push({
    label: "Email configuration incomplete",
    detail: "Email credentials are not fully configured; this is not a delivery-health measurement.",
    href: "/admin/email-delivery",
    actionLabel: "View email diagnostics",
  });
  if (!system.providerCredentialsPresent) attention.push({
    label: "Provider credentials absent",
    detail: "No provider credentials were detected. Review integration readiness.",
    href: "/admin/providers",
    actionLabel: "Review provider readiness",
  });
  if (!system.adminEmailsConfigured) attention.push({
    label: "Administrator email configuration missing",
    detail: "No configured administrator email entries were detected. Managed in deployment configuration; Settings cannot edit the administrator allowlist.",
  });

  return (
    <AdminPageShell title="System" hideHeader>
      <div className="w-full min-w-0 text-[#0F172A]">
        <section aria-labelledby="system-health-heading" className="border-b border-[#D8E1EC] pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="system-health-heading" className="text-[15px] font-semibold">System Health Overview</h2>
              <p className="mt-1 text-[12px] leading-5 text-[#64748B]">Verified connectivity and configuration readiness. This is not a full platform uptime or performance score.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-3">
            <div className="min-w-0">
              <p className="text-[12px] text-[#64748B]">Application environment</p>
              <p className="mt-1 text-[14px] font-semibold">{system.appEnvironment}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-[#64748B]">Database connectivity</p>
              <div className="mt-1"><AdminStatusBadge tone={system.databaseConnected ? "good" : "bad"}>{databaseLabel}</AdminStatusBadge></div>
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-[#64748B]">Configuration gaps</p>
              <p className="mt-1 text-[14px] font-semibold tabular-nums">{configurationGapCount}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-x-10 gap-y-5 border-b border-[#D8E1EC] py-5 lg:grid-cols-2">
          <section aria-labelledby="service-health-heading" className="min-w-0">
            <h2 id="service-health-heading" className="text-[15px] font-semibold">Service Health</h2>
            <p className="mt-1 text-[12px] leading-5 text-[#64748B]">Only the database has a direct connectivity check here.</p>
            <dl className="mt-2 divide-y divide-slate-200">
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[13px] text-[#475569]">Database connectivity</dt>
                <dd className="shrink-0"><AdminStatusBadge tone={system.databaseConnected ? "good" : "bad"}>{databaseLabel}</AdminStatusBadge></dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[13px] text-[#475569]">Authentication configuration</dt>
                <dd className="shrink-0"><AdminStatusBadge tone={system.authConfigured ? "info" : "warn"}>{system.authConfigured ? "Configured" : "Not configured"}</AdminStatusBadge></dd>
              </div>
            </dl>
            <p className="mt-2 text-[12px] leading-5 text-[#64748B]">Authentication configuration does not verify successful sign-in requests.</p>
          </section>

          <section aria-labelledby="configuration-readiness-heading" className="min-w-0">
            <h2 id="configuration-readiness-heading" className="text-[15px] font-semibold">Configuration Readiness</h2>
            <p className="mt-1 text-[12px] leading-5 text-[#64748B]">Configured credentials indicate presence only, not successful service operation.</p>
            <dl className="mt-2 divide-y divide-slate-200">
              {configurationRows.filter(([label]) => label !== "Authentication configuration").map(([label, configured, yes, no]) => (
                <div key={label} className="flex items-center justify-between gap-4 py-3">
                  <dt className="min-w-0 text-[13px] text-[#475569]">{label}</dt>
                  <dd className="shrink-0"><AdminStatusBadge tone={configured ? "info" : "warn"}>{configured ? yes : no}</AdminStatusBadge></dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[13px] text-[#475569]">Configured admin count</dt>
                <dd className="shrink-0"><AdminStatusBadge tone="info">{adminEmailCount}</AdminStatusBadge></dd>
              </div>
            </dl>
          </section>
        </div>

        <section aria-labelledby="system-attention-heading" className="pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="system-attention-heading" className="text-[15px] font-semibold">Issues Requiring Attention</h2>
          </div>
          {attention.length ? (
            <ul className="mt-2 max-w-[880px] divide-y divide-slate-200">
              {attention.map((item) => (
                <li key={item.label} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[#0F172A]">{item.label}</p>
                    <p className="mt-1 text-[12px] leading-5 text-[#64748B]">{item.detail}</p>
                  </div>
                  {item.href ? <Link href={item.href} className="shrink-0 text-[13px] font-medium text-[#004BB8] hover:underline">{item.actionLabel}</Link> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13px] leading-5 text-[#475569]">No database connectivity failures or missing required configurations detected by these checks. Other services may still have alerts.</p>
          )}
          <p className="mt-3 text-[12px] leading-5 text-[#64748B]">For delivery failures, provider operations, CMS integrity and performance details, use the dedicated monitoring pages. No unverified latency or uptime figures are shown.</p>
        </section>
      </div>
    </AdminPageShell>
  );
}
