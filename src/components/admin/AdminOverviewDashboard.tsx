import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Database,
  Headphones,
  KeyRound,
  Mail,
  MousePointerClick,
  Route,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";

import { AdminOverviewAutoRefresh, AdminOverviewRangeSelect, type OverviewRange } from "@/components/admin/AdminOverviewControls";
import { formatProviderFailureRatePct } from "@/services/providerOperationalStatusCore";
import type { ProviderOperationalState, ProviderOperationalStatus } from "@/services/providerOperationalStatus";
import type { getAdminOverview } from "@/services/adminOverviewService";
import type { getRecentAdminActivity, getSafeSystemStatus } from "@/lib/admin-data";

type OverviewData = Extract<Awaited<ReturnType<typeof getAdminOverview>>, { status: "ok" }>["data"];
type SystemStatus = Awaited<ReturnType<typeof getSafeSystemStatus>>;
type AuditActivity = Awaited<ReturnType<typeof getRecentAdminActivity>>;
type Tone = "neutral" | "good" | "warn" | "bad" | "info";

function count(value: number): string {
  return value.toLocaleString("en-US");
}

function humanize(value: string): string {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const colors: Record<Tone, string> = {
    neutral: "bg-slate-100 text-slate-700 ring-slate-200",
    good: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    warn: "bg-amber-50 text-amber-800 ring-amber-200",
    bad: "bg-rose-50 text-rose-800 ring-rose-200",
    info: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  };
  return <span className={"inline-flex max-w-full items-center rounded-full px-2 py-1 text-[11px] font-medium leading-4 ring-1 " + colors[tone]}>{label}</span>;
}

function Section({
  title,
  href,
  children,
  description,
  action,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {action}
          <Link href={href} className="focus-ring inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline" aria-label={"View " + title + " details"}>
            View details <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
      {children}
    </section>
  );
}

function MiniMetric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: Tone;
}) {
  const valueColors: Record<Tone, string> = {
    neutral: "text-slate-950",
    good: "text-emerald-800",
    warn: "text-amber-800",
    bad: "text-rose-800",
    info: "text-indigo-800",
  };
  return (
    <div className="min-w-0 rounded-lg bg-slate-50/75 px-3 py-2.5">
      <p className="text-[12px] font-medium leading-4 text-slate-600">{label}</p>
      <p className={"mt-1 text-xl font-semibold tabular-nums tracking-tight " + valueColors[tone]}>
        {typeof value === "number" ? count(value) : value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] leading-4 text-slate-600">{hint}</p> : null}
    </div>
  );
}

function SnapshotLink({ label, value, href, icon: Icon, hint }: {
  label: string;
  value: number | string;
  href: string;
  icon: LucideIcon;
  hint: string;
}) {
  return (
    <Link href={href} className="focus-ring group flex h-full min-w-0 flex-col rounded-lg border border-slate-200 px-3 py-2.5 transition hover:border-indigo-300 hover:bg-indigo-50/30">
      <div className="flex items-center justify-between gap-2">
        <Icon size={17} className="text-indigo-700" aria-hidden="true" />
        <ArrowUpRight size={14} className="text-slate-400 group-hover:text-indigo-700" aria-hidden="true" />
      </div>
      <p className="mt-1.5 min-w-0 break-words text-[12px] font-medium leading-4 text-slate-600">{label}</p>
      <p className="mt-0.5 min-w-0 break-words text-[22px] font-semibold leading-7 tabular-nums tracking-tight text-slate-950">
        {typeof value === "number" ? count(value) : value}
      </p>
      <p className="mt-1 min-w-0 break-words text-[11px] leading-4 text-slate-600">{hint}</p>
    </Link>
  );
}

function AttentionLink({ label, value, href, icon: Icon, tone }: {
  label: string;
  value: number;
  href: string;
  icon: LucideIcon;
  tone: Tone;
}) {
  const colored = value > 0;
  return (
    <Link href={href} className="focus-ring group flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 transition hover:border-indigo-300 hover:bg-slate-50">
      <Icon size={18} className={colored && tone === "bad" ? "text-rose-700" : colored ? "text-amber-700" : "text-slate-500"} aria-hidden="true" />
      <span className="min-w-0 flex-1 text-[13px] font-medium leading-5 text-slate-800">{label}</span>
      <strong className={"text-lg font-semibold tabular-nums " + (colored && tone === "bad" ? "text-rose-800" : colored ? "text-amber-800" : "text-slate-900")}>{count(value)}</strong>
      <ArrowUpRight size={14} className="shrink-0 text-slate-400 group-hover:text-indigo-700" aria-hidden="true" />
    </Link>
  );
}

function operationalTone(state: ProviderOperationalState): Tone {
  if (state === "HEALTHY") return "good";
  if (state === "DEGRADED") return "warn";
  if (state === "FAILING") return "bad";
  if (state === "NO_RECENT_ACTIVITY") return "info";
  return "neutral";
}

