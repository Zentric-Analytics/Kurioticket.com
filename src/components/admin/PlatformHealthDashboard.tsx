import Link from "next/link";
import { AdminSectionCard } from "./AdminPageShell";
import { PlatformHealthFilters } from "./PlatformHealthFilters";
import { PlatformHealthRefresh } from "./PlatformHealthRefresh";
import { PlatformActivitySummary } from "./PlatformActivitySummary";
import { ScheduledJobObservations } from "./ScheduledJobObservations";
import { OperationalStatus } from "./OperationalStatus";
import { applicationLabel, searchInvestigationHref, type PlatformSelection } from "@/lib/platformHealthPresentation";
import type { readPlatformOperations } from "@/services/platformOperationsService";
export type PlatformOperations = Awaited<ReturnType<typeof readPlatformOperations>>;
function ServiceSignal({ title, state, children, href }: {
    title: string;
    state: string;
    children: React.ReactNode;
    href: string;
}) {
    return <AdminSectionCard className="min-w-0 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-950">{title}</h3><OperationalStatus state={state}/></div><div className="mt-3 text-xs leading-5 text-slate-600">{children}</div><Link href={href} className="focus-ring mt-4 inline-block rounded text-xs font-semibold text-[#004BB8] hover:underline">Investigate {title.toLowerCase()} →</Link></AdminSectionCard>;
}
export function PlatformHealthDashboard({ data, hours, application }: {
    data: PlatformOperations;
    hours: number;
    application: PlatformSelection;
}) {
    const activity = data.activity.data;
    const measures = [{ key: "searches", label: "Search operations", href: searchInvestigationHref(data.window, application), linkLabel: "Investigate searches" }, { key: "providerCalls", label: "Provider calls", href: "/admin/providers", linkLabel: "Investigate shared providers" }, { key: "handoffs", label: "Referral handoffs", href: "/admin/redirects?" + new URLSearchParams({ environment: data.environment, from: data.window.from, to: data.window.to }), linkLabel: "Investigate handoffs (all applications)" }] as const;
    return <div className="min-w-0 space-y-6" data-platform-health>
  <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start"><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-widest text-[#004BB8]">Unified operations · {data.environment}</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Platform Health</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Backend observations across Kurioticket. Each signal retains its source, window and scope.</p></div><PlatformHealthRefresh /></header>
  <div className="rounded-xl border border-slate-200 bg-white p-4"><PlatformHealthFilters hours={hours} application={application}/></div>
  <section aria-labelledby="platform-activity-heading" className="min-w-0"><div className="mb-4"><h2 id="platform-activity-heading" className="text-base font-semibold text-slate-950">{applicationLabel(application)} activity</h2><p className="mt-1 break-words text-xs leading-5 text-slate-500">{data.window.from} to {data.window.to} · UTC · Last observed <time dateTime={data.window.to}>{data.window.to}</time></p><p className="mt-1 text-xs leading-5 text-slate-500">SearchHistory, ApiProviderLog and RedirectLog. These are distinct measures; they are not added into customers, bookings or revenue. Missing environment attribution is excluded; ambiguous source within this environment is Unknown. Native source reflects a validated session declaration, not device attestation.</p></div>
   <div className="grid min-w-0 gap-4 xl:grid-cols-3">{measures.map(measure => <PlatformActivitySummary key={measure.key} label={measure.label} value={activity ? (application === "ALL" ? activity[measure.key].combined : activity[measure.key].applications[application]) : null} href={measure.href} linkLabel={measure.linkLabel}/>)}</div>
  </section>
  <section aria-labelledby="shared-platform-heading" className="min-w-0"><h2 id="shared-platform-heading" className="text-base font-semibold text-slate-950">Shared services</h2><p className="mt-1 text-xs leading-5 text-slate-500">These signals are shared across applications. The application selector does not filter them.</p><div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
   <ServiceSignal title="Database" state={data.database.state} href="/admin/system">Current backend database readiness from the existing System reader. This is not a historical uptime measurement.</ServiceSignal>
   <ServiceSignal title="Email delivery" state={data.email.state} href="/admin/email-delivery">Own last 24 hours · existing email delivery monitor.{"deliveries" in data.email ? <dl className="mt-2 grid grid-cols-3 gap-2">{[["Deliveries", data.email.deliveries], ["Failed", data.email.failures], ["Delayed", data.email.delayed]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl> : <p>Delivery observations are unavailable.</p>}</ServiceSignal>
   <ServiceSignal title="CMS" state={data.cms.state} href="/admin/system/cms-health">Existing shared publication scopes and integrity checks.{data.cms.totals ? <p className="mt-2">{data.cms.totals.scopes} scopes · {data.cms.totals.unhealthy} unhealthy</p> : <p>CMS observations are unavailable.</p>}<p>No installed-client content-consumption acknowledgment is collected.</p></ServiceSignal>
   <ServiceSignal title="Operational alerts" state={data.alerts ? "UNKNOWN" : "MONITORING_UNAVAILABLE"} href="/admin/notifications">Existing occurrences and acknowledgment rules.{data.alerts ? <p className="mt-2">{data.alerts.critical} critical · {data.alerts.warning} warning</p> : <p>Alert counts are unavailable.</p>} Counts alone do not establish overall platform health.</ServiceSignal>
   <ServiceSignal title="Preview release" state="UNKNOWN" href="/admin/system">{data.release ? <><p>Configured service identity · version {data.release.applicationVersion ?? "not recorded"}</p><p className="mt-1 break-all">Commit {data.release.commitSha ?? "not recorded"}</p><p>Process started {data.release.releaseTimestamp}</p><p>Sandbox policy {data.release.sandboxTravelSafe ? "ready" : "not ready"}; email policy restricted.</p></> : <p>No Preview release evidence in this environment.</p>}<p>This is not an installed-app version inventory or a new deployment verification.</p></ServiceSignal>
   <ServiceSignal title="Installed native applications" state={data.nativeApplicationHealth.state} href="/admin/platform-health">No reliable installed-app crash evidence is configured. Successful iOS/Android-attributed API operations do not prove crash-free installed applications.</ServiceSignal>
  </div></section>
  <AdminSectionCard className="min-w-0 p-5"><div className="flex flex-wrap justify-between gap-2"><h2 className="text-sm font-semibold text-slate-950">Provider operational status</h2><Link href="/admin/providers" className="focus-ring text-xs font-semibold text-[#004BB8]">Open Providers →</Link></div><p className="mt-2 text-xs text-slate-500">Shared provider executions · last {hours} hours · {data.environment} · existing provider reader.</p>
   {data.providerHealth?.length ? <div className="mt-4 divide-y divide-slate-100">{data.providerHealth.map(provider => <div key={provider.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row"><div><h3 className="text-sm font-semibold text-slate-900">{provider.provider}</h3><p className="mt-1 text-xs text-slate-500">{provider.totalCalls} calls · {provider.failedCalls} failed · failure rate {provider.failureRatePct === null ? "not measured" : provider.failureRatePct.toFixed(1) + "%"} · average {provider.averageLatencyMs === null ? "not measured" : provider.averageLatencyMs + " ms"}</p><p className="mt-1 text-xs text-slate-500">Readiness: {provider.readinessState.replaceAll("_", " ").toLowerCase()}</p></div><div><OperationalStatus state={provider.readinessState === "DISABLED" ? "DISABLED" : provider.operationalState}/></div></div>)}</div> : <p role="status" className="mt-4 text-sm text-slate-600">Provider monitoring is {data.providerHealth ? "unknown: no observations returned" : "unavailable"}.</p>}
  </AdminSectionCard>
  <ScheduledJobObservations state={data.scheduledJobs.state} runs={data.scheduledJobs.runs}/>
  <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600"><h2 className="font-semibold text-slate-900">Shared controls &amp; content</h2><p className="mt-1">Feature controls apply at the shared backend in {data.environment}; search availability and scheduled price processing keep their existing safeguards.</p><div className="mt-2 flex flex-wrap gap-x-5 gap-y-2"><Link className="focus-ring font-semibold text-[#004BB8]" href="/admin/settings">Feature controls →</Link><Link className="focus-ring font-semibold text-[#004BB8]" href="/admin/content">Shared CMS publication →</Link><Link className="focus-ring font-semibold text-[#004BB8]" href="/admin/logs">Audit logs →</Link></div></aside>
 </div>;
}
