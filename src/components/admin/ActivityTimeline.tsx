import Link from "next/link";
import {
  Building2, CarFront, ChevronRight, CircleDot, Clock3, ExternalLink,
  ListChecks, MousePointerClick, Plane, Search,
} from "lucide-react";
import { compactActivityDisplayRows, groupActivityRows } from "@/lib/adminIdentityActivity";
import type { ActivityRow } from "@/lib/adminIdentityJourney";

const dayLabel = (at: Date) => new Intl.DateTimeFormat("en", {
  month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
}).format(at);
const hourLabel = (at: Date) => new Intl.DateTimeFormat("en", {
  hour: "numeric", minute: "2-digit", timeZone: "UTC",
}).format(at) + " UTC";

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
function detailHref(row: ActivityRow, environment: string, now: Date) {
  if (row.journeyId) {
    const to = new Date(Math.min(now.getTime(), row.at.getTime() + 86_400_000)).toISOString();
    const from = new Date(row.at.getTime() - 86_400_000).toISOString();
    return "/admin/journeys/" + encodeURIComponent(row.journeyId)
      + "?" + new URLSearchParams({ from, to, environment }).toString();
  }
  if (row.searchHistoryId) return "/admin/searches/" + encodeURIComponent(row.searchHistoryId)
    + "?" + new URLSearchParams({ environment }).toString();
  return null;
}
function RecordedEvent({ row, environment, now }: { row: ActivityRow; environment: string; now: Date }) {
  const href = detailHref(row, environment, now);
  return <li data-activity-id={row.id} className="flex min-w-0 flex-col gap-1.5 py-3 sm:flex-row sm:items-start sm:gap-4">
    <span aria-hidden="true" className="mt-0.5 hidden shrink-0 text-[#64748B] sm:block"><EventIcon stage={row.stage} /></span>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-[#020617]">{row.label}</p>
        <time dateTime={row.at.toISOString()} className="shrink-0 text-[12px] font-normal text-[#64748B]">{hourLabel(row.at)}</time>
      </div>
      <p className="mt-1 break-words text-[12px] leading-5 text-[#64748B]">{row.detail || "No additional details recorded"}</p>
      {href ? <Link href={href} className="focus-ring mt-1.5 inline-flex items-center gap-0.5 rounded-sm text-[12px] font-medium text-[#004BB8] hover:underline">
        {row.journeyId ? "Open journey" : "Open search"} <ChevronRight size={14} aria-hidden="true" />
      </Link> : null}
    </div>
  </li>;
}
function dayGroups(events: ActivityRow[]) {
  const byDate = new Map<string, ActivityRow[]>();
  for (const event of events) {
    const date = event.at.toISOString().slice(0, 10);
    const rows = byDate.get(date) ?? [];
    rows.push(event);
    byDate.set(date, rows);
  }
  return [...byDate].map(([date, rows]) => ({
    date, rows, journeys: groupActivityRows(rows),
  }));
}
function journalTitle(rows: ActivityRow[]) {
  const summary = rows.find(row => row.stage === "SEARCH_COMPLETED")
    ?? rows.find(row => row.stage === "RESULTS_VIEWED") ?? rows[0];
  const parts = summary?.detail?.split(" · ").filter(Boolean) ?? [];
  if (!parts.length) return "Recorded activity";
  // Use only already-sanitized, source-recorded product and route/destination.
  return parts.slice(0, 2).join(" · ");
}

/** Group by recorded UTC day, then journey. All source rows remain in the DOM,
 * including individually timestamped, linked events inside disclosures.
 * Neither the environment nor the selected filter scope changes here.
 */
export function ActivityTimeline({ events, nextHref, environment, order = "newest", sortControl }: {
  events: ActivityRow[];
  nextHref: string | null;
  environment: string;
  order?: "newest" | "oldest";
  sortControl?: React.ReactNode;
}) {
  const now = new Date();
  return <section aria-labelledby="activity-history-title" className="min-w-0">
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 pb-3">
      <h2 id="activity-history-title" className="text-[17px] font-semibold tracking-tight text-[#020617]">Activity history</h2>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-[12px] text-[#64748B]">{events.length} recorded {events.length === 1 ? "event" : "events"}</span>
        {sortControl}
      </div>
    </div>
    {!events.length ? (
      <div className="flex min-h-[232px] flex-col items-center justify-center rounded-lg border border-[#D8E1EC] px-4 py-8 text-center">
        <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B]"><Clock3 size={29} strokeWidth={1.8} /></span>
        <p className="mt-3 text-[14px] font-semibold text-[#020617]">No activity recorded in this view</p>
        <p className="mt-1 max-w-xl text-[13px] leading-5 text-[#64748B]">
          No matching recorded activity is currently linked to this identity in {environment}.
        </p>
        <p className="mt-1 text-[12px] text-[#64748B]">Try adjusting your filters or date range.</p>
      </div>
    ) : (
      <div className="min-w-0 rounded-lg border border-[#D8E1EC] px-4 py-2 sm:px-6">
        {dayGroups(events).map(day => <section key={day.date} aria-label={"Activity on " + dayLabel(new Date(day.date + "T12:00:00Z"))}
          className="grid min-w-0 gap-3 border-b border-[#E7ECF5] py-4 last:border-b-0 sm:grid-cols-[92px_minmax(0,1fr)]">
          <div className="shrink-0">
            <h3 className="text-[13px] font-semibold text-[#020617]">{dayLabel(new Date(day.date + "T12:00:00Z"))}</h3>
            <span className="text-[12px] text-[#64748B]">UTC</span>
          </div>
          <div className="relative min-w-0 space-y-4 border-l-2 border-[#D8E1EC] pl-5">
            {day.journeys.map(group => <section key={group.key}
              aria-label={group.journeyId ? "Recorded journey " + group.journeyId : "Other recorded activity"}
              className="relative min-w-0">
              <span aria-hidden="true" className="absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-[#D8E1EC] bg-white text-[#475569]">
                <ProductIcon product={group.products[0]} />
              </span>
              <div className="flex flex-wrap items-start justify-between gap-2 pb-1">
                <div className="min-w-0">
                  <h4 className="break-words text-[13px] font-semibold text-[#020617]">{group.journeyId ? journalTitle(group.events) : "Other recorded activity"}</h4>
                  {group.journeyId ? <p className="mt-1 text-[12px] text-[#64748B]">Recorded journey · {group.events.length} {group.events.length === 1 ? "event" : "events"}</p>
                    : <p className="mt-1 text-[12px] text-[#64748B]">Not linked to a recorded journey</p>}
                </div>
                <span className="text-[12px] text-[#64748B]">{group.events.length} recorded {group.events.length === 1 ? "event" : "events"}</span>
              </div>
              <ol className="divide-y divide-[#E7ECF5]">
                {compactActivityDisplayRows(group.events).map(item => item.kind === "event"
                  ? <RecordedEvent key={item.row.id} row={item.row} environment={environment} now={now} />
                  : <li key={item.rows[0].id} className="py-2">
                      <details data-testid="selection-run" className="group min-w-0">
                        <summary className="focus-ring flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 rounded-sm py-2 text-[13px] font-medium text-[#020617] [&::-webkit-details-marker]:hidden">
                          <span>Offer selected · {item.rows.length} events</span>
                          <span className="inline-flex items-center gap-1 text-[12px] text-[#004BB8]">Show records <ChevronRight size={14} aria-hidden="true" className="transition-transform group-open:rotate-90"/></span>
                        </summary>
                        <ol className="divide-y divide-[#E7ECF5] border-t border-[#E7ECF5] pl-2">
                          {item.rows.map(row => <RecordedEvent key={row.id} row={row} environment={environment} now={now} />)}
                        </ol>
                      </details>
                    </li>
                )}
              </ol>
            </section>)}
          </div>
        </section>)}
      </div>
    )}
    {nextHref ? <div className="flex justify-end pt-4">
      <Link className="focus-ring inline-flex items-center gap-1 rounded-sm text-[13px] font-medium text-[#004BB8] hover:underline" href={nextHref}>
        {order === "oldest" ? "Newer activity" : "Older activity"} <ChevronRight size={15} aria-hidden="true"/>
      </Link>
    </div> : null}
  </section>;
}
