"use client";

import Link from "next/link";
import {
  Building2, CarFront, ChevronRight, CircleDot, ExternalLink,
  ListChecks, MousePointerClick, Plane, Search,
} from "lucide-react";
import { groupContiguousActivityRows } from "@/lib/adminIdentityActivity";
import { encodeActivityJourneyReturn } from "@/lib/adminActivityJourneyNavigation";
import type { ActivityRow } from "@/lib/adminIdentityJourney";

const dayLabel = (at: Date) => new Intl.DateTimeFormat("en", {
  month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
}).format(at);
const hourLabel = (at: Date) => new Intl.DateTimeFormat("en", {
  hour: "numeric", minute: "2-digit", timeZone: "UTC",
}).format(at) + " UTC";

const productLabels = new Map([
  ["FLIGHT", "Flight"], ["HOTEL", "Hotel"], ["CAR", "Car"], ["PACKAGE", "Package"],
]);
const searchOutcomeLabels = new Map([
  ["SUCCESS", "Success"], ["PARTIAL", "Partial"], ["FAILED", "Failed"],
]);

/** Format only known display tokens; keep routes, provider brands and stored rows intact. */
function activityDetail(row: ActivityRow) {
  const parts = row.detail.split(" · ");
  const product = productLabels.get(row.product ?? "");
  if (product && parts[0]?.toUpperCase() === row.product) parts[0] = product;
  // Search writers append their recorded outcome. Other event types may end
  // with a provider name, which must never be interpreted as a search status.
  if (row.stage === "SEARCH_COMPLETED" && parts.length > 1) {
    const last = parts.length - 1;
    const outcome = searchOutcomeLabels.get(parts[last]);
    if (outcome) parts[last] = outcome;
  }
  return parts.join(" · ");
}

