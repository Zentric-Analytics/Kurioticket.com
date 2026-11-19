import Link from "next/link";
import { failureRate, searchInvestigationHref, type PlatformSelection } from "@/lib/platformHealthPresentation";
import type { PlatformOperations } from "./PlatformHealthDashboard";
import { OperationalStatus } from "./OperationalStatus";

type Signal = {
  key: string;
  label: string;
  detail: string;
  href: string;
  state: string;
  scope: "Selected application" | "Shared service";
};

const isProblem = (state: string) => state === "FAILING" || state === "DEGRADED";
const isGap = (state: string) => state === "UNKNOWN" || state === "MONITORING_UNAVAILABLE";

/** Presentation-only triage. Each signal retains its own evidence and scope;
 * these lists are not an overall health score or a count of incidents. */
export function summarizePlatformHealthAttention(data: PlatformOperations, application: PlatformSelection) {
  const issues: Signal[] = [];
  const gaps: Signal[] = [];
  const add = (signal: Signal) => {
    if (isProblem(signal.state)) issues.push(signal);
    else if (isGap(signal.state)) gaps.push(signal);
  };

  const activity = data.activity.data;
  if (!activity) {
    gaps.push({
      key: "activity-unavailable", label: "Platform activity", state: "MONITORING_UNAVAILABLE",
      detail: "Operational counts could not be read for this window.",
      href: searchInvestigationHref(data.window, application), scope: "Selected application",
    });
  } else {
    const measures = [
      { key: "searches", label: "Search operations", href: searchInvestigationHref(data.window, application) },
      { key: "providerCalls", label: "Provider calls", href: "/admin/providers" },
      { key: "handoffs", label: "Referral handoffs", href: "/admin/redirects" },
    ] as const;
    for (const measure of measures) {
      const totals = application === "ALL" ? activity[measure.key].combined : activity[measure.key].applications[application];
      add({
        key: measure.key, label: measure.label, href: measure.href, state: totals.state,
        detail: totals.total === 0
          ? "No recorded operations in the selected window."
          : `${totals.failed.toLocaleString()} failed · ${totals.partial.toLocaleString()} partial · ${failureRate(totals)} failure rate`,
        scope: "Selected application",
      });
    }
  }

  add({
    key: "database", label: "Database connectivity", state: data.database.state,
    detail: "Current connection check; not an uptime measurement.",
    href: "/admin/system", scope: "Shared service",
  });
  add({
    key: "email", label: "Email delivery", state: data.email.state,
    detail: "Email uses its own last 24-hour observations.",
    href: "/admin/email-delivery", scope: "Shared service",
  });
  add({
    key: "cms", label: "CMS publication", state: data.cms.state,
    detail: "Publication checks do not confirm that installed apps received content.",
    href: "/admin/system/cms-health", scope: "Shared service",
  });

  if (data.providerHealth === null) {
    gaps.push({
      key: "providers-unavailable", label: "Provider health", state: "MONITORING_UNAVAILABLE",
      detail: "Shared provider monitoring could not be read.",
      href: "/admin/providers", scope: "Shared service",
    });
  } else if (data.providerHealth.length === 0) {
    gaps.push({
      key: "providers-empty", label: "Provider health", state: "UNKNOWN",
      detail: "No provider health observations were returned.",
      href: "/admin/providers", scope: "Shared service",
    });
  } else {
    for (const provider of data.providerHealth) {
      const state = provider.readinessState === "DISABLED" ? "DISABLED" : provider.operationalState;
      add({
        key: "provider-" + provider.id, label: provider.provider, state,
        detail: `${provider.failedCalls.toLocaleString()} failed of ${provider.attemptedCalls.toLocaleString()} attempted calls · ${provider.failureRatePct === null ? "rate not measured" : provider.failureRatePct.toFixed(1) + "%"}`,
        href: "/admin/providers", scope: "Shared service",
      });
      if (state === "NOT_READY" || state === "NO_RECENT_ACTIVITY") {
        gaps.push({
          key: "provider-evidence-" + provider.id, label: provider.provider, state: "UNKNOWN",
          detail: state === "NOT_READY" ? "Provider configuration is not ready." : "No recent provider calls to assess.",
          href: "/admin/providers", scope: "Shared service",
        });
      }
    }
  }

  const failedJobs = data.scheduledJobs.runs?.filter(run => run.outcome === "FAILED" || run.outcome === "DEGRADED") ?? [];
  if (failedJobs.length) {
    issues.push({
      key: "scheduled-jobs", label: "Background job executions", state: "DEGRADED",
      detail: `${failedJobs.length} failed or degraded in the latest recorded invocations; not evidence of missed schedules.`,
      href: "#scheduled-job-observations", scope: "Shared service",
    });
  } else if (isGap(data.scheduledJobs.state)) {
    gaps.push({
      key: "scheduled-jobs-unobserved", label: "Background jobs", state: data.scheduledJobs.state,
      detail: data.scheduledJobs.state === "UNKNOWN" ? "No invocations observed; scheduling uptime is not known." : "Job observations are unavailable.",
      href: "#scheduled-job-observations", scope: "Shared service",
    });
  }

  if (isGap(data.nativeApplicationHealth.state)) {
    gaps.push({
      key: "installed-apps", label: "Installed iOS and Android apps", state: data.nativeApplicationHealth.state,
      detail: "Reliable installed-app crash and device-health evidence is not configured.",
      href: "#shared-platform-heading", scope: "Shared service",
    });
  }

  issues.sort((a, b) => Number(b.state === "FAILING") - Number(a.state === "FAILING"));
  return { issues, gaps };
}

