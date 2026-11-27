import { Prisma } from "@/generated/prisma/client";
import { deviceHistoryWindow, DEVICE_HISTORY_PAGE_SIZE, type DeviceHistoryQuery } from "./adminDeviceHistory";
import { pageHistoryPlatformValues, pageHistoryTransport } from "./adminPageHistory";
import { pageViewCatalog, type PageViewKey } from "./pageViewCatalog";
import type { PublicEnvironment } from "./stagingSafety";
import { ISO_COUNTRY_CODES, countryCodeToCountryName } from "./geo/context";

export function accessDatePredicate(column: Prisma.Sql, window: { gte?: Date; lt?: Date; lte?: Date }) {
  return Prisma.sql`TRUE
    ${window.gte ? Prisma.sql`AND ${column} >= ${window.gte}` : Prisma.empty}
    ${window.lt ? Prisma.sql`AND ${column} < ${window.lt}` : Prisma.empty}
    ${window.lte ? Prisma.sql`AND ${column} <= ${window.lte}` : Prisma.empty}`;
}

/** Match the account platform projection, not live presence or guessed device names. */
export function accountDevicePlatformPredicate(platform: DeviceHistoryQuery["platform"]) {
  const mobile = Prisma.sql`(s."deviceLabel" = 'Mobile device' OR strpos(s."deviceLabel", 'iPhone') > 0 OR strpos(s."deviceLabel", 'iPad') > 0 OR strpos(s."deviceLabel", 'Android') > 0)`;
  if (platform === "ios" || platform === "android") return Prisma.sql`AND s."client" = 'MOBILE' AND s."platform" = ${platform}`;
  if (platform === "mobile") return Prisma.sql`AND s."client" = 'WEB' AND ${mobile}`;
  if (platform === "desktop") return Prisma.sql`AND s."client" = 'WEB' AND NOT ${mobile}
    AND (s."deviceLabel" = 'Desktop device' OR strpos(s."deviceLabel", 'computer') > 0 OR right(s."deviceLabel", 3) = 'Mac')`;
  return Prisma.empty;
}

/** Access evidence is not an account session. Optional guest observations use
 * existing consented PAGE_VIEW records; necessary guest activity uses only
 * already-retained anonymous operational search/handoff records. Never join
 * temporary presence IDs to visitors, or expose raw network data/credentials. */
