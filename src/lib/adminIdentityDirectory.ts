import { Prisma } from "@/generated/prisma/client";
import { adminCalendarRange, adminLocalDate, adminStartOfLocalDay } from "./adminLocalTime";
import { adminRollingRange } from "./adminReportingRanges";

/** Identity types remain separate in storage; only their Admin listing is unified. */

/**
 * Prisma translates "contains" to SQL LIKE/ILIKE. Escape its metacharacters
 * so count queries and record revalidation use the same literal substring
 * semantics as the ordered directory's parameterized strpos predicate.
 */
export function escapePrismaContainsQuery(query: string) {
  return query.replace(/[\\%_]/g, character => "\\" + character);
}

export const ADMIN_IDENTITY_DATES = ["24h", "all", "today", "last7", "last30", "thisMonth", "lastMonth", "last3", "custom"] as const;
export type AdminIdentityDate = (typeof ADMIN_IDENTITY_DATES)[number];
export function parseAdminIdentityDate(value?: string): AdminIdentityDate {
  return ADMIN_IDENTITY_DATES.includes(value as AdminIdentityDate) ? value as AdminIdentityDate : "today";
}
export function validAdminIdentityCustomDates(from?: string, to?: string, timeZone = "UTC") {
  return from && to ? adminCalendarRange(from, to, timeZone) : null;
}
export function adminIdentityDateBounds(date: AdminIdentityDate, now = new Date(), from?: string, to?: string, timeZone = "UTC") {
  if (date === "all") return null;
  if (date === "custom") return validAdminIdentityCustomDates(from, to, timeZone);
  if (date === "today" || date === "24h" || date === "last7" || date === "last30") {
    const range = date === "last7" ? "7d" : date === "last30" ? "30d" : date;
    return { from: new Date(adminRollingRange(range, now, timeZone).from), to: now };
  }
  const month = new Date(adminLocalDate(now, timeZone).slice(0, 7) + "-01T00:00:00Z");
  const monthStart = (offset: number) => {
    const day = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + offset, 1));
    return adminStartOfLocalDay(day.toISOString().slice(0, 10), timeZone) ?? day;
  };
  if (date === "thisMonth") return { from: monthStart(0), to: monthStart(1) };
  if (date === "lastMonth") return { from: monthStart(-1), to: monthStart(0) };
  return { from: monthStart(-2), to: monthStart(1) };
}

/** An existing registered account is discoverable when it was created OR
 * when an authenticated session, search or handoff was observed in the range.
 * Keep this predicate identical to the SQL directory read below so counts,
 * identifiers and account revalidation cannot disagree.
 *
 * A session has no environment label; search/handoff records must match the
 * deployment environment before they can qualify the account.
 */
export function adminRegisteredActivityDateWhere(
  bounds: { from: Date; to?: Date } | null,
  environment: "staging" | "production",
): Prisma.UserWhereInput {
  if (!bounds) return {};
  const at = { gte: bounds.from, ...(bounds.to ? { lt: bounds.to } : {}) };
  return {
    OR: [
      { createdAt: at },
      { accountSessions: { some: { lastSeenAt: at } } },
      { searchHistory: { some: { createdAt: at, query: { path: ["environment"], equals: environment } } } },
      { redirectLogs: { some: { createdAt: at, metadata: { path: ["environment"], equals: environment } } } },
      { apiEvents: { some: { createdAt: at, metadata: { path: ["environment"], equals: environment } } } },
    ],
  };
}

/** Same account-owned recorded-observation calculation for Directory and Activity.
 * Session observations are independent of journey-event filters; searches,
 * handoffs and analytics are scoped to the active deployment environment. */
export function adminRegisteredLastSeenSql(environment: "staging" | "production"): Prisma.Sql {
  return Prisma.sql`
    GREATEST(
      (SELECT MAX(a."lastSeenAt") FROM "AccountSession" a WHERE a."userId" = u."id"),
      (SELECT MAX(s."createdAt") FROM "SearchHistory" s
        WHERE s."userId" = u."id" AND s."query"->>'environment' = ${environment}),
      (SELECT MAX(r."createdAt") FROM "RedirectLog" r
        WHERE r."userId" = u."id" AND r."metadata"->>'environment' = ${environment}),
      (SELECT MAX(e."createdAt") FROM "AnalyticsEvent" e
        WHERE e."userId" = u."id" AND e."metadata"->>'environment' = ${environment})
    )
  `;
}

