import Link from "next/link";
import {
  Activity,
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

import { AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { AdminOverviewAutoRefresh, AdminOverviewRangeSelect, type OverviewRange } from "@/components/admin/AdminOverviewControls";
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
  icon: Icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="mb-2.5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-950 sm:text-lg">
          {Icon ? <Icon size={17} className="shrink-0 text-indigo-700" aria-hidden="true" /> : null}
          {title}
        </h2>
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
    <div className="min-w-0 border-b border-slate-200/90 py-4 pr-3 sm:pr-4">
      <div className="flex items-center justify-between gap-2">
        <Icon size={19} className={iconColor[tone]} aria-hidden="true" />
        <span className={"h-2 w-2 shrink-0 rounded-full " +
          (tone === "good" ? "bg-emerald-400" : tone === "warn" ? "bg-amber-400" : tone === "bad" ? "bg-rose-400" : tone === "info" ? "bg-indigo-400" : "bg-slate-300")}
          aria-hidden="true" />
      </div>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-slate-950">{count(value)}</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">{hint}</p>
    </div>
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
  const color = active
    ? tone === "bad" ? "text-rose-700" : tone === "warn" ? "text-amber-700" : "text-indigo-700"
    : "text-slate-500";

  return (
    <Link
      href={href}
      className="focus-ring group flex min-w-0 items-start gap-3 border-b border-slate-200/90 py-4 pr-2 transition hover:border-indigo-200"
    >
      <Icon size={20} className={"mt-0.5 shrink-0 " + color} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-950 group-hover:text-indigo-700">
          {title}
          <span className={"text-xs font-bold tabular-nums " + color}>{count(value)}</span>
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-600">{description}</span>
      </span>
      <ChevronRight size={16} className="mt-1 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

function DetailRow({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 border-b border-slate-200/75 py-2.5 last:border-b-0">
      <span className="min-w-0 flex-1 text-xs leading-5 text-slate-600">{label}</span>
      <span className="min-w-0 max-w-[55%] text-right text-xs font-bold tabular-nums leading-5 text-slate-900">
        {typeof value === "number" ? count(value) : value}
      </span>
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
    <section className="min-w-0" aria-label="Platform Health">
      <SectionTitle title="Platform Health" />
      <div className="border-t border-slate-200/90">
        {rows.map(({ label, icon: Icon, status, ready }) => (
          <div key={label} className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-slate-200/80 py-3">
            <span className="flex min-w-0 items-center gap-2.5 text-sm font-medium text-slate-700">
              <Icon size={16} className="shrink-0 text-indigo-600" aria-hidden="true" />
              {label}
            </span>
            <span className={"inline-flex items-center gap-2 text-xs font-bold " + (ready ? "text-emerald-700" : "text-slate-600")}>
              <span className={"h-2 w-2 shrink-0 rounded-full " + (ready ? "bg-emerald-500" : "bg-slate-300")} aria-hidden="true" />
              {status}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-600">
        Configuration indicators do not replace end-to-end service checks.
      </p>
    </section>
  );
}

function ProviderCard({ provider }: { provider: ProviderOperationalStatus }) {
  return (
    <article className="min-w-0 border-t border-slate-200/90 py-4">
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
      <p className="mt-2 text-xs text-slate-600">Observed provider traffic · Last {provider.windowHours} hours</p>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="min-w-0">
          <p className="text-[11px] text-slate-600">Recent calls</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-950">{count(provider.totalCalls)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-600">Average latency</p>
          <p className="mt-1 break-words text-xl font-bold tabular-nums text-slate-950">
            {provider.averageLatencyMs === null ? "—" : provider.averageLatencyMs.toLocaleString("en-US") + "ms"}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-700">
        <span className="font-bold tabular-nums text-emerald-700">{count(provider.successCalls)}</span> successful
        <span className="mx-1.5 text-slate-400">·</span>
        <span className="font-bold tabular-nums text-rose-700">{count(provider.failedCalls)}</span> failed
      </p>
      <details className="mt-3 border-t border-slate-200/80">
        <summary className="focus-ring cursor-pointer py-2.5 text-xs font-semibold text-indigo-700 hover:underline">
          Full provider details
        </summary>
        <div className="border-t border-slate-200/80 pt-1">
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
    </article>
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
    <div className="min-w-0 border-b border-slate-200/90 py-4 pr-3">
      <Icon size={19} className="text-indigo-700" aria-hidden="true" />
      <p className="mt-3 text-xs font-semibold text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-950">{count(journeys)}</p>
      <p className="mt-1 text-xs text-slate-600">{count(events)} recorded events</p>
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
        icon={Icon}
        action={<Link href={href} className="focus-ring inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline">View all <ArrowUpRight size={13} aria-hidden="true" /></Link>}
      />
      <div className="border-t border-slate-200/90">
        {rows.map((row) => (
          <div key={row.label} className="flex min-w-0 items-start justify-between gap-3 border-b border-slate-200/75 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-800">{row.label}</p>
              <p className="mt-1 text-[11px] leading-4 text-slate-600">{row.detail}</p>
            </div>
            <span className="shrink-0 text-sm font-bold tabular-nums text-slate-950">{count(row.value)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActivityFeed({ activity }: { activity: AuditActivity }) {
  return (
    <section className="min-w-0">
      <SectionTitle
        title="Recent Admin Activity"
        action={<Link href="/admin/logs" className="focus-ring inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline">View all <ArrowUpRight size={13} aria-hidden="true" /></Link>}
      />
      {activity.length === 0 ? (
        <p className="border-t border-slate-200/90 py-6 text-sm text-slate-600">
          No admin activity yet. Audit log entries will appear here after admin actions are recorded.
        </p>
      ) : (
        <div className="divide-y divide-slate-200/80 border-t border-slate-200/90">
          {activity.map((item) => (
            <div key={item.id} className="flex min-w-0 items-start gap-3 py-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-950">{humanize(item.title)}</p>
                <p className="mt-0.5 break-words text-xs leading-5 text-slate-700">{item.detail}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-600">
                  <span>{item.timestamp}</span>
                  <span aria-label="Original audit action" className="break-all font-mono">{item.title}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function AdminOverviewSecondary({
  system,
  activity,
}: {
  system: SystemStatus;
  activity: AuditActivity;
}) {
  return (
    <div className="mt-6 space-y-6">
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <PlatformHealth system={system} />
        <ActivityFeed activity={activity} />
      </div>
    </div>
  );
}

export function AdminOverviewDashboard({
  data,
  system,
  activity,
  range,
}: {
  data: OverviewData;
  system: SystemStatus;
  activity: AuditActivity;
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
          action={<AdminOverviewRangeSelect range={range} />}
        />
        <div className="grid gap-x-6 gap-y-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
        <div>
          <SectionTitle title="Attention Required" />
          <div className="grid gap-x-6 gap-y-0 lg:grid-cols-3">
            <AttentionCard href="/admin/providers" title="Provider performance" value={providerAttention} tone="bad"
              description={providerAttention ? "Provider operations are degraded or failing" : "No degraded or failing providers"} icon={Activity} />
            <AttentionCard href="/admin/support" title="Support queue" value={supportAttention} tone="warn"
              description={supportAttention ? "Tickets need a response or follow-up" : "No outstanding support attention"} icon={Headphones} />
            <AttentionCard href="/admin/account-deletions" title="Deletion reviews" value={deletionAttention} tone="info"
              description={deletionAttention ? "Requests pending or ready for review" : "No deletion requests awaiting review"} icon={Trash2} />
          </div>
        </div>
      </section>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <PlatformHealth system={system} />
        <section className="min-w-0" aria-label="Provider Operational Health">
          <SectionTitle title="Provider Operational Health"
            action={<Link href="/admin/providers" className="focus-ring inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline">View all providers <ArrowUpRight size={13} aria-hidden="true" /></Link>} />
          <div className="grid gap-x-6 gap-y-0 xl:grid-cols-2">
            {data.providers.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}
            {data.providers.length === 0 ? <p className="border-t border-slate-200/90 py-4 text-sm text-slate-600">No provider status available. The current deployment has no reported provider operational statuses.</p> : null}
          </div>
        </section>
      </div>

      <section className="mt-6" aria-label="Customer Journey Funnel">
        <SectionTitle
          title="Customer Journey Funnel"
          action={<div className="flex flex-wrap gap-2">
            <AdminStatusBadge tone="info">{count(data.journeys.identities.registered)} registered identities</AdminStatusBadge>
            <AdminStatusBadge>{count(data.journeys.identities.guests)} guest identities</AdminStatusBadge>
          </div>}
        />
        <div>
          <div className="grid gap-x-6 gap-y-0 sm:grid-cols-2 xl:grid-cols-4">
            <FunnelStep label="Search completed" journeys={funnel.SEARCH_COMPLETED.journeys} events={funnel.SEARCH_COMPLETED.events} icon={Search} />
            <FunnelStep label="Results viewed" journeys={funnel.RESULTS_VIEWED.journeys} events={funnel.RESULTS_VIEWED.events} icon={BookOpen} />
            <FunnelStep label="Offer selected" journeys={funnel.OFFER_SELECTED.journeys} events={funnel.OFFER_SELECTED.events} icon={MousePointerClick} />
            <FunnelStep label="Provider handoff" journeys={funnel.PROVIDER_HANDOFF_STARTED.journeys} events={funnel.PROVIDER_HANDOFF_STARTED.events} icon={ArrowUpRight} />
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">Stage counts are distinct consented journeys, not percentages of all operational searches.</p>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <section className="min-w-0 border-t border-slate-200/90 py-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-950"><Search size={17} className="text-indigo-700" aria-hidden="true" />Operational Search Health</h3>
            <div className="mt-3">
              <DetailRow label="Operational searches" value={data.journeys.operationalSearches.total} />
              <DetailRow label="Failed searches" value={data.journeys.operationalSearches.failed} />
              <DetailRow label="Partial results" value={data.journeys.operationalSearches.partial} />
            </div>
          </section>
          <section className="min-w-0 border-t border-slate-200/90 py-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-950"><Route size={17} className="text-indigo-700" aria-hidden="true" />Handoff Correlation</h3>
            <div className="mt-3">
              <DetailRow label="Exact search ↔ handoff links" value={data.journeys.handoffCorrelation.exactEvents} />
              <DetailRow label="Uncorrelated handoffs" value={data.journeys.handoffCorrelation.uncorrelatedEvents} />
            </div>
            <p className="mt-2 text-xs text-slate-500">No nearest-by-time inference.</p>
          </section>
        </div>
      </section>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-3">
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

    </div>
  );
}
