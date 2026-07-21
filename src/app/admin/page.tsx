import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Car,
  CheckCircle2,
  CircleDot,
  Database,
  Gauge,
  Hotel,
  KeyRound,
  Mail,
  Plane,
  Search,
  SearchX,
  ShieldCheck,
  UserCog,
  UsersRound,
  Webhook,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";

import {
  AdminEmptyState,
  AdminPageHeader,
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

const adminHomeSectionClass = "border-t border-[#E4E9EF] px-5 py-6 sm:px-6 lg:px-8 lg:py-8";

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
    <div
      data-admin-home-workspace="single-card"
      className="relative isolate"
    >
      <div
        data-admin-home-workspace-background="full-bleed"
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 border-y border-[#E4E9EF] bg-[#FBFAF7] shadow-[0_10px_36px_rgba(2,28,43,0.06)]"
      />
      <div className="px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
        <AdminPageHeader
          eyebrow=""
          title="Admin Home"
          description="Monitor Kurioticket activity, provider readiness, search health, system status and recent administrative actions."
          actions={<HeroRouteArtwork />}
        />
      </div>
      <section data-admin-home-section="needs-attention" aria-labelledby="needs-attention-heading" className={adminHomeSectionClass}>
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

      <section data-admin-home-section="at-a-glance" aria-labelledby="at-a-glance-heading" className={adminHomeSectionClass}>
        <SectionHeading id="at-a-glance-heading">At a Glance</SectionHeading>
        <div data-admin-home-metric-rail="flat" className="mt-4">
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

      <section aria-label="Search Activity and Service Status" data-admin-home-section="operations" className="border-t border-[#E4E9EF]">
        <div data-admin-home-operations-layout="shared" className="grid gap-0 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section data-admin-home-surface="search-activity" className="relative min-h-[17rem] overflow-hidden px-5 py-6 sm:px-6 lg:px-8 lg:py-8 xl:pr-8" aria-labelledby="search-activity-heading">
          <SearchPanelDecoration />
          <div className="relative z-10">
            <PanelHeading id="search-activity-heading" icon={Activity}>Search Activity</PanelHeading>
            {searchHealth.hasLogs ? (
              <>
                <div data-admin-home-search-metrics="icon-divider-rail" className="mt-6 grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  <PanelMetric icon={Search} tone="blue" label="Total recent searches" value={searchHealth.totalRecentSearches} />
                  <PanelMetric icon={SearchX} tone="amber" label="No-result searches" value={searchHealth.noResultSearches} />
                  <PanelMetric icon={XCircle} tone="rose" label="Failed searches" value={searchHealth.failedSearches} />
                </div>
                <div className="mt-6">
                  <p className="text-sm font-bold text-[#021C2B]">Top products searched</p>
                  {searchHealth.topProducts.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {searchHealth.topProducts.map((product) => (
                        <AdminStatusBadge key={product.label} tone="info">{product.label}: {product.count}</AdminStatusBadge>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">No product search breakdown is available yet.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-5">
                <AdminEmptyState variant="compact" title="Search analytics unavailable" message="Search analytics will appear after search logging records real user searches. No search counts are mocked." />
              </div>
            )}
            <div className="mt-6 flex justify-end"><TextLink href="/admin/searches">View Searches →</TextLink></div>
          </div>
        </section>

        <section data-admin-home-surface="service-status" className="relative min-h-[17rem] overflow-hidden border-t border-[#E4E9EF] px-5 py-6 sm:px-6 lg:px-8 lg:py-8 xl:border-l xl:border-t-0 xl:pl-8" aria-labelledby="service-status-heading">
          <ServicePanelDecoration />
          <div className="relative z-10">
            <PanelHeading id="service-status-heading" icon={Gauge}>Service Status</PanelHeading>
            <div data-admin-home-service-groups="provider-system" className="mt-5 grid gap-5 md:grid-cols-[minmax(0,0.9fr)_auto_minmax(0,1.1fr)] md:gap-6">
              <div className="min-w-0">
                <p className="mb-3 text-sm font-bold text-[#021C2B]">Provider statuses</p>
                {providers.map((provider) => (
                  <StatusRow key={provider.product} icon={provider.product} label={provider.product} status={providerReadinessLabel(provider)} tone={provider.searchEnabled ? "good" : provider.credentialsPresent ? "warn" : "neutral"} />
                ))}
                <TextLink href="/admin/providers" className="mt-5">View Providers →</TextLink>
              </div>
              <div data-admin-home-service-divider="responsive" aria-hidden="true" className="h-px bg-slate-200 md:h-auto md:w-px" />
              <div className="min-w-0">
                <p className="mb-3 text-sm font-bold text-[#021C2B]">System statuses</p>
                <StatusRow icon="Database" label="Database" status={system.databaseConnected ? "Available" : system.databaseConfigured ? "Configured, not connected" : "Not configured"} tone={system.databaseConnected ? "good" : "bad"} />
                <StatusRow icon="Authentication" label="Authentication" status={system.authConfigured && system.sessionConfigured ? "Available" : "Not fully configured"} tone={system.authConfigured && system.sessionConfigured ? "good" : "warn"} />
                <StatusRow icon="Email" label="Email" status={system.emailConfigured ? "Available" : "Unavailable"} tone={system.emailConfigured ? "good" : "warn"} />
                <StatusRow icon="Provider credentials" label="Provider credentials" status={system.providerCredentialsPresent ? "Present" : "Not present"} tone={system.providerCredentialsPresent ? "good" : "warn"} />
                <StatusRow icon="Webhooks" label="Webhooks" status={system.webhookConfigured ? "Available" : "Unavailable"} tone={system.webhookConfigured ? "good" : "warn"} />
                <TextLink href="/admin/system" className="mt-5">View System →</TextLink>
              </div>
            </div>
          </div>
        </section>
        </div>
      </section>

      <section data-admin-home-section="recent-admin-activity" aria-labelledby="recent-admin-activity-heading" className={adminHomeSectionClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeading id="recent-admin-activity-heading">Recent Admin Activity</SectionHeading>
          <TextLink href="/admin/logs">View Admin Logs →</TextLink>
        </div>
        <div className="mt-3"><RecentActivityList items={activity} /></div>
      </section>
    </div>
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

function SearchPanelDecoration() {
  return <svg data-admin-home-decoration="search-route" aria-hidden="true" className="pointer-events-none absolute inset-0 hidden h-full w-full text-[#004BB8] opacity-35 sm:block" viewBox="0 0 720 280" preserveAspectRatio="none" fill="none"><path d="M2 74V18C2 9 9 2 18 2h230" stroke="url(#searchAccent)" strokeWidth="3"/><circle cx="248" cy="2" r="5" fill="#6D5DF6"/><path d="M410 258C490 190 560 292 710 178" stroke="#6D5DF6" opacity=".26"/><path d="M430 276C500 218 594 278 720 205" stroke="#004BB8" opacity=".22"/><path d="M470 250C548 210 610 230 720 150" stroke="#93C5FD" opacity=".32"/><path d="M520 280C585 236 650 260 720 224" stroke="#6D5DF6" opacity=".14"/><defs><linearGradient id="searchAccent" x1="0" y1="70" x2="250" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#8B5CF6"/><stop offset="1" stopColor="#004BB8"/></linearGradient></defs></svg>;
}

function ServicePanelDecoration() {
  return <svg data-admin-home-decoration="status-corner" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full text-[#004BB8] opacity-30" viewBox="0 0 520 280" preserveAspectRatio="none" fill="none"><path d="M518 112v148c0 10-8 18-18 18H326" stroke="#004BB8" strokeWidth="3" opacity=".55"/><circle cx="326" cy="278" r="5" fill="#004BB8"/><g opacity=".38">{Array.from({ length: 24 }).map((_, index) => <circle key={index} cx={430 + (index % 6) * 14} cy={18 + Math.floor(index / 6) * 14} r="1.4" fill="currentColor" />)}</g><path d="M390 250C438 212 478 222 516 182" stroke="#93C5FD" opacity=".28"/><path d="M418 278C462 246 490 252 520 220" stroke="#6D5DF6" opacity=".18"/></svg>;
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="text-base font-semibold text-slate-950">{children}</h2>;
}

function OverviewMetric({ label, value, hint, icon }: { label: string; value: string | number; hint?: string; icon: MetricIcon }) {
  const Icon = metricIcons[icon];
  return <div data-admin-home-metric-item="flat" className="min-w-0 px-4 py-5"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#004BB8]"><Icon className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-sm font-semibold text-slate-600">{label}</p><p className="mt-1 text-3xl font-extrabold tracking-tight text-[#021C2B]">{value}</p>{hint ? <p className="mt-1 text-xs font-medium text-slate-500">{hint}</p> : null}</div></div></div>;
}

const metricIcons = { users: UsersRound, active: CheckCircle2, suspended: AlertTriangle, admin: ShieldCheck, search: Search, activity: Zap };


function PanelHeading({ id, icon: Icon, children }: { id: string; icon: LucideIcon; children: React.ReactNode }) {
  return <h2 id={id} className="flex items-center gap-2 text-base font-extrabold tracking-tight text-[#021C2B]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F0F6FF] text-[#004BB8] ring-1 ring-[#C9D8EA]"><Icon className="h-4 w-4" aria-hidden="true" /></span>{children}</h2>;
}

function PanelMetric({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: LucideIcon; tone: "blue" | "amber" | "rose" }) {
  const toneClass = { blue: "bg-[#EEF4FF] text-[#004BB8] ring-[#C9D8EA]", amber: "bg-amber-50 text-amber-600 ring-amber-200", rose: "bg-rose-50 text-rose-600 ring-rose-200" }[tone];
  return <div data-admin-home-search-metric="flat-icon" className="min-w-0 py-4 sm:px-5 sm:first:pl-0 sm:last:pr-0"><div className="flex items-start gap-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-1 ${toneClass}`}><Icon className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0"><p className="text-sm font-semibold text-slate-600">{label}</p><p className="mt-1 text-3xl font-extrabold tracking-tight text-[#021C2B]">{value}</p></div></div></div>;
}

function AttentionRow({ issue }: { issue: AttentionIssue }) {
  const Icon = issue.icon === "alert" ? AlertCircle : AlertTriangle;
  const iconClassName = issue.tone === "bad" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600";
  return <div data-admin-home-attention-item="flat" className="flex min-w-0 items-start gap-4 py-5 pr-5 md:px-5 md:first:pl-0"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconClassName}`}><Icon className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0"><p className="font-semibold text-slate-950">{issue.message}</p><TextLink href={issue.href} className="mt-2">{issue.linkLabel}</TextLink></div></div>;
}

function StatusRow({ label, status, tone, icon }: { label: string; status: string; tone: StatusTone; icon: string }) {
  const Icon = statusIcons[icon] ?? CircleDot;
  return <div data-admin-home-status-row="flat" className="flex items-center justify-between gap-5 py-2.5 text-sm"><span className="flex min-w-0 flex-1 items-center gap-2 font-semibold text-slate-700"><Icon className="h-4 w-4 shrink-0 text-[#315078]" aria-hidden="true" />{label}</span><span className="shrink-0 whitespace-nowrap"><AdminStatusBadge tone={tone}>{status}</AdminStatusBadge></span></div>;
}

const statusIcons: Record<string, LucideIcon> = { Flights: Plane, Hotels: Hotel, Cars: Car, Database, Authentication: UserCog, Email: Mail, "Provider credentials": KeyRound, Webhooks: Webhook };

function RecentActivityList({ items }: { items: Array<{ id: string; title: string; detail: string; timestamp: string }> }) {
  if (items.length === 0) return <AdminEmptyState variant="compact" title="No admin activity yet" message="Audit log entries will appear here after admin actions are recorded." />;
  return <div data-admin-home-timeline="true" className="border-y border-slate-200"><div>{items.map((item) => <div key={item.id} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 gap-y-2 border-b border-slate-200 py-4 pr-0 text-sm last:border-b-0 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto] sm:gap-x-6"><div data-admin-home-timeline-icon-column="fixed" className="relative flex w-9 justify-center"><div aria-hidden="true" className="pointer-events-none absolute bottom-[-1rem] top-0 w-px bg-[#004BB8]/25" /><span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#004BB8] ring-4 ring-white"><Activity className="h-4 w-4" aria-hidden="true" /></span></div><div className="min-w-0"><p className="font-semibold text-slate-950">{humanizeAuditAction(item.title)}</p><p className="mt-1 break-words text-slate-600">{item.detail}</p></div><p className="col-start-2 text-xs font-semibold text-slate-500 sm:col-start-3 sm:text-right">{item.timestamp}</p></div>)}</div></div>;
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
