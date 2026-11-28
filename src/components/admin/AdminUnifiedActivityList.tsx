import Link from "next/link";
import { Monitor, FileText, Search, ExternalLink, CircleDot, ChevronRight, Bookmark, SlidersHorizontal, Bell, Share2, MousePointerClick, ShieldCheck } from "lucide-react";
import type { ActivityRow, IdentityKind } from "@/lib/adminIdentityJourney";
import { hotelResultSummary } from "@/lib/hotels/hotelResultAccounting";
import { adminActivitySearchHref } from "@/lib/adminUsersNavigation";
import { completeJourneyDetailHref } from "@/lib/adminActivityOverview";
import type { PublicEnvironment } from "@/lib/stagingSafety";

export type AccessPreview = { at: Date; detail: string; href?: string; label?: string };
type ListRow = { id: string; at: Date; label: string; detail: string; event?: ActivityRow; href?: string; access?: boolean };
const products: Record<string, string> = { FLIGHT: "Flight", HOTEL: "Hotel", CAR: "Car", PACKAGE: "Package" };
const platforms: Record<string, string> = { WEB: "Website", IOS: "iOS app", ANDROID: "Android app" };
const outcomes: Record<string, string> = { SUCCESS: "Success", PARTIAL: "Partial provider coverage", FAILED: "Failed" };
const identities = { administrator: "Administrator", registered: "Registered account", guest: "Guest" };

function searchOutcome(row: ActivityRow) {
  if (row.searchOutcome) return row.searchOutcome;
  // Older rows carry the recorded outcome as a final closed token. Never
  // infer failure from a zero result count or other descriptive text.
  const last = row.stage === "SEARCH_COMPLETED" ? row.detail.split(" · ").at(-1) : undefined;
  return last === "SUCCESS" || last === "PARTIAL" || last === "FAILED" ? last : undefined;
}

function actionLabel(row: ActivityRow) {
  if (row.stage === "SEARCH_COMPLETED") {
    const outcome = searchOutcome(row);
    if (outcome === "FAILED") return "Search failed";
    if (outcome === "PARTIAL") return "Search completed with partial coverage";
  }
  if (row.pageView && row.label !== "Page visited") return (row.pageView.transport === "native" ? "Viewed " : "Visited ") + row.label;
  return row.label;
}

function resultSummary(row: ActivityRow) {
  if (row.stage !== "SEARCH_COMPLETED" || typeof row.resultCount !== "number" || !Number.isSafeInteger(row.resultCount) || row.resultCount < 0) return null;
  if (row.product === "HOTEL") return hotelResultSummary(row.resultCount, row.hotelPropertyCount);
  if (row.resultUnit === "component_results") return row.resultCount.toLocaleString("en-US") + (row.resultCount === 1 ? " component result" : " component results");
  return row.resultCount.toLocaleString("en-US") + (row.product === "CAR"
    ? row.resultCount === 1 ? " recorded result" : " recorded results"
    : row.resultCount === 1 ? " result returned" : " results returned");
}

function describe(row: ActivityRow) {
  const parts = row.detail.split(" · ");
  if (row.product && parts[0] === row.product) parts[0] = products[row.product] ?? row.product;
  if (row.stage === "SEARCH_COMPLETED") {
    const last = parts.length - 1;
    parts[last] = outcomes[parts[last]] ?? parts[last];
  }
  return parts.join(" · ");
}

