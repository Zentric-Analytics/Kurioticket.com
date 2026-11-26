import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminCustomerActivityWorkspace } from "@/components/admin/AdminCustomerActivityWorkspace";
import { AdminLiveGuestActivity } from "@/components/admin/AdminLiveGuestActivity";

import { CopyIdentityId } from "@/components/admin/CopyIdentityId";
import { UserStatusActions } from "@/components/admin/UserStatusActions";
import { GuestTrackingActions } from "@/components/admin/GuestTrackingActions";
import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import { AdminUnifiedActivityList, type AccessPreview } from "@/components/admin/AdminUnifiedActivityList";
import { platformLabel } from "@/components/admin/AdminIdentityDeviceAccess";
import { loadAdminGuestAccessHistory } from "@/services/adminGuestAccessService";
import { AdminRecordedGuestLocation } from "@/components/admin/AdminRecordedGuestLocation";
import { loadAdminGuestRecordedLocations, guestRecordedLocationKey } from "@/services/adminGuestRecordedLocationsService";
import { loadAdminDeviceSessions } from "@/services/adminDeviceSessionsService";
import { pageHistoryHrefFromActivity } from "@/lib/adminPageHistory";
import { getAdminViewerTimeZone } from "@/lib/adminViewerTimeZone.server";
import { normalizeUserActivityQuery, safeActivityQueryParams } from "@/lib/adminActivityDateQuery";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminEmails } from "@/lib/env";
import { withOptionalDb } from "@/lib/prisma";
import { activityHref, parseActivityFilters, validActivityIdentity, type ActivityFilters } from "@/lib/adminIdentityActivity";
import { ADMIN_IDENTITY_SORTS, ADMIN_IDENTITY_DATES, validAdminIdentityCustomDates } from "@/lib/adminIdentityDirectory";
import { loadAdminIdentityActivity } from "@/services/adminIdentityActivityService";

export const metadata = { title: "Admin Customer Activity" };
// Live session reads must not be served from a static route cache.
export const dynamic = "force-dynamic";
type Params = { kind: string; id: string };
type RawQuery = Record<string, string | string[] | undefined>;
type PageProps = { params: Promise<Params>; searchParams: Promise<RawQuery> };

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
  // The reserved live-reference route never reaches historical identity readers.
  if (kind === "live-guest") return <AdminLiveGuestActivity reference={id}/>;
  if (!validActivityIdentity(kind, id)) notFound();
  const session = await requireAdminSession("/admin/users/" + kind + "/" + id + "/activity");
  const timeZone = await getAdminViewerTimeZone(session.user.id);
  const now = new Date();
  const raw = normalizeUserActivityQuery(await searchParams, now, timeZone);
  const basePath = "/admin/users/" + kind + "/" + encodeURIComponent(id) + "/activity";
  // Preserve existing filtered Activity bookmarks at the new full-history route.
  // Never silently broaden an invalid query, or reintroduce old cursor semantics.
  const hasDetailFilter = ["tab", "stage", "product", "q"].some(key =>
    typeof raw[key] === "string" && raw[key] !== "" && raw[key] !== "all");
  if (hasDetailFilter && !Object.values(raw).some(Array.isArray)) {
    redirect(activityHref(basePath + "/all", safeActivityQueryParams(raw), { cursor: null, order: null }));
  }
  const filtersResult = parseActivityFilters(raw, timeZone);
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
  const locations = kind === "guest" ? await loadAdminGuestRecordedLocations([id], { range: "all", page: 1 }, environment, now, timeZone) : null;
  const recordedLocation = locations?.get(guestRecordedLocationKey(id, operational ? "operational" : "consented"));
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

  return <AdminCustomerActivityWorkspace
    backHref={backHref}
    title={kind === "guest" ? operational ? "Guest session" : "Visitor" : data.title}
    badge={kind === "guest" ? operational ? "Essential operational activity" : "Consented guest" : data.status === "ACTIVE" ? "Active" : data.status}
    avatar={(kind === "guest" ? "G" : (data.title || "U").slice(0,1)).toUpperCase()}
    firstLabel={kind === "guest" ? "First seen" : "Joined"}
    firstSeenAt={data.firstSeenAt} lastSeenAt={data.lastSeenAt} lastSeenAvailable={data.lastSeenAvailable}
    eventCount={data.events.length - data.events.filter(event => event.stage === "PAGE_VIEW").length + (data.summary.pagesVisited ?? 0)}
    summary={data.summary} timeZone={timeZone}
    identityDetails={<>
      {data.email ? <p className="mt-1 break-words text-sm text-[#475569] [overflow-wrap:anywhere]">{data.email}</p> : null}
      <div className="mt-1 flex min-w-0 items-center gap-2">
        <code className="max-w-[240px] truncate text-xs" title={id}>{id}</code>
        <CopyIdentityId id={id} kind={kind}/>
      </div>
      {kind === "guest" ? <AdminRecordedGuestLocation location={recordedLocation} timeZone={timeZone}/> : null}
    </>}
    management={kind === "user"
      ? <RegisteredManage id={id} email={data.email} role={data.role || "USER"} status={data.status} actorId={session.user.id}/>
      : data.source === "visitor" ? <GuestTrackingActions visitorId={id} backHref={backHref} /> : null}>
      <AdminUnifiedActivityList events={recentEvents} timeZone={timeZone} environment={environment}
        overview access={access} accessHref={accessHref} accessUnavailable={kind === "user" ? deviceSessions?.status !== "ok" : guestAccess?.status !== "ok"}
        pagesHref={!operational ? pagesHref : undefined} pagesUnavailable={!operational && !pageSummary}
        allHref={allHref}/>
  </AdminCustomerActivityWorkspace>;
}
