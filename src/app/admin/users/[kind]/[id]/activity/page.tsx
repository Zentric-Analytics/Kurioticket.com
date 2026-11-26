import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plane, Building2, CarFront } from "lucide-react";

import { CopyIdentityId } from "@/components/admin/CopyIdentityId";
import { UserStatusActions } from "@/components/admin/UserStatusActions";
import { GuestTrackingActions } from "@/components/admin/GuestTrackingActions";
import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import { AdminUnifiedActivityList, type AccessPreview } from "@/components/admin/AdminUnifiedActivityList";
import { platformLabel } from "@/components/admin/AdminIdentityDeviceAccess";
import { loadAdminGuestAccessHistory } from "@/services/adminGuestAccessService";
import { loadAdminDeviceSessions } from "@/services/adminDeviceSessionsService";
import { pageHistoryHrefFromActivity } from "@/lib/adminPageHistory";
import { formatAdminTimeZoneLabel } from "@/lib/adminLocalTime";
import { getAdminViewerTimeZone } from "@/lib/adminViewerTimeZone.server";
import { normalizeUserActivityQuery, safeActivityQueryParams } from "@/lib/adminActivityDateQuery";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminEmails } from "@/lib/env";
import { withOptionalDb } from "@/lib/prisma";
import { activityHref, parseActivityFilters, validActivityIdentity, type ActivityFilters } from "@/lib/adminIdentityActivity";
import { ADMIN_IDENTITY_SORTS, ADMIN_IDENTITY_DATES, validAdminIdentityCustomDates } from "@/lib/adminIdentityDirectory";
import { loadAdminIdentityActivity } from "@/services/adminIdentityActivityService";

export const metadata = { title: "Admin Customer Activity" };
type Params = { kind: string; id: string };
type RawQuery = Record<string, string | string[] | undefined>;
type PageProps = { params: Promise<Params>; searchParams: Promise<RawQuery> };

// Keep the UTC instant, but use a compact, unambiguous header label so
// each date stays on one line beside the workspace sidebar at desktop zoom.
const format = (at: Date, timeZone: string) => new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false, timeZone,
}).format(at);
// One common desktop grid: guest/customer identity spans two fifths, while
// First seen/Joined, Last seen and Events each occupy one fifth.
const activityColumns = "grid min-w-0 w-full gap-y-4 lg:grid-cols-5 lg:gap-y-0";
const buttonClass = "focus-ring inline-flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] font-medium text-[#004BB8] hover:bg-[#F8FAFC]";

function safeDirectoryHref(raw: RawQuery) {
  const saved = typeof raw.directory === "string" && raw.directory.length <= 1000 ? raw.directory : "";
  const candidates = new URLSearchParams(saved);
  const safe = new URLSearchParams();
  const allowed = {
    q: 120, role: 30, status: 30, tab: 30, identity: 30, sort: 20, date: 20, from: 10, to: 10, page: 8,
  } as const;
  for (const [key, max] of Object.entries(allowed)) {
    const value = candidates.get(key);
    if (value && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value)
      && (key !== "sort" || ADMIN_IDENTITY_SORTS.includes(value as (typeof ADMIN_IDENTITY_SORTS)[number]))
      && (key !== "date" || ADMIN_IDENTITY_DATES.includes(value as (typeof ADMIN_IDENTITY_DATES)[number]))) safe.set(key, value);
  }
  if (safe.get("date") !== "custom" || !validAdminIdentityCustomDates(safe.get("from") || undefined, safe.get("to") || undefined)) {
    safe.delete("from");
    safe.delete("to");
    if (safe.get("date") === "custom") safe.set("date", "all");
  }
  return "/admin/users" + (safe.size ? "?" + safe.toString() : "");
}
function HeaderTime({ at, timeZone }: { at: Date; timeZone: string }) {
  const label = format(at, timeZone);
  return <time dateTime={at.toISOString()} title={label + " " + formatAdminTimeZoneLabel(timeZone, at)}>{label}</time>;
}
function Fact({ label, children, className = "", testId }: {
  label: string; children: React.ReactNode; className?: string; testId?: string;
}) {
  return <div data-testid={testId} className={"min-w-0 border-l border-[#E2E8F0] pl-4 sm:pl-5 " + className}>
    <dt className="text-[12px] font-normal text-[#64748B]">{label}</dt>
    <dd className="mt-1 break-words text-[16px] font-medium leading-6 tabular-nums text-[#0F172A]">{children}</dd>
  </div>;
}