function summary(row: ListRow) {
  const event = row.event;
  if (event?.pageView) return event.pageView.transport === "native" ? "App screen visit" : "Website page visit";
  const parts = row.detail.split(" · ").filter(part => !part.startsWith("Reference: ") && !/^https?:\/\//i.test(part));
  if (event?.product && parts[0]?.toUpperCase() === event.product) parts.shift();
  if (event?.stage === "SEARCH_COMPLETED" && Object.values(outcomes).includes(parts.at(-1) ?? "")) parts.pop();
  if (event?.platformSource === "action") {
    const platform = event.platform === "WEB" ? "Web" : event.platform === "IOS" ? "iOS" : event.platform === "ANDROID" ? "Android" : null;
    if (platform) {
      const index = parts.indexOf(platform);
      if (index >= 0) parts.splice(index, 1);
    }
  }
  const result = event ? resultSummary(event) : null;
  return [...parts, ...(result ? [result] : [])].filter(Boolean).join(" · ");
}

function appearance(row: ListRow) {
  const stage = row.event?.stage;
  if (row.access) return { Icon: Monitor, color: "bg-[#F1F5F9] text-[#475569]" };
  if (stage === "ADMIN_SECURITY_AUDIT") return { Icon: ShieldCheck, color: "bg-[#F1F5F9] text-[#475569]" };
  if (stage === "PACKAGE_SEARCH_SUBMITTED") return { Icon: Search, color: "bg-[#EFF5FF] text-[#54749B]" };
  if (stage === "PAGE_VIEW") return { Icon: FileText, color: "bg-[#EFF5FF] text-[#54749B]" };
  if (stage === "SEARCH_COMPLETED") return { Icon: Search, color: searchOutcome(row.event!) === "FAILED" ? "bg-[#FFF1F2] text-[#BE3455]" : "bg-[#EFF5FF] text-[#54749B]" };
  if (stage === "PROVIDER_HANDOFF_STARTED") return { Icon: ExternalLink, color: "bg-[#EDF7F2] text-[#38775E]" };
  if (stage === "RESULT_SAVED" || stage === "RESULT_UNSAVED") return { Icon: Bookmark, color: "bg-[#F4F0FC] text-[#7A659D]" };
  if (stage === "RESULT_SHARED") return { Icon: Share2, color: "bg-[#F4F0FC] text-[#7A659D]" };
  if (stage === "PRICE_ALERT_CREATED") return { Icon: Bell, color: "bg-[#FFF7E9] text-[#96702F]" };
  if (stage === "OFFER_SELECTED" || stage === "PROVIDER_DEAL_SELECTED") return { Icon: MousePointerClick, color: "bg-[#F4F0FC] text-[#7A659D]" };
  if (stage === "SEARCH_EDIT_APPLIED" || stage === "SEARCH_FILTER_APPLIED" || stage === "SEARCH_SORT_CHANGED") return { Icon: SlidersHorizontal, color: "bg-[#EFF5FF] text-[#54749B]" };
  return { Icon: CircleDot, color: "bg-[#F1F5F9] text-[#64748B]" };
}

function EventDetails({ row, timeZone, environment, returnHref, accessHref, identity, now }: {
  row: ListRow; timeZone: string; environment: PublicEnvironment; returnHref?: string; accessHref?: string;
  identity?: { kind: IdentityKind; id: string }; now: Date;
}) {
  const event = row.event;
  const page = event?.pageView;
  const reference = row.detail.split(" · ").filter(part => part.startsWith("Reference: ")).map(part => part.slice("Reference: ".length));
  const description = row.detail.split(" · ").filter(part => !part.startsWith("Reference: ")).join(" · ");
  const results = event ? resultSummary(event) : null;
  const searchHref = event?.searchHistoryId ? adminActivitySearchHref(event.searchHistoryId, environment, returnHref ?? "") : null;
  const journeyHref = identity && event?.journeyId && returnHref
    ? completeJourneyDetailHref(event.journeyId, identity.kind, identity.id, environment, now, returnHref) : null;
  const accessLink = row.access ? row.href ?? accessHref : null;
  const stamp = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone, timeZoneName: "short" });
  const fieldClass = "min-w-0 space-y-1";
  const termClass = "text-[11px] font-medium uppercase tracking-wide text-[#64748B]";
  return <div id={"activity-details-" + row.id} data-testid="activity-event-details" className="mx-1 mb-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-[13px] sm:ml-12 sm:p-4">
    <dl className="grid min-w-0 gap-x-6 gap-y-4 sm:grid-cols-2">
      <div className={fieldClass}><dt className={termClass}>Recorded at</dt><dd className="break-words tabular-nums text-[#334155]">{stamp.format(row.at)}</dd></div>
      {event?.interface ? <div className={fieldClass}><dt className={termClass}>Interface</dt><dd>{event.interface === "admin" ? "Admin" : "Customer"}</dd></div> : null}
      {event?.originalIdentity && !page ? <div className={fieldClass}><dt className={termClass}>Acting identity</dt><dd>{identities[event.originalIdentity]}</dd></div> : null}
      {event?.outcome ? <div className={fieldClass}><dt className={termClass}>Outcome</dt><dd>{event.outcome === "succeeded" ? "Succeeded" : event.outcome === "rejected" ? "Rejected" : "Failed"}</dd></div> : null}
      {event?.product && products[event.product] ? <div className={fieldClass}><dt className={termClass}>Product</dt><dd>{products[event.product]}</dd></div> : null}
      {page ? <>
        <div className={fieldClass}><dt className={termClass}>{page.transport === "native" ? "App screen" : "Page address"}</dt><dd className="break-all">{page.href ? <a href={page.href} target="_blank" rel="noopener noreferrer" className="focus-ring text-[#004BB8] hover:underline">{page.href}</a> : page.path}</dd></div>
        <div className={fieldClass}><dt className={termClass}>Platform</dt><dd>{page.platform}</dd></div>
        {page.originalIdentity ? <div className={fieldClass}><dt className={termClass}>Identity at visit</dt><dd>{page.originalIdentity === "guest" ? "Guest" : "Registered account"}</dd></div> : null}
        {page.previousPath ? <div className={fieldClass}><dt className={termClass}>{page.transport === "native" ? "Previous observed screen" : "Previous observed page"}</dt><dd className="break-all">{page.previousPath}</dd></div> : null}
      </> : <>
        {description ? <div className={fieldClass + " sm:col-span-2"}><dt className={termClass}>Recorded details</dt><dd className="break-words leading-6 text-[#334155]">{description}</dd></div> : null}
        {event?.reportedActionPlatform || event?.platform ? <div className={fieldClass}><dt className={termClass}>{event.reportedActionPlatform || event.platformSource === "action" || event.stage === "SEARCH_COMPLETED" ? "Platform" : "Search platform"}</dt><dd>{event.reportedActionPlatform ?? (event.platform ? platforms[event.platform] : null)}</dd></div> : null}
      </>}
      {results ? <div className={fieldClass}><dt className={termClass}>Recorded results</dt><dd>{results}{event?.product === "CAR" ? <span className="mt-1 block text-[12px] text-[#64748B]">Rental offer count unavailable</span> : null}</dd></div> : null}
      {event?.observedResult ? <div className={fieldClass + " sm:col-span-2"}><dt className={termClass}>Quote shown to customer</dt><dd className="break-words">
        {event.observedResult.label} · {event.observedResult.provider} · {event.observedResult.currency} {event.observedResult.amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        {event.observedResult.priceBasis === "per_night" ? " per night" : event.observedResult.priceBasis === "per_day" ? " per day" : " total"}
      </dd></div> : null}
      {event?.originalSearchIdentity ? <div className={fieldClass}><dt className={termClass}>Original search identity</dt><dd>{event.originalSearchIdentity === "guest" ? "Guest" : "Registered account"}</dd></div> : null}
      {reference.length ? <div className={fieldClass + " sm:col-span-2"}><dt className={termClass}>Record reference</dt><dd className="space-y-1">{reference.map((value, index) => <code key={index} className="block break-all text-[12px] text-[#475569]">{value}</code>)}</dd></div> : null}
    </dl>
    {event?.originalSearchIdentity === "guest" && searchHref ? <p className="mt-4 border-t border-[#E2E8F0] pt-3 text-[12px] leading-5 text-[#64748B]">This search was recorded as guest activity. Its original search record retains that identity.</p> : null}
    {searchHref || journeyHref || accessLink ? <div className="mt-3 flex flex-wrap gap-3">
      {searchHref ? <Link href={searchHref} className="focus-ring inline-flex min-h-10 items-center gap-1 rounded-md text-[13px] font-medium text-[#004BB8] hover:underline">View original search <ChevronRight size={14} aria-hidden="true"/></Link> : null}
      {journeyHref ? <Link href={journeyHref} className="focus-ring inline-flex min-h-10 items-center gap-1 rounded-md text-[13px] font-medium text-[#004BB8] hover:underline">View journey <ChevronRight size={14} aria-hidden="true"/></Link> : null}
      {accessLink ? <Link href={accessLink} className="focus-ring inline-flex min-h-10 items-center gap-1 rounded-md text-[13px] font-medium text-[#004BB8] hover:underline">View access history <ChevronRight size={14} aria-hidden="true"/></Link> : null}
    </div> : null}
  </div>;
}

