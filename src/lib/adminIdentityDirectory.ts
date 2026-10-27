import { Prisma } from "@/generated/prisma/client";

/** Identity types remain separate in storage; only their Admin listing is unified. */

/**
 * Prisma translates "contains" to SQL LIKE/ILIKE. Escape its metacharacters
 * so count queries and record revalidation use the same literal substring
 * semantics as the ordered directory's parameterized strpos predicate.
 */
export function escapePrismaContainsQuery(query: string) {
  return query.replace(/[\\%_]/g, character => "\\" + character);
}

export const ADMIN_IDENTITY_DATES = ["all", "today", "last7", "thisMonth", "lastMonth", "last3"] as const;
export type AdminIdentityDate = (typeof ADMIN_IDENTITY_DATES)[number];
export function parseAdminIdentityDate(value?: string): AdminIdentityDate {
  return ADMIN_IDENTITY_DATES.includes(value as AdminIdentityDate) ? value as AdminIdentityDate : "all";
}
export function adminIdentityDateBounds(date: AdminIdentityDate, now = new Date()) {
  if (date === "all") return null;
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const tomorrow = new Date(today.getTime() + 86400000);
  if (date === "today") return { from: today, to: tomorrow };
  if (date === "last7") return { from: new Date(today.getTime() - 6 * 86400000), to: tomorrow };
  if (date === "thisMonth") return { from: month, to: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)) };
  if (date === "lastMonth") return { from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)), to: month };
  return { from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1)), to: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)) };
}

export type AdminIdentityReference = { kind: "user" | "guest"; id: string };

export const ADMIN_IDENTITY_SORTS = ["newest", "oldest", "name_asc", "name_desc"] as const;
export type AdminIdentitySort = (typeof ADMIN_IDENTITY_SORTS)[number];

export function parseAdminIdentitySort(value: string | undefined): AdminIdentitySort {
  return ADMIN_IDENTITY_SORTS.includes(value as AdminIdentitySort) ? value as AdminIdentitySort : "newest";
}

export type AdminIdentityPageRequest = {
  query: string;
  role: string;
  status: string;
  showUsers: boolean;
  showGuests: boolean;
  limit: number;
  offset: number;
  sort?: AdminIdentitySort;
  date?: AdminIdentityDate;
  now?: Date;
};

/**
 * Page the combined identity timeline IN PostgreSQL, rather than putting all
 * registered accounts before guests or loading every record into memory.
 *
 * Filters intentionally mirror Admin Users' Prisma count queries. In
 * particular, only unlinked guests with active consent may be returned.
 */
export function adminIdentityPageSql(input: AdminIdentityPageRequest): Prisma.Sql | null {
  const { query, role, status, showUsers, showGuests, limit, offset } = input;
  const sort = parseAdminIdentitySort(input.sort);
  const bounds = adminIdentityDateBounds(input.date ?? "all", input.now);
  const order = sort === "oldest"
    ? Prisma.sql`"joinedAt" ASC, "kind" ASC, "id" ASC`
    : sort === "name_asc"
      ? Prisma.sql`lower("displayName") ASC, "joinedAt" DESC, "kind" ASC, "id" DESC`
      : sort === "name_desc"
        ? Prisma.sql`lower("displayName") DESC, "joinedAt" DESC, "kind" ASC, "id" DESC`
        : Prisma.sql`"joinedAt" DESC, "kind" ASC, "id" DESC`;
  if (!showUsers && !showGuests) return null;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100
    || !Number.isSafeInteger(offset) || offset < 0) {
    throw new Error("Invalid Admin identity page bounds");
  }

  const sources: Prisma.Sql[] = [];
  if (showUsers) {
    sources.push(Prisma.sql`
      SELECT 'user'::text AS "kind", u."id" AS "id", u."createdAt" AS "joinedAt",
        COALESCE(NULLIF(BTRIM(u."name"), ''), 'Unnamed user') AS "displayName"
      FROM "User" u
      WHERE TRUE
        ${bounds ? Prisma.sql`AND u."createdAt" >= ${bounds.from}` : Prisma.empty}
        ${bounds?.to ? Prisma.sql`AND u."createdAt" < ${bounds.to}` : Prisma.empty}
        ${query ? Prisma.sql`AND (
          strpos(lower(COALESCE(u."name", '')), lower(${query})) > 0
          OR strpos(lower(COALESCE(u."email", '')), lower(${query})) > 0
          OR strpos(lower(u."id"), lower(${query})) > 0
        )` : Prisma.empty}
        ${role !== "ALL" ? Prisma.sql`AND u."role"::text = ${role}` : Prisma.empty}
        ${status !== "ALL" ? Prisma.sql`AND u."status"::text = ${status}` : Prisma.empty}
    `);
  }

  if (showGuests) {
    sources.push(Prisma.sql`
      SELECT 'guest'::text AS "kind", v."id" AS "id", v."firstSeenAt" AS "joinedAt",
        'Guest visitor'::text AS "displayName"
      FROM "Visitor" v
      WHERE v."consentStatus" = 'GRANTED'
        ${bounds ? Prisma.sql`AND v."firstSeenAt" >= ${bounds.from}` : Prisma.empty}
        ${bounds?.to ? Prisma.sql`AND v."firstSeenAt" < ${bounds.to}` : Prisma.empty}
        AND v."trackingDisabledAt" IS NULL
        AND v."currentUserId" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "VisitorIdentityLink" l WHERE l."visitorId" = v."id"
        )
        ${query ? Prisma.sql`AND strpos(lower(v."id"), lower(${query})) > 0` : Prisma.empty}
    `);
  }

  // Sort the combined identity set in PostgreSQL *before* pagination.
  // Name sorting follows the displayed name (including the guest label);
  // timestamps, kind and ID break ties predictably across pages.
  return Prisma.sql`
    SELECT "kind", "id"
    FROM (${Prisma.join(sources, " UNION ALL ")}) AS identities
    ORDER BY ${order}
    LIMIT ${limit} OFFSET ${offset}
  `;
}
