import { Prisma } from "@/generated/prisma/client";
import { crawlerCatalog } from "@/lib/botRegistry";

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
           s."resultCount", a.id AS "activityId", coalesce(linked.id, historic.id) AS "botId",
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
