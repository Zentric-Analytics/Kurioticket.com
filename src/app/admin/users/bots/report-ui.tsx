import Link from "next/link";
import { Bot } from "lucide-react";
import { BOT_PAGE_SIZE, botHref } from "@/lib/adminBotReport";

export const reportPanel = "rounded-lg border border-[#D8E1EC] bg-white";
export const reportLink = "font-medium text-[#004BB8] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]";
export const reportHead = "border-b border-[#D8E1EC] bg-[#F8FAFC] text-xs font-semibold text-slate-600 [&>tr>th]:px-3 [&>tr>th]:py-3";
export const reportRow = "border-b border-[#E7ECF5] last:border-0 [&>td]:px-3 [&>td]:py-3";
const numberFormat = new Intl.NumberFormat("en-US");

export function BotIcon() {
  return <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F2F7FF] text-[#004BB8]">
    <Bot size={17} aria-hidden="true" />
  </span>;
}

export function Metrics({ labels, values }: { labels: readonly string[]; values: (number | bigint)[] }) {
  return <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
    {labels.map((label, index) => <div key={label}>
      <dt className="text-xs text-slate-600">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums text-slate-950">{numberFormat.format(values[index])}</dd>
    </div>)}
  </dl>;
}

export function ReportUnavailable() {
  return <p role="status" className={reportPanel + " p-4 text-sm text-slate-700"}>Bot reporting is temporarily unavailable.</p>;
}

export function ReportPagination({ path, params, page, total, label, pageParam = "page" }: {
  path: string; params: URLSearchParams; page: number; total: number; label: string; pageParam?: "page" | "searchPage" | "botPage";
}) {
  const pages = Math.ceil(total / BOT_PAGE_SIZE);
  return (
    <nav aria-label={label + " pagination"} className="flex flex-wrap items-center justify-between gap-2 border-t border-[#D8E1EC] px-3 py-2 text-xs text-slate-600">
      <span>{numberFormat.format((page - 1) * BOT_PAGE_SIZE + 1)}–{numberFormat.format(Math.min(page * BOT_PAGE_SIZE, total))} of {numberFormat.format(total)}</span>
      {pages > 1 && <div className="flex items-center gap-4">
        {page > 1 && <Link scroll={false} prefetch={false} className={reportLink} href={botHref(path, params, { [pageParam]: page > 2 ? String(page - 1) : "" })}>Previous</Link>}
        <span>Page {page} of {pages}</span>
        {page < pages && <Link scroll={false} prefetch={false} className={reportLink} href={botHref(path, params, { [pageParam]: String(page + 1) })}>Next</Link>}
      </div>}
    </nav>
  );
}
