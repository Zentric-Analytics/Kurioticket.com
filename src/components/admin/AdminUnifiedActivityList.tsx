import Link from "next/link";
import { Monitor, FileText, Search, ExternalLink, CircleDot, ChevronRight } from "lucide-react";
import type { ActivityRow } from "@/lib/adminIdentityJourney";
import { hotelResultSummary } from "@/lib/hotels/hotelResultAccounting";
import { PageViewDetails } from "@/components/admin/PageViewRecords";

export type AccessPreview = { at: Date; detail: string; href: string };
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
      parts.push(row.product === "HOTEL" ? hotelResultSummary(row.resultCount, row.hotelPropertyCount) : row.resultCount.toLocaleString("en-US") + (row.resultCount === 1 ? " result returned" : " results returned"));
    }
  }
  return parts.join(" · ");
}
export function AdminUnifiedActivityList({ events, timeZone, environment, overview = false, access, accessHref, accessUnavailable, pagesHref, pagesUnavailable, allHref, nextHref }: {
  events: ActivityRow[]; timeZone: string; environment: string; overview?: boolean;
  access?: AccessPreview | null; accessHref?: string; accessUnavailable?: boolean; pagesHref?: string;
  pagesUnavailable?: boolean; allHref?: string; nextHref?: string | null;
}) {
  const ordered = [...events].sort((a,b) => +b.at - +a.at || a.id.localeCompare(b.id));
  const pages = ordered.filter(row => row.stage === "PAGE_VIEW");
  const travel = ordered.filter(row => row.stage !== "PAGE_VIEW");
  const selected = overview ? [...travel.slice(0, 8), ...pages.slice(0, 1)] : ordered;
  const rows: ListRow[] = selected.map(event => ({ id: event.id, at: event.at, label: event.label, detail: describe(event), event,
    access: event.id.startsWith("d-") }));
  if (overview && access) rows.push({ id: "latest-access-summary", at: access.at, label: "Latest recorded access", detail: access.detail, href: access.href, access: true });
  rows.sort((a,b) => +b.at - +a.at || a.id.localeCompare(b.id));
  const date = new Intl.DateTimeFormat("en-GB", { day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false,timeZone });
  return <section aria-label={overview ? "Recent activity" : "All activity"} className="min-w-0 space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
      <h2 className="text-[16px] font-semibold">{overview ? "Recent activity" : "Activity history"}</h2>
      {allHref ? <Link href={allHref} className="focus-ring inline-flex items-center gap-1 text-[13px] font-medium text-[#004BB8] hover:underline">View all activity <ChevronRight size={14} aria-hidden="true"/></Link> : null}
    </div>
    {overview && (accessUnavailable || pagesUnavailable) ? <p role="status" className="text-[12px] text-[#64748B]">{accessUnavailable ? "Access information temporarily unavailable. " : ""}{pagesUnavailable ? "Page visit information temporarily unavailable." : ""}</p> : null}
    {!rows.length ? <p className="rounded-lg border border-[#E2E8F0] p-4 text-[13px] text-[#64748B]">No recorded activity matches this view.</p> :
      <ol className="divide-y divide-[#E2E8F0] border-y border-[#E2E8F0]">
        {rows.map(row => {
          const Icon = row.access ? Monitor : row.event?.stage === "PAGE_VIEW" ? FileText : row.event?.stage === "SEARCH_COMPLETED" ? Search : row.event?.stage === "PROVIDER_HANDOFF_STARTED" ? ExternalLink : CircleDot;
          const href = row.href ?? (row.access ? accessHref : row.event?.stage === "PAGE_VIEW" ? pagesHref : row.event?.searchHistoryId ? "/admin/searches/" + encodeURIComponent(row.event.searchHistoryId) + "?" + new URLSearchParams({environment}).toString() : undefined);
          return <li key={row.id} data-activity-id={row.id} className="flex min-w-0 items-start gap-3 py-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#475569]"><Icon size={16} aria-hidden="true"/></span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <p className="text-[13px] font-medium text-[#0F172A]">{row.label}</p>
                <time className="shrink-0 text-[12px] tabular-nums text-[#64748B]" dateTime={row.at.toISOString()}>{date.format(row.at)}</time>
              </div>
              {row.event?.pageView ? <PageViewDetails row={row.event}/> : <p className="mt-1 break-words text-[12px] text-[#64748B]">{row.detail || "No additional details recorded"}</p>}
              {href ? <Link href={href} className="focus-ring mt-1 inline-flex items-center gap-1 text-[12px] text-[#004BB8] hover:underline">{row.access ? "View access history" : row.event?.stage === "PAGE_VIEW" ? "View pages visited" : "View original search"} <ChevronRight size={12} aria-hidden="true"/></Link> : null}
            </div>
          </li>;
        })}
      </ol>}
    {nextHref ? <div className="flex justify-end pt-2"><Link href={nextHref} className="focus-ring text-[13px] font-medium text-[#004BB8] hover:underline">Load older activity <ChevronRight size={14} className="inline" aria-hidden="true"/></Link></div> : null}
  </section>;
}
