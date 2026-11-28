import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BOT_DECISIONS, BOT_DIRECTORY, BOT_KINDS, botHref, botTime, botType, type BotQuery } from "@/lib/adminBotReport";
import { liveBotActivityPath, liveBotDirectoryHref, liveBotFilters, liveBotPeriod, onlineUsersTabParams } from "@/lib/adminLiveBotNavigation";
import { searchActivityReturnHref } from "@/lib/adminSearchActivityNavigation";
import { requireAdminSession } from "@/lib/auth-guards";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { readLiveBotActivity, type LiveBotEvent } from "@/services/adminLiveBots";
import { BotIcon, ReportPagination, ReportUnavailable, reportLink, reportPanel } from "../../bots/report-ui";
import { liveBotChoice, liveBotNumber, LiveBotRow, LiveBotStatus, LiveBotTable, liveBotVerification } from "../live-bot-ui";

export const metadata = { title: "Admin Live Bot Activity" };
export const dynamic = "force-dynamic";

const columns = ["Time (UTC)", "Activity", "Destination", "Status"];
const pages = new Map([
  ["/", "Homepage"], ["/destinations", "Destinations page"], ["/explore", "Explore page"],
  ["/flights", "Flights page"], ["/hotels", "Hotels page"], ["/cars", "Cars page"],
  ["/packages", "Packages page"], ["/deals", "Deals page"], ["/faq", "FAQ page"],
]);
const products = new Map([["FLIGHT", "Flight"], ["HOTEL", "Hotel"], ["CAR", "Car"], ["PACKAGE", "Package"]]);
const outcomes = new Map([
  ["FAILED", "Failed"], ["COMPLETED", "Completed"], ["SUCCESS", "Successful"],
  ["PARTIAL", "Partial results"], ["EMPTY", "No results"],
]);

function describe(row: LiveBotEvent) {
  const product = products.get(row.product ?? "");
  const destination = row.kind === "PAGE" ? pages.get(row.endpoint) : undefined;
  const visited = row.decision === "ALLOWED" && row.responseStatus !== null
    && row.responseStatus >= 200 && row.responseStatus < 400;
  const activity = product && row.kind === "SEARCH_ATTEMPT" ? product + " search"
    : destination ? destination + (visited ? " visited" : " requested")
    : BOT_KINDS.find(kind => kind.value === row.kind)?.label ?? "—";
  const status = row.dispatched ? outcomes.get(row.executionOutcome ?? "") ?? "Dispatched"
    : BOT_DECISIONS.find(decision => decision.value === row.decision)?.label ?? "—";
  return { ...row, activity, destination: destination ?? product ?? "—", status };
}

