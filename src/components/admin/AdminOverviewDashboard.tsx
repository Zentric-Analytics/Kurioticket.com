import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Headphones,
  HeartPulse,
  KeyRound,
  Mail,
  MousePointerClick,
  Route,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  AdminEmptyState,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import { AdminOverviewAutoRefresh, AdminOverviewRangeSelect, type OverviewRange } from "@/components/admin/AdminOverviewControls";
import type { AdminNavDefinition } from "@/lib/adminNavigation";
import type { getRecentAdminActivity, getSafeSystemStatus } from "@/lib/admin-data";
import { formatDateTime } from "@/lib/admin-data";
import type { getAdminOverview } from "@/services/adminOverviewService";
import type {
  ProviderOperationalState,
  ProviderOperationalStatus,
} from "@/services/providerOperationalStatus";

type OverviewData = Extract<Awaited<ReturnType<typeof getAdminOverview>>, { status: "ok" }>["data"];
type SystemStatus = Awaited<ReturnType<typeof getSafeSystemStatus>>;
type AuditActivity = Awaited<ReturnType<typeof getRecentAdminActivity>>;
type Tone = "neutral" | "good" | "warn" | "bad" | "info";

const quickModulePaths = [
  "/admin/users",
  "/admin/searches",
  "/admin/support",
  "/admin/providers",
  "/admin/logs",
] as const;

