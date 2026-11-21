import Link from "next/link";
import { redirect } from "next/navigation";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { AdminIdentityTable, type IdentityRow } from "@/components/admin/AdminIdentityTable";
import { AdminUsersToolbar } from "@/components/admin/AdminUsersToolbar";
import { AdminUserPopulationCards } from "@/components/admin/AdminUserPopulationCards";
import { readUserPopulationMetrics } from "@/services/adminUserPopulationMetrics";
import { withOptionalDb } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth-guards";
import { adminIdentityPageSql, adminRegisteredActivityDateWhere, escapePrismaContainsQuery, parseAdminIdentitySort, parseAdminIdentityDate, adminIdentityDateBounds, validAdminIdentityCustomDates, type AdminIdentityDirectoryRow } from "@/lib/adminIdentityDirectory";

export const metadata = { title: "Admin Users" };
type PageProps = { searchParams?: Promise<{ q?: string; role?: string; status?: string; tab?: string; identity?: string; activity?: string; page?: string; sort?: string; date?: string; from?: string; to?: string }> };
// Keep each SQL query bounded; fetch all matches in chunks for a continuous directory.
export default async function AdminUsersPage({ searchParams }: PageProps) {
  await requireAdminSession("/admin/users");
  const params = await searchParams;
  const q = (params?.q || "").trim().slice(0, 120);
  const prismaQuery = escapePrismaContainsQuery(q);
  const role = ["ALL", "USER", "SUPPORT", "ADMIN"].includes(params?.role || "") ? params!.role! : "ALL";
  const status = ["ALL", "ACTIVE", "SUSPENDED", "DELETED", "PENDING_DELETION"].includes(params?.status || "") ? params!.status! : "ALL";
  // New shareable URLs use tab=; preserve older identity= bookmarks.
  const selectedTab = params?.tab ?? params?.identity;
  const tab: "ALL" | "REGISTERED" | "GUEST" =
    selectedTab === "REGISTERED" || selectedTab === "GUEST" ? selectedTab : "ALL";
  const sort = parseAdminIdentitySort(params?.sort);
  const requestedDate = parseAdminIdentityDate(params?.date);
  const custom = validAdminIdentityCustomDates(params?.from, params?.to);
  const date = requestedDate === "custom" && !custom ? "today" : requestedDate;
  const from = date === "custom" ? params?.from : undefined;
  const to = date === "custom" ? params?.to : undefined;
  const now = new Date();
  const bounds = adminIdentityDateBounds(date, now, from, to);
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
  const where = {
    // Date means a recorded account/session/search/handoff in this window,
    // not only the date the account was originally registered.
    AND: [
      adminRegisteredActivityDateWhere(bounds, environment),
      ...(q ? [{ OR: [{ email: { contains: prismaQuery, mode: "insensitive" as const } }, { name: { contains: prismaQuery, mode: "insensitive" as const } }, { id: { contains: prismaQuery, mode: "insensitive" as const } }] }] : []),
    ],
    ...(role !== "ALL" ? { role: role as never } : {}),
    ...(status !== "ALL" ? { status: status as never } : {}),
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
  const showUsers = tab !== "GUEST";
  // Role/status are account-only filters. Guest identities never have either.
  const guestsEligibleForFilters = role === "ALL" && status === "ALL";
  const showGuests = tab !== "REGISTERED" && guestsEligibleForFilters;

  // Operational sessions are not accounts or analytics visitor identities.
  // A single identity query supplies the operational guest cohort, timestamps,
  // and total. Account and consented visitor counts remain independent of tab.
  const result = await withOptionalDb<{ rows: IdentityRow[]; registeredCount: number; guestCount: number } | null>(async db => {
    const [registeredCount, consentedGuestCount] = await Promise.all([
      db.user.count({ where }),
      guestsEligibleForFilters ? db.visitor.count({ where: guestWhere }) : Promise.resolve(0),
    ]);
    const countBeforeOperational = (showUsers ? registeredCount : 0) + (showGuests ? consentedGuestCount : 0);
    const sql = adminIdentityPageSql({
      query: q, role, status, showUsers, showGuests,
      showOperationalGuests: showGuests, withOperationalSummary: guestsEligibleForFilters,
      environment, sort, date, from, to, now,
      limit: Math.max(1, countBeforeOperational), offset: 0, allIdentities: true,
    });
    const fetched: AdminIdentityDirectoryRow[] = sql ? await db.$queryRaw<AdminIdentityDirectoryRow[]>(sql) : [];
    const operationalGuestCount = Number(fetched[0]?.operationalGuestCount ?? BigInt(0));
    const identities = fetched.filter((item): item is AdminIdentityDirectoryRow & { kind: "user" | "guest"; id: string } =>
      item.kind !== null && item.id !== null);
    const userIds = identities.filter(item => item.kind === "user").map(item => item.id);
    const guestIds = identities.filter(item => item.kind === "guest").map(item => item.id);
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
    const guestMap = new Map([
      ...identities.filter(item => item.kind === "guest" && item.firstSeenAt && item.lastSeenAt)
        .map(item => [item.id, { id: item.id, firstSeenAt: item.firstSeenAt!, lastSeenAt: item.lastSeenAt! }] as const),
      ...guests.map(guest => [guest.id, guest] as const),
    ]);
    const rows = identities.flatMap<IdentityRow>(identity => {
      if (identity.kind === "user") {
        const record = userMap.get(identity.id);
        return record ? [{ kind: "user" as const, record, lastSeenAt: observed.get("user:" + identity.id) ?? null }] : [];
      }
      const record = guestMap.get(identity.id);
      return record ? [{ kind: "guest" as const, record, lastSeenAt: observed.get("guest:" + identity.id) ?? record.lastSeenAt }] : [];
    });
    return { rows, registeredCount, guestCount: consentedGuestCount + operationalGuestCount };
  }, null);
  const population = await readUserPopulationMetrics(date, now, from, to);
  const periodLabel = date === "today" ? "Today (UTC)" : date === "last7" ? "Last 7 days"
    : date === "last30" ? "Last 30 days" : date === "all" ? "All time"
    : date === "custom" ? "Custom range (UTC)" : date === "24h" ? "Last 24 hours"
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
  return (
    <div className="w-full min-w-0 bg-white">
      <h1 className="sr-only">Users</h1>
      <AdminUserPopulationCards metrics={population} period={periodLabel} />
      <AdminUsersToolbar query={q} role={role} status={status} tab={tab} sort={sort} date={date} from={from || ""} to={to || ""}
        registeredCount={result.registeredCount} guestCount={result.guestCount} pageHref={link}>
        <AdminIdentityTable rows={result.rows} pageHref={link} sort={sort} />
      </AdminUsersToolbar>
    </div>
  );
}
