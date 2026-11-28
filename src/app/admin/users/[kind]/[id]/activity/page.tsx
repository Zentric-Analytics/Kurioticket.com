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
import { AdminActivityAccessSummary } from "@/components/admin/AdminActivityAccessSummary";
import { ActivityFiltersBar } from "@/components/admin/ActivityFiltersBar";
import { platformLabel } from "@/components/admin/AdminIdentityDeviceAccess";
import { loadAdminGuestAccessHistory } from "@/services/adminGuestAccessService";
import { AdminRecordedGuestLocation } from "@/components/admin/AdminRecordedGuestLocation";
import { loadAdminGuestRecordedLocations, guestRecordedLocationKey } from "@/services/adminGuestRecordedLocationsService";
import { loadAdminDeviceSessions } from "@/services/adminDeviceSessionsService";
import { pageHistoryHrefFromActivity } from "@/lib/adminPageHistory";
import { deviceHistoryHrefFromActivity } from "@/lib/adminDeviceHistory";
import { getAdminViewerTimeZone } from "@/lib/adminViewerTimeZone.server";
import { safeActivityQueryParams } from "@/lib/adminActivityDateQuery";
import { normalizeLiveUserActivityQuery, liveActivityQueryParams } from "@/lib/adminActivityLiveQuery";
import { adminUsersActivityReturn } from "@/lib/adminUsersNavigation";
import { ADMIN_REPORTING_RANGE_LABELS, isAdminReportingRange } from "@/lib/adminReportingRanges";
import { journeyHistoryHrefFromActivity } from "@/lib/adminActivityOverview";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminEmails } from "@/lib/env";
import { withOptionalDb } from "@/lib/prisma";
import { activityHref, parseActivityFilters, validActivityIdentity, type ActivityFilters } from "@/lib/adminIdentityActivity";
import { loadAdminIdentityActivity } from "@/services/adminIdentityActivityService";
import { canReadAdminAudit } from "@/services/adminAuditReadService";

export const metadata = { title: "Admin Customer Activity" };
// Live session reads must not be served from a static route cache.
export const dynamic = "force-dynamic";
type Params = { kind: string; id: string };
type RawQuery = Record<string, string | string[] | undefined>;
type PageProps = { params: Promise<Params>; searchParams: Promise<RawQuery> };

