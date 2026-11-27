import Link from "next/link";
import { Monitor, FileText, Search, ExternalLink, CircleDot, ChevronRight } from "lucide-react";
import type { ActivityRow } from "@/lib/adminIdentityJourney";
import { hotelResultSummary } from "@/lib/hotels/hotelResultAccounting";
import { PageViewDetails } from "@/components/admin/PageViewRecords";
import { adminActivitySearchHref } from "@/lib/adminUsersNavigation";
import type { PublicEnvironment } from "@/lib/stagingSafety";

export type AccessPreview = { at: Date; detail: string; href?: string; label?: string };
type ListRow = { id: string; at: Date; label: string; detail: string; event?: ActivityRow; href?: string; access?: boolean };
const products: Record<string, string> = { FLIGHT: "Flight", HOTEL: "Hotel", CAR: "Car", PACKAGE: "Package" };
const outcomes: Record<string, string> = { SUCCESS: "Success", PARTIAL: "Partial provider coverage", FAILED: "Failed" };
function describe(row: ActivityRow) {
  const parts = row.detail.split(" · ");
  if (row.product && parts[0] === row.product) parts[0] = products[row.product] ?? row.product;
  if (row.stage === "SEARCH_COMPLETED") {
    const last = parts.length - 1;
    parts[last] = outcomes[parts[last]] ?? parts[last];
    if (typeof row.resultCount === "number" && Number.isSafeInteger(row.resultCount) && row.resultCount >= 0) {
      parts.push(row.product === "HOTEL" ? hotelResultSummary(row.resultCount, row.hotelPropertyCount) : row.product === "CAR" ? row.resultCount.toLocaleString("en-US") + (row.resultCount === 1 ? " recorded result" : " recorded results") + " · Rental offer count unavailable" : row.resultCount.toLocaleString("en-US") + (row.resultCount === 1 ? " result returned" : " results returned"));
    }
  }
  return parts.join(" · ");
}
export function AdminUnifiedActivityList({ events, timeZone, environment, overview = false, access, accessHref, accessUnavailable, pagesHref, pagesUnavailable, allHref, allHrefPrefetch, nextHref, returnHref, newestHref, historyUnavailable }: {
  events: ActivityRow[]; timeZone: string; environment: PublicEnvironment; overview?: boolean;
  access?: AccessPreview | null; accessHref?: string; accessUnavailable?: boolean; pagesHref?: string;
  pagesUnavailable?: boolean; allHref?: string; allHrefPrefetch?: boolean; nextHref?: string | null;
  returnHref?: string; newestHref?: string; historyUnavailable?: string;
}) {
  const ordered = [...events].sort((a,b) => +b.at - +a.at || a.id.localeCompare(b.id));
  // One chronological preview across every meaningful action type. Passive
  // access observations live in the separate identity context above this list.
  const selected = overview ? ordered.filter(row => !row.id.startsWith("d-")).slice(0, 5) : ordered;
  const rows: ListRow[] = selected.map(event => ({ id: event.id, at: event.at, label: event.label, detail: describe(event), event,
    access: event.id.startsWith("d-") }));
  if (access && !overview) rows.push({ id: "latest-access-summary", at: access.at, label: access.label ?? "Latest recorded access", detail: access.detail, href: access.href, access: true });
  rows.sort((a,b) => +b.at - +a.at || a.id.localeCompare(b.id));
  const date = new Intl.DateTimeFormat("en-GB", { day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false,timeZone });
  return <section data-testid="unified-activity-list" aria-label={overview ? "Recent activity" : "All activity"} className="min-w-0 space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
      <div><h2 className="text-[16px] font-semibold">{overview ? "Recent activity" : "Activity history"}</h2>
        <p className="mt-1 text-[12px] text-[#64748B]">{overview ? "Five most recent recorded actions in this period" : "Newest first · Up to 20 records per page"}</p>
      </div>
      {allHref ? <Link href={allHref} prefetch={allHrefPrefetch} className="focus-ring inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-[#004BB8] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#003D97]">View all activity <ChevronRight size={15} aria-hidden="true"/></Link> : null}
    </div>
    {overview && (accessUnavailable || pagesUnavailable) ? <p role="status" className="text-[12px] text-[#64748B]">{accessUnavailable ? "Access information temporarily unavailable. " : ""}{pagesUnavailable ? "Page visit information temporarily unavailable." : ""}</p> : null}
    {!rows.length ? <p className="rounded-lg border border-[#E2E8F0] p-4 text-[13px] text-[#64748B]">{historyUnavailable ?? "No recorded activity matches this view."}</p> :
      <ol className="divide-y divide-[#E2E8F0] border-y border-[#E2E8F0]">
        {rows.map(row => {
          const Icon = row.access ? Monitor : row.event?.stage === "PAGE_VIEW" ? FileText : row.event?.stage === "SEARCH_COMPLETED" ? Search : row.event?.stage === "PROVIDER_HANDOFF_STARTED" ? ExternalLink : CircleDot;
          const href = row.href ?? (row.access ? accessHref : row.event?.stage === "PAGE_VIEW" ? pagesHref : row.event?.searchHistoryId ? adminActivitySearchHref(row.event.searchHistoryId, environment, returnHref ?? "") : undefined);
          return <li key={row.id} data-activity-id={row.id} data-users-refresh-anchor={row.id} className="flex min-w-0 items-start gap-3 py-4">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#475569]"><Icon size={16} aria-hidden="true"/></span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <p className="text-[14px] font-medium leading-5 text-[#0F172A]">{row.label}</p>
                <time className="shrink-0 text-[12px] tabular-nums text-[#64748B]" dateTime={row.at.toISOString()}>{date.format(row.at)}</time>
              </div>
              {row.event?.pageView ? <div className="mt-1 space-y-0.5">
                <PageViewDetails row={row.event}/>
                <p className="break-words text-[12px] text-[#64748B]">{row.event.pageView.platform}</p>
              </div> : <p className="mt-1 break-words text-[13px] leading-5 text-[#64748B]">{row.detail || "No additional details recorded"}</p>}
              {href ? <Link href={href} className="focus-ring mt-1 inline-flex min-h-11 items-center gap-1 rounded-md text-[13px] text-[#004BB8] hover:underline">{row.access ? "View access history" : row.event?.stage === "PAGE_VIEW" ? "View pages visited" : "View original search"} <ChevronRight size={13} aria-hidden="true"/></Link> : null}
            </div>
          </li>;
        })}
      </ol>}
    {nextHref || newestHref ? <nav aria-label="Activity pagination" className="flex flex-wrap items-center justify-between gap-3 pt-3">
      {newestHref ? <Link href={newestHref} className="focus-ring inline-flex min-h-11 items-center rounded-lg border border-[#E2E8F0] px-3 text-[13px] font-medium text-[#004BB8] hover:bg-[#F8FAFC]">Newest activity</Link> : <span className="text-[12px] text-[#64748B]">{rows.length} {rows.length === 1 ? "record" : "records"} on this page</span>}
      {nextHref ? <Link href={nextHref} className="focus-ring inline-flex min-h-11 items-center gap-1 rounded-lg border border-[#E2E8F0] px-3 text-[13px] font-medium text-[#004BB8] hover:bg-[#F8FAFC]">Next page <ChevronRight size={14} aria-hidden="true"/></Link> : null}
    </nav> : null}
  </section>;
}
