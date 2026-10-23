import Link from "next/link";
import { Building2, CarFront, ChevronRight, CircleDot, ExternalLink, ListChecks, MousePointerClick, Plane, Search } from "lucide-react";
import { compactActivityDisplayRows, groupActivityRows } from "@/lib/adminIdentityActivity";
import type { ActivityRow } from "@/lib/adminIdentityJourney";

const format = (at: Date) => new Intl.DateTimeFormat("en", {
  dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
}).format(at) + " UTC";

function ProductIcon({ product }: { product: string | null | undefined }) {
  if (product === "FLIGHT") return <Plane size={16} aria-hidden="true" />;
  if (product === "HOTEL") return <Building2 size={16} aria-hidden="true" />;
  if (product === "CAR") return <CarFront size={16} aria-hidden="true" />;
  return <CircleDot size={16} aria-hidden="true" />;
}

function EventIcon({ stage }: { stage: ActivityRow["stage"] }) {
  if (stage === "SEARCH_COMPLETED") return <Search size={16} aria-hidden="true" />;
  if (stage === "RESULTS_VIEWED") return <ListChecks size={16} aria-hidden="true" />;
  if (stage === "OFFER_SELECTED") return <MousePointerClick size={16} aria-hidden="true" />;
  if (stage === "PROVIDER_HANDOFF_STARTED") return <ExternalLink size={16} aria-hidden="true" />;
  return <CircleDot size={16} aria-hidden="true" />;
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
  return <li data-activity-id={row.id} className="flex min-w-0 items-start gap-3 py-3">
    <span aria-hidden="true" className="mt-0.5 shrink-0 text-[#475569]"><EventIcon stage={row.stage} /></span>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[13px] font-semibold text-[#020617]">{row.label}</p>
        <time dateTime={row.at.toISOString()} className="text-[12px] text-[#64748B]">{format(row.at)}</time>
      </div>
      <p className="mt-1 break-words text-[13px] text-[#475569]">{row.detail || "No additional details recorded"}</p>
      {href ? <Link href={href} className="focus-ring mt-1.5 inline-flex items-center gap-1 rounded-sm text-[12px] font-medium text-[#004BB8] hover:underline">
        {row.journeyId ? "Open journey" : "Open search"} <ChevronRight size={14} aria-hidden="true" />
      </Link> : null}
    </div>
  </li>;
}

/** All 20 recorded rows remain in the DOM and keep their original links/times. */
export function ActivityTimeline({ events, nextHref, environment }: { events: ActivityRow[]; nextHref: string | null; environment: string }) {
  const groups = groupActivityRows(events);
  const now = new Date();
  return <section aria-labelledby="activity-timeline-title" className="min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D8E1EC] pb-3">
      <h2 id="activity-timeline-title" className="text-[16px] font-semibold text-[#020617]">Activity timeline</h2>
      <span className="text-[12px] text-[#475569]">Newest recorded first · {events.length} on this page</span>
    </div>
    {!events.length ? <div className="py-12 text-center text-[13px] text-[#475569]">
      <p className="font-medium text-[#020617]">No recorded activity is linked to this identity here.</p>
      <p className="mx-auto mt-2 max-w-lg text-[12px] leading-5 text-[#64748B]">
        This view includes only recorded {environment} activity attributed to the identity that matches the selected filters.
        Searches without an eligible identity link, or those made on a different environment, will not appear here.
      </p>
    </div> : (
      <div>
        {groups.map(group => <section key={group.key} aria-label={group.journeyId ? "Recorded journey " + group.journeyId : "Other recorded activity"} className="min-w-0 border-b border-[#D8E1EC] py-3">
          <div className="flex flex-wrap items-start justify-between gap-2 py-2">
            <div className="flex min-w-0 items-start gap-2.5">
              <span aria-hidden="true" className="mt-0.5 shrink-0 text-[#475569]"><ProductIcon product={group.products[0]} /></span>
              <div className="min-w-0">
                <h3 className="text-[13px] font-semibold text-[#020617]">
                  {group.journeyId ? "Journey · " + (group.startedAt ? format(group.startedAt) : group.journeyId.slice(0, 10)) : "Other recorded activity"}
                </h3>
                <p className="mt-1 break-words text-[12px] text-[#475569]">
                  {group.products.join(" · ") || "Other activity"}
                  {group.journeyId ? " · " + group.journeyId.slice(0, 12) + "…" : " · Not linked to a journey"}
                </p>
              </div>
            </div>
            <span className="text-[12px] font-medium text-[#475569]">{group.events.length} recorded {group.events.length === 1 ? "event" : "events"}</span>
          </div>
          <ol className="divide-y divide-[#E7ECF5]">
            {compactActivityDisplayRows(group.events).map(item =>
              item.kind === "event"
                ? <RecordedEvent key={item.row.id} row={item.row} environment={environment} now={now} />
                : <li key={item.rows[0].id} className="py-2.5">
                    <details data-testid="selection-run" className="group min-w-0">
                      <summary className="focus-ring flex flex-wrap cursor-pointer list-none items-center justify-between gap-2 rounded-sm px-1 py-2 text-[13px] font-medium text-[#020617] hover:bg-[#F8FAFC] [&::-webkit-details-marker]:hidden">
                        <span>Offer selected · {item.rows.length} events</span>
                        <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-[#004BB8]">
                          Show records <ChevronRight size={15} aria-hidden="true" className="transition-transform group-open:rotate-90" />
                        </span>
                      </summary>
                      <ol className="mt-1 divide-y divide-[#E7ECF5] border-t border-[#E7ECF5] pl-2">
                        {item.rows.map(row => <RecordedEvent key={row.id} row={row} environment={environment} now={now} />)}
                      </ol>
                    </details>
                  </li>
            )}
          </ol>
        </section>)}
      </div>
    )}
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <p className="text-[12px] text-[#64748B]">Only recorded events are shown. Older events are loaded on demand.</p>
      {nextHref ? <Link className="focus-ring inline-flex items-center gap-1.5 rounded-sm text-[13px] font-medium text-[#004BB8] hover:underline" href={nextHref}>
        Older activity <ChevronRight size={15} aria-hidden="true" />
      </Link> : null}
    </div>
  </section>;
}
