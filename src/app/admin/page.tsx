import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  AdminActivityList,
  AdminEmptyState,
  AdminMetricCard,
  AdminPageShell,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import { adminNavigation } from "@/lib/adminNavigation";
import {
  formatDateTime,
  getRecentAdminActivity,
  getSafeSystemStatus,
} from "@/lib/admin-data";
import { getAdminOverview } from "@/services/adminOverviewService";
import type {
  ProviderOperationalState,
  ProviderOperationalStatus,
} from "@/services/providerOperationalStatus";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const [overview, system, activity] = await Promise.all([
    getAdminOverview(new URLSearchParams()),
    getSafeSystemStatus(),
    getRecentAdminActivity(),
  ]);

  const modules = adminNavigation.filter((item) =>
    [
      "/admin/users",
      "/admin/providers",
      "/admin/searches",
      "/admin/redirects",
      "/admin/support",
      "/admin/account-deletions",
      "/admin/content",
      "/admin/logs",
      "/admin/system",
    ].includes(item.href),
  );

  return (
    <AdminPageShell
      title="Operations Dashboard"
      description="Live admin operations powered by the canonical backend contracts for users, journeys, support, deletions, providers, and audit activity."
    >
      {overview.status !== "ok" ? (
        <AdminEmptyState
          title="Operational summary unavailable"
          message="The canonical admin overview could not be loaded. No fallback or mocked operational totals are shown."
        />
      ) : (
        <OverviewContent data={overview.data} />
      )}

      <section className="mt-8 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="text-lg font-black text-slate-950">Platform Health</h2>
          <AdminSectionCard className="mt-3 p-5">
            <div className="grid gap-3">
              <HealthRow
                label="Database"
                ok={system.databaseConnected}
                fallback={system.databaseConfigured ? "Configured, not connected" : "Not configured"}
              />
              <HealthRow
                label="Auth/session"
                ok={system.authConfigured && system.sessionConfigured}
                fallback="Not fully configured"
              />
              <HealthRow
                label="Email / Resend"
                ok={system.emailConfigured}
                fallback="Unavailable"
              />
              <HealthRow
                label="Provider credentials"
                ok={system.providerCredentialsPresent}
                fallback="Not present"
              />
            </div>
          </AdminSectionCard>
        </div>

        <div>
          <h2 className="text-lg font-black text-slate-950">Admin Activity</h2>
          <div className="mt-3">
            <AdminActivityList items={activity} />
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-black text-slate-950">Admin Modules</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => (
            <Link key={module.href} href={module.href} className="group rounded-2xl focus-ring">
              <AdminSectionCard className="h-full p-4 transition group-hover:border-indigo-200 group-hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <module.icon className="text-indigo-700" size={20} />
                  <ArrowRight
                    className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-700"
                    size={16}
                  />
                </div>
                <p className="mt-3 font-black text-slate-950">{module.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{module.description}</p>
              </AdminSectionCard>
            </Link>
          ))}
        </div>
      </section>
    </AdminPageShell>
  );
}

