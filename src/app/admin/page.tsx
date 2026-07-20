import Link from "next/link";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

import {
  AdminEmptyState,
  AdminPageShell,
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

type StatusTone = "good" | "bad" | "warn" | "neutral" | "info";
type AttentionIssue = {
  key: string;
  message: string;
  href: "/admin/providers" | "/admin/searches" | "/admin/system";
  linkLabel: string;
  tone: Extract<StatusTone, "bad" | "warn">;
  icon: "alert" | "warning";
};

type ProviderStatus = Awaited<ReturnType<typeof getProviderStatuses>>[number];
type SystemStatus = Awaited<ReturnType<typeof getSafeSystemStatus>>;
type SearchHealth = Awaited<ReturnType<typeof getSearchHealth>>;

export default async function AdminPage() {
  const [metrics, providers, system, searchHealth, activity] = await Promise.all([
    getAdminMetrics(),
    getProviderStatuses(),
    getSafeSystemStatus(),
    getSearchHealth(),
    getRecentAdminActivity(),
  ]);
  const attentionIssues = getAttentionIssues(providers, system, searchHealth);

  return (
    <AdminPageShell
      eyebrow=""
      title="Admin Home"
      description="Monitor Kurioticket activity, provider readiness, search health, system status and recent administrative actions."
    >
      <section aria-labelledby="needs-attention-heading">
        <SectionHeading id="needs-attention-heading">Needs Attention</SectionHeading>
        <AdminSectionCard className="mt-3 overflow-hidden p-0 shadow-none">
          {attentionIssues.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {attentionIssues.map((issue) => <AttentionRow key={issue.key} issue={issue} />)}
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 text-sm" role="status">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <p className="font-medium text-slate-700">No urgent issues require attention.</p>
            </div>
          )}
        </AdminSectionCard>
      </section>

      <section aria-labelledby="at-a-glance-heading" className="mt-8">
        <SectionHeading id="at-a-glance-heading">At a Glance</SectionHeading>
        <AdminSectionCard className="mt-3 overflow-hidden p-0 shadow-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <OverviewMetric label="Total users" value={metrics.totalUsers} />
            <OverviewMetric label="Active users" value={metrics.activeUsers} />
            <OverviewMetric label="Suspended users" value={metrics.suspendedUsers} />
            <OverviewMetric label="Admin users" value={metrics.adminUsers} />
            <OverviewMetric label="Recent searches" value={metrics.recentSearches} hint="Last 7 days" />
            <OverviewMetric label="Recent admin actions" value={metrics.recentAdminActions} hint="Last 7 days" />
          </div>
        </AdminSectionCard>
      </section>

      <section aria-label="Search Activity and Service Status" className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <div className="min-w-0">
          <SectionHeading id="search-activity-heading">Search Activity</SectionHeading>
          {searchHealth.hasLogs ? (
            <AdminSectionCard className="mt-3 overflow-hidden p-0 shadow-none" aria-labelledby="search-activity-heading">
              <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <OverviewMetric label="Total recent searches" value={searchHealth.totalRecentSearches} />
                <OverviewMetric label="No-result searches" value={searchHealth.noResultSearches} />
                <OverviewMetric label="Failed searches" value={searchHealth.failedSearches} />
              </div>
              <div className="border-t border-slate-100 p-4">
                <p className="text-sm font-semibold text-slate-950">Top products searched</p>
                {searchHealth.topProducts.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {searchHealth.topProducts.map((product) => (
                      <AdminStatusBadge key={product.label} tone="info">{product.label}: {product.count}</AdminStatusBadge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">No product search breakdown is available yet.</p>
                )}
                <TextLink href="/admin/searches" className="mt-4">View Searches →</TextLink>
              </div>
            </AdminSectionCard>
          ) : (
            <div className="mt-3">
              <AdminEmptyState title="Search analytics unavailable" message="Search analytics will appear after search logging records real user searches. No search counts are mocked." />
              <TextLink href="/admin/searches" className="mt-3">View Searches →</TextLink>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <SectionHeading id="service-status-heading">Service Status</SectionHeading>
          <AdminSectionCard className="mt-3 overflow-hidden p-0 shadow-none" aria-labelledby="service-status-heading">
            <div className="divide-y divide-slate-100">
              {providers.map((provider) => (
                <StatusRow key={provider.product} label={provider.product} status={providerReadinessLabel(provider)} tone={provider.searchEnabled ? "good" : provider.credentialsPresent ? "warn" : "neutral"} />
              ))}
              <StatusRow label="Database" status={system.databaseConnected ? "Available" : system.databaseConfigured ? "Configured, not connected" : "Not configured"} tone={system.databaseConnected ? "good" : "bad"} />
              <StatusRow label="Authentication" status={system.authConfigured && system.sessionConfigured ? "Available" : "Not fully configured"} tone={system.authConfigured && system.sessionConfigured ? "good" : "warn"} />
              <StatusRow label="Email" status={system.emailConfigured ? "Available" : "Unavailable"} tone={system.emailConfigured ? "good" : "warn"} />
              <StatusRow label="Provider credentials" status={system.providerCredentialsPresent ? "Present" : "Not present"} tone={system.providerCredentialsPresent ? "good" : "warn"} />
              <StatusRow label="Webhooks" status={system.webhookConfigured ? "Available" : "Unavailable"} tone={system.webhookConfigured ? "good" : "warn"} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 p-4">
              <TextLink href="/admin/providers">View Providers →</TextLink>
              <TextLink href="/admin/system">View System →</TextLink>
            </div>
          </AdminSectionCard>
        </div>
      </section>

      <section aria-labelledby="recent-admin-activity-heading" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeading id="recent-admin-activity-heading">Recent Admin Activity</SectionHeading>
          <TextLink href="/admin/logs">View Admin Logs →</TextLink>
        </div>
        <div className="mt-3"><RecentActivityList items={activity} /></div>
      </section>
    </AdminPageShell>
  );
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="text-lg font-semibold text-slate-950">{children}</h2>;
}

function OverviewMetric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="min-w-0 border-b border-slate-100 p-4 sm:[&:nth-child(odd)]:border-r lg:border-r lg:[&:nth-child(3n)]:border-r-0 lg:[&:nth-last-child(-n+3)]:border-b-0">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-slate-950">{value}</p>
      {hint ? <p className="mt-1 text-xs font-semibold text-slate-500">{hint}</p> : null}
    </div>
  );
}

function AttentionRow({ issue }: { issue: AttentionIssue }) {
  const Icon = issue.icon === "alert" ? AlertCircle : AlertTriangle;
  const iconClassName = issue.tone === "bad" ? "text-rose-600" : "text-amber-600";

  return (
    <div className="flex flex-col gap-3 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClassName}`} aria-hidden="true" />
        <p className="font-medium text-slate-700">{issue.message}</p>
      </div>
      <TextLink href={issue.href} className="sm:shrink-0">{issue.linkLabel}</TextLink>
    </div>
  );
}

function StatusRow({ label, status, tone }: { label: string; status: string; tone: StatusTone }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <span className="min-w-0 font-semibold text-slate-700">{label}</span>
      <AdminStatusBadge tone={tone}>{status}</AdminStatusBadge>
    </div>
  );
}

function RecentActivityList({ items }: { items: Array<{ id: string; title: string; detail: string; timestamp: string }> }) {
  if (items.length === 0) {
    return <AdminEmptyState title="No admin activity yet" message="Audit log entries will appear here after admin actions are recorded." />;
  }

  return (
    <AdminSectionCard className="divide-y divide-slate-100 p-0 shadow-none">
      {items.map((item) => (
        <div key={item.id} className="grid gap-1 p-4 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-4">
          <div className="min-w-0">
            <p className="font-semibold text-slate-950">{humanizeAuditAction(item.title)}</p>
            <p className="mt-1 break-words text-slate-600">{item.detail}</p>
          </div>
          <p className="text-xs font-semibold text-slate-500 sm:text-right">{item.timestamp}</p>
        </div>
      ))}
    </AdminSectionCard>
  );
}

function TextLink({ href, className = "", children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`focus-ring inline-flex text-sm font-semibold text-[#004BB8] hover:text-[#021C2B] ${className}`}>
      {children}
    </Link>
  );
}