function RegisteredManage({ id, email, role, status, actorId }: {
  id: string; email: string | null; role: string; status: string; actorId: string;
}) {
  const protectedAccount = Boolean(email && getAdminEmails().some(
    adminEmail => adminEmail.toLowerCase().trim() === email.toLowerCase().trim()
  ));
  return <UserStatusActions
    userId={id} email={email} role={role} status={status}
    isSelf={actorId === id} isProtectedAdmin={protectedAccount}
  />;
}

/**
 * Activity history may fail independently of the identity database.
 * Keep existing account administration reachable on an Activity error page
 * without bypassing its separate API authorization, roles or account guards.
 */
async function fallbackManage(kind: string, id: string, actorId: string): Promise<React.ReactNode> {
  return withOptionalDb<React.ReactNode>(async db => {
    if (kind === "user") {
      const account = await db.user.findUnique({
        where: { id }, select: { id: true, email: true, role: true, status: true },
      });
      return account ? <RegisteredManage
        id={account.id} email={account.email} role={account.role}
        status={account.status} actorId={actorId}
      /> : null;
    }
    return null;
  }, null);
}

export default async function AdminIdentityActivityPage({ params, searchParams }: PageProps) {
  const { kind, id } = await params;
  if (!validActivityIdentity(kind, id)) notFound();
  const session = await requireAdminSession("/admin/users/" + kind + "/" + id + "/activity");
  const timeZone = await getAdminViewerTimeZone(session.user.id);
  const now = new Date();
  const raw = normalizeUserActivityQuery(await searchParams, now, timeZone);
  // Legacy activity bookmarks still open this workspace; page views now have their own section.
  // The overview is always an identity summary. Detailed filters live in All Activity.
  delete raw.tab; delete raw.stage; delete raw.type; delete raw.product; delete raw.q;
  const filtersResult = parseActivityFilters(raw, timeZone);
  const basePath = "/admin/users/" + kind + "/" + encodeURIComponent(id) + "/activity";
  const backHref = safeDirectoryHref(raw);
  const queryParams = safeActivityQueryParams(raw);
  if (!filtersResult.ok) return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href={backHref} className={buttonClass}><ArrowLeft size={16} /> Back to Users</Link>
      <div aria-label="Identity management">{await fallbackManage(kind, id, session.user.id)}</div>
    </div>
    <AdminEmptyState title="Invalid activity filters" message={filtersResult.error}
      action={<Link className={buttonClass} href={basePath}>Reset activity filters</Link>} />
  </div>;
  const filters: ActivityFilters = filtersResult.filters;
  const result = await loadAdminIdentityActivity(kind, id, filters, undefined, "summary");
  if (result.status === "not_found") notFound();
  if (result.status !== "ok") return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href={backHref} className={buttonClass}><ArrowLeft size={16} /> Back to Users</Link>
      <div aria-label="Identity management">{await fallbackManage(kind, id, session.user.id)}</div>
    </div>
    <AdminEmptyState title={result.status === "invalid_cursor" ? "Activity page link expired" : "Activity data unavailable"}
      message={result.status === "invalid_cursor" ? "The pagination link does not match this customer or the selected filters." : "The activity reader is temporarily unavailable. This does not mean there is no customer history."}
      action={<Link className={buttonClass} href={activityHref(basePath, queryParams, { cursor: null, order: null })}>Return to newest activity</Link>} />
  </div>;
  const data = result.data;
  const deviceSessions = kind === "user" ? await loadAdminDeviceSessions(id, timeZone, now, "all") : null;
  const guestAccess = kind === "guest" ? await loadAdminGuestAccessHistory(id, { range: "all", page: 1 }, timeZone, now) : null;
  const environment = data.environment;
  const operational = data.source === "operational";
  const activityReturn = activityHref(basePath, queryParams, {});
  // Keep the reporting window while letting page visits ignore travel-specific filters.
  const pageFilters: ActivityFilters = { ...filters, tab: "pages", stage: "all", product: "all", q: "", order: "newest" };
  const pagesHref = pageHistoryHrefFromActivity(kind, id, pageFilters, typeof raw.range === "string" ? raw.range : undefined, activityReturn);
  // The unfiltered overview already includes the newest page record and total.
  // Only issue a separate compact, owner-scoped read when travel filters exclude them.
  const pageSummaryResult = operational ? null
    : filters.tab === "all" && filters.stage === "all" && filters.product === "all" && !filters.q
      ? result
      : await loadAdminIdentityActivity(kind, id, pageFilters, undefined, "summary");
  const pageSummary = pageSummaryResult?.status === "ok" ? pageSummaryResult.data : null;
  const accessHref = basePath.replace(/\/activity$/, "/devices") + "?range=all&activityReturn=" + encodeURIComponent(activityReturn);
  const latestDevice = deviceSessions?.status === "ok" ? deviceSessions.sessions[0] : undefined;
  const latestGuest = guestAccess?.status === "ok" ? guestAccess.records[0] : undefined;
  const access: AccessPreview | null = latestDevice
    ? { at: latestDevice.lastSeenAt, href: accessHref, detail: [platformLabel(latestDevice), latestDevice.deviceLabel, latestDevice.os, latestDevice.browser, latestDevice.locationLabel ?? "Location unavailable"].filter(Boolean).join(" · ") }
    : latestGuest ? { at: latestGuest.at, href: accessHref, detail: [latestGuest.platform, latestGuest.deviceLabel, latestGuest.os, latestGuest.browser, latestGuest.locationLabel ?? "Location unavailable", latestGuest.evidence === "search" ? "Search access observation" : latestGuest.evidence === "handoff" ? "Handoff access observation" : "Page access observation"].filter(Boolean).join(" · ") }
    : null;
  const recentEvents = [...data.events.filter(event => event.stage !== "PAGE_VIEW"), ...(pageSummary?.events.filter(event => event.stage === "PAGE_VIEW") ?? [])];
  const allHref = activityHref(basePath + "/all", queryParams, { cursor: null });

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
        {/* These three rules span the entire information grid, including its
            top and bottom boundaries. No independent inset fact borders. */}
        <div aria-hidden="true" data-testid="activity-shared-dividers"
          className="pointer-events-none absolute inset-0 hidden lg:block">
          <span data-testid="activity-divider-40" className="absolute inset-y-0 left-[40%] border-l border-[#E2E8F0]" />
          <span data-testid="activity-divider-60" className="absolute inset-y-0 left-[60%] border-l border-[#E2E8F0]" />
          <span data-testid="activity-divider-80" className="absolute inset-y-0 left-[80%] border-l border-[#E2E8F0]" />
        </div>
      <section aria-label="Customer identity" className="relative min-w-0">
        <div className={activityColumns + " lg:items-start lg:py-6"}>
          <div className="flex min-w-0 items-center gap-4 lg:col-span-2 lg:gap-3 lg:px-3 min-[1700px]:gap-4 min-[1700px]:px-6">
            <span aria-hidden="true"
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-xl font-semibold min-[1100px]:hidden min-[1700px]:flex">
              {(kind === "guest" ? "G" : (data.title || "U").slice(0,1)).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-xl font-semibold [overflow-wrap:anywhere]">
                  {kind === "guest" ? operational ? "Guest session" : "Visitor" : data.title}
                </h1>
                <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs">
                  {kind === "guest" ? operational ? "Essential operational activity" : "Consented guest" : data.status === "ACTIVE" ? "Active" : data.status}
                </span>
              </div>
              {data.email ? <p className="mt-1 break-words text-sm text-[#475569] [overflow-wrap:anywhere]">{data.email}</p> : null}
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <code className="max-w-[240px] truncate text-xs" title={id}>{id}</code>
                <CopyIdentityId id={id} kind={kind}/>
              </div>
            </div>
          </div>

          <dl className="grid min-w-0 grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:contents">
            <Fact label={kind === "guest" ? "First seen" : "Joined"} className="lg:border-l-0 lg:pl-2 2xl:pl-6"><HeaderTime timeZone={timeZone} at={data.firstSeenAt}/></Fact>
            <Fact label="Last seen" className="lg:border-l-0 lg:pl-2 2xl:pl-6">{data.lastSeenAvailable === false ? "Unavailable" : data.lastSeenAt ? <HeaderTime timeZone={timeZone} at={data.lastSeenAt}/> : "—"}</Fact>
            <Fact label="Events" testId="activity-events-fact"
              className={"lg:border-l-0 lg:pl-6 " + (kind === "user" || data.source === "visitor" ? "lg:pr-28" : "")}>
              {data.events.length - data.events.filter(event => event.stage === "PAGE_VIEW").length + (data.summary.pagesVisited ?? 0)}
            </Fact>
          </dl>

          {(kind === "user" || (kind === "guest" && data.source === "visitor")) ? <div
            className="flex min-w-0 justify-start lg:absolute lg:right-2 lg:top-1/2 lg:-translate-y-1/2"
            aria-label="Identity management">
            {kind === "guest"
              ? <GuestTrackingActions visitorId={id} backHref={backHref} />
              : <RegisteredManage id={id} email={data.email} role={data.role || "USER"} status={data.status} actorId={session.user.id}/>}
          </div> : null}
        </div>
      </section>

      <section aria-label="Activity summary" className="relative min-w-0 border-y border-[#E2E8F0] py-4 lg:border-b-0 lg:py-5">
        {/* The 20% line begins at the separator, since identity spans two cells above. */}
        <div data-testid="activity-metrics-grid" className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 xl:grid-cols-6 lg:gap-x-0">
          {([
            { label: "Searches", count: data.summary.searches },
            { label: "Results viewed", count: data.summary.resultsViewed },
            { label: "Offers selected", count: data.summary.offersSelected },
            { label: "Provider handoffs", count: data.summary.providerHandoffs },
            { label: "Journeys tracked", count: data.summary.journeysTracked },
            { label: "Pages visited", count: data.summary.pagesVisited ?? 0 },
          ]).map(({label,count}) => <div key={label} data-testid="activity-metric"
            className="min-w-0 pr-2 sm:pr-3 lg:px-4">
            <span data-testid="activity-metric-label" className="block text-[12px] font-normal text-[#64748B] lg:whitespace-nowrap">{label}</span>
            <span data-testid="activity-metric-value" className="mt-1 block text-[16px] font-medium leading-6 tabular-nums text-[#0F172A]">{count}</span>
            {label === "Searches" && data.summary.searchProducts ? <div aria-label="Searches by product"
              className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-[11px] sm:gap-x-3 sm:text-xs leading-4 text-[#64748B]">
              {([
                { label: "Flights", count: data.summary.searchProducts.flights, Icon: Plane },
                { label: "Hotels", count: data.summary.searchProducts.hotels, Icon: Building2 },
                { label: "Cars", count: data.summary.searchProducts.cars, Icon: CarFront },
              ]).map(({label, count, Icon}) => <span key={label} aria-label={label + ": " + count} title={label}
                className="inline-flex items-center gap-0.5 tabular-nums sm:gap-1"><Icon size={12} aria-hidden="true" />{count}</span>)}
              {data.summary.searchProducts.other > 0 ? <span aria-label={"Other or unknown: " + data.summary.searchProducts.other}>
                Other: {data.summary.searchProducts.other}
              </span> : null}
            </div> : null}
          </div>)}
        </div>
      </section>
      </div>

      <AdminUnifiedActivityList events={recentEvents} timeZone={timeZone} environment={environment}
        overview access={access} accessHref={accessHref} accessUnavailable={kind === "user" ? deviceSessions?.status !== "ok" : guestAccess?.status !== "ok"}
        pagesHref={!operational ? pagesHref : undefined} pagesUnavailable={!operational && !pageSummary}
        allHref={allHref}/>
    </section>
  </div>;
}