function ProductIcon({ product }: { product: string | null | undefined }) {
  if (product === "FLIGHT") return <Plane size={17} aria-hidden="true" />;
  if (product === "HOTEL") return <Building2 size={17} aria-hidden="true" />;
  if (product === "CAR") return <CarFront size={17} aria-hidden="true" />;
  return <CircleDot size={17} aria-hidden="true" />;
}
function EventIcon({ stage }: { stage: ActivityRow["stage"] }) {
  if (stage === "SEARCH_COMPLETED") return <Search size={15} aria-hidden="true" />;
  if (stage === "RESULTS_VIEWED") return <ListChecks size={15} aria-hidden="true" />;
  if (stage === "OFFER_SELECTED") return <MousePointerClick size={15} aria-hidden="true" />;
  if (stage === "PROVIDER_HANDOFF_STARTED") return <ExternalLink size={15} aria-hidden="true" />;
  return <CircleDot size={15} aria-hidden="true" />;
}
function detailHref(row: ActivityRow, environment: string, now: Date, returnHref?: string) {
  if (row.journeyId) {
    const to = new Date(Math.min(now.getTime(), row.at.getTime() + 86_400_000)).toISOString();
    const from = new Date(row.at.getTime() - 86_400_000).toISOString();
    const query = new URLSearchParams({ from, to, environment });
    const activityReturn = encodeActivityJourneyReturn(returnHref);
    if (activityReturn) query.set("activityReturn", activityReturn);
    return "/admin/journeys/" + encodeURIComponent(row.journeyId)
      + "?" + query.toString();
  }
  return null;
}
function RecordedEvent({ row }: { row: ActivityRow }) {
  return <li data-activity-id={row.id} className="flex min-w-0 flex-col gap-1.5 py-3 sm:flex-row sm:items-start sm:gap-4">
    <span aria-hidden="true" className="mt-0.5 hidden shrink-0 text-[#64748B] sm:block"><EventIcon stage={row.stage} /></span>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-[#0F172A]">{row.label}</p>
        <time dateTime={row.at.toISOString()} className="shrink-0 text-[12px] font-normal text-[#64748B]">{hourLabel(row.at)}</time>
      </div>
      <p className="mt-1 break-words text-[12px] leading-5 text-[#64748B]">{activityDetail(row) || "No additional details recorded"}</p>
    </div>
  </li>;
}
function dayGroups(events: ActivityRow[]) {
  const byDate = new Map<string, ActivityRow[]>();
  for (const row of events) {
    const date = row.at.toISOString().slice(0,10);
    byDate.set(date, [...(byDate.get(date) ?? []), row]);
  }
  return [...byDate].map(([date,rows]) => ({date,rows,journeys:groupContiguousActivityRows(rows)}));
}
function journalTitle(rows: ActivityRow[]) {
  const summary = rows.find(row => row.stage === "SEARCH_COMPLETED")
    ?? rows.find(row => row.stage === "RESULTS_VIEWED") ?? rows[0];
  const parts = summary ? activityDetail(summary).split(" · ").filter(Boolean) : [];
  if (!parts.length) return "Recorded activity";
  // Use only already-sanitized, source-recorded product and route/destination.
  return parts.slice(0, 2).join(" · ");
}

/** Every eligible event is visible immediately, including repeated searches.
 * Preserve optional journey context and one View journey action without collapse controls.
 */
export function ActivityTimeline({ events, nextHref, environment, order = "newest", returnHref, clearHref }: {
  events: ActivityRow[]; nextHref: string | null; environment: string;
  order?: "newest" | "oldest"; returnHref?: string; clearHref?: string;
}) {
  const days = dayGroups(events);
  const now = new Date();
  return <section aria-labelledby="activity-history-title" className="min-w-0">
    <div className="flex items-center justify-between gap-3 pb-3">
      <h2 id="activity-history-title" className="text-[17px] font-semibold text-[#0F172A]">Activity history</h2>
      <span className="text-xs text-[#475569]">{events.length} recorded {events.length === 1 ? "event" : "events"}</span>
    </div>
    {!events.length ? <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
      <p className="font-medium">No activity matches your filters</p><span className="sr-only">No activity recorded in this view</span>
      {clearHref ? <Link className="focus-ring mt-3 inline-block text-sm text-[var(--primary)] underline" href={clearHref}>Clear filters</Link> : null}
    </div> : <div className="space-y-6">
      {days.map(day => <section key={day.date} aria-label={"Activity on " + dayLabel(new Date(day.date + "T12:00:00Z"))}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{dayLabel(new Date(day.date + "T12:00:00Z"))} <span className="ml-1 text-xs font-normal text-[#475569]">UTC</span></h3>
          <span className="text-xs text-[#475569]">{day.rows.length} {day.rows.length === 1 ? "event" : "events"}</span>
        </div>
        <div className="divide-y divide-[#E2E8F0] border-y border-[#E2E8F0]">
          {day.journeys.map(group => {
            const first = group.events[0];
            const href = detailHref(first, environment, now, returnHref);
            const title = journalTitle(group.events);
            return <div key={day.date + ":" + group.key} className="min-w-0">
              {group.journeyId ? <div className="flex min-w-0 items-center justify-between gap-2 py-3">
                <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                  <ProductIcon product={group.products[0]}/>
                  <span className="min-w-0 truncate">{title}</span>
                  <span className="shrink-0 text-xs font-normal text-[#475569]">{group.events.length} events</span>
                </div>
                {href ? <Link href={href} aria-label={"View journey for " + title} className="focus-ring inline-flex shrink-0 items-center gap-1 rounded-sm py-1 text-[13px] font-medium text-[var(--primary)] hover:underline">View journey<ChevronRight size={14} aria-hidden="true" /></Link> : null}
              </div> : null}
              <ol className={"divide-y divide-[#E2E8F0] pl-3 sm:pl-8 " + (group.journeyId ? "border-t border-[#E2E8F0]" : "")}>
                {group.events.map(row => <RecordedEvent key={row.id} row={row}/>)}
              </ol>
            </div>;
          })}
        </div>
      </section>)}
    </div>}
    {nextHref ? <div className="pt-4"><Link className="focus-ring text-sm font-medium text-[var(--primary)] hover:underline" href={nextHref}>{order === "oldest" ? "Load newer activity" : "Load older activity"} <ChevronRight size={15} className="inline" aria-hidden="true"/></Link></div> : null}
  </section>;
}
