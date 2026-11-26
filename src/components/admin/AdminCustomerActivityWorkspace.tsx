import Link from "next/link";
import { ArrowLeft, Plane, Building2, CarFront } from "lucide-react";
import type { ReactNode } from "react";
import { formatAdminTimeZoneLabel } from "@/lib/adminLocalTime";
import type { IdentityActivitySummary } from "@/services/adminIdentityActivityService";

// Keep the UTC instant, but use a compact, unambiguous header label so
// each date stays on one line beside the workspace sidebar at desktop zoom.
const format = (at: Date, timeZone: string) => new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false, timeZone,
}).format(at);
// One common desktop grid: guest/customer identity spans two fifths, while
// First seen/Joined, Last seen and Events each occupy one fifth.
const activityColumns = "grid min-w-0 w-full gap-y-4 lg:grid-cols-5 lg:gap-y-0";
function HeaderTime({ at, timeZone }: { at: Date; timeZone: string }) {
  const label = format(at, timeZone);
  return <time dateTime={at.toISOString()} title={label + " " + formatAdminTimeZoneLabel(timeZone, at)}>{label}</time>;
}
function Fact({ label, children, className = "", testId }: {
  label: string; children: ReactNode; className?: string; testId?: string;
}) {
  return <div data-testid={testId} className={"min-w-0 border-l border-[#E2E8F0] pl-4 sm:pl-5 " + className}>
    <dt className="text-[12px] font-normal text-[#64748B]">{label}</dt>
    <dd className="mt-1 break-words text-[16px] font-medium leading-6 tabular-nums text-[#0F172A]">{children}</dd>
  </div>;
}


function UnavailableValue() {
  return <span aria-label="Unavailable" title="Unavailable">—</span>;
}

type Props = {
  backHref: string;
  title: string;
  badge: string;
  avatar: string;
  identityDetails?: ReactNode;
  management?: ReactNode;
  firstLabel: "First seen" | "Joined";
  firstSeenAt: Date | null;
  lastSeenAt: Date | null;
  lastSeenAvailable?: boolean;
  eventCount: number | null;
  /** null means historical ownership is unavailable, not a measured zero. */
  summary: IdentityActivitySummary | null;
  timeZone: string;
  children: ReactNode;
};

