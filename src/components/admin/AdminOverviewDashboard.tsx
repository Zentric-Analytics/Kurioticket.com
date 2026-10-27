import Link from "next/link";
import {
  Activity, ArrowUpRight, BookOpen, Headphones, HeartPulse, KeyRound, Mail,
  MousePointerClick, Route, Search, ShieldCheck, Trash2, Users,
  type LucideIcon,
} from "lucide-react";

import { AdminOverviewAutoRefresh, AdminOverviewRangeSelect, type OverviewRange } from "@/components/admin/AdminOverviewControls";
import { formatProviderFailureRatePct } from "@/services/providerOperationalStatusCore";
import type { getRecentAdminActivity, getSafeSystemStatus } from "@/lib/admin-data";
import type { getAdminOverview } from "@/services/adminOverviewService";
import type { ProviderOperationalStatus } from "@/services/providerOperationalStatus";

type OverviewData = Extract<Awaited<ReturnType<typeof getAdminOverview>>, { status: "ok" }>["data"];
type SystemStatus = Awaited<ReturnType<typeof getSafeSystemStatus>>;
type AuditActivity = Awaited<ReturnType<typeof getRecentAdminActivity>>;
type Tone = "neutral" | "good" | "warn" | "bad" | "info";

function count(value: number) {
  return value.toLocaleString("en-US");
}

function humanize(value: string) {
  return value.toLowerCase().split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1)).join(" ");
}

function toneClass(tone: Tone) {
  if (tone === "good") return "text-emerald-700";
  if (tone === "bad") return "text-rose-700";
  if (tone === "warn") return "text-amber-700";
  if (tone === "info") return "text-indigo-700";
  return "text-slate-700";
}

function Dot({ tone }: { tone: Tone }) {
  const color: Record<Tone, string> = {
    neutral: "bg-slate-400",
    good: "bg-emerald-500",
    warn: "bg-amber-500",
    bad: "bg-rose-500",
    info: "bg-indigo-500",
  };
  return <span className={"h-2 w-2 shrink-0 rounded-full " + color[tone]} aria-hidden="true" />;
}

function DetailsLink({ href, label = "View details" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="focus-ring inline-flex shrink-0 items-center gap-1 rounded-md text-[13px] font-medium text-indigo-700 hover:underline">
      {label}<ArrowUpRight size={14} aria-hidden="true" />
    </Link>
  );
}

