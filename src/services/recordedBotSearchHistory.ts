import { Prisma } from "@/generated/prisma/client";
import { BOT_PAGE_SIZE } from "@/lib/adminBotReport";
import { crawlerCatalog } from "@/lib/botRegistry";
import { publicVisitorIp } from "@/lib/geo/ipinfo";
import { isIsoCountryCode, normalizeCountryCode } from "@/lib/geo/context";

const engines = Object.entries(crawlerCatalog).filter(([, item]) => item.category === "search").map(([name]) => name);
const others = Object.entries(crawlerCatalog).filter(([, item]) => item.category !== "search").map(([name]) => name);
const historicalAdditional = ["MJ12BOT", "OAI-SEARCHBOT", "AASA-BOT"];

/** Read-only reporting attribution. Match the exact existing activity first.
 * The fallback reproduces historical registry identity keys, not current
 * crawler verification or access decisions. Every counted search is returned
 * at most once; records without a registry match remain explicitly unassigned.
 * Never call this query to authorize access or calculate enforcement quotas. */
export function recordedBotSearchRows(environment: string, window?: { from: Date; to: Date }) {
  return Prisma.sql`
    SELECT s.id, s."createdAt", s.type::text AS product, s.status::text AS status,
           s."resultCount", s."requestId", a.id AS "activityId", coalesce(linked.id, historic.id) AS "botId",
           CASE WHEN s.verified THEN coalesce(s.query->>'crawlerEvidence', 'VERIFIED_DNS')
                WHEN s.query->>'crawlerEvidence' = 'DECLARED_USER_AGENT' THEN 'DECLARED_USER_AGENT' END AS "historicalEvidence",
           jsonb_build_object(
             'applicationSource', 'BOT', 'identifiedCrawler', s.query->'identifiedCrawler',
             'verifiedCrawler', s.query->'verifiedCrawler', 'crawlerEvidence', s.query->'crawlerEvidence',
             'searchNetwork', s.query->'searchNetwork'
           ) AS evidence
    FROM (
      SELECT id, "createdAt", "requestId", type, status, "resultCount", query,
             coalesce(nullif(query->>'identifiedCrawler', ''), nullif(query->>'verifiedCrawler', '')) AS token,
             (
               nullif(query->>'verifiedCrawler', '') IS NOT NULL
               AND (nullif(query->>'identifiedCrawler', '') IS NULL OR query->>'identifiedCrawler' = query->>'verifiedCrawler')
               AND (query->>'crawlerEvidence' IS NULL OR query->>'crawlerEvidence' IN ('VERIFIED_DNS', 'VERIFIED_IP_RANGE'))
             ) AS verified
      FROM "SearchHistory"
      WHERE "countAsSearch" = TRUE AND query->>'environment' = ${environment}
        AND query->>'applicationSource' = 'BOT'
        ${window ? Prisma.sql`AND "createdAt" >= ${window.from} AND "createdAt" < ${window.to}` : Prisma.empty}
    ) s
    LEFT JOIN "BotActivity" a ON a.id = s."requestId" AND a.environment = ${environment}
    LEFT JOIN "BotRegistry" linked ON linked.id = a."botId" AND linked.environment = ${environment}
    LEFT JOIN "BotRegistry" historic ON a.id IS NULL AND historic.environment = ${environment}
      AND historic."identityKey" = CASE
        WHEN s.verified AND s.token IN (${Prisma.join(engines)}) THEN 'SEARCH_ENGINE:' || s.token
        WHEN s.token IN (${Prisma.join(others)}) THEN 'OTHER_RECOGNIZED:' || s.token
        ELSE 'UNKNOWN:' || CASE
          WHEN s.token IN (${Prisma.join([...engines, ...historicalAdditional])})
            OR s.token ~ '^[A-Z0-9_-]{2,48}(BOT|CRAWLER|SPIDER)$' THEN s.token
          ELSE 'UNATTRIBUTED' END
      END
  `;
}

export type RecordedBotSearch = {
  id: string;
  createdAt: Date;
  product: string;
  status: string;
  resultCount: number;
  activityId: string | null;
  botId: string | null;
  evidence: Prisma.JsonValue;
};

/** Evaluate search attribution once on the same snapshot as the live events.
 * Materialize narrow projections; only serialize the paginated rows and summary evidence. */