export default async function LiveBotActivityPage({ searchParams }: { searchParams: Promise<BotQuery> }) {
  await requireAdminSession(liveBotActivityPath);
  const raw = await searchParams;
  if (typeof raw.bot !== "string" || !raw.bot || /[\u0000-\u001f\u007f]/.test(raw.bot)) notFound();
  const period = liveBotPeriod(raw.period);
  const humanFilters = onlineUsersTabParams(raw);
  const filter = liveBotFilters.find(item => item.value === raw.filter)?.value ?? "all";
  const requestedPage = typeof raw.botPage === "string" && /^[1-9]\d{0,7}$/.test(raw.botPage) ? Number(raw.botPage) : 1;
  const params = new URLSearchParams(humanFilters);
  params.set("bot", raw.bot);
  params.set("period", period);
  if (filter !== "all") params.set("filter", filter);
  const report = await readLiveBotActivity(raw.bot, filter, requestedPage);
  const back = <Link href={liveBotDirectoryHref(period, humanFilters)} prefetch={false} className={reportLink + " inline-flex items-center gap-2 text-[13px]"}>
    <ArrowLeft size={15} aria-hidden="true" /> Back to Active Bot
  </Link>;
  if (!report) return <div className="space-y-3">{back}<ReportUnavailable /></div>;
  if (report.state === "missing") notFound();

  const { bot, metrics, day, page, cohorts } = report;
  const summary = [
    ["Verification", liveBotVerification(bot.verification)],
    ["Last seen (UTC)", <time key="last-seen" dateTime={bot.lastSeen.toISOString()}>{botTime(bot.lastSeen)}</time>],
    ["Total requests", liveBotNumber.format(metrics.requests)],
    ["Search attempts", liveBotNumber.format(metrics.attempts)],
    ["Searches dispatched", liveBotNumber.format(metrics.dispatched)],
    ["Denied requests", liveBotNumber.format(metrics.denied)],
  ] as const;
  const searchCohort = cohorts.find(cohort => cohort.dispatched)
    ?? cohorts.find(cohort => cohort.verification === "VERIFIED") ?? cohorts[0];

  return <div className="min-w-0 space-y-5">
    <header className="space-y-3">
      {back}
      <div className="flex min-w-0 items-center gap-3">
        <BotIcon />
        <div className="min-w-0">
          <h1 className="wrap-anywhere text-xl font-semibold text-slate-950">{bot.name}</h1>
          <p className="wrap-anywhere text-[13px] text-slate-600">{[bot.owner, botType(bot)].filter(Boolean).join(" · ")}</p>
        </div>
        <LiveBotStatus active={bot.active} />
      </div>
    </header>
    <section aria-labelledby="bot-summary" className="space-y-2">
      <h2 id="bot-summary" className="text-sm font-semibold text-slate-950">Activity summary</h2>
      <p className="text-xs text-slate-600">Request and search totals for {day.toISOString().slice(0, 10)} UTC</p>
      <dl className="grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {summary.map(([label, value]) => <div key={label} className={reportPanel + " min-w-0 p-3"}>
          <dt className="text-xs font-medium text-slate-600">{label}</dt>
          <dd className="mt-1 wrap-anywhere text-base font-semibold tabular-nums text-slate-950">{value}</dd>
        </div>)}
      </dl>
    </section>
    <section aria-labelledby="bot-history" className="space-y-2">
      <h2 id="bot-history" className="text-sm font-semibold text-slate-950">Activity history</h2>
      <nav aria-label="Bot history filter" className="flex flex-wrap gap-2">
        {liveBotFilters.map(item => <Link key={item.value} className={liveBotChoice}
          href={botHref(liveBotActivityPath, params, { filter: item.value === "all" ? "" : item.value })}
          aria-current={filter === item.value ? "true" : undefined} prefetch={false} scroll={false}>{item.label}</Link>)}
      </nav>
      {metrics.history === 0 ? <p className={reportPanel + " p-4 text-sm text-slate-700"}>No recorded activity matches this filter.</p>
        : <LiveBotTable columns={columns} label="Bot activity history"
          footer={<ReportPagination path={liveBotActivityPath} params={params} page={page} total={metrics.history} label="Bot activity" pageParam="botPage" />}>
          {report.events.map(describe).map(row => <LiveBotRow key={row.id} anchor={row.id} columns={columns} cells={[
            <time key="timestamp" dateTime={row.timestamp.toISOString()}>{botTime(row.timestamp)}</time>, row.activity, row.destination, row.status,
          ]} />)}
        </LiveBotTable>}
    </section>
    <nav aria-label="Detailed bot records" className="flex flex-wrap gap-x-5 gap-y-3 text-[13px]">
      <Link prefetch={false} className={reportLink} href={searchActivityReturnHref({
        identity: "bot", botId: searchCohort.botId, range: "all", environment: getPublicEnvironment(),
      })}>View search activity</Link>
      <Link prefetch={false} className={reportLink} href={BOT_DIRECTORY + "/" + encodeURIComponent(bot.botId)}>View full bot history</Link>
      {cohorts.filter(cohort => cohort.botId !== bot.botId).map(cohort => (
        <Link key={cohort.botId} prefetch={false} className={reportLink}
          href={BOT_DIRECTORY + "/" + encodeURIComponent(cohort.botId)}>
          View {liveBotVerification(cohort.verification).toLowerCase()} bot history
        </Link>
      ))}
    </nav>
  </div>;
}