function OverviewContent({
  data,
}: {
  data: Extract<Awaited<ReturnType<typeof getAdminOverview>>, { status: "ok" }>["data"];
}) {
  const funnel = data.journeys.stages;
  const supportNeedsAttention =
    data.support.open + data.support.waitingOnTeam + data.support.waitingOnUser;
  const deletionNeedsAttention = data.deletions.pending + data.deletions.readyForReview;

  return (
    <>
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-950">Operations Snapshot</h2>
          <div className="flex flex-wrap gap-2">
            <AdminStatusBadge tone="info">{data.scope.environment}</AdminStatusBadge>
            <AdminStatusBadge>
              {formatDateTime(new Date(data.scope.from))} – {formatDateTime(new Date(data.scope.to))}
            </AdminStatusBadge>
          </div>
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <AdminMetricCard label="Total users" value={data.users.total} />
          <AdminMetricCard label="Active users" value={data.users.active} tone="good" />
          <AdminMetricCard
            label="Support attention"
            value={supportNeedsAttention}
            tone={supportNeedsAttention ? "warn" : "good"}
          />
          <AdminMetricCard
            label="Deletion attention"
            value={deletionNeedsAttention}
            tone={deletionNeedsAttention ? "warn" : "good"}
          />
          <AdminMetricCard label="Journeys" value={data.journeys.journeys} hint="Selected time window" />
          <AdminMetricCard label="Admin actions" value={data.adminActions} hint="Selected time window" />
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">Customer Journey Funnel</h2>
            <p className="mt-1 text-sm text-slate-600">
              Consented journey progression. Provider handoffs are outbound referrals, not confirmed bookings.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminStatusBadge tone="info">
              {data.journeys.identities.registered} registered identities
            </AdminStatusBadge>
            <AdminStatusBadge>{data.journeys.identities.guests} guest identities</AdminStatusBadge>
          </div>
        </div>

        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            label="Search completed"
            value={funnel.SEARCH_COMPLETED.journeys}
            hint={`${funnel.SEARCH_COMPLETED.events} recorded events`}
          />
          <AdminMetricCard
            label="Results viewed"
            value={funnel.RESULTS_VIEWED.journeys}
            hint={`${funnel.RESULTS_VIEWED.events} recorded events`}
            tone="info"
          />
          <AdminMetricCard
            label="Offer selected"
            value={funnel.OFFER_SELECTED.journeys}
            hint={`${funnel.OFFER_SELECTED.events} recorded events`}
            tone="info"
          />
          <AdminMetricCard
            label="Provider handoff"
            value={funnel.PROVIDER_HANDOFF_STARTED.journeys}
            hint={`${funnel.PROVIDER_HANDOFF_STARTED.events} recorded events`}
            tone="good"
          />
        </div>

        <AdminSectionCard className="mt-4 p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryLine
              label="Operational searches"
              value={data.journeys.operationalSearches.total}
              detail={`${data.journeys.operationalSearches.failed} failed · ${data.journeys.operationalSearches.partial} partial`}
            />
            <SummaryLine
              label="Exact search ↔ handoff links"
              value={data.journeys.handoffCorrelation.exactEvents}
              detail="Verified correlation only"
            />
            <SummaryLine
              label="Uncorrelated handoffs"
              value={data.journeys.handoffCorrelation.uncorrelatedEvents}
              detail="No nearest-by-time inference"
            />
          </div>
        </AdminSectionCard>
      </section>

      <section className="mt-8">
        <div>
          <h2 className="text-lg font-black text-slate-950">Provider Operational Health</h2>
          <p className="mt-1 text-sm text-slate-600">
            Readiness shows whether a provider may run; operational health shows what recent provider traffic actually did.
          </p>
        </div>
        <div className="mt-3 grid gap-4 xl:grid-cols-2">
          {data.providers.map((provider) => (
            <ProviderOperationalCard key={provider.id} provider={provider} />
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-4 xl:grid-cols-2">
        <div>
          <h2 className="text-lg font-black text-slate-950">Support Workload</h2>
          <AdminSectionCard className="mt-3 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryLine label="Open" value={data.support.open} detail="New / active tickets" />
              <SummaryLine
                label="Waiting on team"
                value={data.support.waitingOnTeam}
                detail="Needs internal action"
              />
              <SummaryLine
                label="Waiting on user"
                value={data.support.waitingOnUser}
                detail="Customer response pending"
              />
              <SummaryLine
                label="Resolved / closed"
                value={data.support.resolvedOrClosed}
                detail="Completed support work"
              />
            </div>
          </AdminSectionCard>
        </div>

        <div>
          <h2 className="text-lg font-black text-slate-950">Account Deletion Workload</h2>
          <AdminSectionCard className="mt-3 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryLine label="Pending" value={data.deletions.pending} detail="Inside lifecycle review" />
              <SummaryLine
                label="Ready for review"
                value={data.deletions.readyForReview}
                detail="Requires admin review"
              />
              <SummaryLine label="Cancelled" value={data.deletions.cancelled} detail="Deletion stopped" />
              <SummaryLine label="Completed" value={data.deletions.completed} detail="Finalized lifecycle" />
            </div>
          </AdminSectionCard>
        </div>
      </section>
    </>
  );
}

function ProviderOperationalCard({
  provider,
}: {
  provider: ProviderOperationalStatus;
}) {
  const tone = providerTone(provider.operationalState);
  return (
    <AdminSectionCard className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{provider.id}</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">{provider.provider}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminStatusBadge tone={readinessTone(provider.readinessState)}>
            {humanize(provider.readinessState)}
          </AdminStatusBadge>
          <AdminStatusBadge tone={tone}>{humanize(provider.operationalState)}</AdminStatusBadge>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryLine
          label="Recent calls"
          value={provider.totalCalls}
          detail={`${provider.windowHours}h observation window`}
        />
        <SummaryLine
          label="Success / failure"
          value={`${provider.successCalls} / ${provider.failedCalls}`}
          detail={provider.degradedCalls ? `${provider.degradedCalls} degraded` : "No degraded calls"}
        />
        <SummaryLine
          label="Average latency"
          value={provider.averageLatencyMs === null ? "—" : `${provider.averageLatencyMs}ms`}
          detail={
            provider.lastActivityAt
              ? `Last activity ${formatDateTime(new Date(provider.lastActivityAt))}`
              : "No recent activity"
          }
        />
      </div>
    </AdminSectionCard>
  );
}

function SummaryLine({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
    </div>
  );
}

function HealthRow({ label, ok, fallback }: { label: string; ok: boolean; fallback: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm">
      <span className="font-semibold text-slate-600">{label}</span>
      <AdminStatusBadge tone={ok ? "good" : "neutral"}>{ok ? "Available" : fallback}</AdminStatusBadge>
    </div>
  );
}

function providerTone(state: ProviderOperationalState) {
  if (state === "HEALTHY") return "good" as const;
  if (state === "DEGRADED") return "warn" as const;
  if (state === "FAILING") return "bad" as const;
  if (state === "NO_RECENT_ACTIVITY") return "info" as const;
  return "neutral" as const;
}

function readinessTone(state: ProviderOperationalStatus["readinessState"]) {
  if (state === "READY") return "good" as const;
  if (state === "ENVIRONMENT_BLOCKED") return "warn" as const;
  return "neutral" as const;
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}
