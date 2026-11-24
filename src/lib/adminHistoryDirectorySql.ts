import { Prisma } from "@/generated/prisma/client";
import { activityWindow } from "./adminIdentityActivity";
import { deviceHistoryWindow } from "./adminDeviceHistory";
import { pageHistoryPlatformValues, pageHistoryTransport, parsePageHistoryQuery } from "./adminPageHistory";
import { pageViewCatalog, type PageViewKey } from "./pageViewCatalog";
import { HISTORY_DIRECTORY_PAGE_SIZE, type HistoryDirectoryQuery, type HistorySection } from "./adminHistoryDirectory";
import type { PublicEnvironment } from "./stagingSafety";

function datePredicate(column: Prisma.Sql, window: { gte?: Date; lt?: Date; lte?: Date }) {
  return Prisma.sql`TRUE
    ${window.gte ? Prisma.sql`AND ${column} >= ${window.gte}` : Prisma.empty}
    ${window.lt ? Prisma.sql`AND ${column} < ${window.lt}` : Prisma.empty}
    ${window.lte ? Prisma.sql`AND ${column} <= ${window.lte}` : Prisma.empty}`;
}

/** Group the same retained records used by each detail reader. Never derive
 * guest access history from activity or use a live-presence snapshot as history. */
export function historyDirectorySql(section: HistorySection, query: HistoryDirectoryQuery, environment: PublicEnvironment, now: Date) {
  if (!Number.isSafeInteger(query.page) || query.page < 1 || query.page > 1_000_000) throw new Error("Invalid history directory page");
  let source: Prisma.Sql;
  if (section === "devices") {
    source = Prisma.sql`
      SELECT 'user'::text AS "kind", u."id", COALESCE(NULLIF(u."name", ''), u."email", 'Registered user') AS "name",
        u."email", COUNT(*)::bigint AS "count", MAX(s."lastSeenAt") AS "lastSeenAt"
      FROM "AccountSession" s JOIN "User" u ON u."id" = s."userId"
      WHERE ${datePredicate(Prisma.sql`s."lastSeenAt"`, deviceHistoryWindow(query, now))}
      GROUP BY u."id", u."name", u."email"
    `;
  } else {
    const parsed = parsePageHistoryQuery({ range: query.range, from: query.from, to: query.to, platform: query.platform }, now);
    if (!parsed.ok) throw new Error(parsed.error);
    const keys = Object.keys(pageViewCatalog) as PageViewKey[];
    const webKeys = keys.filter(key => pageViewCatalog[key].web.length > 0);
    const nativeKeys = keys.filter(key => pageViewCatalog[key].native.length > 0);
    const platforms = pageHistoryPlatformValues(query.platform);
    const transport = pageHistoryTransport(query.platform);
    // Mirror eligibleGuestVisitorWhere / eligibleJourneyLinkedVisitorWhere
    // and the detail reader's pageOwner: an unlinked visitor is counted once;
    // a linked visitor is attributed only to its single verified current owner.
    // Neither a direct userId alone nor stale/conflicting identity links suffice.
    source = Prisma.sql`
      SELECT CASE WHEN v."currentUserId" IS NULL THEN 'guest' ELSE 'user' END AS "kind",
        COALESCE(v."currentUserId", v."id") AS "id",
        CASE WHEN v."currentUserId" IS NULL THEN 'Guest visitor'
          ELSE COALESCE(NULLIF(u."name", ''), u."email", 'Registered user') END AS "name",
        u."email", COUNT(*)::bigint AS "count", MAX(a."createdAt") AS "lastSeenAt"
      FROM "AnalyticsEvent" a JOIN "Visitor" v ON v."id" = a."visitorId"
      LEFT JOIN "User" u ON u."id" = v."currentUserId"
      WHERE a."type" = 'PAGE_VIEW' AND a."name" = 'page_viewed'
        AND a."metadata"->>'environment' = ${environment}
        AND ${datePredicate(Prisma.sql`a."createdAt"`, activityWindow(parsed.query.filters))}
        AND (
          (a."metadata"->>'transport' = 'web' AND a."metadata"->>'pageKey' IN (${Prisma.join(webKeys)}))
          OR (a."metadata"->>'transport' = 'native' AND a."metadata"->>'pageKey' IN (${Prisma.join(nativeKeys)}))
        )
        ${platforms.length ? Prisma.sql`AND a."metadata"->>'platform' IN (${Prisma.join(platforms)})` : Prisma.empty}
        ${transport ? Prisma.sql`AND a."metadata"->>'transport' = ${transport}` : Prisma.empty}
        AND v."consentStatus" = 'GRANTED' AND v."trackingDisabledAt" IS NULL
        AND (
          (v."currentUserId" IS NULL AND a."userId" IS NULL
            AND NOT EXISTS (SELECT 1 FROM "VisitorIdentityLink" l WHERE l."visitorId" = v."id"))
          OR
          (v."currentUserId" IS NOT NULL AND u."status" = 'ACTIVE' AND u."emailVerified" IS NOT NULL
            AND (a."userId" IS NULL OR a."userId" = v."currentUserId")
            AND EXISTS (SELECT 1 FROM "VisitorIdentityLink" l WHERE l."visitorId" = v."id" AND l."userId" = v."currentUserId")
            AND NOT EXISTS (SELECT 1 FROM "VisitorIdentityLink" l WHERE l."visitorId" = v."id" AND l."userId" <> v."currentUserId"))
        )
      GROUP BY 1, 2, 3, 4
    `;
  }
  // One database snapshot, exact identity count even for an empty/out-of-range
  // page, deterministic sorting before slicing. All search text is a parameter.
  const tab = query.tab === "registered" ? Prisma.sql`AND "kind" = 'user'`
    : query.tab === "guests" ? Prisma.sql`AND "kind" = 'guest'` : Prisma.empty;
  return Prisma.sql`
    WITH grouped AS (${source}),
    matching AS MATERIALIZED (
      SELECT * FROM grouped WHERE TRUE ${tab}
        ${query.q ? Prisma.sql`AND (strpos(lower("name"), lower(${query.q})) > 0
          OR strpos(lower(COALESCE("email", '')), lower(${query.q})) > 0
          OR strpos(lower("id"), lower(${query.q})) > 0)` : Prisma.empty}
    )
    SELECT r.*, totals."total"
    FROM (SELECT COUNT(*)::bigint AS "total" FROM matching) totals
    LEFT JOIN LATERAL (
      SELECT * FROM matching
      ORDER BY "lastSeenAt" DESC, "kind" ASC, "id" ASC
      LIMIT ${HISTORY_DIRECTORY_PAGE_SIZE} OFFSET ${(query.page - 1) * HISTORY_DIRECTORY_PAGE_SIZE}
    ) r ON TRUE
    ORDER BY r."lastSeenAt" DESC NULLS LAST, r."kind" ASC, r."id" ASC
  `;
}