export function AdminUnifiedActivityList({ events, timeZone, environment, overview = false, access, accessHref, accessUnavailable, pagesUnavailable, allHref, allHrefPrefetch, nextHref, returnHref, newestHref, historyUnavailable, identity, now = new Date() }: {
  events: ActivityRow[]; timeZone: string; environment: PublicEnvironment; overview?: boolean;
  access?: AccessPreview | null; accessHref?: string; accessUnavailable?: boolean; pagesHref?: string;
  pagesUnavailable?: boolean; allHref?: string; allHrefPrefetch?: boolean; nextHref?: string | null;
  returnHref?: string; newestHref?: string; historyUnavailable?: string;
  identity?: { kind: IdentityKind; id: string }; now?: Date;
}) {
  const ordered = [...events].sort((a,b) => +b.at - +a.at || a.id.localeCompare(b.id));
  // One chronological preview across every meaningful action type. Passive
  // access observations live in the separate identity context above this list.
  const selected = overview ? ordered.filter(row => !row.id.startsWith("d-")).slice(0, 5) : ordered;
  const rows: ListRow[] = selected.map(event => ({ id: event.id, at: event.at, label: actionLabel(event), detail: describe(event), event,
    access: event.id.startsWith("d-") }));
  if (access && !overview) rows.push({ id: "latest-access-summary", at: access.at, label: access.label ?? "Latest recorded access", detail: access.detail, href: access.href, access: true });
  rows.sort((a,b) => +b.at - +a.at || a.id.localeCompare(b.id));
  const date = new Intl.DateTimeFormat("en-GB", { day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false,timeZone });
  return <section data-testid="unified-activity-list" aria-label={overview ? "Recent activity" : "All activity"} className="min-w-0 space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
      <div>{overview ? <h2 className="text-[16px] font-semibold">Recent activity</h2> : null}
        <p className={(overview ? "mt-1 " : "") + "text-[12px] text-[#64748B]"}>{overview ? "Latest five recorded actions in this period" : "Newest first"} · Select an action for details</p>
      </div>
      {allHref ? <Link href={allHref} prefetch={allHrefPrefetch} className="focus-ring inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-[#004BB8] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#003D97]">View all activity <ChevronRight size={15} aria-hidden="true"/></Link> : null}
    </div>
    {overview && (accessUnavailable || pagesUnavailable) ? <p role="status" className="text-[12px] text-[#64748B]">{accessUnavailable ? "Access information temporarily unavailable. " : ""}{pagesUnavailable ? "Page visit information temporarily unavailable." : ""}</p> : null}
    {!rows.length ? <p className="rounded-lg border border-[#E2E8F0] p-4 text-[13px] text-[#64748B]">{historyUnavailable ?? "No recorded activity matches this view."}</p> :
      <ol className="divide-y divide-[#E2E8F0] border-y border-[#E2E8F0]">
        {rows.map(row => {
          const { Icon, color } = appearance(row);
          const event = row.event;
          const description = summary(row);
          const platform = event?.pageView?.platform ?? event?.reportedActionPlatform ?? (event?.platform ? platforms[event.platform] : null);
          const platformIsSearch = !event?.pageView && !event?.reportedActionPlatform && event?.platformSource === "search" && event.stage !== "SEARCH_COMPLETED";
          return <li key={row.id} data-activity-id={row.id} data-users-refresh-anchor={row.id} className="min-w-0">
            {/* Native disclosure keeps keyboard behavior and open state on the
                keyed row when a background refresh inserts newer actions. */}
            <details className="group min-w-0">
              <summary aria-controls={"activity-details-" + row.id} aria-label={row.label + " — " + date.format(row.at)} className="focus-ring flex min-w-0 cursor-pointer list-none items-start gap-3 rounded-lg py-3.5 text-left hover:bg-[#F8FAFC] [&::-webkit-details-marker]:hidden sm:py-4">
                <span className={"mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl " + color}><Icon size={17} aria-hidden="true"/></span>
                <span className="block min-w-0 flex-1">
                  <span className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-1">
                    <span className="text-[14px] font-medium leading-5 text-[#0F172A]">{row.label}</span>
                    <time className="shrink-0 text-[12px] tabular-nums leading-5 text-[#64748B]" dateTime={row.at.toISOString()}>{date.format(row.at)}</time>
                  </span>
                  {description ? <span className="mt-1 block break-words text-[13px] leading-5 text-[#64748B]">{description}</span> : null}
                  {event?.product || platform || event?.interface || event?.originalSearchIdentity === "guest" ? <span className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] leading-4 text-[#64748B]">
                    {event?.interface ? <span>{event.interface === "admin" ? "Admin" : "Customer"}</span> : null}
                    {event?.product && products[event.product] ? <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 font-medium text-[#526B88]">{products[event.product]}</span> : null}
                    {platform ? <span>{platformIsSearch ? "Search: " : ""}{platform}</span> : null}
                    {event?.originalSearchIdentity === "guest" ? <span className="rounded bg-[#FFF8E8] px-1.5 py-0.5 text-[#89662D]">Search originally recorded as guest</span> : null}
                  </span> : null}
                </span>
                {/* The 16px icon reaches roughly 23px across mid-rotation.
                    Reserve that space so the animation stays inside the row. */}
                <span className="flex h-5 w-6 shrink-0 items-center justify-center">
                  <ChevronRight size={16} aria-hidden="true" className="text-[#94A3B8] transition-transform group-open:rotate-90"/>
                </span>
              </summary>
              <EventDetails row={row} timeZone={timeZone} environment={environment} returnHref={returnHref} accessHref={accessHref} identity={identity} now={now}/>
            </details>
          </li>;
        })}
      </ol>}
    {nextHref || newestHref ? <nav aria-label="Activity pagination" className="flex flex-wrap items-center justify-between gap-3 pt-3">
      {newestHref ? <Link href={newestHref} className="focus-ring inline-flex min-h-11 items-center rounded-lg border border-[#E2E8F0] px-3 text-[13px] font-medium text-[#004BB8] hover:bg-[#F8FAFC]">Newest activity</Link> : <span className="text-[12px] text-[#64748B]">{rows.length} {rows.length === 1 ? "record" : "records"} on this page</span>}
      {nextHref ? <Link href={nextHref} className="focus-ring inline-flex min-h-11 items-center gap-1 rounded-lg border border-[#E2E8F0] px-3 text-[13px] font-medium text-[#004BB8] hover:bg-[#F8FAFC]">Next page <ChevronRight size={14} aria-hidden="true"/></Link> : null}
    </nav> : null}
  </section>;
}
