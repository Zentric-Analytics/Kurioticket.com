import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { BotReportFilters } from "@/components/admin/BotReportFilters";
import { BOT_DECISIONS, BOT_DIRECTORY, BOT_KINDS, botRecordedAccess, botDirectoryHref, botDirectoryTime, botFilters, botLabel, botName, botTime, botType, botRecordedVerification, type BotQuery } from "@/lib/adminBotReport";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { readBotDetails } from "@/services/adminBotReportService";
import { historicalVerificationLabel } from "@/services/adminBotHistory";
import { BOT_DAILY_SEARCH_LIMIT, BOT_SEARCH_COOLDOWN_MS } from "@/services/botActivityStore";
import { BotIcon, Metrics, ReportPagination, ReportUnavailable, reportHead, reportLink, reportPanel, reportRow } from "../report-ui";

function Fields({ entries, threeColumns = false }: { entries: [string, ReactNode][]; threeColumns?: boolean }) {
  return <dl className={"grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2" + (threeColumns ? " lg:grid-cols-3" : "")}>
    {entries.map(([label, value]) => <div key={label} className="min-w-0">
      <dt className="text-xs text-slate-600">{label}</dt>
      <dd className="mt-0.5 break-words text-[13px] text-slate-950">{value ?? "Not recorded"}</dd>
    </div>)}
  </dl>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className={reportPanel + " space-y-3 p-4"}>
    <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
    {children}
  </section>;
}

function observed(values: (string | null)[]) {
  return [...new Set(values.filter(Boolean))].join(", ") || "Not recorded";
}

