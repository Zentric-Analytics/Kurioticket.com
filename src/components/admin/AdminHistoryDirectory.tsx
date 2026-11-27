import Link from "next/link";
import { ChevronLeft, ChevronRight, UserRound } from "lucide-react";
import { AdminEmptyState } from "./AdminPageShell";
import { AdminHistoryDirectoryFilters } from "./AdminHistoryDirectoryFilters";
import { HISTORY_DIRECTORY_LABELS, HISTORY_DIRECTORY_PAGE_SIZE, historyDirectoryHref, historyDirectoryPath, historyIdentityHref, parseHistoryDirectoryQuery, type HistorySection } from "@/lib/adminHistoryDirectory";
import { formatAdminTimeZoneLabel } from "@/lib/adminLocalTime";
import { loadAdminHistoryDirectory } from "@/services/adminHistoryDirectoryService";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { AdminRecordedGuestLocation } from "./AdminRecordedGuestLocation";
import { loadAdminGuestRecordedLocations, guestRecordedLocationKey } from "@/services/adminGuestRecordedLocationsService";

const linkClass = "focus-ring inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[12px] font-medium text-[#004BB8] hover:bg-[#F8FAFC]";
const format = (date: Date, timeZone: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(date);
const tabs = [{ value: "all", label: "All" }, { value: "registered", label: "Registered" }, { value: "guests", label: "Guests" }] as const;

export async function AdminHistoryDirectory({ section, raw, timeZone }: { section: HistorySection; raw: Record<string, string | string[] | undefined>; timeZone: string }) {
  const label = HISTORY_DIRECTORY_LABELS[section];
  const parsed = parseHistoryDirectoryQuery(section, raw);
  if (!parsed.ok) return <div className="min-w-0 space-y-4 bg-white">
    <h1 className="text-[19px] font-semibold">{label}</h1>
    <AdminEmptyState title="Invalid history filters" message={parsed.error} action={<Link className={linkClass} href={historyDirectoryPath(section)}>Reset filters</Link>}/>
  </div>;
  const query = parsed.query;
  const now = new Date();
  const result = await loadAdminHistoryDirectory(section, query, now, timeZone);
  const locations = section === "devices" && result.status === "ok"
    ? await loadAdminGuestRecordedLocations(result.rows.filter(row => row.kind === "guest").map(row => row.id),
      query, getPublicEnvironment(), now, timeZone) : new Map();
  const total = result.status === "ok" ? result.total : null;
  const totalPages = total === null ? 1 : Math.min(1_000_000, Math.max(1, Math.ceil(total / HISTORY_DIRECTORY_PAGE_SIZE)));
  const countLabel = section === "devices" ? "Records" : "Visits";
  const columns = "md:grid-cols-[minmax(0,1.7fr)_minmax(0,0.85fr)_minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,0.8fr)]";
  return <section aria-label={label + " directory"} className="min-w-0 space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-3 text-[#0F172A] sm:p-5">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-[19px] font-semibold">{label}</h1>
      {total !== null ? <span data-testid="history-directory-total" className="text-[12px] tabular-nums text-[#64748B]">{total.toLocaleString()} matching {total === 1 ? "identity" : "identities"}</span> : null}
    </header>
    <AdminHistoryDirectoryFilters timeZone={timeZone} key={JSON.stringify([query.q, query.range, query.platform, query.from, query.to])} section={section} query={query}/>
    <nav aria-label="History identity types" className="flex flex-wrap gap-4 border-y border-[#E2E8F0]">
      {tabs.map(tab => <Link key={tab.value} href={historyDirectoryHref(section, query, { tab: tab.value, page: 1 })}
        aria-current={query.tab === tab.value ? "page" : undefined} className={"focus-ring border-b-2 py-3 text-[13px] font-medium " + (query.tab === tab.value ? "border-[#004BB8] text-[#004BB8]" : "border-transparent text-[#64748B] hover:text-[#004BB8]")}>{tab.label}</Link>)}
    </nav>
    {result.status === "unavailable" ? <AdminEmptyState title="History unavailable" message="The recorded history could not be loaded. This does not mean there are no records."
      action={<Link className={linkClass} href={historyDirectoryHref(section, query)}>Retry</Link>}/>
    : !result.rows.length ? <AdminEmptyState title="No matching identities" message={query.page > totalPages ? "No identities remain on this page." : section === "devices" ? "No eligible accounts or guests have recorded access in this range." : "No eligible registered users or consented guests have recorded visits in this range."}
      action={query.page > 1 ? <Link className={linkClass} href={historyDirectoryHref(section, query, { page: 1 })}>First page</Link> : undefined}/>
    : <div className="min-w-0 overflow-hidden rounded-lg border border-[#E2E8F0]">
      <div aria-hidden="true" className={"hidden gap-3 border-b border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-[11px] font-medium uppercase text-[#64748B] md:grid " + columns}>
        <span>Identity</span><span>Type</span><span>{countLabel}</span><span>Last {section === "devices" ? "seen" : "visit"} ({formatAdminTimeZoneLabel(timeZone, now)})</span><span>Action</span>
      </div>
      <ul className="divide-y divide-[#E2E8F0]">
        {result.rows.map(row => {
          const href = historyIdentityHref(section, row, query, now, timeZone);
          return <li key={row.kind + ":" + row.id} data-users-refresh-anchor={row.kind + ":" + row.id} data-testid="history-directory-row" className={"grid min-w-0 items-center gap-2 px-3 py-3 text-[13px] md:gap-3 " + columns}>
            <div className="flex min-w-0 items-start gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#475569]"><UserRound size={15} aria-hidden="true"/></span>
              <div className="min-w-0">
                <Link href={href} className="focus-ring font-medium text-[#0F172A] [overflow-wrap:anywhere] hover:text-[#004BB8] hover:underline">{row.name}</Link>
                <p className="break-all text-[12px] text-[#64748B]">{row.email ?? row.id}</p>
                {section === "devices" && row.kind === "guest" ? <AdminRecordedGuestLocation
                  location={locations.get(guestRecordedLocationKey(row.id, row.guestSource === "operational" ? "operational" : "consented"))} timeZone={timeZone}/> : null}
              </div>
            </div>
            <span className="min-w-0 text-[12px] text-[#475569]">{row.kind === "user" ? "Registered" : row.guestSource === "operational" ? "Guest" : "Consented guest"}</span>
            <span className="min-w-0 tabular-nums"><span className="text-[#64748B] md:hidden">{countLabel}: </span>{row.count.toLocaleString()}{section === "devices" ? <span className="mt-0.5 block text-[11px] text-[#64748B]">{row.kind === "user" ? "Sessions" : "Observations"}</span> : null}</span>
            <time dateTime={row.lastSeenAt.toISOString()} className="min-w-0 break-words text-[12px] tabular-nums text-[#64748B]">{format(row.lastSeenAt, timeZone)}</time>
            <Link href={href} aria-label={"View history for " + row.name + (row.email ? " (" + row.email + ")" : " (" + row.id + ")")}
              className="focus-ring inline-flex min-w-0 items-center gap-1 text-[13px] font-medium text-[#004BB8] hover:underline"><span>View history</span><ChevronRight size={14} className="shrink-0" aria-hidden="true"/></Link>
          </li>;
        })}
      </ul>
    </div>}
    {result.status === "ok" && totalPages > 1 && query.page <= totalPages ? <nav aria-label="History directory pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] pt-3">
      <span className="text-[12px] text-[#64748B]">Page {query.page} of {totalPages}</span>
      <div className="flex gap-2">
        {query.page > 1 ? <Link href={historyDirectoryHref(section, query, { page: query.page - 1 })} className={linkClass}><ChevronLeft size={15} aria-hidden="true"/> Previous</Link> : <span aria-disabled="true" className={linkClass + " opacity-40"}>Previous</span>}
        {query.page < totalPages ? <Link href={historyDirectoryHref(section, query, { page: query.page + 1 })} className={linkClass}>Next <ChevronRight size={15} aria-hidden="true"/></Link> : <span aria-disabled="true" className={linkClass + " opacity-40"}>Next</span>}
      </div>
    </nav> : null}
  </section>;
}
