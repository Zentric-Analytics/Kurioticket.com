import Link from "next/link";
import { ChevronRight, Route } from "lucide-react";
import { activityOverviewRows } from "@/lib/adminActivityOverview";
import { ActivityTimeline } from "@/components/admin/ActivityTimeline";
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
  events, journeyHistoryHref, operational, environment,
}: {
  events: ActivityRow[];
  journeyHistoryHref: string;
  operational: boolean;
  environment: string;
}) {
  const overview = activityOverviewRows(events);
  return <section data-testid="activity-overview" aria-label="Activity overview" className="min-w-0 space-y-6">
    {!operational ? <section aria-labelledby="recent-journeys-title" className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="recent-journeys-title" className="text-[16px] font-semibold text-[#0F172A]">Recent journeys</h2>
          <p className="mt-1 text-[12px] text-[#64748B]">
            {overview.matchingSearchCount} matching {overview.matchingSearchCount === 1 ? "search" : "searches"} · Latest {Math.min(10, overview.matchingSearchCount)} shown
          </p>
        </div>
        <Link href={journeyHistoryHref} className={action}>View Journey History <ChevronRight size={15} aria-hidden="true" /></Link>
      </div>
      {overview.searches.length ? <div className="divide-y divide-[#E2E8F0] border-y border-[#E2E8F0]">
        {overview.searches.map(search => {
          const counts = [
            { label: "Results viewed", value: search.resultsViewed },
            { label: "Offers selected", value: search.offersSelected },
            { label: "Provider handoffs", value: search.handoffs },
          ];
          return <article key={search.id} data-testid="activity-journey-row" aria-label={name(search.product ?? "") + " search record"} className="min-w-0 py-3.5">
            <div className="flex min-w-0 items-start gap-3">
              <Route size={17} className="mt-0.5 shrink-0 text-[#64748B]" aria-hidden="true" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <h3 className="break-words text-[13px] font-semibold text-[#0F172A]">{name(search.product ?? "")} search</h3>
                    {search.route ? <p className="mt-1 break-words text-[12px] text-[#475569]">{search.route}</p> : null}
                  </div>
                  <time dateTime={(search.searchedAt ?? search.at).toISOString()} className="shrink-0 text-[12px] text-[#64748B]">{stamp(search.searchedAt ?? search.at)}</time>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#64748B]">
                  {search.platform ? <span>Platform: <span className="font-medium text-[#334155]">{search.platform === "IOS" ? "iOS app" : search.platform === "ANDROID" ? "Android app" : "Website"}</span></span> : null}
                  {search.searchStatus ? <span>Status: <span className="font-medium text-[#334155]">{search.searchStatus.replaceAll("_", " ").toLowerCase()}</span></span> : null}
                  {search.resultCount !== null ? <span>Results returned: <span className="font-medium tabular-nums text-[#334155]">{search.resultCount}</span></span> : null}
                  <span>{search.eventCount} recorded {search.eventCount === 1 ? "stage" : "stages"}</span>
                  {!search.journeyId ? <span>Search record only</span> : null}
                </div>
                <dl className="grid min-w-0 grid-cols-3 gap-2 sm:max-w-[550px]">
                  {counts.map(({ label, value }) => <div key={label} className="min-w-0 rounded-md border border-[#E2E8F0] px-2.5 py-2">
                    <dt className="text-[11px] leading-4 text-[#64748B]">{label}</dt>
                    <dd className="mt-1 text-[14px] font-semibold tabular-nums text-[#0F172A]">{value}</dd>
                  </div>)}
                </dl>
                {search.providers.length ? <p className="break-words text-[12px] text-[#64748B]">Recorded providers: {search.providers.join(", ")}</p> : null}
              </div>
            </div>
          </article>;
        })}
      </div> : <p className="rounded-lg border border-[#E2E8F0] p-4 text-[13px] text-[#64748B]">No recorded searches match these filters. Open Journey History to review full records.</p>}
      {overview.unlinkedStageCount > 0 ? <p className="mt-2 text-[12px] text-[#64748B]">
        {overview.unlinkedStageCount} recorded {overview.unlinkedStageCount === 1 ? "stage has" : "stages have"} no verified search reference; {overview.unlinkedStageCount === 1 ? "it is" : "they are"} not assigned to another search. View Journey History for the full chronology.
      </p> : null}
    </section> : <section aria-label="Operational guest session" className="min-w-0">
      {/* Operational searches and handoffs are already owner-scoped by the
          authorized reader. Display their actual events here, not a link to
          another page or fabricated consented journeys. */}
      <p className="mb-3 text-[12px] text-[#64748B]">Recorded searches and handoffs for this session.</p>
      <ActivityTimeline events={events} nextHref={null} environment={environment}/>
    </section>}
  </section>;
}