function SignalList({ signals, empty }: { signals: Signal[]; empty: string }) {
  if (!signals.length) return <p className="px-3 py-3 text-[12px] leading-5 text-[#64748B]">{empty}</p>;
  const shown = signals.slice(0, 3);
  return <div>
    <ul className="divide-y divide-[#E7ECF5]">
      {shown.map(signal => <li key={signal.key} className="min-w-0 px-3 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          {signal.href.startsWith("#")
            ? <span className="min-w-0 break-words text-[13px] font-semibold text-[#020617]">{signal.label}</span>
            : <Link href={signal.href} className="focus-ring min-w-0 break-words text-[13px] font-semibold text-[#004BB8] hover:underline">{signal.label} →</Link>}
          <OperationalStatus state={signal.state}/>
        </div>
        <p className="mt-1 text-[11px] text-[#64748B]">{signal.scope} · {signal.detail}</p>
      </li>)}
    </ul>
    {signals.length > shown.length ? <p className="border-t border-[#E7ECF5] px-3 py-2 text-[11px] text-[#64748B]">
      {signals.length - shown.length} more signal(s) in the detailed sections below.
    </p> : null}
  </div>;
}

export function PlatformHealthAttention({ data, application }: {
  data: PlatformOperations;
  application: PlatformSelection;
}) {
  const { issues, gaps } = summarizePlatformHealthAttention(data, application);
  return <section aria-labelledby="health-attention-heading" className="min-w-0 border-b border-[#D8E1EC] py-5">
    <div className="mb-3">
      <h2 id="health-attention-heading" className="text-[15px] font-semibold text-[#020617]">Health at a glance</h2>
      <p className="mt-1 text-[12px] leading-5 text-[#64748B]">Reported operational problems and missing monitoring evidence. Not an overall platform health score.</p>
    </div>
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <div className="min-w-0 overflow-hidden rounded-lg border border-[#D8E1EC] bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-[#E7ECF5] bg-slate-50 px-3 py-2.5">
          <h3 className="text-[13px] font-semibold text-[#020617]">Needs investigation</h3>
          <span className="text-[12px] tabular-nums text-[#475569]">{issues.length} signals</span>
        </div>
        <SignalList signals={issues} empty="No degraded or failing signals in available observations. This does not confirm full platform health."/>
      </div>
      <div className="min-w-0 overflow-hidden rounded-lg border border-[#D8E1EC] bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-[#E7ECF5] bg-slate-50 px-3 py-2.5">
          <h3 className="text-[13px] font-semibold text-[#020617]">Unknown or unavailable</h3>
          <span className="text-[12px] tabular-nums text-[#475569]">{gaps.length} signals</span>
        </div>
        <SignalList signals={gaps} empty="No gaps reported by these limited checks."/>
      </div>
    </div>
  </section>;
}
