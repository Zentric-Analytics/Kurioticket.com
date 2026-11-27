import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { AdminEmptyState } from "./AdminPageShell";
import { AdminDeviceHistoryFilters } from "./AdminDeviceHistoryFilters";
import { loadAdminGuestAccessHistory } from "@/services/adminGuestAccessService";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { AdminRecordedGuestLocation } from "./AdminRecordedGuestLocation";
import { loadAdminGuestRecordedLocations, guestRecordedLocationKey } from "@/services/adminGuestRecordedLocationsService";
import { formatAdminTimeZoneLabel } from "@/lib/adminLocalTime";
import { deviceHistoryHref, DEVICE_HISTORY_PAGE_SIZE, type DeviceHistoryQuery } from "@/lib/adminDeviceHistory";

const linkClass = "focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[12px] font-medium text-[#004BB8] hover:bg-[#F8FAFC]";
const format = (at: Date | null, timeZone: string) => at ? new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone,
}).format(at) : "Unavailable";

export async function AdminGuestAccessHistory({ id, query, path, backHref, backLabel, timeZone, now }: {
  id: string; query: DeviceHistoryQuery; path: string; backHref: string; backLabel: string; timeZone: string; now: Date;
}) {
  const result = await loadAdminGuestAccessHistory(id, query, timeZone, now);
  if (result.status === "not_found") notFound();
  const href = (page: number) => deviceHistoryHref(path, query, { page }, backHref);
  const back = <nav aria-label="Breadcrumb" className="flex min-w-0 items-center text-[13px]">
    <Link href={backHref} className="focus-ring inline-flex items-center gap-1.5 text-[#004BB8] hover:underline"><ArrowLeft size={15} aria-hidden="true"/> {backLabel}</Link>
  </nav>;
  if (result.status !== "ok") return <div className="min-w-0 space-y-4 bg-white">{back}
    <AdminEmptyState title="Guest access unavailable" message="Guest access observations could not be loaded." action={<Link href={href(1)} className={linkClass}>Retry</Link>}/>
  </div>;
  const locations = await loadAdminGuestRecordedLocations([id], query, getPublicEnvironment(), now, timeZone);
  const location = locations.get(guestRecordedLocationKey(id, "consented")) ?? locations.get(guestRecordedLocationKey(id, "operational"));
  const totalPages = Math.max(1, Math.ceil(result.total / DEVICE_HISTORY_PAGE_SIZE));
  const columns = "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)]";
  return <div className="min-w-0 space-y-5 bg-white pb-6 text-[#0F172A]">
    {back}
    <section aria-label="Guest device and access history" className="min-w-0 space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-3 sm:p-5">
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-[19px] font-semibold">Device &amp; Access History</h1>
          <p className="mt-1 break-all text-[13px] text-[#475569]">Guest · {id}</p>
          <p className="mt-1 text-[12px] text-[#64748B]">Recorded guest access observations, not signed-in sessions. Live status is not verified.</p>
        </div>
        <span data-testid="guest-access-total" className="text-[12px] tabular-nums text-[#64748B]">{result.total.toLocaleString()} observations</span>
      </header>
      <AdminDeviceHistoryFilters timeZone={timeZone} key={JSON.stringify([query.range, query.from, query.to, query.platform])} path={path} query={query} returnHref={backHref}/>
      {result.total > 0 ? <div className="grid min-w-0 gap-2 rounded-lg bg-[#F8FAFC] p-3 text-[12px] sm:grid-cols-2">
        <div><span className="text-[#64748B]">First matching access</span><p className="mt-1 font-medium">{format(result.firstSeenAt, timeZone)}</p></div>
        <div><span className="text-[#64748B]">Last matching access</span><p className="mt-1 font-medium">{format(result.lastSeenAt, timeZone)}</p></div>
        <div className="sm:col-span-2"><AdminRecordedGuestLocation location={location} timeZone={timeZone}/></div>
      </div> : null}
      {!result.records.length ? <AdminEmptyState title="No matching access observations"
        message={query.page > totalPages ? "No records remain on this page." : "No eligible guest access observations match this range and platform. Device details are only available when actually recorded."}
        action={query.page > 1 ? <Link href={href(1)} className={linkClass}>First page</Link> : undefined}/>
      : <div className="min-w-0 overflow-hidden rounded-lg border border-[#E2E8F0]">
        <div aria-hidden="true" className={"hidden gap-3 border-b border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-[11px] font-medium uppercase text-[#64748B] lg:grid " + columns}>
          <span>Platform</span><span>Device / browser</span><span>Location</span><span>Observed ({formatAdminTimeZoneLabel(timeZone, now)})</span><span>Evidence</span>
        </div>
        <ul className="divide-y divide-[#E2E8F0]">
          {result.records.map(record => <li key={record.id} data-testid="guest-access-row" className={"grid min-w-0 gap-2 px-3 py-3 text-[13px] lg:items-center lg:gap-3 " + columns}>
            <span className="font-medium">{record.platform}</span>
            <div className="min-w-0 break-words"><span>{record.deviceLabel ?? "Unavailable"}</span><p className="text-[12px] text-[#64748B]">{[record.os, record.platform === "iOS app" || record.platform === "Android app" ? "Native app" : record.browser].filter(Boolean).join(" · ") || "Browser / OS unavailable"}</p></div>
            <span data-testid="guest-access-location" className="min-w-0 break-words text-[12px] text-[#64748B]">{record.locationLabel ?? "Unavailable"}</span>
            <time dateTime={record.at.toISOString()} className="min-w-0 break-words text-[12px] tabular-nums text-[#64748B]">{format(record.at, timeZone)}</time>
            <div className="min-w-0 text-[12px]"><span>{record.evidence === "page" ? "Page access" : record.evidence === "search" ? "Search access" : "Provider handoff"}</span><p className="mt-0.5 text-[#64748B]">{record.source === "consented" ? "Consented" : "Operational"}</p></div>
          </li>)}
        </ul>
      </div>}
      {totalPages > 1 && query.page <= totalPages ? <nav aria-label="Guest access pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] pt-3">
        <span className="text-[12px] text-[#64748B]">Page {query.page} of {totalPages}</span>
        <div className="flex flex-wrap gap-2">
          {query.page > 1 ? <Link href={href(query.page - 1)} className={linkClass}><ChevronLeft size={15} aria-hidden="true"/> Previous</Link> : <span aria-disabled="true" className={linkClass + " opacity-40"}>Previous</span>}
          {query.page < totalPages ? <Link href={href(query.page + 1)} className={linkClass}>Next <ChevronRight size={15} aria-hidden="true"/></Link> : <span aria-disabled="true" className={linkClass + " opacity-40"}>Next</span>}
        </div>
      </nav> : null}
    </section>
  </div>;
}