function count(value: number) {
  return value.toLocaleString("en-US");
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function providerTone(value: ProviderOperationalState): Tone {
  if (value === "HEALTHY") return "good";
  if (value === "DEGRADED") return "warn";
  if (value === "FAILING") return "bad";
  if (value === "NO_RECENT_ACTIVITY") return "info";
  return "neutral";
}

function readinessTone(value: ProviderOperationalStatus["readinessState"]): Tone {
  if (value === "READY") return "good";
  if (value === "ENVIRONMENT_BLOCKED") return "warn";
  return "neutral";
}

function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-base font-bold tracking-tight text-slate-950 sm:text-lg">{title}</h2>
        {description ? <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  const iconColor: Record<Tone, string> = {
    neutral: "text-slate-600",
    good: "text-emerald-700",
    warn: "text-amber-700",
    bad: "text-rose-700",
    info: "text-indigo-700",
  };
  return (
    <AdminSectionCard className="min-w-0 p-4">
      <div className="flex items-center justify-between gap-2">
        <Icon size={19} className={iconColor[tone]} aria-hidden="true" />
        <span className={"h-2 w-2 shrink-0 rounded-full " +
          (tone === "good" ? "bg-emerald-400" : tone === "warn" ? "bg-amber-400" : tone === "bad" ? "bg-rose-400" : tone === "info" ? "bg-indigo-400" : "bg-slate-300")}
          aria-hidden="true" />
      </div>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-slate-950">{count(value)}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </AdminSectionCard>
  );
}

function AttentionCard({
  href,
  title,
  value,
  description,
  icon: Icon,
  tone,
}: {
  href: string;
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  tone: "bad" | "warn" | "info";
}) {
  const active = value > 0;
  const treatment = active
    ? tone === "bad"
      ? "border-rose-200 bg-rose-50/60 hover:bg-rose-50"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50/60 hover:bg-amber-50"
        : "border-indigo-200 bg-indigo-50/60 hover:bg-indigo-50"
    : "border-slate-200 bg-slate-50/60 hover:bg-slate-100";
  const color = active
    ? tone === "bad" ? "text-rose-700" : tone === "warn" ? "text-amber-700" : "text-indigo-700"
    : "text-slate-500";

  return (
    <Link href={href} className={"focus-ring group flex min-w-0 items-center gap-3 rounded-xl border px-4 py-3 transition " + treatment}>
      <span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white " + color}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-950">
          {title}
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold tabular-nums text-slate-800">{count(value)}</span>
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-600">{description}</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

function DetailRow({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <span className="min-w-0 text-xs text-slate-600">{label}</span>
      <span className="shrink-0 text-right text-xs font-bold tabular-nums text-slate-900">{typeof value === "number" ? count(value) : value}</span>
      {detail ? <span className="sr-only">{detail}</span> : null}
    </div>
  );
}

function PlatformHealth({ system }: { system: SystemStatus }) {
  const rows = [
    {
      label: "Database",
      icon: HeartPulse,
      status: system.databaseConnected ? "Connected" : system.databaseConfigured ? "Configured, not connected" : "Not configured",
      ready: system.databaseConnected,
    },
    {
      label: "Auth / session",
      icon: KeyRound,
      status: system.authConfigured && system.sessionConfigured ? "Configured" : "Not fully configured",
      ready: system.authConfigured && system.sessionConfigured,
    },
    {
      label: "Email / Resend",
      icon: Mail,
      status: system.emailConfigured ? "Configured" : "Unavailable",
      ready: system.emailConfigured,
    },
    {
      label: "Provider credentials",
      icon: ShieldCheck,
      status: system.providerCredentialsPresent ? "Present" : "Not present",
      ready: system.providerCredentialsPresent,
    },
  ] as const;

  return (
    <section className="min-w-0" aria-labelledby="overview-platform-health">
      <SectionTitle title="Platform Health" />
      <AdminSectionCard className="p-4">
        <div className="space-y-1.5">
          {rows.map(({ label, icon: Icon, status, ready }) => (
            <div key={label} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-3 py-3">
              <span className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                <Icon size={16} className="text-indigo-600" aria-hidden="true" />
                {label}
              </span>
              <span className={"inline-flex items-center gap-2 text-xs font-bold " + (ready ? "text-emerald-700" : "text-slate-600")}>
                <span className={"h-2 w-2 rounded-full " + (ready ? "bg-emerald-500" : "bg-slate-300")} aria-hidden="true" />
                {status}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Configuration indicators do not replace end-to-end service checks.
        </p>
      </AdminSectionCard>
    </section>
  );
}

function ProviderCard({ provider }: { provider: ProviderOperationalStatus }) {
  return (
    <AdminSectionCard className="min-w-0 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{provider.id}</p>
          <h3 className="mt-1 text-base font-bold text-slate-950">{provider.provider}</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <AdminStatusBadge tone={readinessTone(provider.readinessState)}>{humanize(provider.readinessState)}</AdminStatusBadge>
          <AdminStatusBadge tone={providerTone(provider.operationalState)}>{humanize(provider.operationalState)}</AdminStatusBadge>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">Observed provider traffic · Last {provider.windowHours} hours</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-[11px] text-slate-500">Recent calls</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-950">{count(provider.totalCalls)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-[11px] text-slate-500">Average latency</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-950">
            {provider.averageLatencyMs === null ? "—" : provider.averageLatencyMs.toLocaleString("en-US") + "ms"}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-700">
        <span className="font-bold tabular-nums text-emerald-700">{count(provider.successCalls)}</span> successful
        <span className="mx-1.5 text-slate-300">·</span>
        <span className="font-bold tabular-nums text-rose-700">{count(provider.failedCalls)}</span> failed
      </p>
      <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70">
        <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600">
          Full provider details
        </summary>
        <div className="border-t border-slate-200 bg-white px-3 py-1">
          <DetailRow label="Readiness" value={humanize(provider.readinessState)} />
          <DetailRow label="Operational health" value={humanize(provider.operationalState)} />
          <DetailRow label="Observation window" value={provider.windowHours + " hours"} />
          <DetailRow label="Total calls" value={provider.totalCalls} />
          <DetailRow label="Successful calls" value={provider.successCalls} />
          <DetailRow label="Failed calls" value={provider.failedCalls} />
          <DetailRow label="Degraded calls" value={provider.degradedCalls} />
          <DetailRow label="Disabled calls" value={provider.disabledCalls} />
          <DetailRow label="Average latency" value={provider.averageLatencyMs === null ? "—" : provider.averageLatencyMs + "ms"} />
          <DetailRow label="Last activity" value={provider.lastActivityAt ? formatDateTime(new Date(provider.lastActivityAt)) : "No recent activity"} />
          <DetailRow label="Last success" value={provider.lastSuccessAt ? formatDateTime(new Date(provider.lastSuccessAt)) : "Unavailable"} />
          <DetailRow label="Last failure" value={provider.lastFailureAt ? formatDateTime(new Date(provider.lastFailureAt)) : "Unavailable"} />
        </div>
      </details>
    </AdminSectionCard>
  );
}

function FunnelStep({
  label,
  journeys,
  events,
  icon: Icon,
}: {
  label: string;
  journeys: number;
  events: number;
  icon: LucideIcon;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-4">
      <Icon size={19} className="text-indigo-700" aria-hidden="true" />
      <p className="mt-3 text-xs font-semibold text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-950">{count(journeys)}</p>
      <p className="mt-1 text-xs text-slate-500">{count(events)} recorded events</p>
    </div>
  );
}

function WorkloadCard({
  title,
  href,
  icon: Icon,
  rows,
}: {
  title: string;
  href: string;
  icon: LucideIcon;
  rows: Array<{ label: string; value: number; detail: string }>;
}) {
  return (
    <section className="min-w-0">
      <SectionTitle
        title={title}
        action={<Link href={href} className="focus-ring inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">View all <ArrowUpRight size={13} aria-hidden="true" /></Link>}
      />
      <AdminSectionCard className="p-4">
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
          <Icon size={18} aria-hidden="true" />
        </div>
        <div className="divide-y divide-slate-100">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700">{row.label}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{row.detail}</p>
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums text-slate-950">{count(row.value)}</span>
            </div>
          ))}
        </div>
      </AdminSectionCard>
    </section>
  );
}

function ActivityFeed({ activity }: { activity: AuditActivity }) {
  return (
    <section className="min-w-0">
      <SectionTitle
        title="Recent Admin Activity"
        action={<Link href="/admin/logs" className="focus-ring inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">View all <ArrowUpRight size={13} aria-hidden="true" /></Link>}
      />
      {activity.length === 0 ? (
        <AdminEmptyState title="No admin activity yet" message="Audit log entries will appear here after admin actions are recorded." />
      ) : (
        <AdminSectionCard className="divide-y divide-slate-100 p-0">
          {activity.map((item) => (
            <div key={item.id} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-950">{humanize(item.title)}</p>
                <p className="mt-0.5 break-words text-xs leading-5 text-slate-600">{item.detail}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                  <span>{item.timestamp}</span>
                  <span aria-label="Original audit action" className="font-mono">{item.title}</span>
                </div>
              </div>
            </div>
          ))}
        </AdminSectionCard>
      )}
    </section>
  );
}

function QuickActions({ modules }: { modules: AdminNavDefinition[] }) {
  const shortcuts = quickModulePaths.flatMap((path) => {
    const module = modules.find((item) => item.href === path);
    return module ? [module] : [];
  });

  return (
    <section className="min-w-0" aria-label="Admin shortcuts and modules">
      <SectionTitle title="Quick Actions" description="Open the most-used operations, or expand the complete module directory below." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {shortcuts.map((module) => (
          <Link key={module.href} href={module.href} className="focus-ring group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
            <module.icon size={19} className="shrink-0 text-indigo-700" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-950">{module.label}</span>
              <span className="mt-0.5 block truncate text-xs text-slate-500">{module.description}</span>
            </span>
            <ArrowRight size={14} className="shrink-0 text-slate-400 group-hover:text-indigo-700" aria-hidden="true" />
          </Link>
        ))}
      </div>
      <details className="mt-3 rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600">
          All admin modules ({modules.length}) — show complete directory
        </summary>
        <div className="grid gap-2 border-t border-slate-100 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Link key={module.href} href={module.href} className="focus-ring group flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 hover:border-indigo-200 hover:bg-indigo-50">
              <module.icon size={17} className="mt-0.5 shrink-0 text-indigo-700" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{module.label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-600">{module.description}</span>
              </span>
            </Link>
          ))}
        </div>
      </details>
    </section>
  );
}

export function AdminOverviewSecondary({
  system,
  activity,
  modules,
}: {
  system: SystemStatus;
  activity: AuditActivity;
  modules: AdminNavDefinition[];
}) {
  return (
    <div className="mt-6 space-y-6">
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <PlatformHealth system={system} />
        <ActivityFeed activity={activity} />
      </div>
      <QuickActions modules={modules} />
    </div>
  );
}

export function AdminOverviewDashboard({
  data,
  system,
  activity,
  modules,
  range,
}: {
  data: OverviewData;
  system: SystemStatus;
  activity: AuditActivity;
  modules: AdminNavDefinition[];
  range: OverviewRange;
}) {
  const funnel = data.journeys.stages;
  const supportAttention = data.support.open + data.support.waitingOnTeam + data.support.waitingOnUser;
  const deletionAttention = data.deletions.pending + data.deletions.readyForReview;
  const providerAttention = data.providers.filter((p) => p.operationalState === "DEGRADED" || p.operationalState === "FAILING").length;

  return (
    <div className="min-w-0">
      <AdminOverviewAutoRefresh />

      <section aria-label="Operations Snapshot">
        <SectionTitle
          title="Operations Snapshot"
          description="Account totals and action queues are current; journeys and admin actions use the selected reporting range."
          action={<AdminOverviewRangeSelect range={range} />}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="Total users" value={data.users.total} hint="Current accounts" icon={Users} tone="info" />
          <MetricCard label="Enabled accounts" value={data.users.active} hint="Registered accounts with ACTIVE status; not people online" icon={UserCheck} tone="good" />
          <MetricCard label="Support attention" value={supportAttention} hint="Tickets awaiting action" icon={Headphones} tone={supportAttention ? "warn" : "good"} />
          <MetricCard label="Deletion attention" value={deletionAttention} hint="Requests needing review" icon={Trash2} tone={deletionAttention ? "warn" : "good"} />
          <MetricCard label="Journeys" value={data.journeys.journeys} hint="Selected time window" icon={Route} tone="info" />
          <MetricCard label="Admin actions" value={data.adminActions} hint="Selected time window" icon={ShieldCheck} tone="neutral" />
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-600">
          <strong>Recently observed visitors (5 min): {count(data.visitorActivity.observedVisitorIdentities)}</strong>
          {" · Consented visitor identities with recorded activity, not a verified count of everyone currently online. One person can use multiple devices; unconsented visitors are excluded."}
        </p>
      </section>

      <section className="mt-6" aria-label="Attention Required">
        <AdminSectionCard className="p-4 sm:p-5">
          <SectionTitle title="Attention Required" description="Items derived from current ticket, deletion and provider states." />
          <div className="grid gap-3 lg:grid-cols-3">
            <AttentionCard href="/admin/providers" title="Provider performance" value={providerAttention} tone="bad"
              description={providerAttention ? "Provider operations are degraded or failing" : "No degraded or failing providers"} icon={Activity} />
            <AttentionCard href="/admin/support" title="Support queue" value={supportAttention} tone="warn"
              description={supportAttention ? "Tickets need a response or follow-up" : "No outstanding support attention"} icon={Headphones} />
            <AttentionCard href="/admin/account-deletions" title="Deletion reviews" value={deletionAttention} tone="info"
              description={deletionAttention ? "Requests pending or ready for review" : "No deletion requests awaiting review"} icon={Trash2} />
          </div>
        </AdminSectionCard>
      </section>

      <div className="mt-6 grid items-start gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <PlatformHealth system={system} />
        <section className="min-w-0" aria-label="Provider Operational Health">
          <SectionTitle title="Provider Operational Health"
            description="Readiness shows whether a provider may run; operational health reflects its recorded traffic."
            action={<Link href="/admin/providers" className="focus-ring inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline">View all providers <ArrowUpRight size={13} aria-hidden="true" /></Link>} />
          <div className="grid gap-3 xl:grid-cols-2">
            {data.providers.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}
            {data.providers.length === 0 ? <AdminEmptyState title="No provider status available" message="The current deployment has no reported provider operational statuses." /> : null}
          </div>
        </section>
      </div>

      <section className="mt-6" aria-label="Customer Journey Funnel">
        <SectionTitle
          title="Customer Journey Funnel"
          description="Consented journey progression. Outbound provider handoffs do not prove completed bookings."
          action={<div className="flex flex-wrap gap-2">
            <AdminStatusBadge tone="info">{count(data.journeys.identities.registered)} registered identities</AdminStatusBadge>
            <AdminStatusBadge>{count(data.journeys.identities.guests)} guest identities</AdminStatusBadge>
          </div>}
        />
        <AdminSectionCard className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FunnelStep label="Search completed" journeys={funnel.SEARCH_COMPLETED.journeys} events={funnel.SEARCH_COMPLETED.events} icon={Search} />
            <FunnelStep label="Results viewed" journeys={funnel.RESULTS_VIEWED.journeys} events={funnel.RESULTS_VIEWED.events} icon={BookOpen} />
            <FunnelStep label="Offer selected" journeys={funnel.OFFER_SELECTED.journeys} events={funnel.OFFER_SELECTED.events} icon={MousePointerClick} />
            <FunnelStep label="Provider handoff" journeys={funnel.PROVIDER_HANDOFF_STARTED.journeys} events={funnel.PROVIDER_HANDOFF_STARTED.events} icon={ArrowUpRight} />
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">Stage counts are distinct consented journeys, not percentages of all operational searches.</p>
        </AdminSectionCard>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <AdminSectionCard className="p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-950"><Search size={17} className="text-indigo-700" aria-hidden="true" />Operational Search Health</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">Operational search records · Selected reporting range</p>
            <div className="mt-3">
              <DetailRow label="Operational searches" value={data.journeys.operationalSearches.total} />
              <DetailRow label="Failed searches" value={data.journeys.operationalSearches.failed} />
              <DetailRow label="Partial results" value={data.journeys.operationalSearches.partial} />
            </div>
          </AdminSectionCard>
          <AdminSectionCard className="p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-950"><Route size={17} className="text-indigo-700" aria-hidden="true" />Handoff Correlation</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">Only verifiable search-to-handoff associations</p>
            <div className="mt-3">
              <DetailRow label="Exact search ↔ handoff links" value={data.journeys.handoffCorrelation.exactEvents} />
              <DetailRow label="Uncorrelated handoffs" value={data.journeys.handoffCorrelation.uncorrelatedEvents} />
            </div>
            <p className="mt-2 text-xs text-slate-500">No nearest-by-time inference.</p>
          </AdminSectionCard>
        </div>
      </section>

      <div className="mt-6 grid items-start gap-4 xl:grid-cols-3">
        <WorkloadCard title="Support Workload" href="/admin/support" icon={Headphones} rows={[
          { label: "Open", value: data.support.open, detail: "New / active tickets" },
          { label: "Waiting on team", value: data.support.waitingOnTeam, detail: "Needs internal action" },
          { label: "Waiting on user", value: data.support.waitingOnUser, detail: "Customer response pending" },
          { label: "Resolved / closed", value: data.support.resolvedOrClosed, detail: "Completed support work" },
        ]} />
        <WorkloadCard title="Account Deletion Workload" href="/admin/account-deletions" icon={Trash2} rows={[
          { label: "Pending", value: data.deletions.pending, detail: "Inside lifecycle review" },
          { label: "Ready for review", value: data.deletions.readyForReview, detail: "Requires admin review" },
          { label: "Cancelled", value: data.deletions.cancelled, detail: "Deletion stopped" },
          { label: "Completed", value: data.deletions.completed, detail: "Finalized lifecycle" },
        ]} />
        <ActivityFeed activity={activity} />
      </div>

      <div className="mt-6">
        <QuickActions modules={modules} />
      </div>
    </div>
  );
}
