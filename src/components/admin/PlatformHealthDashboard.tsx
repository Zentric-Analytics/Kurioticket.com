"use client";

import { useState } from "react";
import Link from "next/link";
import { OperationsSection } from "./TravelOperationsOverviewUI";
import { PlatformHealthFilters } from "./PlatformHealthFilters";
import { PlatformHealthRefresh } from "./PlatformHealthRefresh";
import { PlatformActivitySummary } from "./PlatformActivitySummary";
import { ScheduledJobObservations } from "./ScheduledJobObservations";
import { OperationalStatus } from "./OperationalStatus";
import { PlatformHealthAttention } from "./PlatformHealthAttention";
import { formatAdminTimeZoneLabel, formatViewerTimestamp } from "@/lib/adminLocalTime";
import { applicationLabel, searchInvestigationHref, type PlatformSelection } from "@/lib/platformHealthPresentation";
import type { readPlatformOperations } from "@/services/platformOperationsService";
export type PlatformOperations = Awaited<ReturnType<typeof readPlatformOperations>>;
function ServiceSignal({ title, state, children, href, linkLabel }: {
    title: string;
    state: string;
    children: React.ReactNode;
    href?: string;
    linkLabel?: string;
}) {
    return <section className="min-w-0 border-b border-[#E7ECF5] bg-white px-2 py-4 sm:px-3">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-[#020617]">{title}</h3>
        <OperationalStatus state={state}/>
      </div>
      <div className="mt-2 min-w-0 break-words text-[12px] leading-5 text-[#64748B]">{children}</div>
      {href ? <Link href={href} className="focus-ring mt-3 inline-block rounded-sm text-[12px] font-semibold text-[#004BB8] hover:underline">{linkLabel ?? `Investigate ${title.toLowerCase()}`} →</Link> : null}
    </section>;
}
export function PlatformHealthDashboard({ data: initialData, hours, period, application }: {
    data: PlatformOperations;
    hours: number;
    period: "today" | "rolling";
    application: PlatformSelection;
}) {
    const [localSnapshot, setLocalSnapshot] = useState<{ origin: PlatformOperations; value: PlatformOperations }>({ origin: initialData, value: initialData });
    // A later server view with the same filters must replace stale client observations.
    const data = localSnapshot.origin === initialData ? localSnapshot.value : initialData;
    const acceptRefresh = (fresh: PlatformOperations) => setLocalSnapshot({ origin: initialData, value: fresh });
    const activity = data.activity.data;
    const { timeZone } = data;
    const timeZoneLabel = formatAdminTimeZoneLabel(timeZone, new Date(data.window.to));
    const measures = [{ key: "searches", label: "Search operations", href: searchInvestigationHref(data.window, application), linkLabel: "Investigate searches" }, { key: "providerCalls", label: "Provider calls", href: "/admin/providers", linkLabel: "Investigate shared providers" }, { key: "handoffs", label: "Referral handoffs", href: "/admin/redirects?" + new URLSearchParams({ environment: data.environment, from: data.window.from, to: data.window.to }), linkLabel: "Investigate handoffs (all applications)" }] as const;
    return <div className="mx-auto w-full min-w-0 max-w-[1500px] bg-white text-[#020617]" data-platform-health>
  <header className="border-b border-[#D8E1EC] pb-4 pt-1">
    <h1 className="text-[20px] font-semibold leading-7 tracking-[-0.02em] text-[#020617]">Platform Health</h1>
  </header>
  <div className="flex min-w-0 flex-wrap items-end justify-between gap-3 border-b border-[#D8E1EC] py-4">
    <div className="min-w-0 flex-1"><PlatformHealthFilters hours={hours} period={period} application={application} timeZoneLabel={timeZoneLabel}/></div>
    <PlatformHealthRefresh hours={hours} period={period} timeZone={timeZone} lastRefreshedAt={data.window.to} onRefreshed={acceptRefresh} />
  </div>
  <PlatformHealthAttention data={data} application={application}/>
  <OperationsSection className="py-5" >
    <div className="mb-4 min-w-0">
      <h2 id="platform-activity-heading" className="text-[14px] font-semibold text-[#020617]">{applicationLabel(application)} activity</h2>
      <p className="mt-1 break-words text-[12px] leading-5 text-[#64748B]">
        Window: <time dateTime={data.window.from}>{formatViewerTimestamp(data.window.from, timeZone)}</time> to <time dateTime={data.window.to}>{formatViewerTimestamp(data.window.to, timeZone)}</time>
      </p>
      <p className="mt-1 text-[12px] leading-5 text-[#64748B]">Separate operational measures, not bookings or customers. Legacy UNKNOWN records appear as Unverified; they are not assumed to be bots.</p>
      <p className="mt-2 text-[12px] leading-5 text-[#475569]" data-verified-bot-searches>
        Verified Bots recorded as searches: <strong className="font-semibold text-[#020617]">{data.botSearches === null ? "Unavailable" : data.botSearches}</strong> · Included in All Platforms; nearby-date lookups are not separate searches.
      </p>
    </div>
    <div role="region" tabIndex={0} aria-label="Platform activity metrics" className="w-full min-w-0 overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
      <div className="grid min-w-[780px] grid-cols-3 gap-px border-y border-[#D8E1EC] bg-[#E7ECF5]">
        {measures.map(measure => <PlatformActivitySummary key={measure.key} label={measure.label} value={activity ? (application === "ALL" ? activity[measure.key].combined : activity[measure.key].applications[application]) : null} href={measure.href} linkLabel={measure.linkLabel}/>)}
      </div>
    </div>
  </OperationsSection>
  <OperationsSection className="py-5" ><h2 id="shared-platform-heading" className="text-[14px] font-semibold text-[#020617]">Shared services</h2><p className="mt-1 text-[12px] leading-5 text-[#64748B]">Shared across applications; the application selector does not filter them.</p><div className="mt-3 grid min-w-0 gap-x-6 md:grid-cols-2 xl:grid-cols-3">
   <ServiceSignal title="Database" state={data.database.state} href="/admin/system">Current database connectivity; not an uptime history.</ServiceSignal>
   <ServiceSignal title="Email delivery" state={data.email.state} href="/admin/email-delivery">Own last 24 hours.{"deliveries" in data.email ? <dl className="mt-2 grid grid-cols-3 gap-2">{[["Deliveries", data.email.deliveries], ["Failed", data.email.failures], ["Delayed", data.email.delayed]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl> : <p>Delivery observations are unavailable.</p>}</ServiceSignal>
   <ServiceSignal title="CMS" state={data.cms.state} href="/admin/system/cms-health">Publication scope checks.{data.cms.totals ? <p className="mt-2">{data.cms.totals.scopes} scopes · {data.cms.totals.unhealthy} unhealthy</p> : <p>CMS observations are unavailable.</p>}<span className="sr-only">No installed-client content-consumption acknowledgment is collected.</span></ServiceSignal>
   <ServiceSignal title="Operational alerts" state={data.alerts ? "UNKNOWN" : "MONITORING_UNAVAILABLE"} href="/admin/notifications">Recorded alert occurrences.{data.alerts ? <p className="mt-2">{data.alerts.critical} critical · {data.alerts.warning} warning</p> : <p>Alert counts are unavailable.</p>}<span className="sr-only">Alert counts alone do not establish overall platform health.</span></ServiceSignal>
   <ServiceSignal title="Preview release" state="UNKNOWN" href="/admin/system">{data.release ? <><p>Service version {data.release.applicationVersion ?? "not recorded"}</p><p className="mt-1 break-all">Commit {data.release.commitSha ?? "not recorded"}</p><p>Process started {formatViewerTimestamp(data.release.releaseTimestamp, timeZone)}</p><p>Sandbox: {data.release.sandboxTravelSafe ? "ready" : "not ready"} · Email: restricted</p></> : <p>No Preview release evidence in this environment.</p>}<span className="sr-only">Release data does not verify installed-app versions.</span></ServiceSignal>
   <ServiceSignal title="Installed native applications" state={data.nativeApplicationHealth.state}
     href="/admin/platforms/devices" linkLabel="View Platform Metrics">
     No reliable installed-app crash evidence is configured.
   </ServiceSignal>
  </div></OperationsSection>
  <OperationsSection className="py-5"><div className="flex flex-wrap justify-between gap-2"><h2 className="text-[14px] font-semibold text-[#020617]">Provider operational status</h2><Link href="/admin/providers" className="focus-ring text-xs font-semibold text-[#004BB8]">Open Providers →</Link></div><p className="mt-1 text-[12px] text-[#64748B]">Shared providers · {period === "today" ? "Today" : "Last " + hours + " hours"} · {data.environment}</p>
   {data.providerHealth?.length ? <div className="mt-3 divide-y divide-[#E7ECF5]">{data.providerHealth.map(provider => <div key={provider.id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row"><div><h3 className="text-sm font-semibold text-slate-900">{provider.provider}</h3><p className="mt-1 text-xs text-slate-500">{provider.totalCalls} calls · {provider.failedCalls} failed · failure rate {provider.failureRatePct === null ? "not measured" : provider.failureRatePct.toFixed(1) + "%"} · average {provider.averageLatencyMs === null ? "not measured" : provider.averageLatencyMs + " ms"}</p><p className="mt-1 text-xs text-slate-500">Readiness: {provider.readinessState.replaceAll("_", " ").toLowerCase()}</p></div><div><OperationalStatus state={provider.readinessState === "DISABLED" ? "DISABLED" : provider.operationalState}/></div></div>)}</div> : <p role="status" className="mt-4 text-sm text-slate-600">Provider monitoring is {data.providerHealth ? "unknown: no observations returned" : "unavailable"}.</p>}
  </OperationsSection>
  <ScheduledJobObservations state={data.scheduledJobs.state} runs={data.scheduledJobs.runs} timeZone={timeZone}/>
  <aside className="border-t border-[#D8E1EC] bg-white py-4 text-[12px] leading-5 text-[#64748B]"><h2 className="font-semibold text-slate-900">Shared controls &amp; content</h2><p className="mt-1">Controls and content are managed in their dedicated pages.</p><div className="mt-2 flex flex-wrap gap-x-5 gap-y-2"><Link className="focus-ring font-semibold text-[#004BB8]" href="/admin/settings">Feature controls →</Link><Link className="focus-ring font-semibold text-[#004BB8]" href="/admin/content">Shared CMS publication →</Link><Link className="focus-ring font-semibold text-[#004BB8]" href="/admin/logs">Audit logs →</Link></div></aside>
 </div>;
}
