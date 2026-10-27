import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Headphones,
  HeartPulse,
  Info,
  KeyRound,
  Mail,
  MousePointerClick,
  Route,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
  type LucideIcon,
} from "lucide-react";

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
  if (value === "READY") return "info";
  if (value === "ENVIRONMENT_BLOCKED") return "warn";
  return "neutral";
}

// A configured provider may still fail real requests.
function readinessLabel(value: ProviderOperationalStatus["readinessState"]) {
  return value === "READY" ? "Configured for calls" : humanize(value);
}

function operationalLabel(value: ProviderOperationalState) {
  if (value === "HEALTHY") return "Calls healthy";
  if (value === "DEGRADED") return "Calls degraded";
  if (value === "FAILING") return "Requests failing";
  if (value === "NO_RECENT_ACTIVITY") return "No recent calls";
  return "Not ready";
}

// Preserve status colors but reduce badge weight only on this dense Overview.
function OverviewStatusBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  const colors: Record<Tone, string> = {
    neutral: "bg-slate-100 text-slate-600 ring-slate-200",
    good: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warn: "bg-amber-50 text-amber-700 ring-amber-200",
    bad: "bg-rose-50 text-rose-700 ring-rose-200",
    info: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  };
  return <span className={"inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-4 ring-1 " + colors[tone]}>{children}</span>;
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
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
          {Icon ? <Icon size={17} className="shrink-0 text-indigo-700" aria-hidden="true" /> : null}
          {title}
        </h2>
        {description ? <p className="mt-1 text-[13px] leading-5 text-slate-700 sm:text-sm">{description}</p> : null}
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
    <div className="min-w-0 border-b border-r border-slate-200/85 p-3 sm:p-4 lg:min-h-32">
      <div className="flex items-center justify-between gap-2">
        <Icon size={17} className={iconColor[tone]} aria-hidden="true" />
        <span className={"h-1.5 w-1.5 shrink-0 rounded-full " +
          (tone === "good" ? "bg-emerald-400" : tone === "warn" ? "bg-amber-400" : tone === "bad" ? "bg-rose-400" : tone === "info" ? "bg-indigo-400" : "bg-slate-300")}
          aria-hidden="true" />
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-600">{label}</p>
      <p className="mt-1 text-[23px] font-semibold tabular-nums tracking-tight text-slate-950">{count(value)}</p>
      <p className="mt-1 text-[13px] leading-5 text-slate-600">{hint}</p>
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
      className="focus-ring group flex h-full min-w-0 flex-col rounded-xl border border-slate-200 p-3.5 transition hover:border-indigo-200 hover:bg-slate-50/60 sm:p-4"
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-slate-900 group-hover:text-indigo-700">
          <Icon size={17} className={"shrink-0 " + color} aria-hidden="true" />
          {title}
        </span>
        <ChevronRight size={16} className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
      <span className={"mt-3 text-2xl font-semibold tabular-nums tracking-tight " + color}>{count(value)}</span>
      <span className="mt-1 text-xs leading-5 text-slate-600">{description}</span>
    </Link>
  );
}