export type AdminIdentityReference = { kind: "user" | "guest"; id: string };
/** One directory read carries operational guest totals and recorded timestamps. */
export type GuestDirectoryStatus = "ACTIVE" | "INACTIVE" | "UNAVAILABLE";
export type AdminIdentityDirectoryRow = {
  kind: "user" | "guest" | null;
  id: string | null;
  firstSeenAt: Date | null;
  lastSeenAt: Date | null;
  guestSource: "visitor" | "operational" | null;
  guestStatus: GuestDirectoryStatus | null;
  operationalGuestCount: bigint;
  /** All recorded, unlinked operational sessions in this deployment. */
  operationalAllTimeCount: bigint;
  /** Sessions first recorded inside the selected reporting period. */
  operationalNewCount: bigint;
};

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
  showOperationalGuests?: boolean;
  environment?: "staging" | "production";
  /** Legacy unpaged callers only. The Users directory always requests a bounded page. */
  allIdentities?: boolean;
  /** Read unfiltered all-time/new session totals alongside date-scoped directory rows. */
  withOperationalSummary?: boolean;
  limit: number;
  offset: number;
  sort?: AdminIdentitySort;
  date?: AdminIdentityDate;
  from?: string;
  to?: string;
  now?: Date;
  timeZone?: string;
};

/**
 * Page the combined identity timeline IN PostgreSQL, rather than putting all
 * registered accounts before guests or loading every record into memory.
 *
 * Filters intentionally mirror Admin Users' Prisma count queries. In
 * particular, analytics visitor records must be consented and unlinked;
 * essential-only guests are represented by their operational session ID.
 */
