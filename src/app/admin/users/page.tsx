import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { AdminIdentityTable, type IdentityRow } from "@/components/admin/AdminIdentityTable";
import { AdminUsersToolbar } from "@/components/admin/AdminUsersToolbar";
import { withOptionalDb } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth-guards";
import { adminIdentityPageSql, escapePrismaContainsQuery, parseAdminIdentitySort, parseAdminIdentityDate, adminIdentityDateBounds, validAdminIdentityCustomDates, type AdminIdentityReference } from "@/lib/adminIdentityDirectory";

export const metadata = { title: "Admin Users" };
type PageProps = { searchParams?: Promise<{ q?: string; role?: string; status?: string; tab?: string; identity?: string; activity?: string; page?: string; sort?: string; date?: string; from?: string; to?: string }> };
// Keep each SQL query bounded; fetch all matches in chunks for a continuous directory.
const BATCH_SIZE = 100;
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
  const date = requestedDate === "custom" && !custom ? "all" : requestedDate;
  const from = date === "custom" ? params?.from : undefined;
  const to = date === "custom" ? params?.to : undefined;
  const now = new Date();
  const bounds = adminIdentityDateBounds(date, now, from, to);
  const dateWhere = bounds ? { gte: bounds.from, ...(bounds.to ? { lt: bounds.to } : {}) } : undefined;
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
  const showOperationalGuests = showGuests;
  const environment = getPublicEnvironment();
  const operationalSources = Prisma.sql`(
    SELECT s."userId", s."visitorId", s."createdAt", s."query"->>'environment' AS "environment", s."query"->>'operationalSessionId' AS "sessionId" FROM "SearchHistory" s
    UNION ALL
    SELECT r."userId", r."visitorId", r."createdAt", r."metadata"->>'environment' AS "environment", r."metadata"->>'operationalSessionId' AS "sessionId" FROM "RedirectLog" r
  ) a`;
  const operationalWhere = Prisma.sql`WHERE a."userId" IS NULL AND a."visitorId" IS NULL AND a."environment" = ${environment}`;
  // Tab totals remain stable while moving between All, Registered, and Guests.
  // Count filtered cohorts independent of the active tab; only the selected
  // cohort determines the table and pagination totals.
  const stats = await withOptionalDb(async db => {
    const [registeredCount, consentedGuestCount, operationalRows] = await Promise.all([
      db.user.count({ where }),
      guestsEligibleForFilters ? db.visitor.count({ where: guestWhere }) : Promise.resolve(0),
      guestsEligibleForFilters ? db.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS "count" FROM (
          SELECT a."sessionId" FROM ${operationalSources} ${operationalWhere}
            AND a."sessionId" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}
  }, { registeredCount: 0, guestCount: 0 });
  const count = (showUsers ? stats.registeredCount : 0) + (showGuests ? stats.guestCount : 0);
  // Retain the combined ordering across chunks; no page controls or 100-row cutoff.
  const result = await withOptionalDb(async db => {
    const identities: AdminIdentityReference[] = [];
    for (let offset = 0; offset < count; offset += BATCH_SIZE) {
      const sql = adminIdentityPageSql({
        query: q, role, status, showUsers, showGuests, showOperationalGuests, environment, sort, date, from, to, now,
        limit: BATCH_SIZE, offset,
      });
      if (!sql) break;
      const batch = await db.$queryRaw<AdminIdentityReference[]>(sql);
      identities.push(...batch);
      if (batch.length < BATCH_SIZE) break;
    }
    const userIds = identities.filter(item => item.kind === "user").map(item => item.id);
    const guestIds = identities.filter(item => item.kind === "guest").map(item => item.id);
    const [users, guests, operationalRows] = await Promise.all([
      userIds.length ? db.user.findMany({
        where: { ...where, id: { in: userIds } },
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
      }) : Promise.resolve([]),
      guestIds.length ? db.visitor.findMany({
        where: { ...guestWhere, id: { in: guestIds } },
        select: { id: true, firstSeenAt: true, lastSeenAt: true },
      }) : Promise.resolve([]),
      guestIds.length && showOperationalGuests ? db.$queryRaw<Array<{ id: string; firstSeenAt: Date; lastSeenAt: Date }>>(Prisma.sql`
        SELECT a."sessionId" AS "id", MIN(a."createdAt") AS "firstSeenAt", MAX(a."createdAt") AS "lastSeenAt"
        FROM ${operationalSources} ${operationalWhere}
          AND a."sessionId" IN (${Prisma.join(guestIds)})
        GROUP BY a."sessionId"
      `) : Promise.resolve([]),
    ]);
    const userMap = new Map(users.map(user => [user.id, user]));
    const guestMap = new Map([...operationalRows, ...guests].map(guest => [guest.id, guest]));
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
  const link = "/admin/users?" + new URLSearchParams({ ...(q ? { q } : {}), role, status, tab, sort, date, ...(from && to ? {from,to} : {}) }).toString();
  return (
    <div className="w-full min-w-0 bg-white">
      <h1 className="sr-only">Users</h1>
      <AdminUsersToolbar query={q} role={role} status={status} tab={tab} sort={sort} date={date} from={from || ""} to={to || ""}
        registeredCount={stats.registeredCount} guestCount={stats.guestCount} pageHref={link}>
        <AdminIdentityTable rows={result.rows} pageHref={link} sort={sort} />
      </AdminUsersToolbar>
    </div>
  );
}

            ${q ? Prisma.sql`AND strpos(lower(a."sessionId"), lower(${q})) > 0` : Prisma.empty}
          GROUP BY a."sessionId"
          ${bounds ? Prisma.sql`HAVING MIN(a."createdAt") >= ${bounds.from}
            ${bounds.to ? Prisma.sql`AND MIN(a."createdAt") < ${bounds.to}` : Prisma.empty}` : Prisma.empty}
        ) sessions
      `) : Promise.resolve([]),
    ]);
    return { registeredCount, guestCount: consentedGuestCount + Number(operationalRows[0]?.count ?? 0) };
  }, { registeredCount: 0, guestCount: 0 });
  const count = (showUsers ? stats.registeredCount : 0) + (showGuests ? stats.guestCount : 0);
  // Retain the combined ordering across chunks; no page controls or 100-row cutoff.
  const result = await withOptionalDb(async db => {
    const identities: AdminIdentityReference[] = [];
    for (let offset = 0; offset < count; offset += BATCH_SIZE) {
      const sql = adminIdentityPageSql({
        query: q, role, status, showUsers, showGuests, sort, date, from, to, now,
        limit: BATCH_SIZE, offset,
      });
      if (!sql) break;
      const batch = await db.$queryRaw<AdminIdentityReference[]>(sql);
      identities.push(...batch);
      if (batch.length < BATCH_SIZE) break;
    }
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
  const link = "/admin/users?" + new URLSearchParams({ ...(q ? { q } : {}), role, status, tab, sort, date, ...(from && to ? {from,to} : {}) }).toString();
  return (
    <div className="w-full min-w-0 bg-white">
      <h1 className="sr-only">Users</h1>
      <AdminUsersToolbar query={q} role={role} status={status} tab={tab} sort={sort} date={date} from={from || ""} to={to || ""}
        registeredCount={stats.registeredCount} guestCount={stats.guestCount} pageHref={link}>
        <AdminIdentityTable rows={result.rows} pageHref={link} sort={sort} />
      </AdminUsersToolbar>
    </div>
  );
}