function Panel({
  title, href, children, description, icon: Icon, actionLabel,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2 text-[15px] font-semibold text-slate-950">
          {Icon ? <Icon size={17} className="shrink-0 text-indigo-700" aria-hidden="true" /> : null}
          {title}
        </h2>
        <DetailsLink href={href} label={actionLabel} />
      </div>
      {description ? <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function MiniStat({
  label, value, tone = "neutral", note,
}: {
  label: string;
  value: number | string;
  tone?: Tone;
  note?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs leading-5 text-slate-600">{label}</p>
      <p className={"mt-0.5 text-[22px] font-semibold tabular-nums tracking-tight " + toneClass(tone)}>
        {typeof value === "number" ? count(value) : value}
      </p>
      {note ? <p className="mt-0.5 text-xs leading-4 text-slate-600">{note}</p> : null}
    </div>
  );
}

function SnapshotTile({
  href, label, value, icon: Icon, note, tone = "neutral",
}: {
  href: string;
  label: string;
  value: number | string;
  icon: LucideIcon;
  note: string;
  tone?: Tone;
}) {
  return (
    <Link href={href} className="focus-ring group min-w-0 rounded-lg border border-slate-200 px-3.5 py-3 transition hover:border-indigo-300 hover:bg-slate-50/60 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <Icon size={18} className={toneClass(tone)} aria-hidden="true" />
        <ArrowUpRight size={14} className="text-slate-400 group-hover:text-indigo-700" aria-hidden="true" />
      </div>
      <p className="mt-2 text-[12px] font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-[25px] font-semibold tabular-nums tracking-tight text-slate-950">
        {typeof value === "number" ? count(value) : value}
      </p>
      <p className="mt-0.5 text-xs leading-4 text-slate-600">{note}</p>
    </Link>
  );
}

function AttentionLink({
  href, label, countValue, icon: Icon, tone,
}: {
  href: string;
  label: string;
  countValue: number;
  icon: LucideIcon;
  tone: Tone;
}) {
  return (
    <Link href={href} className="focus-ring group flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 hover:border-indigo-300 hover:bg-slate-50/60">
      <Icon size={19} className={"shrink-0 " + toneClass(countValue > 0 ? tone : "neutral")} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-slate-800">{label}</p>
        <p className={"text-xl font-semibold tabular-nums " + toneClass(countValue > 0 ? tone : "neutral")}>{count(countValue)}</p>
      </div>
      <ArrowUpRight size={15} className="shrink-0 text-slate-400 group-hover:text-indigo-700" aria-hidden="true" />
    </Link>
  );
}

function ProviderSummary({ provider }: { provider: ProviderOperationalStatus }) {
  const state = provider.operationalState;
  const tone: Tone = state === "FAILING" ? "bad" : state === "DEGRADED" ? "warn"
    : state === "HEALTHY" ? "good" : state === "NO_RECENT_ACTIVITY" ? "info" : "neutral";
  const stateLabel = state === "FAILING" ? "Requests failing" : state === "DEGRADED" ? "Calls degraded"
    : state === "HEALTHY" ? "Calls healthy" : state === "NO_RECENT_ACTIVITY" ? "No recent calls" : "Not ready";
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-900">{provider.provider}</p>
          <p className="text-xs text-slate-600">{provider.readinessState === "READY" ? "Configured for calls" : humanize(provider.readinessState)}</p>
        </div>
        <span className={"inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-1 text-xs font-medium " + toneClass(tone)}>
          <Dot tone={tone} />{stateLabel}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-2.5">
        <div><p className="text-[11px] text-slate-600">Calls</p><p className="text-base font-semibold tabular-nums text-slate-950">{count(provider.totalCalls)}</p></div>
        <div><p className="text-[11px] text-slate-600">Failed</p><p className="text-base font-semibold tabular-nums text-slate-950">{count(provider.failedCalls)}</p></div>
        <div><p className="text-[11px] text-slate-600">Failure rate</p><p className={"text-base font-semibold tabular-nums " + toneClass(tone)}>{formatProviderFailureRatePct(provider.failureRatePct, provider.failedCalls)}</p></div>
      </div>
    </div>
  );
}

function PlatformSummary({ system }: { system: SystemStatus }) {
  const statuses: Array<{ label: string; value: string; tone: Tone; icon: LucideIcon }> = [
    { label: "Database", value: system.databaseConnected ? "Connected" : system.databaseConfigured ? "Not connected" : "Not configured", tone: system.databaseConnected ? "good" : "bad", icon: HeartPulse },
    { label: "Authentication", value: system.authConfigured && system.sessionConfigured ? "Configured, not tested" : "Incomplete", tone: system.authConfigured && system.sessionConfigured ? "info" : "warn", icon: KeyRound },
    { label: "Email", value: system.emailConfigured ? "Configured, not tested" : "Incomplete", tone: system.emailConfigured ? "info" : "warn", icon: Mail },
    { label: "Provider keys", value: system.providerCredentialsPresent ? "Present, not verified" : "Missing", tone: system.providerCredentialsPresent ? "info" : "warn", icon: ShieldCheck },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {statuses.map(({ label, value, tone, icon: Icon }) => (
        <div key={label} className="flex min-w-0 items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5">
          <Icon size={16} className={"mt-0.5 shrink-0 " + toneClass(tone)} aria-hidden="true" />
          <div className="min-w-0"><p className="text-[13px] font-medium text-slate-900">{label}</p><p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-600"><Dot tone={tone} />{value}</p></div>
        </div>
      ))}
    </div>
  );
}

function ActivitySummary({ activity }: { activity: AuditActivity }) {
  if (activity.status === "unavailable") {
    return <p role="status" className="text-[13px] text-slate-600">Recent admin actions are unavailable.</p>;
  }
  if (activity.items.length === 0) {
    return <p className="text-[13px] text-slate-600">No admin actions have been recorded yet.</p>;
  }
  return (
    <div className="divide-y divide-slate-200">
      {activity.items.slice(0, 3).map((item) => (
        <div key={item.id} className="flex min-w-0 items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" aria-hidden="true" />
            <p className="min-w-0 text-[13px] font-medium text-slate-800">{humanize(item.title)}{item.source === "system" ? " (System)" : ""}</p>
          </div>
          <p className="shrink-0 text-xs text-slate-600">{item.timestamp}</p>
        </div>
      ))}
    </div>
  );
}

export function AdminOverviewSecondary({ system, activity }: { system: SystemStatus; activity: AuditActivity }) {
  return (
    <div className="mt-5 grid gap-3 lg:grid-cols-2">
      <Panel title="Platform Health" href="/admin/system" icon={HeartPulse}>
        <PlatformSummary system={system} />
      </Panel>
      <Panel title="Recent Admin Activity" href="/admin/logs" icon={BookOpen} description="Latest recorded actions, regardless of the reporting period.">
        <ActivitySummary activity={activity} />
      </Panel>
    </div>
  );
}

export function AdminOverviewDashboard({
  data, system, activity, range,
}: {
  data: OverviewData;
  system: SystemStatus;
  activity: AuditActivity;
  range: OverviewRange;
}) {
  const supportAttention = data.support.open + data.support.waitingOnTeam + data.support.waitingOnUser;
  const deletionAttention = data.deletions.pending + data.deletions.readyForReview;
  const providerAttention = data.providers.filter((provider) =>
    provider.operationalState === "DEGRADED" || provider.operationalState === "FAILING" || provider.operationalState === "NOT_READY"
  ).length;
  const funnel = data.journeys.stages;
  const searches = data.journeys.operationalSearches;
  const redirects = data.journeys.operationalHandoffs;

  return (
    <div className="min-w-0">
      <AdminOverviewAutoRefresh />

      <section aria-label="Operations Snapshot">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950">Operations Snapshot</h2>
          <AdminOverviewRangeSelect range={range} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SnapshotTile href="/admin/users" icon={Users} label="Total accounts" value={data.users.total} note="Current retained accounts" />
          <SnapshotTile href="/admin/users" icon={Activity} label="Active website users"
            value={data.websitePresence.status === "ok" ? data.websitePresence.total : "Unavailable"}
            note={data.websitePresence.status === "ok" ? "Consented · last " + data.websitePresence.windowSeconds + " seconds" : "Live presence not verified"}
            tone={data.websitePresence.status === "ok" ? "good" : "warn"} />
          <SnapshotTile href="/admin/searches/activity" icon={Search} label="Recorded searches" value={searches.total} note="Selected reporting range" tone="info" />
          <SnapshotTile href="/admin/journeys" icon={Route} label="Customer journeys" value={data.journeys.journeys} note="Consented · selected range" tone="info" />
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          Live website users count consented, recently active website identities—not native app users or everyone online. Other activity totals follow the selected reporting range.
        </p>
      </section>

      <section className="mt-5 border-t border-slate-200 pt-4" aria-label="Attention Required">
        <h2 className="text-base font-semibold text-slate-950">Attention Required</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <AttentionLink href="/admin/providers" icon={Activity} label="Provider issues" countValue={providerAttention} tone="bad" />
          <AttentionLink href="/admin/support" icon={Headphones} label="Support queue" countValue={supportAttention} tone="warn" />
          <AttentionLink href="/admin/account-deletions" icon={Trash2} label="Deletion reviews" countValue={deletionAttention} tone="warn" />
        </div>
      </section>

      <div className="mt-5 grid items-start gap-3 lg:grid-cols-2">
        <Panel title="Visitor Activity" icon={Route} href="/admin/journeys" description="Consented events · selected range">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <MiniStat label="Journeys" value={data.journeys.journeys} />
            <MiniStat label="Search events" value={funnel.SEARCH_COMPLETED.events} />
            <MiniStat label="Offer selections" value={funnel.OFFER_SELECTED.events} />
            <MiniStat label="Handoff events" value={funnel.PROVIDER_HANDOFF_STARTED.events} />
          </div>
        </Panel>

        <Panel title="Search Performance" icon={Search} href="/admin/searches/activity" description="All logged searches · selected range">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <MiniStat label="Total searches" value={searches.total} />
            <MiniStat label="Successful operations" value={searches.success} tone="good" />
            <MiniStat label="Partial searches" value={searches.partial} tone="warn" />
            <MiniStat label="Failed searches" value={searches.failed} tone={searches.failed ? "bad" : "neutral"} />
          </div>
        </Panel>

        <Panel title="Provider Handoffs" icon={MousePointerClick} href="/admin/redirects" description="Recorded redirects, not confirmed bookings">
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Redirects" value={redirects.total} />
            <MiniStat label="Exact search links" value={redirects.exactSearchLinks} tone="info" />
            <MiniStat label="Unattributed" value={redirects.withoutVisitorIdentity} />
          </div>
        </Panel>

        <Panel title="Provider Health" icon={HeartPulse} href="/admin/providers" description="Actual calls · last 24 hours">
          {data.providers.length === 0 ? (
            <p className="text-[13px] text-slate-600">No provider statuses reported.</p>
          ) : (
            <div className="grid gap-2">
              {data.providers.map((provider) => <ProviderSummary key={provider.id} provider={provider} />)}
            </div>
          )}
        </Panel>

        <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5" aria-label="Operational Workloads">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-950"><Headphones size={17} className="text-indigo-700" aria-hidden="true" />Operational Workloads</h2>
          <div className="mt-3 grid gap-2">
            <div className="rounded-lg border border-slate-200 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-semibold text-slate-900">Support</h3>
                <DetailsLink href="/admin/support" />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <MiniStat label="Open" value={data.support.open} />
                <MiniStat label="Waiting on team" value={data.support.waitingOnTeam} />
                <MiniStat label="Waiting on user" value={data.support.waitingOnUser} />
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-semibold text-slate-900">Account Deletions</h3>
                <DetailsLink href="/admin/account-deletions" />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <MiniStat label="Pending" value={data.deletions.pending} />
                <MiniStat label="Ready for review" value={data.deletions.readyForReview} />
                <MiniStat label="Completed" value={data.deletions.completed} />
              </div>
            </div>
          </div>
        </section>

        <Panel title="Platform Health" icon={ShieldCheck} href="/admin/system" description="Configuration is not a verified end-to-end test">
          <PlatformSummary system={system} />
        </Panel>
      </div>

      <div className="mt-3">
        <Panel title="Recent Admin Activity" icon={BookOpen} href="/admin/logs"
          description="Latest three recorded actions across all dates; human admin actions in the selected range: " + count(data.audit.human)}>
          <ActivitySummary activity={activity} />
        </Panel>
      </div>
    </div>
  );
}
