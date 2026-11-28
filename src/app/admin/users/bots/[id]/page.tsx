import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { BotReportFilters } from "@/components/admin/BotReportFilters";
import { BOT_DECISIONS, BOT_DIRECTORY, BOT_KINDS, botRecordedAccess, botDirectoryHref, botDirectoryTime, botFilters, botLabel, botName, botTime, botType, botVerification, type BotQuery } from "@/lib/adminBotReport";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { searchActivityReturnHref } from "@/lib/adminSearchActivityNavigation";
import { readBotDetails } from "@/services/adminBotReportService";
import { RequestEvidence } from "./request-evidence";
import { BotIcon, ReportPagination, ReportUnavailable, reportHead, reportLink, reportPanel, reportRow } from "../report-ui";

function Fields({ entries, threeColumns = false }: { entries: [string, ReactNode][]; threeColumns?: boolean }) {
  return <dl className={"grid gap-x-4 gap-y-3 sm:gap-x-6 " + (threeColumns ? "grid-cols-2 md:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>
    {entries.map(([label, value]) => <div key={label} className="min-w-0">
      <dt className="text-xs text-slate-600">{label}</dt>
      <dd className="mt-0.5 wrap-anywhere text-sm text-slate-950">{value ?? "—"}</dd>
    </div>)}
  </dl>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className={reportPanel + " space-y-4 p-4 sm:p-5"}>
    <h2 className="text-base font-semibold text-slate-950">{title}</h2>
    {children}
  </section>;
}

const activityColumns = ["Time (UTC)", "Activity", "Decision", "Outcome / Evidence", "Action"];
const numberFormat = new Intl.NumberFormat("en-US");
const decisionStyles: Record<string, string> = {
  ALLOWED: "bg-emerald-50 text-emerald-800",
  DENIED: "bg-rose-50 text-rose-800",
  RATE_LIMITED: "bg-amber-50 text-amber-900",
};

function responseOutcome(status: number | null) {
  if (status === null) return "—";
  if (status === 304) return "Resource unchanged";
  if (status === 404) return "Resource not found";
  if (status === 429) return "Too many requests";
  if (status >= 500) return "Server error";
  if (status >= 400) return "Client error";
  if (status >= 300) return "Redirected";
  return "Response sent";
}

function ActivityCell({ column, children }: { column: string; children: ReactNode }) {
  return <td role="cell" className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-2 md:table-cell">
    <span aria-hidden="true" className="text-xs font-medium text-slate-600 md:hidden">{column}</span>
    <div className="min-w-0">{children}</div>
  </td>;
}

export default async function BotDetailsPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<BotQuery>;
}) {
  const [{ id }, raw] = await Promise.all([params, searchParams]);
  const directory = typeof raw.directory === "string" && raw.directory.length <= 2048 ? raw.directory : "";
  const back = directory ? botDirectoryHref(botFilters(Object.fromEntries(new URLSearchParams(directory)))) : BOT_DIRECTORY;
  const report = await readBotDetails(id, raw);
  if (report.state === "missing") notFound();
  const backLink = <Link prefetch={false} href={back} className={reportLink + " inline-flex items-center gap-2 text-[13px]"}>
    <ArrowLeft size={15} aria-hidden="true" /> Back to Bot Management
  </Link>;
  if (report.state === "unavailable") return <div className="space-y-3">{backLink}<ReportUnavailable /></div>;

  const { bot, countries, filters } = report;
  const activityParams = new URLSearchParams(Object.entries({
    directory, range: filters.range, from: filters.from, to: filters.to,
    kind: filters.kind ?? "", decision: filters.decision ?? "",
  }).filter(([, value]) => value));
  const botSearchesHref = searchActivityReturnHref({ identity: "bot", botId: bot.id,
    range: filters.range, from: filters.from, to: filters.to });
  const searchHref = (searchId: string) => "/admin/searches/" + encodeURIComponent(searchId) + "?environment=" + getPublicEnvironment();
  const category = bot.group === "SEARCH_ENGINE" ? "Search engine"
    : bot.group === "OTHER_RECOGNIZED" ? "Other recognized" : "Unknown";
  const metrics = [
    { label: "Total Requests", value: report.requestSummary?.requests },
    { label: "Allowed Requests", value: report.requestSummary?.allowed },
    { label: "Denied Requests", value: report.requestSummary?.denied },
    { label: "Search Attempts", value: report.requestSummary?.searchAttempts },
    { label: "Searches Dispatched", value: report.requestSummary?.searches },
    { label: "Actual Searches", value: report.summaryActual },
  ];

  return <div className="min-w-0 space-y-4">
    <header className="space-y-3">
      {backLink}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <BotIcon />
          <div className="min-w-0">
            <h1 className="wrap-anywhere text-xl font-semibold text-slate-950">{botName(bot)}</h1>
            <p className="text-[13px] text-slate-600">{botType(bot)} · {report.reportVerification} · {botRecordedAccess(bot)}</p>
          </div>
        </div>
      </div>
    </header>
    <Section title="Bot Information">
      <Fields threeColumns entries={[
        ["Owner", bot.owner],
        ["Category", category],
        ["Country", countries.length ? <span title="Countries observed in recorded requests and searches for this bot name">{countries.join(", ")}</span> : null],
        ["First seen (UTC)", <time key="first-seen" dateTime={bot.firstSeen.toISOString()} title={botTime(bot.firstSeen)}>{botDirectoryTime(bot.firstSeen)}</time>],
        ["Last seen (UTC)", <time key="last-seen" dateTime={bot.lastSeen.toISOString()} title={botTime(bot.lastSeen)}>{botDirectoryTime(bot.lastSeen)}</time>],
      ]} />
    </Section>
    <BotReportFilters filters={filters} now={report.now.toISOString()} history details={{
      sectionClassName: reportPanel + " space-y-3 p-4 sm:p-5",
      summary: <>
        <dl className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {metrics.map(({ label, value }) => <div key={label} className={reportPanel + " min-w-0 px-3 py-2"}>
            <dt className="text-xs font-medium text-slate-600">{label}</dt>
            <dd className="mt-1 wrap-anywhere text-xl font-semibold tabular-nums text-slate-950">
              {value == null ? <span className="text-sm font-medium">Not tracked</span> : numberFormat.format(value)}
            </dd>
          </div>)}
        </dl>
        {report.requestSummary === null && filters.window !== null &&
          <p className="text-xs text-slate-600">Request history may be incomplete outside the 90-day retention period.</p>}
        <div className="flex justify-end">
          <Link prefetch={false} href={botSearchesHref} className={reportLink + " text-xs"}>Open in Search Activity <span aria-hidden="true">→</span></Link>
        </div>
      </>,
      history: <>
        {report.total !== null && <div className={reportPanel}>
        <table role="table" aria-label="Bot request activity" className="block w-full text-left text-[13px] text-slate-700 md:table">
          <thead role="rowgroup" className={reportHead + " sr-only md:not-sr-only"}>
            <tr role="row">{activityColumns.map(column => <th role="columnheader" scope="col" key={column}>{column}</th>)}</tr>
          </thead>
          <tbody role="rowgroup" className="block md:table-row-group">
            {report.events.map(event => {
              const decision = BOT_DECISIONS.find(item => item.value === event.decision)?.label ?? botLabel(event.decision);
              const outcome = event.search ? "Search " + botLabel(event.search.status).toLowerCase()
                : event.executionOutcome ? botLabel(event.executionOutcome)
                : responseOutcome(event.responseStatus);
              return <tr key={event.id} role="row" className={reportRow + " block space-y-2 p-3 align-top max-md:[&>td]:p-0 md:table-row md:space-y-0 md:p-0"}>
                <ActivityCell column={activityColumns[0]}>
                  <time dateTime={event.timestamp.toISOString()} className="tabular-nums">{botTime(event.timestamp)}</time>
                </ActivityCell>
                <ActivityCell column={activityColumns[1]}>
                  <span className="font-medium text-slate-950">{BOT_KINDS.find(item => item.value === event.kind)?.label ?? botLabel(event.kind)}</span>
                </ActivityCell>
                <ActivityCell column={activityColumns[2]}>
                  <span className={"inline-block rounded-full px-2 py-0.5 text-xs font-medium " + (decisionStyles[event.decision] ?? "bg-slate-100 text-slate-700")}>{decision}</span>
                </ActivityCell>
                <ActivityCell column={activityColumns[3]}>{outcome}</ActivityCell>
                <ActivityCell column={activityColumns[4]}>
                  <RequestEvidence>
                    <Fields entries={[
                      ["Request ID", event.id], ["Recorded path", event.endpoint], ["HTTP method", event.method],
                      ["Request timestamp (UTC)", botTime(event.timestamp)], ["Bot reference ID", bot.id],
                      ["IP address", event.ip], ["Country", event.country], ["Declared bot identity", event.declaredName],
                      ...(event.search ? [
                        ["IP address (linked search)", event.search.network.ipAddress],
                        ["Country (linked search)", event.search.network.countryCode],
                      ] as [string, ReactNode][] : []),
                      ["Network ASN", event.networkAsn ? "AS" + event.networkAsn : null], ["Network organization", event.networkOrganization],
                      ["Network evidence source", event.networkSource ? botLabel(event.networkSource) : null], ["Cloudflare Ray ID", event.edgeRay],
                      ["Render request ID", event.renderRequestId],
                      ...(event.reportedIp || event.reportedCountry ? [
                        ["Reported IP (not authenticated)", event.reportedIp],
                        ["Reported country (not authenticated)", event.reportedCountry],
                      ] as [string, ReactNode][] : []),
                      ...(event.renderLogIp || event.renderLogCountry ? [
                        ["IP address from Render log", event.renderLogIp],
                        ["Country estimate from logged IP", event.renderLogCountry],
                        ["Render log time (UTC)", event.renderLogTimestamp && botTime(event.renderLogTimestamp)],
                        ["Evidence recovered (UTC)", event.renderLogRecoveredAt && botTime(event.renderLogRecoveredAt)],
                        ["Retrospective identity evidence", event.renderLogCorroboration ? botLabel(event.renderLogCorroboration) : "Not confirmed"],
                      ] as [string, ReactNode][] : []),
                      ["Recorded User-Agent token", event.userAgent],
                      ["Recorded verification status", botVerification(event.verification)],
                      ["Verification evidence", event.evidence ? botLabel(event.evidence) : null],
                      ...(event.networkEvidence ? [
                        ["Network check", event.networkEvidence.label],
                        ["Network check basis", event.networkEvidence.detail],
                      ] as [string, ReactNode][] : []),
                      ["Access decision", decision], ["Reason", botLabel(event.reason)], ["HTTP response status", event.responseStatus],
                      ["Search dispatch (UTC)", event.dispatchedAt && botTime(event.dispatchedAt)],
                      ["Search outcome", event.search ? botLabel(event.search.status) + " · " + event.search.resultCount + " results"
                        : event.executionOutcome ? botLabel(event.executionOutcome) : null],
                      ["Request duration", event.durationMs === null ? null : event.durationMs + " ms"],
                      ["Related recorded search", event.search ? <Link className={reportLink} prefetch={false}
                        href={searchHref(event.search.id)}>View search record</Link> : null],
                      ["Related provider calls", event.providers.length ? <ul className="space-y-1">
                        {event.providers.map(provider => <li key={provider.id}>{provider.provider} · {provider.service} · {botLabel(provider.status)}</li>)}
                      </ul> : null],
                    ]} />
                  </RequestEvidence>
                </ActivityCell>
              </tr>;
            })}
            {report.total === 0 && <tr role="row" className="block md:table-row"><td role="cell" colSpan={5} className="block px-3 py-5 md:table-cell">No recorded requests match your filters.</td></tr>}
          </tbody>
        </table>
        {report.total > 0 && <ReportPagination path={BOT_DIRECTORY + "/" + bot.id} params={activityParams}
          page={report.page} total={report.total} label="Bot activity" />}
      </div>}
      </>,
    }} />
  </div>;
}
