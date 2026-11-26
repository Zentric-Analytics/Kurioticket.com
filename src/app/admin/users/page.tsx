import Link from "next/link";
import { redirect } from "next/navigation";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { AdminIdentityTable, type IdentityRow } from "@/components/admin/AdminIdentityTable";
import { AdminUsersToolbar } from "@/components/admin/AdminUsersToolbar";
import { AdminUserPopulationCards } from "@/components/admin/AdminUserPopulationCards";
import { readUserPopulationMetrics } from "@/services/adminUserPopulationMetrics";
import { withOptionalDb } from "@/lib/prisma";
import { loadAdminGuestRecordedLocations, guestRecordedLocationKey } from "@/services/adminGuestRecordedLocationsService";
import { getAdminViewerTimeZone } from "@/lib/adminViewerTimeZone.server";
import { formatAdminTimeZoneLabel } from "@/lib/adminLocalTime";
import { requireAdminSession } from "@/lib/auth-guards";
import { adminIdentityPageSql, adminRegisteredActivityDateWhere, escapePrismaContainsQuery, parseAdminIdentitySort, parseAdminIdentityDate, adminIdentityDateBounds, validAdminIdentityCustomDates, type AdminIdentityDirectoryRow } from "@/lib/adminIdentityDirectory";

export const metadata = { title: "Admin Users" };
type PageProps = { searchParams?: Promise<{ q?: string; role?: string; status?: string; tab?: string; identity?: string; activity?: string; page?: string; sort?: string; date?: string; from?: string; to?: string }> };
// Keep each SQL query bounded; fetch all matches in chunks for a continuous directory.
export default async function AdminUsersPage({ searchParams }: PageProps) {
  const session = await requireAdminSession("/admin/users");
  const timeZone = await getAdminViewerTimeZone(session.user.id);
  const params = await searchParams;
  const q = (params?.q || "").trim().slice(0, 120);
  const prismaQuery = escapePrismaContainsQuery(q);
  const role = ["ALL", "USER", "SUPPORT", "ADMIN"].includes(params?.role || "") ? params!.role! : "ALL";
  const status = ["ALL", "ACTIVE", "INACTIVE", "UNAVAILABLE", "SUSPENDED", "DELETED", "PENDING_DELETION"].includes(params?.status || "") ? params!.status! : "ALL";
  // New shareable URLs use tab=; preserve older identity= bookmarks.
  const selectedTab = params?.tab ?? params?.identity;
  const tab: "ALL" | "REGISTERED" | "GUEST" =
    selectedTab === "REGISTERED" || selectedTab === "GUEST" ? selectedTab : "ALL";
  const sort = parseAdminIdentitySort(params?.sort);
  const requestedDate = parseAdminIdentityDate(params?.date);
  const custom = validAdminIdentityCustomDates(params?.from, params?.to, timeZone);
  const date = requestedDate === "custom" && !custom ? "today" : requestedDate;
  const from = date === "custom" ? params?.from : undefined;
  const to = date === "custom" ? params?.to : undefined;
  const now = new Date();
  const bounds = adminIdentityDateBounds(date, now, from, to, timeZone);
  const dateWhere = bounds ? { gte: bounds.from, ...(bounds.to ? { lt: bounds.to } : {}) } : undefined;
  const environment = getPublicEnvironment();
  // Existing bookmarked drawer URLs remain functional; only the presentation changes.
  const legacy = /^(user|guest):([a-z0-9_-]{6,80})$/i.exec(params?.activity || "");
  if (legacy) {
    const directory = new URLSearchParams({
      ...(q ? { q } : {}), role, status, tab, sort, date, ...(from && to ? {from,to} : {}),
      ...(params?.page && /^\d{1,7}$/.test(params.page) ? { page: params.page } : {}),
    }).toString();
    redirect("/admin/users/" + legacy[1].toLowerCase() + "/" + encodeURIComponent(legacy[2])
      + "/activity?directory=" + encodeURIComponent(directory));
  }
  const registeredEligibleForFilters = status !== "INACTIVE" && status !== "UNAVAILABLE";
  const where = {
    // Date means a recorded account/session/search/handoff in this window,
    // not only the date the account was originally registered.
    AND: [
      adminRegisteredActivityDateWhere(bounds, environment),
      ...(q ? [{ OR: [{ email: { contains: prismaQuery, mode: "insensitive" as const } }, { name: { contains: prismaQuery, mode: "insensitive" as const } }, { id: { contains: prismaQuery, mode: "insensitive" as const } }] }] : []),
    ],
    ...(role !== "ALL" ? { role: role as never } : {}),
    ...(registeredEligibleForFilters && status !== "ALL" ? { status: status as never } : {}),
  };
  // The existing User model remains the authority for registered accounts.
  // Guests remain distinct records and only consent-eligible, unlinked guests are listed.
  // Returning consented visitors qualify by either their original visit or
  // their latest valid observation. Mirror the ordered SQL cohort exactly.
  const guestWhere = {
    ...(dateWhere ? { OR: [{ firstSeenAt: dateWhere }, { lastSeenAt: dateWhere }] } : {}),
    consentStatus: "GRANTED" as const, trackingDisabledAt: null,
    currentUserId: null, identityLinks: { none: {} },
    ...(q ? { id: { contains: prismaQuery, mode: "insensitive" as const } } : {}),
  };
  const showUsers = tab !== "GUEST" && registeredEligibleForFilters;
  // Role filters still apply only to accounts. Active can match both kinds,
  // while Inactive/Unavailable are operational guest statuses, not User enums.
  const guestsEligibleForFilters = role === "ALL" && ["ALL", "ACTIVE", "INACTIVE", "UNAVAILABLE"].includes(status);
  const consentedGuestsEligible = guestsEligibleForFilters && (status === "ALL" || status === "ACTIVE");
  const showGuests = tab !== "REGISTERED" && consentedGuestsEligible;
  const showOperationalGuests = tab !== "REGISTERED" && guestsEligibleForFilters;

  // Operational sessions are not accounts or analytics visitor identities.
  // A single identity query supplies the operational guest cohort, timestamps,
  // and total. Account and consented visitor counts remain independent of tab.
  const result = await withOptionalDb<{ rows: IdentityRow[]; registeredCount: number; guestCount: number; operationalAllTimeCount: number | null; operationalNewCount: number | null } | null>(async db => {
    const [registeredCount, consentedGuestCount] = await Promise.all([
      registeredEligibleForFilters ? db.user.count({ where }) : Promise.resolve(0),
      consentedGuestsEligible ? db.visitor.count({ where: guestWhere }) : Promise.resolve(0),
    ]);
    const countBeforeOperational = (showUsers ? registeredCount : 0) + (showGuests ? consentedGuestCount : 0);
    const sql = adminIdentityPageSql({
      query: q, role, status, showUsers, showGuests,
      showOperationalGuests, withOperationalSummary: true,
      environment, sort, date, from, to, now, timeZone,
      limit: Math.max(1, countBeforeOperational), offset: 0, allIdentities: true,
    });
    const fetched: AdminIdentityDirectoryRow[] = sql ? await db.$queryRaw<AdminIdentityDirectoryRow[]>(sql) : [];
    // Directory guest tabs may be filtered by search, role, status and last activity.
    // Metrics are independent of these filters, except the New card's date range.
    // The SQL derives both metrics from one environment-scoped session grouping.
    const scopedOperationalGuestCount = Number(fetched[0]?.operationalGuestCount);
    const operationalAllTimeCount = Number(fetched[0]?.operationalAllTimeCount);
    const operationalNewCount = Number(fetched[0]?.operationalNewCount);
    if (!fetched.length || ![scopedOperationalGuestCount, operationalAllTimeCount, operationalNewCount]
      .every(value => Number.isSafeInteger(value) && value >= 0)
      || operationalNewCount > operationalAllTimeCount
      || (guestsEligibleForFilters && !q && scopedOperationalGuestCount > operationalAllTimeCount)) {
      throw new Error("Invalid or missing operational guest summaries");
    }
    const identities = fetched.filter((item): item is AdminIdentityDirectoryRow & { kind: "user" | "guest"; id: string } =>
      item.kind !== null && item.id !== null);
    const userIds = identities.filter(item => item.kind === "user").map(item => item.id);
    const guestIds = identities.filter(item => item.kind === "guest" && item.guestSource === "visitor").map(item => item.id);
    const [users, guests] = await Promise.all([
      userIds.length ? db.user.findMany({
        where: { ...where, id: { in: userIds } },
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
      }) : Promise.resolve([]),
      guestIds.length ? db.visitor.findMany({
        where: { ...guestWhere, id: { in: guestIds } },
        select: { id: true, firstSeenAt: true, lastSeenAt: true },
      }) : Promise.resolve([]),
    ]);
    // Use the same computed Last Seen value for sorting and rendering.
    // Never recompute it after ordering or infer a timestamp from registration.
    const observed = new Map(identities.map(item => [item.kind + ":" + item.id, item.lastSeenAt]));
    const userMap = new Map(users.map(user => [user.id, user]));
    const guestMap = new Map(guests.map(guest => [guest.id, guest]));
    const rows = identities.flatMap<IdentityRow>(identity => {
      if (identity.kind === "user") {
        const record = userMap.get(identity.id);
        return record ? [{ kind: "user" as const, record, lastSeenAt: observed.get("user:" + identity.id) ?? null }] : [];
      }
      // A withdrawn/linked visitor cannot reappear via an operational fallback.
      const record = identity.guestSource === "visitor" ? guestMap.get(identity.id)
        : identity.guestSource === "operational" && identity.firstSeenAt && identity.lastSeenAt
          ? { id: identity.id, firstSeenAt: identity.firstSeenAt, lastSeenAt: identity.lastSeenAt } : null;
      return record ? [{ kind: "guest" as const, record, lastSeenAt: observed.get("guest:" + identity.id) ?? record.lastSeenAt,
        guestSource: identity.guestSource ?? undefined, guestStatus: identity.guestStatus ?? "UNAVAILABLE" }] : [];
    });
    return { rows, registeredCount, guestCount: consentedGuestCount +
      (guestsEligibleForFilters ? scopedOperationalGuestCount : 0),
      operationalAllTimeCount, operationalNewCount };
  }, null);
  const population = await readUserPopulationMetrics(date, now, from, to, timeZone);
  const periodLabel = date === "today" ? "Today · " + formatAdminTimeZoneLabel(timeZone, now) : date === "last7" ? "Last 7 days"
    : date === "last30" ? "Last 30 days" : date === "all" ? "All time"
    : date === "custom" ? "Custom range · " + formatAdminTimeZoneLabel(timeZone, now) : date === "24h" ? "Last 24 hours"
    : date === "thisMonth" ? "This month" : date === "lastMonth" ? "Last month" : "Last 3 months";
  const link = "/admin/users?" + new URLSearchParams({ ...(q ? { q } : {}), role, status, tab, sort, date, ...(from && to ? {from,to} : {}) }).toString();
  if (result === null) {
    return (
      <div className="w-full min-w-0 bg-white text-[#020617]">
        <h1 className="sr-only">Users</h1>
        <section role="status" aria-label="Users directory unavailable"
          className="border-y border-[#D8E1EC] px-3 py-8 sm:px-4">
          <h2 className="text-[15px] font-semibold">Users directory unavailable</h2>
          <p className="mt-2 max-w-[760px] text-[13px] leading-5 text-[#475569]">
            The identity directory could not be read. User and guest counts and records are unavailable;
            an empty directory is not assumed.
          </p>
          <Link href={link} className="mt-4 inline-flex h-9 items-center rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] font-medium text-[#004BB8] hover:bg-[#F8FAFC]">
            Retry directory
          </Link>
        </section>
      </div>
    );
  }
  const guestLocations = await loadAdminGuestRecordedLocations(
    result.rows.filter(row => row.kind === "guest").map(row => row.record.id),
    { range: "all", page: 1 }, environment, now, timeZone);
  const rowsWithLocations = result.rows.map(row => row.kind === "guest" ? {
    ...row, lastRecordedLocation: guestLocations.get(guestRecordedLocationKey(row.record.id,
      row.guestSource === "operational" ? "operational" : "consented")) ?? null,
  } : row);
  return (
    <div className="w-full min-w-0 bg-white">
      <h1 className="sr-only">Users</h1>
      <AdminUserPopulationCards metrics={population} period={periodLabel}
        operationalAllTimeCount={result.operationalAllTimeCount}
        operationalNewCount={result.operationalNewCount} />
      <AdminUsersToolbar timeZone={timeZone} now={now.toISOString()} query={q} role={role} status={status} tab={tab} sort={sort} date={date} from={from || ""} to={to || ""}
        registeredCount={result.registeredCount} guestCount={result.guestCount} pageHref={link}>
        <AdminIdentityTable rows={rowsWithLocations} pageHref={link} sort={sort} timeZone={timeZone} />
      </AdminUsersToolbar>
    </div>
  );
}
