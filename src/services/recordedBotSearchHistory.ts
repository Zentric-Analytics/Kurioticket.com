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

// Shared by the initial summary and the on-demand bounded fallback pages.
// The original identity and search attribution remain unchanged.
function botNetworkScope(environment: string, id: string, name: string | null) {
  return Prisma.sql`
    SELECT id FROM "BotRegistry" WHERE environment = ${environment}
    AND (id = ${id}
      ${name ? Prisma.sql`OR (name = ${name} AND "group" <> 'UNKNOWN')` : Prisma.empty})
  `;
}

function botNetworkRecords(environment: string, id: string, name: string | null) {
  return Prisma.sql`
    SELECT id, "botId", "createdAt" AS timestamp, 'search'::text AS source,
      CASE WHEN jsonb_typeof(evidence->'searchNetwork'->'ipAddress') = 'string'
        THEN nullif(evidence->'searchNetwork'->>'ipAddress', '') END AS ip,
      CASE WHEN jsonb_typeof(evidence->'searchNetwork'->'countryCode') = 'string'
        THEN evidence->'searchNetwork'->>'countryCode' END AS country,
      'Recorded search'::text AS provenance, 0::int AS priority
    FROM attributed
    -- Apply the same source crawler-name condition for every related cohort.
    -- A linked search for a different crawler never relabels the owning bot.
    WHERE ${name ? Prisma.sql`coalesce(nullif(evidence->>'identifiedCrawler', ''), nullif(evidence->>'verifiedCrawler', '')) = ${name}` : Prisma.sql`"botId" = ${id}`}
    UNION ALL
    SELECT a.id, a."botId", a.timestamp, 'activity'::text AS source,
      observation.ip, observation.country, observation.provenance, observation.priority
    FROM "BotActivity" a
    CROSS JOIN LATERAL (VALUES
      (a.ip, a.country, coalesce(a."networkSource", 'Recorded request'), 0),
      (a."renderLogIp", a."renderLogCountry", 'Render log', 1),
      (a."reportedIp", a."reportedCountry", 'Reported request IP', 2)
    ) AS observation(ip, country, provenance, priority)
    WHERE a.environment = ${environment} AND a."botId" IN (SELECT id FROM network_scope)
  `;
}

/** Evaluate search attribution once on the same snapshot as the live events.
 * Materialize narrow projections; only serialize the paginated rows and summary evidence. */
export function detailHistoryQuery(environment: string, id: string, name: string | null, history: Prisma.Sql,
  validWindow: boolean, requestedPage: number, requestedSearchPage: number,
  summaryWindow?: { from: Date; to: Date } | null) {
  return Prisma.sql`
    WITH network_scope AS MATERIALIZED (
      ${botNetworkScope(environment, id, name)}
    ), attributed AS MATERIALIZED (
      SELECT searches.* FROM (${recordedBotSearchRows(environment)}) searches
      WHERE "botId" IN (SELECT id FROM network_scope)
    ), recorded AS MATERIALIZED (
      SELECT * FROM attributed WHERE "botId" = ${id}
    ), network_records AS MATERIALIZED (
      ${botNetworkRecords(environment, id, name)}
    ), timeline AS MATERIALIZED (
      ${validWindow ? history : Prisma.sql`SELECT NULL::text AS id, NULL::timestamp AS timestamp, NULL::text AS source WHERE FALSE`}
    ), counts AS (
      SELECT (SELECT count(*)::int FROM timeline) AS total,
             count(*)::int AS actual, count(*) FILTER (WHERE "activityId" IS NULL)::int AS historical,
             ${summaryWindow === null ? Prisma.sql`NULL::int` : summaryWindow
               ? Prisma.sql`count(*) FILTER (WHERE "createdAt" >= ${summaryWindow.from} AND "createdAt" < ${summaryWindow.to})::int`
               : Prisma.sql`count(*)::int`} AS "summaryActual"
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
      actual, "summaryActual", historical AS "historicalActual", page, "searchPage",
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
      -- Return only one page; the server iterates if no public IP is found.
      -- Do not assume the first 25 candidates have valid public addresses.
      coalesce((SELECT jsonb_agg(item ORDER BY item.timestamp DESC, item.source, item.id DESC, item.priority) FROM (
        SELECT id, "botId", timestamp, source, ip, provenance, priority FROM network_records
        WHERE ip IS NOT NULL
        ORDER BY timestamp DESC, source, id DESC, priority LIMIT ${BOT_PAGE_SIZE}
      ) item), '[]') AS "networkIpCandidates",
      coalesce((SELECT jsonb_agg(code ORDER BY code) FROM (
        SELECT DISTINCT upper(country) AS code FROM network_records
        WHERE country ~ '^[A-Za-z]{2}$'
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

/** Bounded fallback only when the initial summary has no valid public IP.
 * Use the same cohort and original evidence as the summary; pagination
 * prevents huge JSON payloads for high-traffic bots. */
/** Single read-only server-side cursor, opened only after the first 25
 * candidates are unusable. FETCH returns bounded batches without rebuilding
 * the full network history on every page. Close within the transaction. */
export function declareBotNetworkIpCursor(environment: string, id: string, name: string | null) {
  return Prisma.sql`
    DECLARE bot_network_ip_cursor NO SCROLL CURSOR FOR
    WITH network_scope AS MATERIALIZED (
      ${botNetworkScope(environment, id, name)}
    ), attributed AS MATERIALIZED (
      SELECT searches.* FROM (${recordedBotSearchRows(environment)}) searches
      WHERE "botId" IN (SELECT id FROM network_scope)
    ), network_records AS MATERIALIZED (
      ${botNetworkRecords(environment, id, name)}
    )
    SELECT id, "botId", to_char(timestamp, 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS timestamp,
      source, ip, provenance, priority
    FROM network_records WHERE ip IS NOT NULL
    ORDER BY network_records.timestamp DESC, source, id DESC, priority
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

/** Validate the first bounded batch, fetching later batches only if needed.
 * An older valid public IP must survive any number of newer invalid records. */
export async function summarizeBotNetworkPaged(
  initial: BotNetworkIpCandidate[], countryCodes: string[],
  nextPage: () => Promise<BotNetworkIpCandidate[]>,
) {
  const summary = summarizeBotNetwork(initial, countryCodes);
  if (summary.latestIp || initial.length < BOT_PAGE_SIZE) return summary;
  for (;;) {
    const candidates = await nextPage();
    const found = summarizeBotNetwork(candidates, []).latestIp;
    if (found) return { ...summary, latestIp: found };
    if (candidates.length < BOT_PAGE_SIZE) return summary;
  }
}