export function guestAccessRecordsSql(query: DeviceHistoryQuery, environment: PublicEnvironment, now: Date, id?: string | readonly string[], timeZone = "UTC") {
  const window = deviceHistoryWindow(query, now, timeZone);
  const identityPredicate = (column: Prisma.Sql) => typeof id === "string" ? Prisma.sql`AND ${column} = ${id}`
    : id ? id.length ? Prisma.sql`AND ${column} IN (${Prisma.join([...id])})` : Prisma.sql`AND FALSE`
    : Prisma.empty;
  const keys = Object.keys(pageViewCatalog) as PageViewKey[];
  const webKeys = keys.filter(key => pageViewCatalog[key].web.length > 0);
  const nativeKeys = keys.filter(key => pageViewCatalog[key].native.length > 0);
  const platforms = pageHistoryPlatformValues(query.platform ?? "all");
  const transport = pageHistoryTransport(query.platform ?? "all");
  const operational = (type: "search" | "handoff") => {
    const table = type === "search" ? Prisma.sql`"SearchHistory" x` : Prisma.sql`"RedirectLog" x`;
    const meta = type === "search" ? Prisma.sql`x."query"` : Prisma.sql`x."metadata"`;
    const session = Prisma.sql`${meta}->>'operationalSessionId'`;
    const source = Prisma.sql`${meta}->>'applicationSource'`;
    const webDevice = Prisma.sql`${source} = 'WEB' AND ${meta}->'guestAccess'->>'version' = '1'
      AND ${meta}->'guestAccess'->>'platform' IN ('desktop', 'mobile')`;
    // Native source already records a platform-bound app declaration. WEB
    // alone cannot establish desktop/mobile; only this request's saved
    // device observation can refine it. Legacy unobserved web stays coarse.
    const platform = Prisma.sql`CASE ${source} WHEN 'IOS' THEN 'ios' WHEN 'ANDROID' THEN 'android'
      WHEN 'WEB' THEN CASE WHEN ${webDevice} THEN ${meta}->'guestAccess'->>'platform' ELSE 'web' END
      ELSE 'unknown' END`;
    return Prisma.sql`
      SELECT ${session} AS "guestId", 'operational'::text AS "guestSource",
        ${type} || ':' || x."id" AS "recordId", ${type}::text AS "evidence",
        ${platform} AS "platform",
        CASE ${source} WHEN 'IOS' THEN 'iOS device' WHEN 'ANDROID' THEN 'Android device'
          ELSE CASE WHEN ${webDevice} THEN ${meta}->'guestAccess'->>'deviceLabel' END END AS "deviceLabel",
        CASE WHEN ${webDevice} THEN ${meta}->'guestAccess'->>'browser' END AS "browser",
        CASE ${source} WHEN 'IOS' THEN 'iOS' WHEN 'ANDROID' THEN 'Android'
          ELSE CASE WHEN ${webDevice} THEN ${meta}->'guestAccess'->>'os' END END AS "os",
        NULL::text AS "locationLabel",
        ${type === "search" ? Prisma.sql`CASE WHEN jsonb_typeof(x."query" #> '{searchNetwork,countryCode}') = 'string' THEN x."query" #>> '{searchNetwork,countryCode}' END` : Prisma.sql`NULL::text`} AS "recordedCountryCode",
        x."createdAt" AS "at"
      FROM ${table}
      WHERE x."userId" IS NULL AND x."visitorId" IS NULL
        AND ${meta}->>'environment' = ${environment}
        AND ${session} ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND COALESCE(${source}, 'UNKNOWN') <> 'BOT'
        AND NOT EXISTS (SELECT 1 FROM "Visitor" existing WHERE existing."id" = ${session})
        AND ${accessDatePredicate(Prisma.sql`x."createdAt"`, window)}
        ${identityPredicate(session)}
        ${query.platform && query.platform !== "all" ? Prisma.sql`AND ${platform} = ${query.platform}` : Prisma.empty}
    `;
  };
  const consented = Prisma.sql`
    SELECT v."id" AS "guestId", 'consented'::text AS "guestSource",
      'page:' || a."id" AS "recordId", 'page'::text AS "evidence",
      CASE
        WHEN a."metadata"->>'transport' = 'native' THEN CASE
          WHEN a."metadata"->>'platform' IN ('iOS app', 'iOS app (reported)') THEN 'ios'
          WHEN a."metadata"->>'platform' IN ('Android app', 'Android app (reported)') THEN 'android' ELSE 'native' END
        ELSE CASE
          WHEN a."metadata"->>'platform' IN ('Desktop web', 'Desktop web (reported)') THEN 'desktop'
          WHEN a."metadata"->>'platform' IN ('Mobile web', 'Mobile web (reported)') THEN 'mobile' ELSE 'web' END
      END AS "platform",
      CASE WHEN a."metadata"->'guestAccess'->>'version' = '1' THEN a."metadata"->'guestAccess'->>'deviceLabel' END AS "deviceLabel",
      CASE WHEN a."metadata"->'guestAccess'->>'version' = '1' THEN a."metadata"->'guestAccess'->>'browser' END AS "browser",
      CASE WHEN a."metadata"->'guestAccess'->>'version' = '1' THEN a."metadata"->'guestAccess'->>'os' END AS "os",
      CASE WHEN a."metadata"->'guestAccess'->>'version' = '1' THEN a."metadata"->'guestAccess'->>'locationLabel' END AS "locationLabel",
      NULL::text AS "recordedCountryCode",
      a."createdAt" AS "at"
    FROM "AnalyticsEvent" a JOIN "Visitor" v ON v."id" = a."visitorId"
    WHERE a."type" = 'PAGE_VIEW' AND a."name" = 'page_viewed'
      AND a."metadata"->>'environment' = ${environment}
      AND a."userId" IS NULL AND v."currentUserId" IS NULL
      AND v."consentStatus" = 'GRANTED' AND v."trackingDisabledAt" IS NULL
      AND NOT EXISTS (SELECT 1 FROM "VisitorIdentityLink" l WHERE l."visitorId" = v."id")
      AND ${accessDatePredicate(Prisma.sql`a."createdAt"`, window)}
      AND ((a."metadata"->>'transport' = 'web' AND a."metadata"->>'pageKey' IN (${Prisma.join(webKeys)}))
        OR (a."metadata"->>'transport' = 'native' AND a."metadata"->>'pageKey' IN (${Prisma.join(nativeKeys)})))
      ${identityPredicate(Prisma.sql`v."id"`)}
      ${platforms.length ? Prisma.sql`AND a."metadata"->>'platform' IN (${Prisma.join(platforms)})` : Prisma.empty}
      ${transport ? Prisma.sql`AND a."metadata"->>'transport' = ${transport}` : Prisma.empty}
  `;
  return Prisma.sql`${consented} UNION ALL ${operational("search")} UNION ALL ${operational("handoff")}`;
}

/** Identical source and filters for directory counts and detail history. */
export function guestAccessHistorySql(id: string, query: DeviceHistoryQuery, environment: PublicEnvironment, now: Date, timeZone = "UTC") {
  return Prisma.sql`
    WITH records AS MATERIALIZED (${guestAccessRecordsSql(query, environment, now, id, timeZone)})
    SELECT r.*, totals."total", totals."firstSeenAt", totals."lastSeenAt"
    FROM (SELECT COUNT(*)::bigint AS "total", MIN("at") AS "firstSeenAt", MAX("at") AS "lastSeenAt" FROM records) totals
    LEFT JOIN LATERAL (
      SELECT * FROM records ORDER BY "at" DESC, "recordId" ASC
      LIMIT ${DEVICE_HISTORY_PAGE_SIZE} OFFSET ${(query.page - 1) * DEVICE_HISTORY_PAGE_SIZE}
    ) r ON TRUE
    ORDER BY r."at" DESC NULLS LAST, r."recordId" ASC
  `;
}

/** Latest actual location-bearing record per eligible identity and source,
 * independent of pagination. The same access evidence/consent/environment
 * predicates are used by the detail reader. A missing later observation
 * remains missing; this is explicitly a dated historical summary, not a fill.
 */
export function guestLatestRecordedLocationsSql(
  ids: readonly string[], query: DeviceHistoryQuery, environment: PublicEnvironment, now: Date, timeZone = "UTC",
) {
  const names = ISO_COUNTRY_CODES.map(code => countryCodeToCountryName(code) ?? code);
  return Prisma.sql`
    SELECT DISTINCT ON ("guestId", "guestSource")
      "guestId", "guestSource", "evidence", "locationLabel", "recordedCountryCode", "at"
    FROM (${guestAccessRecordsSql(query, environment, now, ids, timeZone)}) location_records
    WHERE (
      ("guestSource" = 'operational' AND "evidence" = 'search'
        AND upper(btrim("recordedCountryCode")) IN (${Prisma.join([...ISO_COUNTRY_CODES])}))
      OR ("guestSource" = 'consented' AND "evidence" = 'page'
        AND length("locationLabel") BETWEEN 2 AND 100
        AND regexp_replace("locationLabel", '^.*, ', '') IN (${Prisma.join(names)}))
    )
    ORDER BY "guestId", "guestSource", "at" DESC, "recordId" ASC
  `;
}