const buttonClass = "focus-ring inline-flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] font-medium text-[#004BB8] hover:bg-[#F8FAFC]";

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
  // Only a current, server-verified existing owner can leave the live fallback.
  if (kind === "live-guest") return <AdminLiveGuestActivity reference={id} input={await searchParams}/>;
  if (!validActivityIdentity(kind, id)) notFound();
  const session = await requireAdminSession("/admin/users/" + kind + "/" + id + "/activity");
  const timeZone = await getAdminViewerTimeZone(session.user.id);
  const now = new Date();
  const raw = normalizeLiveUserActivityQuery({ ...(await searchParams), cursor: undefined }, now, timeZone);
  const basePath = "/admin/users/" + kind + "/" + encodeURIComponent(id) + "/activity";
  // Preserve existing filtered Activity bookmarks at the new full-history route.
  // Never silently broaden an invalid query, or reintroduce old cursor semantics.
  const hasDetailFilter = ["tab", "stage", "product", "interface", "q"].some(key =>
    typeof raw[key] === "string" && raw[key] !== "" && raw[key] !== "all");
  if (hasDetailFilter && !Object.values(raw).some(Array.isArray)) {
    redirect(activityHref(basePath + "/all", safeActivityQueryParams(raw), { cursor: null, order: null }));
  }
  const filtersResult = parseActivityFilters(raw, timeZone);
  const origin = adminUsersActivityReturn(raw, timeZone);
  const backHref = origin.href;
  const queryParams = liveActivityQueryParams(raw);
  if (!filtersResult.ok) return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href={backHref} className={buttonClass}><ArrowLeft size={16} /> Back to Users</Link>
      <div aria-label="Identity management">{await fallbackManage(kind, id, session.user.id)}</div>
    </div>
    <AdminEmptyState title="Invalid activity filters" message={filtersResult.error}
      action={<Link className={buttonClass} href={basePath}>Reset activity filters</Link>} />
  </div>;
  const filters: ActivityFilters = filtersResult.filters;
  const result = await loadAdminIdentityActivity(kind, id, filters, undefined, "summary", undefined, canReadAdminAudit);
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
  const environment = data.environment;
  const operational = data.source === "operational";
  const [deviceSessions, guestAccess, locations] = await Promise.all([
    kind === "user" ? loadAdminDeviceSessions(id, timeZone, now, "all") : null,
    kind === "guest" ? loadAdminGuestAccessHistory(id, { range: "all", page: 1 }, timeZone, now) : null,
    kind === "guest" ? loadAdminGuestRecordedLocations([id], { range: "all", page: 1 }, environment, now, timeZone) : null,
  ]);
  const recordedLocation = locations?.get(guestRecordedLocationKey(id, operational ? "operational" : "consented"));
  const activityReturn = activityHref(basePath, queryParams, {});
  const range = typeof raw.range === "string" ? raw.range : "today";
  // Keep the reporting window while letting page visits ignore travel-specific filters.
  const pageFilters: ActivityFilters = { ...filters, tab: "pages", stage: "all", product: "all", q: "", order: "newest" };
  const pagesHref = pageHistoryHrefFromActivity(kind, id, pageFilters, typeof raw.range === "string" ? raw.range : undefined, activityReturn);
  const accessHref = deviceHistoryHrefFromActivity(kind, id, filters, range, activityReturn, timeZone);
  const latestDevice = deviceSessions?.status === "ok" ? deviceSessions.sessions[0] : undefined;
  const latestGuest = guestAccess?.status === "ok" ? guestAccess.records[0] : undefined;
  const access: AccessPreview | null = latestDevice
    ? { at: latestDevice.lastSeenAt, href: accessHref, detail: [platformLabel(latestDevice), latestDevice.deviceLabel, latestDevice.os, latestDevice.browser, latestDevice.locationLabel ?? "Location unavailable"].filter(Boolean).join(" · ") }
    : latestGuest ? { at: latestGuest.at, href: accessHref, detail: [latestGuest.platform, latestGuest.deviceLabel, latestGuest.os, latestGuest.browser].filter(Boolean).join(" · ") }
    : null;
  const recentEvents = data.events;
  const allHref = activityHref(basePath + "/all", queryParams, { cursor: null });
  const activityMetricHref = (tab: string, stage?: string) => activityHref(basePath + "/all", queryParams, { tab, stage: stage ?? null, cursor: null });
  const unsupported = "Not collected for this essential guest session.";

  return <AdminCustomerActivityWorkspace
    backHref={backHref} backLabel={origin.label}
    title={kind === "guest" ? operational ? "Guest session" : "Visitor" : data.title}
    badge={kind === "guest" ? operational ? "Essential guest session" : "Consented guest" : "Registered account"}
    accountStatus={kind === "user" ? data.status === "ACTIVE" ? "Account enabled" : "Account " + data.status.toLowerCase().replaceAll("_", " ") : undefined}
    coverage={operational ? "operational" : kind === "guest" ? "consented" : "registered"}
    avatar={(kind === "guest" ? "G" : (data.title || "U").slice(0,1)).toUpperCase()}
    firstLabel={kind === "user" ? "Joined" : operational ? "First recorded activity" : "Identity created"}
    firstSeenAt={data.firstSeenAt} lastSeenAt={data.lastSeenAt} lastSeenAvailable={data.lastSeenAvailable}
    eventCount={data.summary.recordedActions ?? null}
    summary={data.summary} timeZone={timeZone}
    periodLabel={isAdminReportingRange(range) ? ADMIN_REPORTING_RANGE_LABELS[range] : range}
    periodControl={<ActivityFiltersBar compact path={basePath} directory={queryParams.directory ?? ""} usersReturn={queryParams.usersReturn}
      timeZone={timeZone} now={now.toISOString()} tabs={null}
      initial={{tab:"all",q:"",product:"all",stage:"all",order:"newest",from:filters.from,to:filters.to,range}}/>}
    metricLinks={{searches:activityMetricHref("searches","SEARCH_COMPLETED"),resultsViewed:activityMetricHref("searches","RESULTS_VIEWED"),
      offersSelected:activityMetricHref("selections","OFFER_SELECTED"),providerHandoffs:activityMetricHref("handoffs"),
      journeysTracked:journeyHistoryHrefFromActivity(kind,id,filters,range,activityReturn),pagesVisited:pagesHref}}
    unavailableMetrics={operational ? {resultsViewed:unsupported,offersSelected:unsupported,journeysTracked:unsupported,pagesVisited:unsupported} : undefined}
    accessContext={<AdminActivityAccessSummary access={access} href={accessHref} timeZone={timeZone}
      unavailable={kind === "user" ? deviceSessions?.status !== "ok" : guestAccess?.status !== "ok"}
      location={kind === "guest" ? <AdminRecordedGuestLocation location={recordedLocation} timeZone={timeZone}/> : null}/>}
    identityDetails={<>
      {data.email ? <p className="mt-1 break-words text-sm text-[#475569] [overflow-wrap:anywhere]">{data.email}</p> : null}
      <details className="mt-1.5 min-w-0 text-[12px] text-[#64748B]">
        <summary className="focus-ring w-fit cursor-pointer rounded-sm">{kind === "user" ? "Account reference" : "Guest reference"}</summary>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
          <code className="break-all text-xs">{id}</code>
          <CopyIdentityId id={id} kind={kind}/>
        </div>
      </details>
    </>}
    management={kind === "user"
      ? <RegisteredManage id={id} email={data.email} role={data.role || "USER"} status={data.status} actorId={session.user.id}/>
      : data.source === "visitor" ? <GuestTrackingActions visitorId={id} backHref={backHref} /> : null}>
      <AdminUnifiedActivityList events={recentEvents} timeZone={timeZone} environment={environment} identity={operational ? undefined : { kind, id }} now={now}
        overview pagesHref={!operational ? pagesHref : undefined}
        allHref={allHref} returnHref={activityReturn}/>
  </AdminCustomerActivityWorkspace>;
}
