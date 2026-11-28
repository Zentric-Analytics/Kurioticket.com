import Link from "next/link";
import { ArrowLeft, Plane, Building2, CarFront, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { formatAdminTimeZoneLabel } from "@/lib/adminLocalTime";
import type { IdentityActivitySummary } from "@/services/adminIdentityActivityService";
import { AdminActivityDataDialog, type ActivityCoverage } from "./AdminActivityDataDialog";

const format = (at: Date, timeZone: string) => new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone,
}).format(at);
function HeaderTime({ at, timeZone }: { at: Date; timeZone: string }) {
  const label = format(at, timeZone);
  return <time dateTime={at.toISOString()} title={label + " " + formatAdminTimeZoneLabel(timeZone, at)}>{label}</time>;
}
function Fact({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) {
  return <div data-testid={testId} className="min-w-0 py-1">
    <dt className="text-[12px] text-[#64748B]">{label}</dt>
    <dd className="mt-1 break-words text-[14px] font-medium leading-6 tabular-nums text-[#0F172A]">{children}</dd>
  </div>;
}
function UnavailableValue({ reason = "Unavailable" }: { reason?: string }) {
  return <span aria-label="Unavailable" title={reason}>—</span>;
}

export type ActivityMetricKey = "searches" | "resultsViewed" | "offersSelected" | "providerHandoffs" | "journeysTracked" | "pagesVisited";
const metrics: {key: ActivityMetricKey; label: string}[] = [
  {key:"searches",label:"Searches"}, {key:"resultsViewed",label:"Results viewed"},
  {key:"offersSelected",label:"Offers selected"}, {key:"providerHandoffs",label:"Provider handoffs"},
  {key:"journeysTracked",label:"Journeys tracked"}, {key:"pagesVisited",label:"Pages visited"},
];
type Props = {
  backHref: string; backLabel?: string; title: string; badge: string; avatar: string;
  accountStatus?: string; identityDetails?: ReactNode; management?: ReactNode;
  firstLabel: string; firstSeenAt: Date | null; lastSeenAt: Date | null; lastSeenAvailable?: boolean;
  eventCount: number | null;
  /** null means historical ownership is unavailable, not a measured zero. */
  summary: IdentityActivitySummary | null;
  metricLinks?: Partial<Record<ActivityMetricKey, string>>;
  unavailableMetrics?: Partial<Record<ActivityMetricKey, string>>;
  periodControl?: ReactNode; periodLabel?: string; accessContext?: ReactNode;
  coverage?: ActivityCoverage; timeZone: string; children: ReactNode;
};

/** The same identity, summary and activity hierarchy for accounts and guests. */
export function AdminCustomerActivityWorkspace({
  backHref, backLabel = "Users", title, badge, avatar, accountStatus, identityDetails, management,
  firstLabel, firstSeenAt, lastSeenAt, lastSeenAvailable, eventCount, summary, metricLinks = {},
  unavailableMetrics = {}, periodControl, periodLabel = "Today", accessContext, coverage,
  timeZone, children,
}: Props) {
  return <div className="min-w-0 space-y-3 bg-white pb-5 text-[#0F172A]">
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px] text-[#475569]">
        <Link href={backHref} className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg hover:text-[#004BB8]">
          <ArrowLeft size={16} aria-hidden="true"/> {backLabel}
        </Link>
        <span aria-hidden="true">/</span><span className="font-medium text-[#0F172A]">Activity</span>
      </nav>
      <AdminActivityDataDialog coverage={coverage}/>
    </div>
    <section data-testid="activity-page-card" aria-label="Customer activity workspace"
      className="min-w-0 space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
      <section data-testid="activity-info-grid" aria-label="Customer identity" className="min-w-0 space-y-3">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 basis-full items-start gap-3 sm:flex-1 sm:basis-0 sm:gap-4">
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EDF4FF] text-lg font-semibold text-[#004BB8] sm:h-12 sm:w-12">{avatar}</span>
            <div className="min-w-0 flex-1">
              <h1 className="break-words text-xl font-semibold leading-7 [overflow-wrap:anywhere]">{title}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px]">
                <span className="rounded-full border border-[#D8E1EC] px-2.5 py-1 text-[#475569]">{badge}</span>
                {accountStatus ? <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[#475569]">{accountStatus}</span> : null}
              </div>
              {identityDetails}
            </div>
          </div>
          {management ? <div className="flex w-full min-w-0 shrink-0 justify-end sm:w-auto" aria-label="Identity management">{management}</div> : null}
        </div>
        <dl data-testid="activity-identity-facts" className={"grid min-w-0 grid-cols-1 gap-x-5 gap-y-2 border-t border-[#F1F5F9] pt-2 " + (summary === null ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
          <Fact label={firstLabel}>{firstSeenAt ? <HeaderTime timeZone={timeZone} at={firstSeenAt}/> : <UnavailableValue/>}</Fact>
          <Fact label="Last seen">{lastSeenAvailable === false ? <UnavailableValue/> : lastSeenAt ? <HeaderTime timeZone={timeZone} at={lastSeenAt}/> : <UnavailableValue/>}</Fact>
          {summary !== null ? <Fact label="Recorded actions in period" testId="activity-events-fact">{eventCount === null ? <UnavailableValue/> : eventCount.toLocaleString("en-US")}</Fact> : null}
        </dl>
        {accessContext}
      </section>
      <section aria-label="Activity summary" className="min-w-0 space-y-3 border-t border-[#E2E8F0] pt-4">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-base font-semibold">{summary === null ? "Activity availability" : "Activity overview"}</h2>
            {summary !== null ? <p className="mt-1 text-[12px] text-[#64748B]">Reporting period: <span className="font-medium text-[#475569]">{periodLabel}</span></p> : null}
          </div>
          {periodControl ? <div className="w-full min-w-0 sm:w-auto sm:min-w-[300px]">{periodControl}</div> : null}
        </div>
        {summary === null ? <p role="status" className="text-[13px] leading-6 text-[#64748B]">Recorded activity history is unavailable for this temporary guest session. Current access information is shown when it can be verified.</p> : <div data-testid="activity-metrics-grid" className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {metrics.map(({key,label}) => {
            const reason = unavailableMetrics[key];
            const count = reason || summary === null ? null : summary[key] ?? (key === "pagesVisited" ? 0 : null);
            const href = count === null ? undefined : metricLinks[key];
            const content = <>
              <span data-testid="activity-metric-label" className="block break-words text-[12px] leading-5 text-[#64748B]">{label}</span>
              <span data-testid="activity-metric-value" className="mt-1 block text-[20px] font-semibold leading-7 tabular-nums text-[#0F172A]">{count == null ? <UnavailableValue reason={reason}/> : count.toLocaleString("en-US")}</span>
              {reason ? <span className="mt-1 block text-[12px] leading-4 text-[#64748B]">Not available</span> : null}
              {key === "searches" && summary?.searchProducts ? <span aria-label="Searches by product" className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-4 text-[#64748B]">
                {[{label:"Flights",count:summary.searchProducts.flights,Icon:Plane},{label:"Hotels",count:summary.searchProducts.hotels,Icon:Building2},{label:"Cars",count:summary.searchProducts.cars,Icon:CarFront}].map(({label,count,Icon}) =>
                  <span key={label} aria-label={label + ": " + count} title={label} className="inline-flex items-center gap-1 tabular-nums"><Icon size={12} aria-hidden="true"/>{count}</span>)}
                {summary.searchProducts.other > 0 ? <span>Other: {summary.searchProducts.other}</span> : null}
                {summary.searchProducts.packages ? <span>Packages: {summary.searchProducts.packages}</span> : null}
              </span> : null}
              {href ? <ArrowUpRight aria-hidden="true" size={13} className="absolute right-2 top-2 text-[#64748B]"/> : null}
            </>;
            const className = "relative min-w-0 rounded-lg border border-[#E2E8F0] p-2.5 sm:p-3 " + (href ? "focus-ring hover:border-[#9DBBE7] hover:bg-[#F8FBFF]" : "bg-white");
            return href ? <Link key={key} data-testid="activity-metric" href={href} aria-label={"View " + label.toLowerCase() + ": " + count}
              title={key === "journeysTracked" ? "Journeys with exact recorded links. All activity also includes actions recorded separately." : undefined} className={className}>{content}</Link>
              : <div key={key} data-testid="activity-metric" title={reason} className={className}>{content}</div>;
          })}
        </div>}
      </section>
      {children}
    </section>
  </div>;
}