function operationalLabel(state: ProviderOperationalState): string {
  if (state === "HEALTHY") return "Calls healthy";
  if (state === "DEGRADED") return "Calls degraded";
  if (state === "FAILING") return "Requests failing";
  if (state === "NO_RECENT_ACTIVITY") return "No recent calls";
  return "Not ready";
}

function ProviderSummary({ provider }: { provider: ProviderOperationalStatus }) {
  const readiness = provider.readinessState === "READY" ? "Configured for calls" : humanize(provider.readinessState);
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-slate-950">{provider.provider}</h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge label={readiness} tone={provider.readinessState === "READY" ? "info" : "neutral"} />
          <StatusBadge label={operationalLabel(provider.operationalState)} tone={operationalTone(provider.operationalState)} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniMetric label="Attempts" value={provider.attemptedCalls} />
        <MiniMetric label="Failed" value={provider.failedCalls} tone={provider.failedCalls > 0 ? "bad" : "neutral"} />
        <MiniMetric label="Failure rate" value={formatProviderFailureRatePct(provider.failureRatePct, provider.failedCalls)} />
      </div>
    </div>
  );
}

function PlatformSummary({ system }: { system: SystemStatus }) {
  const items = [
    { label: "Database", icon: Database, value: system.databaseConnected ? "Connected" : system.databaseConfigured ? "Not connected" : "Not configured", good: system.databaseConnected },
    { label: "Auth / session", icon: KeyRound, value: system.authConfigured && system.sessionConfigured ? "Configured, not tested" : "Not configured", good: false },
    { label: "Email", icon: Mail, value: system.emailConfigured ? "Configured, not tested" : "Not configured", good: false },
    { label: "Provider keys", icon: ShieldCheck, value: system.providerCredentialsPresent ? "Key present, not tested" : "No keys configured", good: false },
  ] as const;
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ label, icon: Icon, value, good }) => (
        <div key={label} className="min-w-0 rounded-lg bg-slate-50/75 px-3 py-3">
          <div className="flex items-center gap-2">
            <Icon size={16} className="shrink-0 text-indigo-700" aria-hidden="true" />
            <span className="text-[12px] font-medium text-slate-700">{label}</span>
          </div>
          <div className="mt-2 flex items-start gap-2">
            <span aria-hidden="true" className={"mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full " + (good ? "bg-emerald-500" : "bg-slate-400")} />
            <span className="text-[12px] leading-5 text-slate-700">{value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentActivity({ activity }: { activity: AuditActivity }) {
  if (activity.status === "unavailable") {
    return <p role="status" className="py-3 text-sm text-slate-600">Recent admin activity is unavailable.</p>;
  }
  const recent = activity.items.slice(0, 3);
  if (recent.length === 0) {
    return <p className="py-3 text-sm text-slate-600">No recorded admin actions yet.</p>;
  }
  return (
    <ol className="divide-y divide-slate-200/90">
      {recent.map((item) => (
        <li key={item.id} className="flex min-w-0 flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-900">{humanize(item.title)}{item.source === "system" ? " (System)" : ""}</p>
            <p className="min-w-0 truncate text-[12px] leading-5 text-slate-600" title={item.detail}>{item.detail}</p>
          </div>
          <time className="shrink-0 text-[11px] text-slate-600">{item.timestamp}</time>
        </li>
      ))}
    </ol>
  );
}

export function AdminOverviewSecondary({ system, activity }: { system: SystemStatus; activity: AuditActivity }) {
  return (
    <div className="mt-4 grid gap-4">
      <Section title="Platform Health" href="/admin/system">
        <PlatformSummary system={system} />
      </Section>
      <Section title="Recent Admin Activity" href="/admin/logs" description="Latest three actions across all dates.">
        <RecentActivity activity={activity} />
      </Section>
    </div>
  );
}

export function AdminOverviewDashboard({ data, system, activity, range }: {
  data: OverviewData;
  system: SystemStatus;
  activity: AuditActivity;
  range: OverviewRange;
}) {
  const stages = data.journeys.stages;
  const supportAttention = data.support.open + data.support.waitingOnTeam + data.support.waitingOnUser;
  const deletionAttention = data.deletions.pending + data.deletions.readyForReview;
  const providerAttention = data.providers.filter((p) =>
    p.operationalState === "DEGRADED" || p.operationalState === "FAILING" || p.operationalState === "NOT_READY"
  ).length;
  const websiteActive = data.websitePresence.status === "ok"
    ? data.websitePresence.total
    : "Unavailable";

  return (
    <div className="min-w-0 space-y-4">
      <AdminOverviewAutoRefresh />

      <section aria-label="Operations Snapshot" className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold tracking-tight text-slate-950">Operations Snapshot</h2>
            <p className="mt-1 text-xs text-slate-600">Current accounts and selected-range activity at a glance.</p>
          </div>
          <AdminOverviewRangeSelect range={range} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 min-[56.25rem]:grid-cols-4">
          <SnapshotLink href="/admin/users" label="Total accounts" value={data.users.total} icon={Users} hint="Current account records" />
          <SnapshotLink href="/admin/users" label="Active website users" value={websiteActive} icon={Activity} hint="Consented website identities · last 90s" />
          <SnapshotLink href="/admin/searches/activity" label="Recorded searches" value={data.journeys.operationalSearches.total} icon={Search} hint="Selected reporting range" />
          <SnapshotLink href="/admin/journeys" label="Customer journeys" value={data.journeys.journeys} icon={Route} hint="Eligible consented journeys · selected range" />
        </div>
        <p className="mt-2 text-[11px] leading-5 text-slate-600">
          Active website users excludes native-app activity and visitors who decline analytics; it does not count every person online.
        </p>
      </section>

      <section aria-label="Attention Required" className="min-w-0 rounded-xl border border-slate-200 p-4 sm:p-5">
        <h2 className="mb-3 text-[15px] font-semibold text-slate-950">Attention Required</h2>
        <div className="grid gap-2 md:grid-cols-3">
          <AttentionLink href="/admin/providers" label="Provider issues" value={providerAttention} icon={Activity} tone="bad" />
          <AttentionLink href="/admin/support" label="Support queue" value={supportAttention} icon={Headphones} tone="warn" />
          <AttentionLink href="/admin/account-deletions" label="Deletion reviews" value={deletionAttention} icon={Trash2} tone="warn" />
        </div>
        <p className="mt-2 text-[11px] text-slate-600">Provider health: last 24 hours. Support and deletion queues: current.</p>
      </section>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Section title="Visitor Activity" href="/admin/journeys" description="Recorded consented events · selected range.">
          <div className="grid grid-cols-2 gap-2">
            <MiniMetric label="Search events" value={stages.SEARCH_COMPLETED.events} />
            <MiniMetric label="Results views" value={stages.RESULTS_VIEWED.events} />
            <MiniMetric label="Offer selections" value={stages.OFFER_SELECTED.events} />
            <MiniMetric label="Provider handoffs" value={stages.PROVIDER_HANDOFF_STARTED.events} />
          </div>
          <p className="mt-2 text-[11px] text-slate-600">Events can repeat. Handoffs are not confirmed bookings.</p>
        </Section>

        <Section title="Search Performance" href="/admin/searches/activity" description="All recorded search operations · selected range.">
          <div className="grid grid-cols-2 gap-2">
            <MiniMetric label="Total" value={data.journeys.operationalSearches.total} />
            <MiniMetric label="Successful" value={data.journeys.operationalSearches.success} tone="good" />
            <MiniMetric label="Failed" value={data.journeys.operationalSearches.failed} tone={data.journeys.operationalSearches.failed ? "bad" : "neutral"} />
            <MiniMetric label="Partial" value={data.journeys.operationalSearches.partial} />
          </div>
          <p className="mt-2 text-[11px] text-slate-600">Includes unattributed searches; success does not guarantee offers.</p>
        </Section>
      </div>

      {/* Independent columns let short workload summaries sit directly below their related cards. */}
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <Section title="Provider Handoffs" href="/admin/redirects" description="Recorded outbound redirects · selected range.">
            <div className="grid grid-cols-3 gap-2">
              <MiniMetric label="Recorded" value={data.journeys.operationalHandoffs.total} />
              <MiniMetric label="In consented journeys" value={data.journeys.operationalHandoffs.inConsentedJourneys} />
              <MiniMetric label="Unattributed" value={data.journeys.operationalHandoffs.withoutVisitorIdentity} />
            </div>
            <p className="mt-2 text-[11px] text-slate-600">Redirects are not bookings. Missing attribution does not prove declined consent.</p>
          </Section>

          <Section title="Support Workload" href="/admin/support">
            <div className="grid grid-cols-3 gap-2">
              <MiniMetric label="Open" value={data.support.open} />
              <MiniMetric label="Waiting on team" value={data.support.waitingOnTeam} />
              <MiniMetric label="Waiting on user" value={data.support.waitingOnUser} />
            </div>
          </Section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Section title="Provider Health" href="/admin/providers" description="Real request outcomes · last 24 hours.">
            <div className="grid gap-2">
              {data.providers.map((provider) => <ProviderSummary key={provider.id} provider={provider} />)}
              {data.providers.length === 0 ? <p className="text-sm text-slate-600">Provider status unavailable.</p> : null}
            </div>
          </Section>

          <Section title="Deletion Workload" href="/admin/account-deletions">
            <div className="grid grid-cols-3 gap-2">
              <MiniMetric label="Pending" value={data.deletions.pending} />
              <MiniMetric label="Ready for review" value={data.deletions.readyForReview} />
              <MiniMetric label="Completed" value={data.deletions.completed} />
            </div>
          </Section>
        </div>
      </div>

      <AdminOverviewSecondary system={system} activity={activity} />
    </div>
  );
}