export function adminIdentityPageSql(input: AdminIdentityPageRequest): Prisma.Sql | null {
  const { query, role, status, showUsers, showGuests, limit, offset } = input;
  const showOperationalGuests = input.showOperationalGuests ?? false;
  const environment = input.environment ?? "production";
  const sort = parseAdminIdentitySort(input.sort);
  const bounds = adminIdentityDateBounds(input.date ?? "all", input.now, input.from, input.to, input.timeZone);
  const order = sort === "oldest"
    ? Prisma.sql`"joinedAt" ASC, "kind" ASC, "id" ASC`
    : sort === "name_asc"
      ? Prisma.sql`lower("displayName") ASC, "joinedAt" DESC, "kind" ASC, "id" DESC`
      : sort === "name_desc"
        ? Prisma.sql`lower("displayName") DESC, "joinedAt" DESC, "kind" ASC, "id" DESC`
        : Prisma.sql`"lastSeenAt" DESC NULLS LAST, "joinedAt" DESC, "kind" ASC, "id" DESC`;
  if (!showUsers && !showGuests && !showOperationalGuests && !input.withOperationalSummary) return null;
  if (!Number.isSafeInteger(limit) || limit < 1 || (!input.allIdentities && limit > 100)
    || !Number.isSafeInteger(offset) || offset < 0) {
    throw new Error("Invalid Admin identity page bounds");
  }

  const includeOperational = showOperationalGuests || input.withOperationalSummary === true;
  const nowMs = (input.now ?? new Date()).getTime();
  // Only server-recorded, numeric signed expiry evidence is authoritative.
  // The legacy session ID and Last Seen alone cannot prove current validity.
  const operationalStatus = Prisma.sql`CASE
    WHEN o."expiresAtMs" IS NULL THEN 'UNAVAILABLE'
    WHEN o."expiresAtMs" > ${nowMs} THEN 'ACTIVE'
    ELSE 'INACTIVE' END`;
  const operationalStatusFilter = status === "ALL" ? Prisma.empty
    : Prisma.sql`AND (${operationalStatus}) = ${status}`;
  // Group deployment-scoped operational sessions once, across all recorded history.
  // The directory keeps its last-seen activity filter, while metric totals are
  // independent of search, role and status filters. Do not rescan the JSON logs.
  const operationalCte = includeOperational ? Prisma.sql`
    WITH all_operational_sessions AS MATERIALIZED (
      SELECT a."sessionId" AS "id",
        MIN(a."createdAt") AS "firstSeenAt",
        MAX(a."createdAt") AS "lastSeenAt",
        MAX(CASE WHEN a."expiresAtMs" ~ '^[0-9]{13}$' THEN a."expiresAtMs"::bigint ELSE NULL END) AS "expiresAtMs"
      FROM (
        SELECT s."query"->>'operationalSessionId' AS "sessionId", s."createdAt",
          CASE WHEN jsonb_typeof(s."query"->'operationalSessionExpiresAtMs') = 'number' THEN s."query"->>'operationalSessionExpiresAtMs' END AS "expiresAtMs"
        FROM "SearchHistory" s
        WHERE s."userId" IS NULL AND s."visitorId" IS NULL
          AND s."query"->>'environment' = ${environment}
          AND s."query"->>'operationalSessionId' IS NOT NULL
        UNION ALL
        SELECT r."metadata"->>'operationalSessionId' AS "sessionId", r."createdAt",
          CASE WHEN jsonb_typeof(r."metadata"->'operationalSessionExpiresAtMs') = 'number' THEN r."metadata"->>'operationalSessionExpiresAtMs' END AS "expiresAtMs"
        FROM "RedirectLog" r
        WHERE r."userId" IS NULL AND r."visitorId" IS NULL
          AND r."metadata"->>'environment' = ${environment}
          AND r."metadata"->>'operationalSessionId' IS NOT NULL
      ) a
      WHERE a."sessionId" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      GROUP BY a."sessionId"
    ), operational_sessions AS (
      SELECT o."id", o."firstSeenAt", o."lastSeenAt", (${operationalStatus}) AS "guestStatus"
      FROM all_operational_sessions o
      WHERE TRUE
        ${operationalStatusFilter}
        ${query ? Prisma.sql`AND strpos(lower(o."id"), lower(${query})) > 0` : Prisma.empty}
        ${bounds ? Prisma.sql`AND o."lastSeenAt" >= ${bounds.from}
          ${bounds.to ? Prisma.sql`AND o."lastSeenAt" < ${bounds.to}` : Prisma.empty}` : Prisma.empty}
    ), operational_summary AS (
      SELECT COUNT(*)::bigint AS "operationalAllTimeCount",
        ${bounds ? Prisma.sql`
          COUNT(*) FILTER (WHERE "firstSeenAt" >= ${bounds.from}
            ${bounds.to ? Prisma.sql`AND "firstSeenAt" < ${bounds.to}` : Prisma.empty})::bigint
        ` : Prisma.sql`COUNT(*)::bigint`} AS "operationalNewCount"
      FROM all_operational_sessions
    )
  ` : Prisma.empty;

  const sources: Prisma.Sql[] = [];
  if (showUsers) {
    sources.push(Prisma.sql`
      SELECT 'user'::text AS "kind", u."id" AS "id", u."createdAt" AS "joinedAt",
        COALESCE(NULLIF(BTRIM(u."name"), ''), 'Unnamed user') AS "displayName",
        NULL::timestamp AS "firstSeenAt",
        ${adminRegisteredLastSeenSql(environment)} AS "lastSeenAt", NULL::text AS "guestSource", NULL::text AS "guestStatus"
      FROM "User" u
      WHERE TRUE
        ${bounds ? Prisma.sql`AND (
          (u."createdAt" >= ${bounds.from}
            ${bounds.to ? Prisma.sql`AND u."createdAt" < ${bounds.to}` : Prisma.empty})
          OR EXISTS (
            SELECT 1 FROM "AccountSession" a
            WHERE a."userId" = u."id" AND a."lastSeenAt" >= ${bounds.from}
              ${bounds.to ? Prisma.sql`AND a."lastSeenAt" < ${bounds.to}` : Prisma.empty}
          )
          OR EXISTS (
            SELECT 1 FROM "SearchHistory" s
            WHERE s."userId" = u."id" AND s."createdAt" >= ${bounds.from}
              ${bounds.to ? Prisma.sql`AND s."createdAt" < ${bounds.to}` : Prisma.empty}
              AND s."query"->>'environment' = ${environment}
          )
          OR EXISTS (
            SELECT 1 FROM "RedirectLog" r
            WHERE r."userId" = u."id" AND r."createdAt" >= ${bounds.from}
              ${bounds.to ? Prisma.sql`AND r."createdAt" < ${bounds.to}` : Prisma.empty}
              AND r."metadata"->>'environment' = ${environment}
          )
          OR EXISTS (
            SELECT 1 FROM "AnalyticsEvent" e
            WHERE e."userId" = u."id" AND e."createdAt" >= ${bounds.from}
              ${bounds.to ? Prisma.sql`AND e."createdAt" < ${bounds.to}` : Prisma.empty}
              AND e."metadata"->>'environment' = ${environment}
          )
        )` : Prisma.empty}
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
        'Guest visitor'::text AS "displayName",
        v."firstSeenAt" AS "firstSeenAt", v."lastSeenAt" AS "lastSeenAt",
        'visitor'::text AS "guestSource", 'ACTIVE'::text AS "guestStatus"
      FROM "Visitor" v
      WHERE v."consentStatus" = 'GRANTED'
        ${bounds ? Prisma.sql`AND (
          (v."firstSeenAt" >= ${bounds.from}
            ${bounds.to ? Prisma.sql`AND v."firstSeenAt" < ${bounds.to}` : Prisma.empty})
          OR (v."lastSeenAt" >= ${bounds.from}
            ${bounds.to ? Prisma.sql`AND v."lastSeenAt" < ${bounds.to}` : Prisma.empty})
        )` : Prisma.empty}
        AND v."trackingDisabledAt" IS NULL
        AND v."currentUserId" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "VisitorIdentityLink" l WHERE l."visitorId" = v."id"
        )
        ${query ? Prisma.sql`AND strpos(lower(v."id"), lower(${query})) > 0` : Prisma.empty}
    `);
  }

  if (showOperationalGuests) {
    sources.push(Prisma.sql`
      SELECT 'guest'::text AS "kind", o."id", o."firstSeenAt" AS "joinedAt",
        'Guest visitor'::text AS "displayName",
        o."firstSeenAt", o."lastSeenAt", 'operational'::text AS "guestSource", o."guestStatus"
      FROM operational_sessions o
    `);
  }

  // A metric-only request (for example Guest tab + account-only role filters)
  // still needs a single null identity row to carry the independent aggregates.
  if (!sources.length) {
    if (!input.withOperationalSummary) return null;
    sources.push(Prisma.sql`
      SELECT NULL::text AS "kind", NULL::text AS "id",
        NULL::timestamp AS "joinedAt", NULL::text AS "displayName",
        NULL::timestamp AS "firstSeenAt", NULL::timestamp AS "lastSeenAt",
        NULL::text AS "guestSource", NULL::text AS "guestStatus"
      WHERE FALSE
    `);
  }

  // Sort all eligible identities together in PostgreSQL before pagination.
  // Latest observed activity, not registration, sets the default order.
  // Null timestamps are last; Joined, kind and ID provide stable ties.
  // Join summaries after slicing so an empty/out-of-range page still carries
  // its counts. This avoids a second aggregation just to clamp an old page URL.
  return Prisma.sql`
    ${operationalCte}
    SELECT identities."kind", identities."id", identities."firstSeenAt",
      identities."lastSeenAt", identities."guestSource", identities."guestStatus",
      ${input.withOperationalSummary
        ? Prisma.sql`totals."operationalGuestCount", totals."operationalAllTimeCount", totals."operationalNewCount"`
        : Prisma.sql`0::bigint AS "operationalGuestCount",
            0::bigint AS "operationalAllTimeCount", 0::bigint AS "operationalNewCount"`}
    FROM (
      SELECT * FROM (${Prisma.join(sources, " UNION ALL ")}) AS combined_identities
      ORDER BY ${order}
      ${input.allIdentities ? Prisma.empty : Prisma.sql`LIMIT ${limit} OFFSET ${offset}`}
    ) AS identities
    ${input.withOperationalSummary ? Prisma.sql`
      RIGHT JOIN (
        SELECT scoped."operationalGuestCount",
          summary."operationalAllTimeCount", summary."operationalNewCount"
        FROM (SELECT COUNT(*)::bigint AS "operationalGuestCount"
          FROM operational_sessions) scoped
        CROSS JOIN operational_summary summary
      ) totals ON TRUE
    ` : Prisma.empty}
    ORDER BY ${order}
  `;
}