const activityColumns = ["Time (UTC)", "Activity / Endpoint", "Decision", "Outcome / Evidence"];

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

  const { bot, observations, quota, filters, searchEvidence, relatedEvidence } = report;
  const ipValues = [
    ...observations.map(row => row.ip ?? (row.renderLogIp ? row.renderLogIp + " (Render log)" : null)),
    ...searchEvidence.map(row => row.ipAddress ? row.ipAddress + " (search history)" : null),
  ];
  const countryValues = [
    ...observations.map(row => row.country ?? (row.renderLogCountry ? row.renderLogCountry + " (IP estimate)" : null)),
    ...searchEvidence.map(row => row.countryCode ? row.countryCode + " (search history)" : null),
  ];
  const relatedIps = relatedEvidence?.observations.map(row => row.ipAddress).filter(Boolean) ?? [];
  const relatedCountries = relatedEvidence?.observations.map(row => row.countryCode).filter(Boolean) ?? [];
  function evidenceField(values: (string | null)[], related: (string | null)[]) {
    return <div className="space-y-1">
      <p>{observed(values)}</p>
      {related.length > 0 && <p className="text-xs text-slate-600">
        Separate verified identity (search history): {observed(related)}
      </p>}
    </div>;
  }
  const cooldownMinutes = BOT_SEARCH_COOLDOWN_MS / 60_000;
  const activityParams = new URLSearchParams(Object.entries({
    directory, range: filters.range, from: filters.from, to: filters.to,
    kind: filters.kind ?? "", decision: filters.decision ?? "",
  }).filter(([, value]) => value));
  return <div className="min-w-0 space-y-3">
    <header className="space-y-3">
      {backLink}
      <div className="flex items-center gap-3">
        <BotIcon />
        <div>
          <h1 className="text-xl font-semibold text-slate-950">{botName(bot)}</h1>
          <p className="text-[13px] text-slate-600">{botType(bot)} · {botRecordedVerification(bot)} · {botRecordedAccess(bot)}</p>
        </div>
      </div>
    </header>
    <Section title="Bot Information">
      <Fields threeColumns entries={[
        ["Owner", bot.owner],
        ["Category", botType(bot)],
        ["Verification status", botRecordedVerification(bot)],
        ["IP addresses", evidenceField(ipValues, relatedIps)],
        ["Countries", evidenceField(countryValues, relatedCountries)],
        ["First seen (UTC)", <span key="first-seen" title={botTime(bot.firstSeen)}>{botDirectoryTime(bot.firstSeen)}</span>],
        ["Last seen (UTC)", <span key="last-seen" title={botTime(bot.lastSeen)}>{botDirectoryTime(bot.lastSeen)}</span>],
      ]} />
      <p className="text-xs text-slate-600">Network summary uses up to 20 recent evidence-bearing requests and 20 saved searches for this identity. Search history and Render logs are recorded evidence, not proof of the latest caller.</p>
      {relatedEvidence && (relatedIps.length > 0 || relatedCountries.length > 0) && <p className="text-xs text-slate-600">
        The separately verified identity shares this declared name but does not authenticate this record.{" "}
        <Link prefetch={false} className={reportLink} href={BOT_DIRECTORY + "/" + relatedEvidence.id + "?range=all"}>View verified identity history</Link>.
      </p>}
      {bot.group === "UNKNOWN" && <p className="text-xs text-slate-600">This reference groups observations that may come from multiple clients.</p>}
    </Section>
    <Section title="Activity Summary">
      <p className="text-xs text-slate-600">Lifetime registry totals</p>
      <Metrics labels={["Total requests", "Allowed requests", "Denied requests", "Rate-limited requests", "Search attempts", "Searches dispatched", "Policy violations"]}
        values={[bot.requests, bot.allowed, bot.denied, bot.rateLimited, bot.searchAttempts, bot.searches, bot.violations]} />
      <div className="border-t border-[#D8E1EC] pt-3">
        <Metrics labels={["Actual searches (all recorded time)", "Historical searches without activity link"]} values={[report.actual, report.historicalActual]} />
      </div>
    </Section>
    {quota && <Section title="Search Allowance">
      <Fields entries={[
        ["Daily search limit", BOT_DAILY_SEARCH_LIMIT], ["Searches used today (UTC)", quota.used],
        ["Remaining allowance", quota.remaining], ["Minimum search interval", cooldownMinutes + " minutes"],
        ["Last search dispatch (UTC)", botTime(quota.last)], ["Next permitted search time (UTC)", botTime(quota.next)],
      ]} />
      <progress aria-label="Daily search allowance used" className="block h-2 w-full max-w-64 accent-[#004BB8]" max={BOT_DAILY_SEARCH_LIMIT} value={quota.used} />
      <p className="text-xs text-slate-600">Flights, Hotels, Cars and Packages share the allowance. It resets at midnight UTC and the cooldown continues across midnight.</p>
    </Section>}
    <Section title="Activity History">
      <p className="text-xs text-slate-600">Retained requests and recorded historical searches, newest first. Older searches without an activity record do not establish access decisions, HTTP status or provider dispatch. Detailed request retention still applies.</p>
      <BotReportFilters filters={filters} now={new Date().toISOString()} history />
      {report.total !== null && <div className={reportPanel}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px] text-slate-700">
            <thead className={reportHead}><tr>{activityColumns.map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead>
            <tbody>
              {report.events.map(event => {
                if (event.source === "search") return <tr key={"search:" + event.id} className={reportRow + " align-top"}>
                  <td className="whitespace-nowrap tabular-nums">{botTime(event.timestamp)}</td>
                  <td>
                    <p className="font-medium text-slate-950">Historical search</p>
                    <p>{botLabel(event.product)}</p>
                  </td>
                  <td>Not recorded</td>
                  <td className="w-2/5">
                    <p>{botLabel(event.status)} · {event.resultCount} results</p>
                    <details className="mt-1">
                      <summary className={reportLink + " cursor-pointer"}>View evidence</summary>
                      <div className="mt-3">
                        <Fields entries={[
                          ["Bot reference ID", bot.id], ["Search request reference", event.requestId],
                          ["IP address (search history)", event.ipAddress], ["Country (search history)", event.countryCode],
                          ["Recorded verification", historicalVerificationLabel(event.evidence)],
                          ["Related recorded search", <Link key={event.id} className={reportLink} prefetch={false}
                            href={"/admin/searches/" + encodeURIComponent(event.id) + "?environment=" + getPublicEnvironment()}>View search record</Link>],
                        ]} />
                      </div>
                    </details>
                  </td>
                </tr>;
                const decision = BOT_DECISIONS.find(item => item.value === event.decision)?.label ?? botLabel(event.decision);
                return <tr key={"activity:" + event.id} className={reportRow + " align-top"}>
                  <td className="whitespace-nowrap tabular-nums">{botTime(event.timestamp)}</td>
                  <td>
                    <p className="font-medium text-slate-950">{BOT_KINDS.find(item => item.value === event.kind)?.label ?? botLabel(event.kind)}</p>
                    <code className="break-all text-xs">{event.endpoint}</code>
                  </td>
                  <td className={event.decision === "DENIED" || event.decision === "RATE_LIMITED" ? "text-rose-700" : undefined}>{decision}</td>
                  <td className="w-2/5">
                    <p>{event.search ? botLabel(event.search.status) : event.executionOutcome ? botLabel(event.executionOutcome)
                      : event.responseStatus ? "HTTP " + event.responseStatus : "Not recorded"}</p>
                    <details className="mt-1">
                      <summary className={reportLink + " cursor-pointer"}>View evidence</summary>
                      <div className="mt-3">
                        <Fields entries={[
                          ["Bot reference ID", bot.id], ["Request reference", event.id], ["HTTP method", event.method], ["Recorded endpoint", event.endpoint],
                          ["IP address", event.ip], ["Country", event.country], ["Declared bot identity", event.declaredName],
                          ...(event.search ? [
                            ["IP address (linked search)", event.search.ipAddress],
                            ["Country (linked search)", event.search.countryCode],
                          ] as [string, ReactNode][] : []),
                          ["Network ASN", event.networkAsn ? "AS" + event.networkAsn : null], ["Network organization", event.networkOrganization],
                          ["Network evidence source", event.networkSource ? botLabel(event.networkSource) : null], ["Cloudflare Ray ID", event.edgeRay],
                          ["Render request ID", event.renderRequestId],
                          ...(event.renderLogIp ? [
                            ["IP address from Render log", event.renderLogIp],
                            ["Country estimate from logged IP", event.renderLogCountry],
                            ["Render log time (UTC)", botTime(event.renderLogTimestamp)],
                            ["Evidence recovered (UTC)", botTime(event.renderLogRecoveredAt)],
                            ["Retrospective identity evidence", event.renderLogCorroboration ? botLabel(event.renderLogCorroboration) : "Not confirmed"],
                          ] as [string, ReactNode][] : []),
                          ["Recorded User-Agent token", event.userAgent],
                          ["Verification evidence", event.evidence ? botLabel(event.evidence) : null],
                          ["Access decision", decision], ["Reason", botLabel(event.reason)], ["HTTP response status", event.responseStatus],
                          ["Search dispatch (UTC)", botTime(event.dispatchedAt)],
                          ["Search outcome", event.search ? botLabel(event.search.status) + " · " + event.search.resultCount + " results"
                            : event.executionOutcome ? botLabel(event.executionOutcome) : null],
                          ["Request duration", event.durationMs === null ? null : event.durationMs + " ms"],
                          ["Related recorded search", event.search ? <Link className={reportLink} prefetch={false}
                            href={"/admin/searches/" + encodeURIComponent(event.search.id) + "?environment=" + getPublicEnvironment()}>View search record</Link> : null],
                          ["Related provider calls", event.providers.length ? <ul className="space-y-1">
                            {event.providers.map(provider => <li key={provider.id}>{provider.provider} · {provider.service} · {botLabel(provider.status)}</li>)}
                          </ul> : null],
                        ]} />
                      </div>
                    </details>
                  </td>
                </tr>;
              })}
              {report.total === 0 && <tr><td colSpan={4} className="px-3 py-5">No recorded activity matches your filters</td></tr>}
            </tbody>
          </table>
        </div>
        {report.total > 0 && <ReportPagination path={BOT_DIRECTORY + "/" + bot.id} params={activityParams}
          page={report.page} total={report.total} label="Bot activity" />}
      </div>}
    </Section>
  </div>;
}
