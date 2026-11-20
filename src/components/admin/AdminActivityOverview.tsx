import Link from "next/link";
import { ArrowUpRight, ChevronRight, Route, ClipboardList } from "lucide-react";
import { activityOverviewRows, completeJourneyDetailHref } from "@/lib/adminActivityOverview";
import type { ActivityRow, IdentityKind } from "@/lib/adminIdentityJourney";

const stamp = (date: Date) => new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit",
  minute: "2-digit", timeZone: "UTC", hour12: false,
}).format(date) + " UTC";
const name = (product: string) => ({
  FLIGHT: "Flight", HOTEL: "Hotel", CAR: "Car", PACKAGE: "Package",
} as Record<string,string>)[product] ?? "Recorded product";
const action = "focus-ring inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-[13px] font-medium text-[#004BB8] hover:bg-[#F1F6FF]";

export function AdminActivityOverview({
  events, kind, identityId, environment, returnHref, journeyHistoryHref,
  otherHref, operational,
}: {
  events: ActivityRow[];
  kind: IdentityKind;
  identityId: string;
  environment: "staging" | "production";
  returnHref: string;
  journeyHistoryHref: string;
  otherHref: string;
  operational: boolean;
}) {
  const overview = activityOverviewRows(events);
  const now = new Date();
  return <section data-testid="activity-overview" aria-label="Activity overview" className="min-w-0 space-y-6">
    {!operational ? <section aria-labelledby="recent-journeys-title" className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="recent-journeys-title" className="text-[16px] font-semibold text-[#0F172A]">Recent journeys</h2>
          <p className="mt-1 text-[12px] text-[#64748B]">
            {overview.matchingJourneyCount} matching {overview.matchingJourneyCount === 1 ? "journey" : "journeys"} · Latest five shown
          </p>
        </div>
        <Link href={journeyHistoryHref} className={action}>View Journey History <ChevronRight size={15} aria-hidden="true" /></Link>
      </div>
      {overview.journeys.length ? <div className="divide-y divide-[#E2E8F0] border-y border-[#E2E8F0]">
        {overview.journeys.map(journey => {
          const productTitle = journey.products.map(name).join(", ") || "Recorded journey";
          const detail = journey.route ? productTitle + " · " + journey.route : productTitle;
          const parts = [
            journey.searches ? journey.searches + " searches" : null,
            journey.resultsViewed ? journey.resultsViewed + " results viewed" : null,
            journey.offersSelected ? journey.offersSelected + " selections" : null,
            journey.handoffs ? journey.handoffs + " handoffs" : null,
          ].filter(Boolean);
          return <div key={journey.id} data-testid="activity-journey-row" className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Route size={17} className="mt-0.5 shrink-0 text-[#64748B]" aria-hidden="true" />
              <div className="min-w-0">
                <p className="break-words text-[13px] font-medium text-[#0F172A]">{detail}</p>
                <p className="mt-1 text-[12px] text-[#64748B]">{stamp(journey.at)} · {journey.eventCount} matching {journey.eventCount === 1 ? "event" : "events"}</p>
                {parts.length ? <p className="mt-1 text-[12px] text-[#64748B]">{parts.join(" · ")}</p> : null}
              </div>
            </div>
            <Link href={completeJourneyDetailHref(journey.id,kind,identityId,environment,now,returnHref)}
              className={action} aria-label={"View journey for " + detail}>
              View journey <ChevronRight size={15} aria-hidden="true"/>
            </Link>
          </div>;
        })}
      </div> : <p className="rounded-lg border border-[#E2E8F0] p-4 text-[13px] text-[#64748B]">No tracked journeys match these filters. Other recorded actions may still appear below.</p>}
    </section> : null}
    <section aria-labelledby="other-activity-title" className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="other-activity-title" className="text-[16px] font-semibold text-[#0F172A]">
            {operational ? "Recent operational activity" : "Other recorded activity"}
          </h2>
          <p className="mt-1 text-[12px] text-[#64748B]">
            {overview.otherCount} matching {overview.otherCount === 1 ? "event" : "events"} outside tracked journeys · Latest five shown
          </p>
        </div>
        <Link href={otherHref} className={action}>View all other activity <ArrowUpRight size={15} aria-hidden="true"/></Link>
      </div>
      {overview.other.length ? <div className="divide-y divide-[#E2E8F0] border-y border-[#E2E8F0]">
        {overview.other.map(row => <div key={row.id} data-testid="activity-other-row"
          className="flex min-w-0 items-start gap-3 py-3">
          <ClipboardList size={16} className="mt-0.5 shrink-0 text-[#64748B]" aria-hidden="true"/>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-[13px] font-medium text-[#0F172A]">{row.label}</p>
              <time dateTime={row.at.toISOString()} className="text-[12px] tabular-nums text-[#64748B]">{stamp(row.at)}</time>
            </div>
            <p className="mt-1 truncate text-[12px] text-[#64748B]" title={row.detail}>
              {row.detail || "No additional details recorded"}
            </p>
          </div>
        </div>)}
      </div> : <p className="rounded-lg border border-[#E2E8F0] p-4 text-[13px] text-[#64748B]">No other recorded activity matches these filters.</p>}
    </section>
  </section>;
}
