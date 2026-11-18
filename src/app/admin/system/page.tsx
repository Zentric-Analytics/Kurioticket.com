import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { getSafeSystemStatus } from "@/lib/admin-data";
import { getAdminEmails } from "@/lib/env";

export const metadata = { title: "Admin System" };

type StatusTone = "good" | "bad" | "warn" | "neutral" | "info";
type AttentionItem = { label: string; detail: string };
type ServiceItem = {
  id: string;
  name: string;
  status: string;
  tone: StatusTone;
  signal: string;
};

const statusStyles: Record<StatusTone, { text: string; dot: string }> = {
  good: { text: "text-emerald-700", dot: "bg-emerald-500" },
  bad: { text: "text-rose-700", dot: "bg-rose-500" },
  warn: { text: "text-amber-700", dot: "bg-amber-500" },
  neutral: { text: "text-[#475569]", dot: "bg-slate-400" },
  info: { text: "text-[#004BB8]", dot: "bg-[#004BB8]" },
};

function StatusIndicator({ value, tone }: { value: string; tone: StatusTone }) {
  const style = statusStyles[tone];
  return (
    <span className={"inline-flex items-center gap-1.5 text-[12px] font-medium " + style.text}>
      <span aria-hidden="true" className={"h-1.5 w-1.5 shrink-0 rounded-full " + style.dot} />
      {value}
    </span>
  );
}

function SystemAreaRow({ service }: { service: ServiceItem }) {
  return (
    <div data-system-area={service.id}
      className="grid min-w-0 gap-2 px-3 py-3 md:grid-cols-[minmax(150px,1.15fr)_minmax(160px,0.9fr)_minmax(180px,1.3fr)] md:items-center md:gap-4">
      <span className="min-w-0 text-[13px] font-semibold text-[#020617]">{service.name}</span>
      <div className="min-w-0"><StatusIndicator value={service.status} tone={service.tone} /></div>
      <p className="min-w-0 break-words text-[12px] text-[#475569]">{service.signal}</p>
    </div>
  );
}

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
  });
  if (!system.providerCredentialsPresent) attention.push({
    label: "Provider credentials absent",
    detail: "No provider credentials were detected. Review provider integration readiness.",
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
    },
    {
      id: "authentication",
      name: "Authentication",
      status: system.authConfigured ? "Configured" : "Not configured",
      tone: system.authConfigured ? "info" : "warn",
      signal: "Configuration only",
    },
    {
      id: "email",
      name: "Email",
      status: system.emailConfigured ? "Configured" : "Incomplete",
      tone: system.emailConfigured ? "info" : "warn",
      signal: "Configuration only",
    },
    {
      id: "cms",
      name: "CMS",
      status: "Separate check",
      tone: "neutral",
      signal: "CMS diagnostics",
    },
    {
      id: "admin-access",
      name: "Admin access",
      status: system.adminEmailsConfigured ? "Configured" : "Not configured",
      tone: system.adminEmailsConfigured ? "info" : "warn",
      signal: "Configuration only · " + adminEmailCount + " administrators listed",
    },
  ];

  const systemAreaCount = serviceRows.length;

  return (
    <AdminPageShell title="System" hideHeader>
      <div className="w-full min-w-0 bg-white text-[#020617]">
        <section aria-label="System summary" className="border-b border-[#D8E1EC] py-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">
            <div className="min-w-0">
              <p className="text-[12px] text-[#64748B]">Environment</p>
              <p className="mt-1 text-[14px] font-semibold">{system.appEnvironment}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-[#64748B]">System areas</p>
              <p className="mt-1 text-[14px] font-semibold tabular-nums">{systemAreaCount}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-[#64748B]">Issues requiring attention</p>
              <p className="mt-1 text-[14px] font-semibold tabular-nums">{attention.length}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-[#64748B]">Database</p>
              <div className="mt-1">
                <StatusIndicator value={databaseLabel} tone={system.databaseConnected ? "good" : "bad"} />
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="system-attention-heading" className="border-b border-[#D8E1EC] py-4">
          <h2 id="system-attention-heading" className="text-[15px] font-semibold text-[#020617]">Issues Requiring Attention</h2>
          {attention.length ? (
            <ul className="mt-2 max-w-[980px] divide-y divide-[#E7ECF5]">
              {attention.map((item) => (
                <li key={item.label} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 max-w-[760px]">
                    <p className="text-[13px] font-medium text-[#020617]">{item.label}</p>
                    <p className="mt-1 text-[12px] leading-5 text-[#64748B]">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-[13px] leading-5 text-[#475569]">No issues detected by these checks.</p>
          )}
        </section>

        <section aria-labelledby="system-areas-heading" className="py-4">
          <h2 id="system-areas-heading" className="text-[15px] font-semibold text-[#020617]">System areas</h2>

          <div className="mt-2.5 border-y border-[#E7ECF5]">
            <div className="hidden grid-cols-[minmax(150px,1.15fr)_minmax(160px,0.9fr)_minmax(180px,1.3fr)] gap-4 border-b border-[#D8E1EC] px-3 py-3 text-[12px] font-medium uppercase text-[#475569] md:grid">
              <span>Area</span>
              <span>Status</span>
              <span>Signal</span>
            </div>

            <div className="divide-y divide-[#E7ECF5]">
              {serviceRows.map((service) => (
                <SystemAreaRow key={service.id} service={service} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </AdminPageShell>
  );
}
