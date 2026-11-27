import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { BotReportFilters } from "@/components/admin/BotReportFilters";
import { BOT_DECISIONS, BOT_DIRECTORY, BOT_KINDS, botAccessLabel, botDirectoryHref, botFilters, botLabel, botName, botTime, botType, botVerification, type BotQuery } from "@/lib/adminBotReport";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { readBotDetails } from "@/services/adminBotReportService";
import { BOT_ACTIVITY_RETENTION_DAYS, BOT_DAILY_SEARCH_LIMIT, BOT_SEARCH_COOLDOWN_MS, botCrawlRequestsPerMinute } from "@/services/botActivityStore";
import { BotIcon, Metrics, ReportPagination, ReportUnavailable, reportHead, reportLink, reportPanel, reportRow } from "../report-ui";

function Fields({ entries }: { entries: [string, ReactNode][] }) {
  return <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
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

  const { bot, observations, quota, filters } = report;
  const blocked = bot.access === "BLOCKED";
  const allowedSearch = bot.access === "CRAWL_AND_LIMITED_SEARCH" && bot.verification === "VERIFIED" && bot.group === "SEARCH_ENGINE";
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
          <p className="text-[13px] text-slate-600">{botType(bot)} · {botVerification(bot.verification)} · {botAccessLabel(bot.access)}</p>
        </div>
      </div>
    </header>
    <Section title="Bot Information">
      <Fields entries={[
        ["Bot reference ID", bot.id], ["Owner", bot.owner], ["Category", botType(bot)],
        ["Verification status", botVerification(bot.verification)], ["First seen (UTC)", botTime(bot.firstSeen)], ["Last seen (UTC)", botTime(bot.lastSeen)],
      ]} />
      {bot.group === "UNKNOWN" && <p className="text-xs text-slate-600">This reference groups observations that may come from multiple clients.</p>}
    </Section>
    <Section title="Activity Summary">
      <p className="text-xs text-slate-600">Lifetime registry totals</p>
      <Metrics labels={["Total requests", "Allowed requests", "Denied requests", "Rate-limited requests", "Search attempts", "Searches dispatched", "Policy violations"]}
        values={[bot.requests, bot.allowed, bot.denied, bot.rateLimited, bot.searchAttempts, bot.searches, bot.violations]} />
      <div className="border-t border-[#D8E1EC] pt-3">
        <Metrics labels={["Actual searches linked to retained activity"]} values={[report.actual]} />
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
    <Section title="Network Information">
      <p className="text-xs text-slate-600">Based on up to 20 most recent recorded requests. Render log evidence is retrospective; estimated countries are based on logged IPs, not request-time verification.</p>
      <Fields entries={[
        ["IP addresses", observed(observations.map(row => row.ip ?? (row.renderLogIp ? row.renderLogIp + " (Render log)" : null)))],
        ["Countries", observed(observations.map(row => row.country ?? (row.renderLogCountry ? row.renderLogCountry + " (IP estimate)" : null)))],
        ["Network organizations", observed(observations.map(row => row.networkOrganization))],
      ]} />
    </Section>
    <Section title="Security Policy">
      <Fields entries={[
        ["Public page access", blocked ? "Blocked" : "GET and HEAD access to approved public pages and resources"],
        ["Travel search permissions", allowedSearch ? "Limited searches on the approved Flights, Hotels, Cars and Packages endpoints" : "Blocked"],
        ["Private and Admin resources", "Blocked"],
        ["Public crawl rate limit", blocked ? "Public crawl blocked" : botCrawlRequestsPerMinute(bot.group) + " requests per minute for this identity"],
        ["Registration and monitoring", "Observed requests are registered and monitored. Detailed activity is retained for " + BOT_ACTIVITY_RETENTION_DAYS + " days."],
      ]} />
    </Section>
    <Section title="Activity History">
      <p className="text-xs text-slate-600">Retained requests, newest first. Allowed public requests record access decisions at ingress. Page delivery and indexing are outside these observations.</p>
      <BotReportFilters filters={filters} now={new Date().toISOString()} history />
      {report.total !== null && <div className={reportPanel}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px] text-slate-700">
            <thead className={reportHead}><tr>{activityColumns.map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead>
            <tbody>
              {report.events.map(event => {
                const decision = BOT_DECISIONS.find(item => item.value === event.decision)?.label ?? botLabel(event.decision);
                return <tr key={event.id} className={reportRow + " align-top"}>
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
                          ["Request reference", event.id], ["HTTP method", event.method], ["Recorded endpoint", event.endpoint],
                          ["IP address", event.ip], ["Country", event.country], ["Declared bot identity", event.declaredName],
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
              {report.total === 0 && <tr><td colSpan={4} className="px-3 py-5">No retained activity matches your filters</td></tr>}
            </tbody>
          </table>
        </div>
        {report.total > 0 && <ReportPagination path={BOT_DIRECTORY + "/" + bot.id} params={activityParams}
          page={report.page} total={report.total} label="Bot activity" />}
      </div>}
    </Section>
  </div>;
}
