import Link from "next/link";
import { AdminPageShell, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { getSafeSystemStatus } from "@/lib/admin-data";
import { getAdminEmails } from "@/lib/env";

export const metadata = { title: "Admin System" };

type StatusTone = "good" | "bad" | "warn" | "neutral" | "info";
type AttentionItem = { label: string; detail: string; href?: string; actionLabel?: string };
type ServiceItem = {
  id: string;
  name: string;
  status: string;
  tone: StatusTone;
  signal: string;
  detail: string;
  configured?: string;
  verification: string;
  adminDetails?: { allowlist: string; configuredAdministrators: number };
  href?: string;
  actionLabel?: string;
};

export default async function AdminSystemPage() {
  const system = await getSafeSystemStatus();
  const adminEmailCount = getAdminEmails().length;

  // A successful database query is the only direct connectivity signal on this page.
  // Every other row is intentionally described as configuration/readiness or as a
  // link to its dedicated diagnostics so the UI never invents service health.
  const databaseLabel = system.databaseConnected
    ? "Connected"
    : system.databaseConfigured ? "Configured, disconnected" : "Disconnected";

  const attention: AttentionItem[] = [];
  if (!system.databaseConnected) {
    attention.push({
      label: "Database connectivity unavailable",
      detail: system.databaseConfigured
        ? "The database is configured, but its connectivity check did not succeed. Check database availability and application connectivity in the deployment environment."
        : "A database connection is not configured. Managed in deployment configuration; database credentials are not editable on this page.",
    });
  }
  if (!system.authConfigured) attention.push({
    label: "Authentication configuration missing",
    detail: "The server authentication secret was not found. It must be restored by an authorized operator in deployment configuration.",
  });
  if (!system.emailConfigured) attention.push({
    label: "Email configuration incomplete",
    detail: "Email credentials are not fully configured. This does not represent delivery health.",
    href: "/admin/email-delivery",
    actionLabel: "View email diagnostics",
  });
  if (!system.providerCredentialsPresent) attention.push({
    label: "Provider credentials absent",
    detail: "No provider credentials were detected. Review provider integration readiness.",
    href: "/admin/providers",
    actionLabel: "Review provider readiness",
  });
  if (!system.adminEmailsConfigured) attention.push({
    label: "Administrator email configuration missing",
    detail: "No administrator email entries were detected. The administrator allowlist is managed in deployment configuration.",
  });

  const serviceRows: ServiceItem[] = [
    {
      id: "database",
      name: "Database",
      status: databaseLabel,
      tone: system.databaseConnected ? "good" : "bad",
      signal: "Live connectivity check",
      detail: system.databaseConnected
        ? "A database query completed successfully for this System Status request."
        : "The database connectivity check did not succeed for this System Status request.",
      configured: system.databaseConfigured ? "Configured" : "Not configured",
      verification: "Direct database query",
    },
    {
      id: "authentication",
      name: "Authentication",
      status: system.authConfigured ? "Configured" : "Not configured",
      tone: system.authConfigured ? "info" : "warn",
      signal: "Configuration only",
      detail: "This row verifies authentication configuration presence only. It does not prove that sign-in requests are succeeding.",
      configured: system.authConfigured ? "Configured" : "Not configured",
      verification: "Server configuration presence",
    },
    {
      id: "email",
      name: "Email",
      status: system.emailConfigured ? "Configured" : "Incomplete",
      tone: system.emailConfigured ? "info" : "warn",
      signal: "Configuration only",
      detail: "Email credentials are checked for configuration presence here. Delivery outcomes and test-email diagnostics live on Email Delivery.",
      configured: system.emailConfigured ? "Configured" : "Not configured",
      verification: "Server configuration presence",
      href: "/admin/email-delivery",
      actionLabel: "Open Email Delivery",
    },
    {
      id: "providers",
      name: "Providers",
      status: system.providerCredentialsPresent ? "Configured" : "Not configured",
      tone: system.providerCredentialsPresent ? "info" : "warn",
      signal: "Configuration only",
      detail: "Provider credential presence is not provider health. Provider readiness, operational telemetry and retests live on Providers.",
      configured: system.providerCredentialsPresent ? "Credentials detected" : "No credentials detected",
      verification: "Provider configuration presence",
      href: "/admin/providers",
      actionLabel: "Open Providers",
    },
    {
      id: "cms",
      name: "CMS",
      status: "Separate check",
      tone: "neutral",
      signal: "CMS diagnostics",
      detail: "CMS integrity and repair diagnostics are maintained on the dedicated CMS Health page; this page does not duplicate or infer that state.",
      verification: "CMS Health diagnostics",
      href: "/admin/system/cms-health",
      actionLabel: "Open CMS Health",
    },
    {
      id: "admin-access",
      name: "Admin access",
      status: system.adminEmailsConfigured ? "Configured" : "Not configured",
      tone: system.adminEmailsConfigured ? "info" : "warn",
      signal: "Configuration only",
      detail: "Managed in deployment configuration; this row reports allowlist presence and configured administrator count without exposing administrator addresses.",
      verification: "Server configuration presence",
      adminDetails: {
        allowlist: system.adminEmailsConfigured ? "Configured" : "Not configured",
        configuredAdministrators: adminEmailCount,
      },
    },
  ];

  const monitoredAreaCount = serviceRows.filter(service => service.id !== "admin-access").length;

  return (
    <AdminPageShell title="System" hideHeader>
      <div className="w-full min-w-0 bg-white text-[#0F172A]">
        <section aria-label="System summary" className="border-b border-[#D8E1EC] py-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">
            <div className="min-w-0">
              <p className="text-[12px] text-[#64748B]">Environment</p>
              <p className="mt-1 text-[14px] font-semibold">{system.appEnvironment}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-[#64748B]">Monitored areas</p>
              <p className="mt-1 text-[14px] font-semibold tabular-nums">{monitoredAreaCount}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-[#64748B]">Issues requiring attention</p>
              <p className="mt-1 text-[14px] font-semibold tabular-nums">{attention.length}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-[#64748B]">Database</p>
              <div className="mt-1">
                <AdminStatusBadge tone={system.databaseConnected ? "good" : "bad"}>{databaseLabel}</AdminStatusBadge>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="system-attention-heading" className="border-b border-[#D8E1EC] py-4">
          <h2 id="system-attention-heading" className="text-[15px] font-semibold">Issues Requiring Attention</h2>
          {attention.length ? (
            <ul className="mt-2 max-w-[980px] divide-y divide-[#E7ECF5]">
              {attention.map((item) => (
                <li key={item.label} className="flex flex-wrap items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 max-w-[760px]">
                    <p className="text-[13px] font-medium text-[#0F172A]">{item.label}</p>
                    <p className="mt-1 text-[12px] leading-5 text-[#64748B]">{item.detail}</p>
                  </div>
                  {item.href ? (
                    <Link href={item.href} className="shrink-0 text-[13px] font-medium text-[#004BB8] hover:underline">
                      {item.actionLabel}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-[13px] leading-5 text-[#475569]">No issues detected by these checks.</p>
          )}
        </section>

        <section aria-labelledby="system-areas-heading" className="py-4">
          <h2 id="system-areas-heading" className="text-[15px] font-semibold">System areas</h2>

          <div className="mt-2.5 border-y border-[#E7ECF5]">
            <div className="hidden grid-cols-[minmax(150px,1.1fr)_minmax(170px,0.9fr)_minmax(170px,1fr)_80px] gap-4 border-b border-[#E7ECF5] px-1 py-2.5 text-[11px] font-medium uppercase tracking-[0.04em] text-[#64748B] md:grid">
              <span>Area</span>
              <span>Status</span>
              <span>Signal</span>
              <span className="text-right">Details</span>
            </div>

            <div className="divide-y divide-[#E7ECF5]">
              {serviceRows.map((service) => (
                <details key={service.id} className="group">
                  <summary className="grid cursor-pointer list-none gap-2 px-1 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] md:grid-cols-[minmax(150px,1.1fr)_minmax(170px,0.9fr)_minmax(170px,1fr)_80px] md:items-center md:gap-4 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0">
                      <span className="text-[13px] font-semibold text-[#0F172A]">{service.name}</span>
                    </div>
                    <div className="min-w-0">
                      <AdminStatusBadge tone={service.tone}>{service.status}</AdminStatusBadge>
                    </div>
                    <p className="text-[12px] text-[#64748B]">{service.signal}</p>
                    <span className="text-[12px] font-medium text-[#004BB8] md:text-right">
                      <span className="group-open:hidden">View ›</span>
                      <span className="hidden group-open:inline">Hide ‹</span>
                    </span>
                  </summary>

                  <div className="border-t border-[#EEF2F7] px-1 pb-3.5 pt-3">
                    <div className={"grid max-w-[1100px] gap-x-8 gap-y-3 sm:grid-cols-2 " + (service.adminDetails ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
                      {service.adminDetails ? (
                        <>
                          <div className="min-w-0">
                            <p className="text-[12px] text-[#64748B]">Administrator allowlist</p>
                            <p className="mt-1 text-[13px] font-medium text-[#0F172A]">{service.adminDetails.allowlist}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] text-[#64748B]">Configured administrators</p>
                            <p className="mt-1 text-[13px] font-medium tabular-nums text-[#0F172A]">{service.adminDetails.configuredAdministrators}</p>
                          </div>
                        </>
                      ) : service.configured ? (
                        <div className="min-w-0">
                          <p className="text-[12px] text-[#64748B]">Configuration</p>
                          <p className="mt-1 text-[13px] font-medium text-[#0F172A]">{service.configured}</p>
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        <p className="text-[12px] text-[#64748B]">Verification</p>
                        <p className="mt-1 text-[13px] font-medium text-[#0F172A]">{service.verification}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] text-[#64748B]">Meaning</p>
                        <p className="mt-1 text-[12px] leading-5 text-[#475569]">{service.detail}</p>
                      </div>
                    </div>
                    {service.href ? (
                      <Link href={service.href} className="mt-3 inline-flex text-[13px] font-medium text-[#004BB8] hover:underline">
                        {service.actionLabel} ›
                      </Link>
                    ) : null}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AdminPageShell>
  );
}
