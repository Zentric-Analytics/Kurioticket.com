import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Car,
  CheckCircle2,
  CircleDot,
  Database,
  Hotel,
  KeyRound,
  Mail,
  Plane,
  Search,
  ShieldCheck,
  UserCog,
  UsersRound,
  Webhook,
  Zap,
  type LucideIcon,
} from "lucide-react";

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

type MetricIcon = "users" | "active" | "suspended" | "admin" | "search" | "activity";

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
      actions={<HeroRouteArtwork />}
    >
      <section aria-labelledby="needs-attention-heading" className="border-b border-slate-200 pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <SectionHeading id="needs-attention-heading">Needs Attention</SectionHeading>
          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600" aria-label={`${attentionIssues.length} issues`}>
            {attentionIssues.length}
          </span>
        </div>
        <div data-admin-home-attention-rail="flat" className="mt-4 border-t border-slate-200">
          {attentionIssues.length > 0 ? (
            <div className="grid divide-y divide-slate-200 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
              {attentionIssues.map((issue) => <AttentionRow key={issue.key} issue={issue} />)}
            </div>
          ) : (
            <div className="flex items-start gap-3 py-4 text-sm" role="status">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="pt-2 font-medium text-slate-700">No urgent issues require attention.</p>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="at-a-glance-heading" className="mt-7">
        <SectionHeading id="at-a-glance-heading">At a Glance</SectionHeading>
        <div data-admin-home-metric-rail="flat" className="mt-4 border-l-4 border-[#6B7CFF] pl-5">
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 border-y border-slate-200 md:grid-cols-3 xl:grid-cols-6 xl:divide-y-0">
            <OverviewMetric icon="users" label="Total users" value={metrics.totalUsers} />
            <OverviewMetric icon="active" label="Active users" value={metrics.activeUsers} />
            <OverviewMetric icon="suspended" label="Suspended users" value={metrics.suspendedUsers} />
            <OverviewMetric icon="admin" label="Admin users" value={metrics.adminUsers} />
            <OverviewMetric icon="search" label="Recent searches" value={metrics.recentSearches} hint="Last 7 days" />
            <OverviewMetric icon="activity" label="Recent admin actions" value={metrics.recentAdminActions} hint="Last 7 days" />
          </div>
        </div>
      </section>

      <section aria-label="Search Activity and Service Status" className="mt-7 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <SectionHeading id="search-activity-heading">Search Activity</SectionHeading>
          {searchHealth.hasLogs ? (
            <AdminSectionCard data-admin-home-surface="search-activity" className="relative mt-3 overflow-hidden rounded-[1.5rem] border-slate-200 bg-white/95 p-0 shadow-sm" aria-labelledby="search-activity-heading">
              <PanelRouteMotif />
              <div className="relative z-10 grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <PanelMetric label="Total recent searches" value={searchHealth.totalRecentSearches} />
                <PanelMetric label="No-result searches" value={searchHealth.noResultSearches} />
                <PanelMetric label="Failed searches" value={searchHealth.failedSearches} />
              </div>
              <div className="relative z-10 border-t border-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-950">Top products searched</p>
                {searchHealth.topProducts.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {searchHealth.topProducts.map((product) => (
                      <AdminStatusBadge key={product.label} tone="info">{product.label}: {product.count}</AdminStatusBadge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">No product search breakdown is available yet.</p>
                )}
                <TextLink href="/admin/searches" className="mt-5">View Searches →</TextLink>
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
          <AdminSectionCard data-admin-home-surface="service-status" className="relative mt-3 overflow-hidden rounded-[1.5rem] border-slate-200 bg-white/95 p-0 shadow-sm" aria-labelledby="service-status-heading">
            <StatusCornerMotif />
            <div className="relative z-10 grid md:grid-cols-2">
              <div className="p-5">
                <p className="mb-2 text-sm font-semibold text-slate-950">Provider statuses</p>
                {providers.map((provider) => (
                  <StatusRow key={provider.product} icon={provider.product} label={provider.product} status={providerReadinessLabel(provider)} tone={provider.searchEnabled ? "good" : provider.credentialsPresent ? "warn" : "neutral"} />
                ))}
                <TextLink href="/admin/providers" className="mt-4">View Providers →</TextLink>
              </div>
              <div className="border-t border-slate-200 p-5 md:border-l md:border-t-0">
                <p className="mb-2 text-sm font-semibold text-slate-950">System statuses</p>
                <StatusRow icon="Database" label="Database" status={system.databaseConnected ? "Available" : system.databaseConfigured ? "Configured, not connected" : "Not configured"} tone={system.databaseConnected ? "good" : "bad"} />
                <StatusRow icon="Authentication" label="Authentication" status={system.authConfigured && system.sessionConfigured ? "Available" : "Not fully configured"} tone={system.authConfigured && system.sessionConfigured ? "good" : "warn"} />
                <StatusRow icon="Email" label="Email" status={system.emailConfigured ? "Available" : "Unavailable"} tone={system.emailConfigured ? "good" : "warn"} />
                <StatusRow icon="Provider credentials" label="Provider credentials" status={system.providerCredentialsPresent ? "Present" : "Not present"} tone={system.providerCredentialsPresent ? "good" : "warn"} />
                <StatusRow icon="Webhooks" label="Webhooks" status={system.webhookConfigured ? "Available" : "Unavailable"} tone={system.webhookConfigured ? "good" : "warn"} />
                <TextLink href="/admin/system" className="mt-4">View System →</TextLink>
              </div>
            </div>
          </AdminSectionCard>
        </div>
      </section>

      <section aria-labelledby="recent-admin-activity-heading" className="mt-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeading id="recent-admin-activity-heading">Recent Admin Activity</SectionHeading>
          <TextLink href="/admin/logs">View Admin Logs →</TextLink>
        </div>
        <div className="mt-3"><RecentActivityList items={activity} /></div>
      </section>
    </AdminPageShell>
  );
}

function HeroRouteArtwork() {
  return (
    <svg data-admin-home-hero-artwork="route-lines" aria-hidden="true" className="pointer-events-none hidden h-36 w-full max-w-xl text-[#004BB8] md:block" viewBox="0 0 620 160" fill="none">
      <path d="M8 120C120 48 206 128 318 78C415 34 472 0 612 20" stroke="currentColor" strokeWidth="1.5" opacity="0.38" />
      <path d="M44 132C178 78 243 98 345 66C448 33 506 52 610 84" stroke="#93C5FD" strokeWidth="1" opacity="0.42" />
      <path d="M130 36C230 10 285 66 380 50C486 32 526 110 610 126" stroke="#8B5CF6" strokeWidth="1" opacity="0.18" />
      <path d="M252 118C320 95 365 116 426 84C492 48 552 42 612 50" stroke="#004BB8" strokeWidth="1" opacity="0.2" />
      {[116, 318, 452, 548].map((cx, index) => <circle key={cx} cx={cx} cy={[70, 78, 39, 100][index]} r="4" fill="currentColor" opacity="0.55" />)}
    </svg>
  );
}

function PanelRouteMotif() {
  return <svg data-admin-home-decoration="search-route" aria-hidden="true" className="pointer-events-none absolute -bottom-8 right-0 h-32 w-56 text-[#004BB8] opacity-20" viewBox="0 0 240 140" fill="none"><path d="M10 120C78 52 142 152 232 48" stroke="currentColor"/><path d="M0 96C74 38 132 116 226 20" stroke="#8B5CF6" opacity=".45"/><path d="M40 132C108 88 154 114 232 78" stroke="#93C5FD" opacity=".6"/></svg>;
}

function StatusCornerMotif() {
  return <svg data-admin-home-decoration="status-corner" aria-hidden="true" className="pointer-events-none absolute right-4 top-4 h-20 w-20 text-[#004BB8] opacity-20" viewBox="0 0 90 90" fill="none"><path d="M76 12C48 10 20 30 14 64" stroke="currentColor" strokeDasharray="2 5"/><circle cx="62" cy="24" r="3" fill="currentColor"/><circle cx="24" cy="62" r="2.5" fill="#8B5CF6"/></svg>;
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="text-base font-semibold text-slate-950">{children}</h2>;
}

function OverviewMetric({ label, value, hint, icon }: { label: string; value: string | number; hint?: string; icon: MetricIcon }) {
  const Icon = metricIcons[icon];
  return <div data-admin-home-metric-item="flat" className="min-w-0 px-4 py-5"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#004BB8]"><Icon className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-sm font-semibold text-slate-600">{label}</p><p className="mt-1 text-3xl font-extrabold tracking-tight text-[#021C2B]">{value}</p>{hint ? <p className="mt-1 text-xs font-medium text-slate-500">{hint}</p> : null}</div></div></div>;
}

const metricIcons = { users: UsersRound, active: CheckCircle2, suspended: AlertTriangle, admin: ShieldCheck, search: Search, activity: Zap };

function PanelMetric({ label, value }: { label: string; value: string | number }) {
  return <div className="min-w-0 px-5 py-5"><p className="text-sm font-semibold text-slate-600">{label}</p><p className="mt-1 text-3xl font-extrabold tracking-tight text-[#021C2B]">{value}</p></div>;
}

function AttentionRow({ issue }: { issue: AttentionIssue }) {
  const Icon = issue.icon === "alert" ? AlertCircle : AlertTriangle;
  const iconClassName = issue.tone === "bad" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600";
  return <div data-admin-home-attention-item="flat" className="flex min-w-0 items-start gap-4 py-5 pr-5 md:px-5 md:first:pl-0"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconClassName}`}><Icon className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0"><p className="font-semibold text-slate-950">{issue.message}</p><TextLink href={issue.href} className="mt-2">{issue.linkLabel}</TextLink></div></div>;
}

function StatusRow({ label, status, tone, icon }: { label: string; status: string; tone: StatusTone; icon: string }) {
  const Icon = statusIcons[icon] ?? CircleDot;
  return <div data-admin-home-status-row="flat" className="flex items-center justify-between gap-4 py-2.5 text-sm"><span className="flex min-w-0 items-center gap-2 font-semibold text-slate-700"><Icon className="h-4 w-4 shrink-0 text-[#315078]" aria-hidden="true" />{label}</span><AdminStatusBadge tone={tone}>{status}</AdminStatusBadge></div>;
}

const statusIcons: Record<string, LucideIcon> = { Flights: Plane, Hotels: Hotel, Cars: Car, Database, Authentication: UserCog, Email: Mail, "Provider credentials": KeyRound, Webhooks: Webhook };

function RecentActivityList({ items }: { items: Array<{ id: string; title: string; detail: string; timestamp: string }> }) {
  if (items.length === 0) return <AdminEmptyState title="No admin activity yet" message="Audit log entries will appear here after admin actions are recorded." />;
  return <div data-admin-home-timeline="true" className="border-y border-slate-200"><div className="relative"><div aria-hidden="true" className="pointer-events-none absolute bottom-5 left-5 top-5 w-px bg-[#004BB8]/25" />{items.map((item) => <div key={item.id} className="relative grid gap-2 border-b border-slate-200 py-4 pl-12 pr-0 text-sm last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-6"><span className="absolute left-[0.8rem] top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-[#004BB8] ring-4 ring-white"><Activity className="h-4 w-4" aria-hidden="true" /></span><div className="min-w-0"><p className="font-semibold text-slate-950">{humanizeAuditAction(item.title)}</p><p className="mt-1 break-words text-slate-600">{item.detail}</p></div><p className="text-xs font-semibold text-slate-500 sm:text-right">{item.timestamp}</p></div>)}</div></div>;
}

function TextLink({ href, className = "", children }: { href: string; className?: string; children: React.ReactNode }) {
  return <Link href={href} className={`focus-ring inline-flex text-sm font-semibold text-[#004BB8] hover:text-[#021C2B] ${className}`}>{children}</Link>;
}

function getAttentionIssues(providers: ProviderStatus[], system: SystemStatus, searchHealth: SearchHealth): AttentionIssue[] {
  const providerIssues = providers.flatMap((provider) => {
    const issues: AttentionIssue[] = [];
    if (provider.providerName === "Not connected") issues.push({ key: `${provider.product}-not-connected`, message: `${provider.product} provider is not connected`, href: "/admin/providers", linkLabel: "View Providers →", tone: "warn", icon: "warning" });
    if (!provider.credentialsPresent) issues.push({ key: `${provider.product}-credentials-missing`, message: `${provider.product} provider credentials are missing`, href: "/admin/providers", linkLabel: "View Providers →", tone: "warn", icon: "warning" });
    if (!provider.searchEnabled) issues.push({ key: `${provider.product}-search-unavailable`, message: `${provider.product} provider search is unavailable`, href: "/admin/providers", linkLabel: "View Providers →", tone: "warn", icon: "warning" });
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