function DetailRow({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 border-b border-slate-200/75 py-2.5 last:border-b-0">
      <span className="min-w-0 flex-1 text-[13px] leading-5 text-slate-700">{label}</span>
      <span className="min-w-0 max-w-[55%] text-right text-[13px] font-semibold tabular-nums leading-5 text-slate-900">
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
      confirmed: system.databaseConnected,
    },
    {
      label: "Auth / session",
      icon: KeyRound,
      status: system.authConfigured && system.sessionConfigured ? "Secrets configured (not tested)" : "Secrets incomplete",
      ready: system.authConfigured && system.sessionConfigured,
      confirmed: false,
    },
    {
      label: "Email / Resend",
      icon: Mail,
      status: system.emailConfigured ? "Credentials configured (not tested)" : "Credentials incomplete",
      ready: system.emailConfigured,
      confirmed: false,
    },
    {
      label: "Provider credentials",
      icon: ShieldCheck,
      status: system.providerCredentialsPresent ? "At least one key present" : "No keys configured",
      ready: system.providerCredentialsPresent,
      confirmed: false,
    },
  ] as const;
  return (
    <section className="min-w-0" aria-label="Platform Health">
      <SectionTitle title="Platform Health" description="Database connectivity and configuration—not proof that integrations work." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map(({ label, icon: Icon, status, ready, confirmed }) => (
          <div key={label} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 sm:p-4">
            <div className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-800">
              <Icon size={17} className="shrink-0 text-indigo-600" aria-hidden="true" />
              {label}
            </div>
            <div className="mt-3 flex items-start gap-2 text-xs font-medium leading-5 text-slate-700">
              <span className={"mt-1.5 h-2 w-2 shrink-0 rounded-full " +
                (confirmed ? "bg-emerald-500" : ready ? "bg-indigo-400" : "bg-slate-300")} aria-hidden="true" />
              <span>{status}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}


function ProviderCard({ provider }: { provider: ProviderOperationalStatus }) {
  const serviceGridColumns = provider.serviceBreakdown.length >= 3
    ? "lg:grid-cols-3"
    : provider.serviceBreakdown.length === 2
      ? "sm:grid-cols-2"
      : "grid-cols-1";

  return (
    <article className="min-w-0 rounded-xl border border-slate-200 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{provider.id}</p>
          <h3 className="mt-1 text-base font-semibold text-slate-950">{provider.provider}</h3>
          <p className="mt-1 text-xs text-slate-600">Recorded provider calls · Last {provider.windowHours} hours</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OverviewStatusBadge tone={readinessTone(provider.readinessState)}>{readinessLabel(provider.readinessState)}</OverviewStatusBadge>
          <OverviewStatusBadge tone={providerTone(provider.operationalState)}>{operationalLabel(provider.operationalState)}</OverviewStatusBadge>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 border-y border-slate-200 py-3 lg:grid-cols-4 lg:gap-5">
        <div className="min-w-0">
          <p className="text-[11px] text-slate-600">Total calls</p>
          <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-slate-950">{count(provider.totalCalls)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-600">Successful</p>
          <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-emerald-700">{count(provider.successCalls)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-600">Failed</p>
          <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-rose-700">{count(provider.failedCalls)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-600">Failure rate</p>
          <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-slate-950">{provider.failureRatePct === null ? "No attempts" : provider.failureRatePct + "%"}</p>
        </div>
      </div>
      <div className="mt-4 min-w-0" aria-label={provider.provider + " full provider details"}>
        <h4 className="text-[13px] font-semibold text-slate-900">Full provider details</h4>
                <div className={"mt-3 grid gap-3 " + serviceGridColumns}>
          {provider.serviceBreakdown.map(service => (
            <section key={service.service} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h5 className="text-xs font-semibold capitalize text-slate-900">{service.service.replaceAll("-", " ")}</h5>
                <OverviewStatusBadge tone={providerTone(service.operationalState)}>{operationalLabel(service.operationalState)}</OverviewStatusBadge>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-700">{count(service.successCalls)} successful · {count(service.failedCalls)} failed · {count(service.disabledCalls)} disabled</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">Failure rate: {service.failureRatePct === null ? "No attempts" : service.failureRatePct + "%"}</p>
              {service.failureReasons.map(issue => (
                <p key={issue.code} className="mt-1.5 text-xs leading-5 text-slate-700">{issue.label}: <span className="font-semibold tabular-nums">{count(issue.calls)}</span></p>
              ))}
            </section>
          ))}
        </div>
        <div className="mt-3 grid gap-x-6 md:grid-cols-2">
          <div>
            <DetailRow label="Attempted calls (excludes disabled)" value={provider.attemptedCalls} />
            <DetailRow label="Degraded calls" value={provider.degradedCalls} />
            <DetailRow label="Disabled calls" value={provider.disabledCalls} />
          </div>
          <div>
            <DetailRow label="Avg. attempted-call latency" value={provider.averageLatencyMs === null ? "No timing recorded" : provider.averageLatencyMs + "ms"} />
            <DetailRow label="Last activity" value={provider.lastActivityAt ? formatDateTime(new Date(provider.lastActivityAt)) : "No recent activity"} />
            <DetailRow label="Last success" value={provider.lastSuccessAt ? formatDateTime(new Date(provider.lastSuccessAt)) : "None recorded in window"} />
            <DetailRow label="Last failure" value={provider.lastFailureAt ? formatDateTime(new Date(provider.lastFailureAt)) : "None recorded in window"} />
          </div>
        </div>
      </div>
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
    <div className="min-w-0 border-b border-r border-slate-200/90 p-3.5">
      <Icon size={19} className="text-indigo-700" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums tracking-tight text-slate-950">{count(journeys)}</p>
      <p className="mt-1 text-[13px] text-slate-700">{count(events)} recorded events</p>
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
    <section className="min-w-0 rounded-xl border border-slate-200 p-4 sm:p-5">
      <SectionTitle
        title={title}
        icon={Icon}
        action={<Link href={href} className="focus-ring inline-flex items-center gap-1 text-[13px] font-medium text-indigo-700 hover:underline">View all <ArrowUpRight size={13} aria-hidden="true" /></Link>}
      />
      <div className="border-t border-slate-200/90">
        {rows.map((row) => (
          <div key={row.label} className="flex min-w-0 items-start justify-between gap-3 border-b border-slate-200/75 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800">{row.label}</p>
              <p className="mt-1 text-[13px] leading-5 text-slate-600">{row.detail}</p>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{count(row.value)}</span>
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
        action={<Link href="/admin/logs" className="focus-ring inline-flex items-center gap-1 text-[13px] font-medium text-indigo-700 hover:underline">View all <ArrowUpRight size={13} aria-hidden="true" /></Link>}
      />
      {activity.status === "unavailable" ? (
        <p role="status" className="border-t border-slate-200/90 py-6 text-sm text-slate-600">Recent admin activity is unavailable.</p>
      ) : activity.items.length === 0 ? (
        <p className="border-t border-slate-200/90 py-6 text-sm text-slate-600">
          No admin activity yet. Audit log entries will appear here after admin actions are recorded.
        </p>
      ) : (
        <div className="divide-y divide-slate-200/80 border-t border-slate-200/90">
          <div className="hidden min-w-0 grid-cols-[8px_minmax(140px,0.75fr)_minmax(0,2.4fr)_minmax(145px,0.9fr)_minmax(130px,0.9fr)] gap-x-3 bg-slate-50/70 px-1 py-2 text-xs font-medium text-slate-600 lg:grid">
            <span aria-hidden="true" />
            <span>Action</span>
            <span>Details</span>
            <span>Time (UTC)</span>
            <span>Audit code</span>
          </div>
          {activity.items.map((item) => (
            <div key={item.id} className="grid min-w-0 grid-cols-[8px_minmax(0,1fr)] items-start gap-x-3 gap-y-1 py-3 lg:grid-cols-[8px_minmax(140px,0.75fr)_minmax(0,2.4fr)_minmax(145px,0.9fr)_minmax(130px,0.9fr)]">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" aria-hidden="true" />
              <p className="min-w-0 text-xs font-semibold leading-5 text-slate-950">{humanize(item.title)}{item.source === "system" ? " (System)" : ""}</p>
              <p className="col-start-2 min-w-0 break-words text-[13px] leading-5 text-slate-700 lg:col-start-auto">{item.detail}</p>
              <span className="col-start-2 text-[13px] leading-5 text-slate-700 lg:col-start-auto lg:whitespace-nowrap">{item.timestamp}</span>
              <span aria-label="Original audit action" className="col-start-2 min-w-0 break-words font-mono text-[13px] leading-5 text-slate-700 lg:col-start-auto">{item.title}</span>
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
      </div>
      <div className="mt-7">
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
  const providerAttention = data.providers.filter((p) => p.operationalState === "DEGRADED" || p.operationalState === "FAILING" || p.operationalState === "NOT_READY").length;

  return (
    <div className="min-w-0">
      <AdminOverviewAutoRefresh />

      <section aria-label="Operations Snapshot">
        <SectionTitle
          title="Operations Snapshot"
          action={<AdminOverviewRangeSelect range={range} />}
        />
        <p className="text-xs leading-5 text-slate-600">Current account and workflow totals · live website activity from the last 90 seconds · journeys and human actions use the selected reporting range.</p>
        <div className="mt-4 grid overflow-hidden rounded-lg border-l border-t border-slate-200 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard label="Total accounts" value={data.users.total} hint="Current account records, including retained deleted status" icon={Users} tone="info" />
          <MetricCard label="Enabled accounts" value={data.users.active} hint="ACTIVE account status · not people online" icon={UserCheck} tone="good" />
          <div className="min-w-0 border-b border-r border-slate-200/85 p-3 sm:p-4 lg:min-h-32">
            <div className="flex items-center justify-between"><Activity size={19} className={data.websitePresence.status === "ok" ? "text-emerald-700" : "text-slate-500"} aria-hidden="true" /><span className={"h-2 w-2 rounded-full " + (data.websitePresence.status === "ok" ? "bg-emerald-400" : "bg-slate-300")} aria-hidden="true" /></div>
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-700">Active website users</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums tracking-tight text-slate-950">{data.websitePresence.status === "ok" ? count(data.websitePresence.total) : "Unavailable"}</p>
            <p className="mt-1 text-[13px] leading-5 text-slate-700">{data.websitePresence.status === "ok" ? "Last " + data.websitePresence.windowSeconds + "s · " + count(data.websitePresence.registeredAccounts) + " accounts · " + count(data.websitePresence.guestIdentities) + " guests" : "Live website activity could not be verified"}</p>
          </div>
          <MetricCard label="Suspended accounts" value={data.users.suspended} hint="Current SUSPENDED account records" icon={UserX} tone="warn" />
          <MetricCard label="Deleted accounts" value={data.users.deleted} hint="Retained DELETED records · excludes permanently erased" icon={Trash2} tone="neutral" />
          <MetricCard label="Support attention" value={supportAttention} hint="Current open and waiting support tickets" icon={Headphones} tone={supportAttention ? "warn" : "good"} />
          <MetricCard label="Deletion attention" value={deletionAttention} hint="Current pending and ready-for-review requests" icon={Trash2} tone={deletionAttention ? "warn" : "good"} />
          <MetricCard label="Customer journeys" value={data.journeys.journeys} hint="Distinct consented journeys · selected range" icon={Route} tone="info" />
          <MetricCard label="Human admin actions" value={data.audit.human} hint={"Human-attributed audit rows · selected range · " + count(data.audit.automated) + " system entries excluded"} icon={ShieldCheck} tone="neutral" />
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-xs leading-5 text-slate-700" role="note">
          <Info size={16} className="mt-0.5 shrink-0 text-indigo-700" aria-hidden="true" />
          <p><span className="font-semibold text-indigo-800">How it's counted:</span> Only consented visitors with a visible website tab and a recent heartbeat are included, excluding native app activity and visitors who decline analytics. This estimates active browser/account identities, not every person online. The 90-second window is independent of the reporting-range selector.</p>
        </div>
      </section>

      <section className="mt-7 border-t border-slate-200 pt-6" aria-label="Attention Required">
        <div>
          <SectionTitle title="Attention Required" description="Current support and deletion queues · provider performance over the last 24 hours." />
          <div className="grid gap-3 md:grid-cols-3">
            <AttentionCard href="/admin/providers" title="Provider performance" value={providerAttention} tone="bad"
              description={providerAttention ? "Degraded, failing or not-ready integrations" : "No degraded, failing or not-ready integrations · inactivity may remain"} icon={Activity} />
            <AttentionCard href="/admin/support" title="Support queue" value={supportAttention} tone="warn"
              description={supportAttention ? "Tickets need a response or follow-up" : "No outstanding support attention"} icon={Headphones} />
            <AttentionCard href="/admin/account-deletions" title="Deletion reviews" value={deletionAttention} tone="info"
              description={deletionAttention ? "Requests pending or ready for review" : "No deletion requests awaiting review"} icon={Trash2} />
          </div>
        </div>
      </section>

      <section className="mt-7 border-t border-slate-200 pt-6" aria-label="Visitor Activity & Search Performance">
        <SectionTitle
          title="Visitor Activity & Search Performance"
          description="Consented journey events and recorded search and redirect outcomes."
          action={<div className="flex flex-wrap gap-2">
            <OverviewStatusBadge tone="info">{count(data.journeys.identities.registered)} registered identities</OverviewStatusBadge>
            <OverviewStatusBadge>{count(data.journeys.identities.guests)} guest identities</OverviewStatusBadge>
          </div>}
        />
        <div>
          <div className="grid overflow-hidden rounded-lg border-l border-t border-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            <FunnelStep label="Tracked searches" journeys={funnel.SEARCH_COMPLETED.journeys} events={funnel.SEARCH_COMPLETED.events} icon={Search} />
            <FunnelStep label="Results viewed" journeys={funnel.RESULTS_VIEWED.journeys} events={funnel.RESULTS_VIEWED.events} icon={BookOpen} />
            <FunnelStep label="Offer selected" journeys={funnel.OFFER_SELECTED.journeys} events={funnel.OFFER_SELECTED.events} icon={MousePointerClick} />
            <FunnelStep label="Tracked handoffs" journeys={funnel.PROVIDER_HANDOFF_STARTED.journeys} events={funnel.PROVIDER_HANDOFF_STARTED.events} icon={ArrowUpRight} />
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-600">Selected reporting range · stages count distinct eligible consented journeys. A search-completed event also includes failed or empty searches; stages can occur out of order and are not a conversion percentage or confirmed booking.</p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="min-w-0 rounded-xl border border-slate-200 p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Search size={17} className="text-indigo-700" aria-hidden="true" />Search Performance</h3>
            <div className="mt-3">
              <DetailRow label="Operational searches" value={data.journeys.operationalSearches.total} />
              <DetailRow label="Successful search operations" value={data.journeys.operationalSearches.success} />
              <DetailRow label="Failed searches" value={data.journeys.operationalSearches.failed} />
              <DetailRow label="Partial searches" value={data.journeys.operationalSearches.partial} />
              <DetailRow label="Partial with offers" value={data.journeys.operationalSearches.partialWithResults} />
              <DetailRow label="Partial without offers" value={data.journeys.operationalSearches.partialWithoutResults} />
              <p className="mt-2 text-xs leading-5 text-slate-600">Selected range · database search outcomes, including searches without consented journeys. Success means the operation completed, not that offers were returned. Partial may contain zero offers.</p>
            </div>
          </section>
          <section className="min-w-0 rounded-xl border border-slate-200 p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Route size={17} className="text-indigo-700" aria-hidden="true" />Provider Redirects</h3>
            <div className="mt-3">
              <DetailRow label="Recorded provider redirects" value={data.journeys.operationalHandoffs.total} />
              <DetailRow label="In consented journeys" value={data.journeys.operationalHandoffs.inConsentedJourneys} />
              <DetailRow label="Outside consented journeys" value={data.journeys.operationalHandoffs.outsideConsentedJourneys} />
              <DetailRow label="Without visitor attribution" value={data.journeys.operationalHandoffs.withoutVisitorIdentity} />
              <DetailRow label="Exact search links (eligible redirects)" value={data.journeys.operationalHandoffs.exactSearchLinks} />
              <DetailRow label="Eligible redirects without exact links" value={data.journeys.operationalHandoffs.eligibleWithoutExactSearch} />
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">Selected range and environment. Provider redirects are not confirmed bookings. Missing attribution does not establish that someone declined consent. No nearest-by-time inference.</p>
          </section>
        </div>
      </section>

      <div className="mt-7 border-t border-slate-200 pt-6">
        <section className="min-w-0" aria-label="Provider Operational Health">
          <SectionTitle title="Provider Operational Health"
            description="Recorded provider calls. Configured does not mean healthy."
            action={<Link href="/admin/providers" className="focus-ring inline-flex items-center gap-1 text-[13px] font-medium text-indigo-700 hover:underline">View all providers <ArrowUpRight size={13} aria-hidden="true" /></Link>} />
          <div className="grid gap-4">
            {data.providers.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}
            {data.providers.length === 0 ? <p className="border-t border-slate-200/90 py-4 text-sm text-slate-600">No provider status available. The current deployment has no reported provider operational statuses.</p> : null}
          </div>
        </section>
      </div>

      <section className="mt-7 border-t border-slate-200 pt-6" aria-label="Operational Workloads">
        <SectionTitle title="Operational Workloads" />
        <div className="grid items-start gap-4 lg:grid-cols-2">
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
        </div>
      </section>

      <div className="mt-7 border-t border-slate-200 pt-6">
        <PlatformHealth system={system} />
      </div>

      <div className="mt-7 min-w-0 border-t border-slate-200 pt-6">
        <ActivityFeed activity={activity} />
      </div>
    </div>
  );
}
