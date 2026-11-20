import Link from "next/link";
import { ChevronRight, Route } from "lucide-react";
import { activityOverviewRows } from "@/lib/adminActivityOverview";
import type { ActivityRow } from "@/lib/adminIdentityJourney";

const stamp = (date: Date) => new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit",
  minute: "2-digit", timeZone: "UTC", hour12: false,
}).format(date) + " UTC";
const name = (product: string) => ({
  FLIGHT: "Flight", HOTEL: "Hotel", CAR: "Car", PACKAGE: "Package",
} as Record<string,string>)[product] ?? "Recorded product";
const action = "focus-ring inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-[13px] font-medium text-[#004BB8] hover:bg-[#F1F6FF]";

export function AdminActivityOverview({
  events, journeyHistoryHref, operational, otherHref,
}: {
  events: ActivityRow[];
  journeyHistoryHref: string;
  operational: boolean;
  otherHref: string;
}) {
  const overview = activityOverviewRows(events);
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
          return <div key={journey.id} data-testid="activity-journey-row" className="flex min-w-0 items-start gap-3 py-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Route size={17} className="mt-0.5 shrink-0 text-[#64748B]" aria-hidden="true" />
              <div className="min-w-0">
                <p className="break-words text-[13px] font-medium text-[#0F172A]">{detail}</p>
                <p className="mt-1 text-[12px] text-[#64748B]">{stamp(journey.at)} · {journey.eventCount} matching {journey.eventCount === 1 ? "event" : "events"}</p>
                {parts.length ? <p className="mt-1 text-[12px] text-[#64748B]">{parts.join(" · ")}</p> : null}
              </div>
            </div>
          </div>;
        })}
      </div> : <p className="rounded-lg border border-[#E2E8F0] p-4 text-[13px] text-[#64748B]">No tracked journeys match these filters. Open Journey History to review full records.</p>}
    </section> : <section aria-label="Operational guest session" className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-[#475569]">This guest session has operational records, not a consented journey.</p>
        <Link href={otherHref} className={action}>View recorded session activity <ChevronRight size={15} aria-hidden="true" /></Link>
      </div>
    </section>}
  </section>;
}