/** One overview layout for all recorded identities and verified live sessions. */
export function AdminCustomerActivityWorkspace({
  backHref, title, badge, avatar, identityDetails, management, firstLabel, firstSeenAt,
  lastSeenAt, lastSeenAvailable, eventCount, summary, timeZone, children,
}: Props) {
  return <div className="min-w-0 space-y-6 bg-white pb-2 text-[#0F172A]">
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px] text-[#475569]">
      <Link href={backHref} className="focus-ring inline-flex items-center gap-1.5 rounded-sm hover:text-[#004BB8]">
        <ArrowLeft size={16} aria-hidden="true" /> Users
      </Link>
      <span aria-hidden="true">/</span>
      <span className="font-medium text-[#0F172A]">Activity</span>
    </nav>

    <section data-testid="activity-page-card" aria-label="Customer activity workspace"
      className="min-w-0 space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-6">
      <div data-testid="activity-info-grid"
        className="relative min-w-0 lg:-mx-6 lg:-mt-6 lg:border-y lg:border-[#E2E8F0]">
      <section aria-label="Customer identity" className="relative min-w-0">
        <div data-testid="activity-identity-facts" className={activityColumns + " relative lg:items-start lg:py-4"}>
          <div className="flex min-w-0 items-center gap-4 lg:col-span-2 lg:gap-3 lg:px-3 min-[1700px]:gap-4 min-[1700px]:px-6">
            <span aria-hidden="true"
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-xl font-semibold min-[1100px]:hidden min-[1700px]:flex">
              {avatar}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-xl font-semibold [overflow-wrap:anywhere]">
                  {title}
                </h1>
                <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs">
                  {badge}
                </span>
              </div>
              {identityDetails}
            </div>
          </div>

          <dl className="grid min-w-0 grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:contents">
            <Fact label={firstLabel} className="lg:border-l-0 lg:pl-2 2xl:pl-6">{firstSeenAt ? <HeaderTime timeZone={timeZone} at={firstSeenAt}/> : <UnavailableValue/>}</Fact>
            <Fact label="Last seen" className="lg:border-l-0 lg:pl-2 2xl:pl-6">{lastSeenAvailable === false ? "Unavailable" : lastSeenAt ? <HeaderTime timeZone={timeZone} at={lastSeenAt}/> : "—"}</Fact>
            <Fact label="Events" testId="activity-events-fact"
              className="lg:border-l-0 lg:pl-6 lg:pr-3">
              {eventCount === null ? <UnavailableValue/> : eventCount}
            </Fact>
          </dl>
        {/* Identity has five columns; the six metrics below have their own grid. */}
        <div aria-hidden="true" data-testid="activity-identity-dividers"
          className="pointer-events-none absolute inset-0 hidden lg:block">
          <span data-testid="activity-divider-40" className="absolute inset-y-0 left-[40%] border-l border-[#E2E8F0]" />
          <span data-testid="activity-divider-60" className="absolute inset-y-0 left-[60%] border-l border-[#E2E8F0]" />
          <span data-testid="activity-divider-80" className="absolute inset-y-0 left-[80%] border-l border-[#E2E8F0]" />
        </div>
        </div>

          {management ? <div
            className="flex min-w-0 justify-end pt-3 lg:px-3 lg:pb-3 lg:pt-0"
            aria-label="Identity management">{management}</div> : null}
      </section>

      <section aria-label="Activity summary" className="relative min-w-0 border-y border-[#E2E8F0] py-4 lg:border-b-0 lg:py-5">
        <div data-testid="activity-metrics-grid" className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 xl:grid-cols-6 lg:gap-x-0">
          {([
            { label: "Searches", count: summary?.searches },
            { label: "Results viewed", count: summary?.resultsViewed },
            { label: "Offers selected", count: summary?.offersSelected },
            { label: "Provider handoffs", count: summary?.providerHandoffs },
            { label: "Journeys tracked", count: summary?.journeysTracked },
            { label: "Pages visited", count: summary === null ? null : summary.pagesVisited ?? 0 },
          ]).map(({label,count}) => <div key={label} data-testid="activity-metric"
            className="min-w-0 pr-2 sm:pr-3 lg:px-3 xl:border-l xl:border-[#E2E8F0] xl:first:border-l-0">
            <span data-testid="activity-metric-label" className="block break-words text-[12px] font-normal text-[#64748B]">{label}</span>
            <span data-testid="activity-metric-value" className="mt-1 block text-[16px] font-medium leading-6 tabular-nums text-[#0F172A]">{count == null ? <UnavailableValue/> : count}</span>
            {label === "Searches" && summary?.searchProducts ? <div aria-label="Searches by product"
              className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-[11px] sm:gap-x-3 sm:text-xs leading-4 text-[#64748B]">
              {([
                { label: "Flights", count: summary.searchProducts.flights, Icon: Plane },
                { label: "Hotels", count: summary.searchProducts.hotels, Icon: Building2 },
                { label: "Cars", count: summary.searchProducts.cars, Icon: CarFront },
              ]).map(({label, count, Icon}) => <span key={label} aria-label={label + ": " + count} title={label}
                className="inline-flex items-center gap-0.5 tabular-nums sm:gap-1"><Icon size={12} aria-hidden="true" />{count}</span>)}
              {summary.searchProducts.other > 0 ? <span aria-label={"Other or unknown: " + summary.searchProducts.other}>
                Other: {summary.searchProducts.other}
              </span> : null}
            </div> : null}
          </div>)}
        </div>
      </section>
      </div>

      {children}
    </section>
  </div>;
}
