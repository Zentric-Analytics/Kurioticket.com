"use client";

import Link from "next/link";
import type { ActivityRow } from "@/lib/adminIdentityJourney";
import { formatAdminTimeZoneLabel } from "@/lib/adminLocalTime";
import { recentPageViews } from "@/lib/adminPageHistory";

const stamp = (date: Date, timeZone: string) => new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  second: "2-digit", hour12: false, timeZone,
}).format(date);

export function PageViewDetails({ row }: { row: ActivityRow }) {
  const page = row.pageView;
  if (!page) return null;
  return <div className="min-w-0 space-y-0.5 text-[12px] leading-5 text-[#475569]">
    {page.href ? <a href={page.href} target="_blank" rel="noopener noreferrer" className="break-all text-[#004BB8] hover:underline focus-visible:outline-2">{page.href}</a>
      : <p className="break-words">{page.path}{page.transport === "native" ? " · Screen route" : " · Safe page path"}</p>}
    {page.originalIdentity === "guest" ? <p>Recorded as a guest</p> : null}
    {page.previousPath ? <p className="break-words text-[#64748B]">{page.transport === "native" ? "Previous observed screen" : "Previous observed page"}: {page.previousPath}</p> : null}
  </div>;
}

export function PageViewRecords({ events, count, full, href, operational, timeZone = "UTC" }: {
  events: ActivityRow[]; count: number; full: boolean; href?: string; operational: boolean; timeZone?: string;
}) {
  const visible = full ? events.filter(row => row.stage === "PAGE_VIEW" && row.pageView) : recentPageViews(events);
  return <section aria-label="Pages visited" className="min-w-0 space-y-3" data-testid="page-view-records">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-[#0F172A]">Pages visited</h2>
        <p className="mt-1 text-[12px] text-[#64748B]">{operational ? "Optional page tracking is not available for this guest session." : full ? "Matching page and screen visits" : "Showing " + visible.length + " most recent " + (visible.length === 1 ? "visit" : "visits")}</p>
        {!operational ? <p data-testid="pages-visited-total" className="mt-1 text-[19px] font-semibold tabular-nums text-[#0F172A]">{count}</p> : null}
      </div>
      {!full && href && !operational ? <Link href={href} className="focus-ring shrink-0 rounded-md px-2 py-1.5 text-[13px] font-medium text-[#004BB8] hover:bg-[#F1F6FF]">View all pages visited</Link> : null}
    </div>
    {!visible.length ? <p className="rounded-lg border border-[#E2E8F0] p-3 text-[13px] text-[#64748B]">{operational ? "No optional navigation records for this session." : "No recorded page visits match these filters."}</p>
      : <div className="min-w-0 overflow-hidden rounded-lg border border-[#E2E8F0]">
        <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)_minmax(0,0.8fr)_minmax(0,1fr)] gap-3 border-b border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-[11px] font-medium uppercase text-[#64748B] lg:grid">
          <span>Page</span><span>URL / screen</span><span>Platform</span><span>Time ({formatAdminTimeZoneLabel(timeZone)})</span>
        </div>
        <ol className="divide-y divide-[#E2E8F0]">
          {visible.map(row => <li key={row.id} data-users-refresh-anchor={row.id} data-testid="page-view-row" className="grid min-w-0 gap-1.5 px-3 py-3 text-[12px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)_minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-3">
            <span className="min-w-0 break-words font-medium text-[#0F172A]">{row.label}</span>
            <PageViewDetails row={row}/>
            <span className="min-w-0 break-words text-[#475569]">{row.pageView?.platform}</span>
            <time dateTime={row.at.toISOString()} className="min-w-0 break-words tabular-nums text-[#64748B]">{stamp(row.at, timeZone)}</time>
          </li>)}
        </ol>
      </div>}
  </section>;
}
