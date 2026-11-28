import Link from "next/link";
import { botHref, botTime } from "@/lib/adminBotReport";
import { liveBotActivityPath, liveBotDirectoryHref, type LiveBotPeriod } from "@/lib/adminLiveBotNavigation";
import { onlinePresenceWindowSeconds } from "@/lib/onlinePresence";
import { readLiveBotDirectory } from "@/services/adminLiveBots";
import { ReportUnavailable, reportLink, reportPanel } from "../bots/report-ui";
import { liveBotNumber, LiveBotRow, LiveBotStatus, LiveBotTable, liveBotVerification } from "./live-bot-ui";

const columns = ["Bot name", "Verification", "Last seen (UTC)", "Status", "Activity"];
const periods = [
  { key: "now", label: "Active Now", hint: `Last ${onlinePresenceWindowSeconds} seconds` },
  { key: "today", label: "Active Today", hint: "Since midnight UTC" },
] as const;

export async function ActiveBotDirectory({ period, humanFilters }: { period: LiveBotPeriod; humanFilters: URLSearchParams }) {
  const directory = await readLiveBotDirectory();
  return <section aria-label="Active Bot" className="min-w-0 space-y-4">
    <h1 className="text-[17px] font-semibold text-[#0F172A]">Active Bot</h1>
    <nav aria-label="Bot activity period" className="grid auto-rows-fr grid-cols-2 gap-2 sm:gap-3">
      {periods.map(({ key, label, hint }) => (
        <Link key={key} href={liveBotDirectoryHref(key, humanFilters)} prefetch={false} scroll={false}
          aria-current={period === key ? "true" : undefined}
          className={reportPanel + " focus-ring min-w-0 p-3 hover:border-[#004BB8] aria-[current]:border-[#004BB8] aria-[current]:bg-[#F2F7FF] sm:p-4"}>
          <span className="block text-[13px] font-medium text-slate-950">{label}</span>
          <span className="mt-1 block wrap-anywhere text-xl font-semibold tabular-nums text-slate-950">
            {directory ? liveBotNumber.format(directory[key].length) : "Unavailable"}
          </span>
          <span className="mt-1 block text-xs text-slate-600">{hint}</span>
        </Link>
      ))}
    </nav>
    <h2 className="text-sm font-semibold text-slate-950">{periods.find(option => option.key === period)?.label} directory</h2>
    {!directory ? <ReportUnavailable /> : directory[period].length === 0
      ? <p role="status" className={reportPanel + " p-4 text-sm text-slate-700"}>No named bots were observed in this period.</p>
      : <LiveBotTable label="Observed bots" columns={columns}>
        {directory[period].map(bot => <LiveBotRow key={bot.key} anchor={bot.key} columns={columns} cells={[
          <strong key="name" className="font-medium text-slate-950">{bot.name}</strong>,
          liveBotVerification(bot.verification),
          <time key="last-seen" dateTime={bot.lastSeen.toISOString()}>{botTime(bot.lastSeen)}</time>,
          <LiveBotStatus key="status" active={bot.active} />,
          <Link key="activity" prefetch={false} className={reportLink}
            href={botHref(liveBotActivityPath, humanFilters, { bot: bot.key, period })}>View Activity</Link>,
        ]} />)}
      </LiveBotTable>}
  </section>;
}