function getAttentionIssues(providers: ProviderStatus[], system: SystemStatus, searchHealth: SearchHealth): AttentionIssue[] {
  const providerIssues = providers.flatMap((provider) => {
    const issues: AttentionIssue[] = [];
    if (provider.providerName === "Not connected") {
      issues.push({ key: `${provider.product}-not-connected`, message: `${provider.product} provider is not connected`, href: "/admin/providers", linkLabel: "View Providers →", tone: "warn", icon: "warning" });
    }
    if (!provider.credentialsPresent) {
      issues.push({ key: `${provider.product}-credentials-missing`, message: `${provider.product} provider credentials are missing`, href: "/admin/providers", linkLabel: "View Providers →", tone: "warn", icon: "warning" });
    }
    if (!provider.searchEnabled) {
      issues.push({ key: `${provider.product}-search-unavailable`, message: `${provider.product} provider search is unavailable`, href: "/admin/providers", linkLabel: "View Providers →", tone: "warn", icon: "warning" });
    }
    return issues;
  });

  const systemIssues: AttentionIssue[] = [
    ...(!system.databaseConnected ? [{ key: "database-unavailable", message: system.databaseConfigured ? "Database is configured but unavailable" : "Database is not configured", href: "/admin/system" as const, linkLabel: "View System →", tone: "bad" as const, icon: "alert" as const }] : []),
    ...(!(system.authConfigured && system.sessionConfigured) ? [{ key: "auth-session-unconfigured", message: "Authentication/session is not fully configured", href: "/admin/system" as const, linkLabel: "View System →", tone: "warn" as const, icon: "warning" as const }] : []),
    ...(!system.emailConfigured ? [{ key: "email-unavailable", message: "Email is unavailable", href: "/admin/system" as const, linkLabel: "View System →", tone: "warn" as const, icon: "warning" as const }] : []),
    ...(!system.webhookConfigured ? [{ key: "webhooks-unavailable", message: "Webhooks are unavailable", href: "/admin/system" as const, linkLabel: "View System →", tone: "warn" as const, icon: "warning" as const }] : []),
  ];

  const searchIssues: AttentionIssue[] = [
    ...(Number(searchHealth.failedSearches) > 0 ? [{ key: "failed-searches", message: `${searchHealth.failedSearches} failed searches in the last 7 days`, href: "/admin/searches" as const, linkLabel: "View Searches →", tone: "bad" as const, icon: "alert" as const }] : []),
    ...(Number(searchHealth.noResultSearches) > 0 ? [{ key: "no-result-searches", message: `${searchHealth.noResultSearches} no-result searches in the last 7 days`, href: "/admin/searches" as const, linkLabel: "View Searches →", tone: "warn" as const, icon: "warning" as const }] : []),
  ];

  return [...providerIssues, ...systemIssues, ...searchIssues];
}

function providerReadinessLabel(provider: ProviderStatus) {
  if (provider.searchEnabled) return "Search ready";
  if (provider.providerName === "Not connected") return "Not connected";
  if (!provider.credentialsPresent) return "Credentials missing";
  return "Search unavailable";
}

function humanizeAuditAction(action: string) {
  const specialCases: Record<string, string> = {
    HOMEPAGE_FARES_REFRESHED: "Homepage fares refreshed",
    "support_ticket.reply": "Support ticket reply sent",
    "account_deletion.save_notes": "Account deletion notes updated",
  };

  if (specialCases[action]) return specialCases[action];

  const normalized = action.replace(/[._-]+/g, " ").toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
