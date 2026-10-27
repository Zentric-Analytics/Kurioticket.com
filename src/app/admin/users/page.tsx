import { redirect } from "next/navigation";
import { AdminIdentityTable, type IdentityRow } from "@/components/admin/AdminIdentityTable";
import { AdminUsersToolbar } from "@/components/admin/AdminUsersToolbar";
import { withOptionalDb } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminIdentityPagination } from "@/lib/adminIdentityPagination";
import { adminIdentityPageSql, escapePrismaContainsQuery, parseAdminIdentitySort, parseAdminIdentityDate, adminIdentityDateBounds, type AdminIdentityReference } from "@/lib/adminIdentityDirectory";

export const metadata = { title: "Admin Users" };
type PageProps = { searchParams?: Promise<{ q?: string; role?: string; status?: string; tab?: string; identity?: string; activity?: string; page?: string; sort?: string; date?: string }> };
// Fixed maximum per page; shorter results show every matching identity.
const PAGE_SIZE = 100;
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
  const date = parseAdminIdentityDate(params?.date);
  const now = new Date();
  const bounds = adminIdentityDateBounds(date, now);
  const dateWhere = bounds ? { gte: bounds.from, ...(bounds.to ? { lt: bounds.to } : {}) } : undefined;
  // Existing bookmarked drawer URLs remain functional; only the presentation changes.
  const legacy = /^(user|guest):([a-z0-9_-]{6,80})$/i.exec(params?.activity || "");
  if (legacy) {
    const directory = new URLSearchParams({
      ...(q ? { q } : {}), role, status, tab, sort, date,
      ...(params?.page && /^\d{1,7}$/.test(params.page) ? { page: params.page } : {}),
    }).toString();
    redirect("/admin/users/" + legacy[1].toLowerCase() + "/" + encodeURIComponent(legacy[2])
      + "/activity?directory=" + encodeURIComponent(directory));
  }
  const where = {
    ...(dateWhere ? { createdAt: dateWhere } : {}),
    ...(q ? { OR: [{ email: { contains: prismaQuery, mode: "insensitive" as const } }, { name: { contains: prismaQuery, mode: "insensitive" as const } }, { id: { contains: prismaQuery, mode: "insensitive" as const } }] } : {}),
    ...(role !== "ALL" ? { role: role as never } : {}),
    ...(status !== "ALL" ? { status: status as never } : {}),
  };
  // The existing User model remains the authority for registered accounts.
  // Guests remain distinct records and only consent-eligible, unlinked guests are listed.
  const guestWhere = { ...(dateWhere ? { firstSeenAt: dateWhere } : {}), consentStatus: "GRANTED" as const, trackingDisabledAt: null, currentUserId: null, identityLinks: { none: {} }, ...(q ? { id: { contains: prismaQuery, mode: "insensitive" as const } } : {}) };
  const showUsers = tab !== "GUEST";
  // Role/status are account-only filters. Guest identities never have either.
  const guestsEligibleForFilters = role === "ALL" && status === "ALL";
  const showGuests = tab !== "REGISTERED" && guestsEligibleForFilters;
  // Tab totals remain stable while moving between All, Registered, and Guests.
  // Count filtered cohorts independent of the active tab; only the selected
  // cohort determines the table and pagination totals.
  const stats = await withOptionalDb(async db => {
    const [registeredCount, guestCount] = await Promise.all([
      db.user.count({ where }),
      guestsEligibleForFilters ? db.visitor.count({ where: guestWhere }) : Promise.resolve(0),
    ]);
    return { registeredCount, guestCount };
  }, { registeredCount: 0, guestCount: 0 });
  const { page, count } = getAdminIdentityPagination(
    params?.page,
    showUsers ? stats.registeredCount : 0,
    showGuests ? stats.guestCount : 0,
    PAGE_SIZE,
  );
  // Paginate the *combined* chronological list; do not group users before guests.
  const result = await withOptionalDb(async db => {
    const sql = adminIdentityPageSql({
      query: q, role, status, showUsers, showGuests, sort, date, now,
      limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE,
    });
    if (!sql) return { rows: [] as IdentityRow[] };
    const identities = await db.$queryRaw<AdminIdentityReference[]>(sql);
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
    const userMap = new Map(users.map(user => [user.id, user]));
    const guestMap = new Map(guests.map(guest => [guest.id, guest]));
    const rows = identities.flatMap<IdentityRow>(identity => {
      if (identity.kind === "user") {
        const record = userMap.get(identity.id);
        return record ? [{ kind: "user" as const, record }] : [];
      }
      if (identity.kind === "guest") {
        const record = guestMap.get(identity.id);
        return record ? [{ kind: "guest" as const, record }] : [];
      }
      return [];
    });
    return { rows };
  }, { rows: [] as IdentityRow[] });
  const link = (nextPage: number) => "/admin/users?" + new URLSearchParams({ ...(q ? { q } : {}), role, status, tab, sort, date, page: String(nextPage) }).toString();
  return (
    <div className="w-full min-w-0 bg-white">
      <h1 className="sr-only">Users</h1>
      <AdminUsersToolbar query={q} role={role} status={status} tab={tab} sort={sort} date={date}
        registeredCount={stats.registeredCount} guestCount={stats.guestCount} pageHref={link(page)}>
        <AdminIdentityTable rows={result.rows} page={page} count={count} pageSize={PAGE_SIZE}
          pageHref={link(page)} sort={sort} />
      </AdminUsersToolbar>
    </div>
  );
}
