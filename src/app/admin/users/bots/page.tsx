import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BotReportFilters } from "@/components/admin/BotReportFilters";
import { BOT_DIRECTORY, BOT_GROUPS, botRecordedAccess, botDirectoryHref, botHref, botDirectorySubtitle, botDirectoryTime, botName, botType, type BotQuery } from "@/lib/adminBotReport";
import { readBotDirectory } from "@/services/adminBotReportService";
import { Metrics, ReportPagination, ReportUnavailable, reportHead, reportLink, reportPanel } from "./report-ui";

const columns = ["Identity", "Type", "Verification", "Status", "Last Seen (UTC)", "Activity"];
const directoryRow = "border-b border-[#E7ECF5] last:border-0 [&>td]:px-3 [&>td]:py-2";

export default async function BotManagementPage({ searchParams }: { searchParams: Promise<BotQuery> }) {
  const report = await readBotDirectory(await searchParams);
  const { filters, now } = report;
  const directory = botDirectoryHref(filters);
  const params = new URLSearchParams(directory.split("?")[1]);
  return (
    <div className="min-w-0 space-y-3">
      <h1 className="sr-only">Bot Management</h1>
      {report.state === "ready" && <section aria-label="Bot monitoring summary" className={reportPanel}>
        <div className="space-y-2 px-4 py-3">
          <h2 className="text-[13px] font-semibold text-slate-950">Bot Registry</h2>
          <Metrics labels={["Total bots", "Search engines", "Other recognized", "Unknown bots"]} values={report.registry} />
        </div>
        <div className="space-y-2 border-t border-[#D8E1EC] px-4 py-3">
          <h2 className="text-[13px] font-semibold text-slate-950">Bot Activity</h2>
          <Metrics labels={["Total requests", "Actual searches", "Denied requests", "Rate-limited requests"]} values={report.activity} />
          <p className="text-[11px] text-slate-600">Actual searches include saved Search History records. Older searches do not imply additional request counts.</p>
          {report.unassignedSearches > BigInt(0) && <p className="text-xs text-slate-600">
            {report.unassignedSearches.toLocaleString()} recorded searches have no matching registry identity.{" "}
            <Link className={reportLink} href="/admin/searches/activity?identity=bot&range=all">View all bot searches</Link>
          </p>}
        </div>
      </section>}
      <BotReportFilters filters={filters} now={now.toISOString()} />
      {report.state === "unavailable" && <ReportUnavailable />}
      {report.state === "ready" && <section aria-label="Bot directory">
        <nav aria-label="Bot registry groups" className="flex items-end gap-x-1 overflow-x-auto border-b border-[#D8E1EC] sm:gap-x-6">
          {BOT_GROUPS.map(({ value, label }) => {
            const active = filters.group === value;
            return <Link key={value} scroll={false} prefetch={false} aria-current={active ? "page" : undefined}
              className={"inline-flex min-h-10 shrink-0 items-center whitespace-nowrap border-b-2 px-0.5 text-[11px] font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#004BB8] sm:px-1 sm:text-[13px] " +
                (active ? "border-[#004BB8] text-[#004BB8]" : "border-transparent text-slate-600 hover:text-slate-950")}
              href={botHref(BOT_DIRECTORY, params, { group: value, page: "" })}>
              {label} ({(report.counts[value || "all"] ?? 0).toLocaleString("en-US")})
            </Link>;
          })}
        </nav>
        <div className={reportPanel + " mt-2"}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-[13px] text-slate-700">
              <thead className={reportHead}><tr>{columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
              <tbody>
                {report.rows.map(bot => <tr key={bot.id} className={directoryRow}>
                  <td>
                    <p className="break-words font-semibold text-slate-950" title={bot.group === "UNKNOWN" ? "Declared identity, not independently verified" : undefined}>{botName(bot)}</p>
                    <p className="text-xs text-slate-600">{botDirectorySubtitle(bot)}</p>
                  </td>
                  <td>{botType(bot)}</td>
                  <td>{bot.reportVerification}</td>
                  <td className="whitespace-nowrap"><span className={bot.access === "BLOCKED" ? "text-rose-700" : "text-slate-950"}>{botRecordedAccess(bot)}</span></td>
                  <td className="whitespace-nowrap tabular-nums">{botDirectoryTime(bot.lastSeen)}</td>
                  <td><Link prefetch={false} className={reportLink + " inline-flex items-center gap-1 whitespace-nowrap"}
                    href={botHref(BOT_DIRECTORY + "/" + bot.id, new URLSearchParams(), { directory: params.toString() })}>
                    View Activity <ChevronRight size={15} aria-hidden="true" />
                  </Link></td>
                </tr>)}
                {!report.total && <tr><td colSpan={columns.length} className="px-3 py-5">
                  <p className="font-medium text-slate-950">No bots match your filters</p>
                  <Link className={reportLink} href={BOT_DIRECTORY + "?range=all"}>View all recorded bots</Link>
                </td></tr>}
              </tbody>
            </table>
          </div>
          {report.total > 0 && <ReportPagination path={BOT_DIRECTORY} params={params} page={report.page} total={report.total} label="Bot directory" />}
        </div>
      </section>}
    </div>
  );
}