export function detailHistoryQuery(environment: string, id: string, name: string | null, history: Prisma.Sql,
  validWindow: boolean, requestedPage: number, requestedSearchPage: number) {
  return Prisma.sql`
    WITH network_scope AS MATERIALIZED (
      SELECT id FROM "BotRegistry" WHERE environment = ${environment}
      AND (id = ${id}
      ${name ? Prisma.sql`OR (name = ${name} AND "group" <> 'UNKNOWN')` : Prisma.empty})
    ), attributed AS MATERIALIZED (
      SELECT searches.* FROM (${recordedBotSearchRows(environment)}) searches
      WHERE "botId" IN (SELECT id FROM network_scope)
    ), recorded AS MATERIALIZED (
      SELECT * FROM attributed WHERE "botId" = ${id}
    ), network_records AS MATERIALIZED (
      SELECT id, "botId", "createdAt" AS timestamp, 'search'::text AS source,
        CASE WHEN jsonb_typeof(evidence->'searchNetwork'->'ipAddress') = 'string'
          THEN nullif(evidence->'searchNetwork'->>'ipAddress', '') END AS ip,
        CASE WHEN jsonb_typeof(evidence->'searchNetwork'->'countryCode') = 'string'
          THEN evidence->'searchNetwork'->>'countryCode' END AS country,
        'Recorded search'::text AS provenance
      FROM attributed
      WHERE "botId" = ${id}
        ${name ? Prisma.sql`OR coalesce(nullif(evidence->>'identifiedCrawler', ''), nullif(evidence->>'verifiedCrawler', '')) = ${name}` : Prisma.empty}
      UNION ALL
      SELECT a.id, a."botId", a.timestamp, 'activity'::text AS source,
        coalesce(nullif(a.ip, ''), nullif(a."renderLogIp", ''), nullif(a."reportedIp", '')) AS ip,
        coalesce(nullif(a.country, ''), nullif(a."renderLogCountry", ''), nullif(a."reportedCountry", '')) AS country,
        CASE WHEN nullif(a.ip, '') IS NOT NULL THEN coalesce(a."networkSource", 'Recorded request')
             WHEN nullif(a."renderLogIp", '') IS NOT NULL THEN 'Render log'
             ELSE 'Reported request IP' END AS provenance
      FROM "BotActivity" a
      WHERE a.environment = ${environment} AND a."botId" IN (SELECT id FROM network_scope)
    ), timeline AS MATERIALIZED (
      ${validWindow ? history : Prisma.sql`SELECT NULL::text AS id, NULL::timestamp AS timestamp, NULL::text AS source WHERE FALSE`}
    ), counts AS (
      SELECT (SELECT count(*)::int FROM timeline) AS total,
             count(*)::int AS actual, count(*) FILTER (WHERE "activityId" IS NULL)::int AS historical
      FROM recorded
    ), pages AS (
      SELECT *, least(${requestedPage}, greatest(1, ceil(total::numeric / ${BOT_PAGE_SIZE})::int)) AS page,
        least(${requestedSearchPage}, greatest(1, ceil(actual::numeric / ${BOT_PAGE_SIZE})::int)) AS "searchPage"
      FROM counts
    ), timeline_page AS MATERIALIZED (
      SELECT * FROM timeline ORDER BY timestamp DESC, source DESC, id DESC
      OFFSET (SELECT (page - 1) * ${BOT_PAGE_SIZE} FROM pages) LIMIT ${BOT_PAGE_SIZE}
    )
    SELECT ${validWindow ? Prisma.sql`total` : Prisma.sql`NULL::int`} AS total,
      actual, historical AS "historicalActual", page, "searchPage",
      coalesce((SELECT jsonb_agg(p ORDER BY p.timestamp DESC, p.source DESC, p.id DESC) FROM timeline_page p), '[]') AS pointers,
      coalesce((SELECT jsonb_agg(item) FROM (
        SELECT r.id, r."createdAt" AS timestamp, r."requestId", r.product, r.status, r."resultCount",
               r.evidence->'searchNetwork' AS network, r."historicalEvidence" AS evidence
        FROM timeline_page p JOIN recorded r ON r.id = p.id WHERE p.source = 'search'
      ) item), '[]') AS historical,
      coalesce((SELECT jsonb_agg(item ORDER BY item."createdAt" DESC, item.id DESC) FROM (
        SELECT id, "createdAt", product, status, "resultCount", "activityId", "botId", evidence FROM recorded
        ORDER BY "createdAt" DESC, id DESC
        OFFSET (SELECT ("searchPage" - 1) * ${BOT_PAGE_SIZE} FROM pages) LIMIT ${BOT_PAGE_SIZE}
      ) item), '[]') AS "recordedSearches",
      coalesce((SELECT jsonb_agg(item ORDER BY item.timestamp DESC, item.source, item.id DESC) FROM (
        SELECT id, "botId", timestamp, source, ip, provenance FROM network_records
        WHERE ip IS NOT NULL
        ORDER BY timestamp DESC, source, id DESC LIMIT 25
      ) item), '[]') AS "networkIpCandidates",
      coalesce((SELECT jsonb_agg(code ORDER BY code) FROM (
        SELECT DISTINCT upper(country) AS code FROM network_records
        WHERE country ~ '^[A-Za-z]{2}
      ${name ? Prisma.sql`coalesce((SELECT jsonb_agg(item ORDER BY item.count DESC, item.id) FROM (
        SELECT b.id, b.verification, count(*)::int AS count
        FROM attributed a JOIN "BotRegistry" b ON b.id = a."botId"
        WHERE b.environment = ${environment} AND b.name = ${name} AND b.id <> ${id}
        GROUP BY b.id, b.verification ORDER BY count DESC, b.id LIMIT 10
      ) item), '[]')` : Prisma.sql`'[]'::jsonb`} AS "relatedCohorts"
    FROM pages
  `;
}

      ) countries), '[]') AS "networkCountryCodes",
      ${name ? Prisma.sql`coalesce((SELECT jsonb_agg(item ORDER BY item.count DESC, item.id) FROM (
        SELECT b.id, b.verification, count(*)::int AS count
        FROM attributed a JOIN "BotRegistry" b ON b.id = a."botId"
        WHERE b.environment = ${environment} AND b.name = ${name} AND b.id <> ${id}
        GROUP BY b.id, b.verification ORDER BY count DESC, b.id LIMIT 10
      ) item), '[]')` : Prisma.sql`'[]'::jsonb`} AS "relatedCohorts"
    FROM pages
  `;
}

// Summary-only network observations. The original search/request and cohort
// remain the evidence owner, including when the selected cohort has no IP.
export type BotNetworkIpCandidate = {
  id: string; botId: string; timestamp: string; source: "search" | "activity";
  ip: string; provenance: string;
};

export function summarizeBotNetwork(candidates: BotNetworkIpCandidate[], countryCodes: string[]) {
  const latestIp = candidates.find(row => publicVisitorIp(row.ip) === row.ip) ?? null;
  const countries = [...new Set(countryCodes.flatMap(raw => {
    const code = normalizeCountryCode(raw);
    return code && isIsoCountryCode(code) ? [code] : [];
  }))].sort();
  return { latestIp, countries };
}
