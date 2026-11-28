import { Prisma } from "@/generated/prisma/client";
import { crawlerCatalog } from "@/lib/botRegistry";
import { recordedSearchNetwork } from "@/lib/searchNetworkObservation";
import { publicVisitorIp } from "@/lib/geo/ipinfo";

// Match the registry's historical identity mapping. Never promote a declared
// caller to the verified cohort merely because a name or address matches.
const searchEngines = Object.entries(crawlerCatalog).filter(([, entry]) => entry.category === "search").map(([token]) => token);
const originalOther = Object.entries(crawlerCatalog).filter(([, entry]) => entry.category !== "search").map(([token]) => token);
const namedTokens = [...searchEngines, ...originalOther, "MJ12BOT", "OAI-SEARCHBOT", "AASA-BOT"];

export type BotReportWindow = { from: Date; to: Date } | undefined;

export function botHistoryWindow(window: BotReportWindow) {
  return window ? Prisma.sql`AND timestamp >= ${window.from} AND timestamp < ${window.to}` : Prisma.empty;
}

/** Historical actual searches without a retained activity link. This is a
 * read-only reporting projection, not a BotActivity event or a quota replay.
 * SearchHistory remains the authoritative source for actual-search counts. */
export function historicalBotSearches(environment: string) {
  return Prisma.sql`
    WITH recorded AS (
      SELECT s.id, s."createdAt" AS timestamp, s."requestId", s.type::text AS product,
        s.status::text AS status, s."resultCount", s.query->'searchNetwork' AS network,
        coalesce(nullif(s.query->>'identifiedCrawler', ''), nullif(s.query->>'verifiedCrawler', '')) AS token,
        s.query->>'crawlerEvidence' AS evidence,
        (nullif(s.query->>'verifiedCrawler', '') IS NOT NULL
          AND (nullif(s.query->>'identifiedCrawler', '') IS NULL OR s.query->>'identifiedCrawler' = s.query->>'verifiedCrawler')
          AND (s.query->>'crawlerEvidence' IS NULL OR s.query->>'crawlerEvidence' IN ('VERIFIED_DNS', 'VERIFIED_IP_RANGE'))) AS verified
      FROM "SearchHistory" s
      WHERE s.query->>'environment' = ${environment}
        AND s.query->>'applicationSource' = 'BOT' AND s."countAsSearch" = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM "BotActivity" a
          WHERE a.environment = ${environment} AND a.id = s."requestId"
        )
    )
    SELECT id, timestamp, "requestId", product, status, "resultCount", network,
      CASE WHEN verified THEN coalesce(evidence, 'VERIFIED_DNS')
        WHEN evidence = 'DECLARED_USER_AGENT' THEN evidence ELSE NULL END AS evidence,
      CASE WHEN verified AND token IN (${Prisma.join(searchEngines)}) THEN 'SEARCH_ENGINE:' || token
        WHEN token IN (${Prisma.join(originalOther)}) THEN 'OTHER_RECOGNIZED:' || token
        ELSE 'UNKNOWN:' || CASE
          WHEN token IN (${Prisma.join(namedTokens)}) OR token ~ '^[A-Z0-9_-]{2,48}(BOT|CRAWLER|SPIDER)$' THEN token
          ELSE 'UNATTRIBUTED' END
      END AS "identityKey"
    FROM recorded
  `;
}

export type HistoricalBotSearch = {
  id: string;
  timestamp: Date;
  requestId: string | null;
  product: string;
  status: string;
  resultCount: number;
  network: unknown;
  evidence: string | null;
  identityKey: string;
};

export type BotHistoryPointer = { id: string; timestamp: Date; source: "activity" | "search" };

type BotHistoryFilters = {
  window: BotReportWindow;
  kind?: string;
  decision?: string;
};

export function botRequestHistory(environment: string, botId: string, filters: BotHistoryFilters) {
  return Prisma.sql`
    SELECT id, timestamp, 'activity'::text AS source FROM "BotActivity"
    WHERE environment = ${environment} AND "botId" = ${botId}
    ${botHistoryWindow(filters.window)}
    ${filters.kind ? Prisma.sql`AND kind = ${filters.kind}` : Prisma.empty}
    ${filters.decision ? Prisma.sql`AND decision = ${filters.decision}` : Prisma.empty}
  `;
}

export type BotRequestSummary = {
  requests: bigint;
  allowed: bigint;
  denied: bigint;
  searchAttempts: bigint;
  searches: bigint;
};

/** Read-only date-scoped counts; request accounting follows the original
 * request timestamp, while a dispatch is observed at its dispatch time.
 * Keep this separate from the paginated/decision-filtered activity list. */
export function botRequestSummaryQuery(environment: string, botId: string, window: NonNullable<BotReportWindow>) {
  const request = Prisma.sql`timestamp >= ${window.from} AND timestamp < ${window.to}`;
  const dispatch = Prisma.sql`"dispatchedAt" >= ${window.from} AND "dispatchedAt" < ${window.to}`;
  return Prisma.sql`
    SELECT count(*) FILTER (WHERE ${request}) AS requests,
      count(*) FILTER (WHERE ${request} AND decision = 'ALLOWED') AS allowed,
      count(*) FILTER (WHERE ${request} AND decision = 'DENIED') AS denied,
      count(*) FILTER (WHERE ${request} AND product IS NOT NULL) AS "searchAttempts",
      count(*) FILTER (WHERE ${dispatch}) AS searches
    FROM "BotActivity"
    WHERE environment = ${environment} AND "botId" = ${botId}
      AND ((${request}) OR (${dispatch}))
  `;
}

export function combinedBotHistory(environment: string, botId: string, identityKey: string, filters: BotHistoryFilters,
  historicalSource = Prisma.sql`SELECT id, timestamp FROM (${historicalBotSearches(environment)}) history WHERE "identityKey" = ${identityKey}`) {
  const live = filters.kind === "HISTORICAL_SEARCH" ? Prisma.empty : botRequestHistory(environment, botId, filters);
  const includeHistorical = !filters.decision && (!filters.kind || filters.kind === "HISTORICAL_SEARCH");
  const historical = includeHistorical ? Prisma.sql`
    SELECT id, timestamp, 'search'::text AS source FROM (${historicalSource}) history
    WHERE TRUE ${botHistoryWindow(filters.window)}
  ` : Prisma.empty;
  if (filters.kind === "HISTORICAL_SEARCH") {
    return includeHistorical ? historical : Prisma.sql`SELECT NULL::text AS id, NULL::timestamp AS timestamp, NULL::text AS source WHERE FALSE`;
  }
  return includeHistorical ? Prisma.sql`${live} UNION ALL ${historical}` : live;
}

/** Evidence from an actual search is explicitly historical/reported data.
 * Validate public IPs and country codes using the existing search reader.
 * Never pass this result to crawler authentication or access control. */
export function botSearchNetwork(network: unknown) {
  const recorded = recordedSearchNetwork({ searchNetwork: network });
  return { ipAddress: publicVisitorIp(recorded.ipAddress), countryCode: recorded.countryCode };
}

export function historicalVerificationLabel(evidence: string | null) {
  return evidence === "VERIFIED_DNS" ? "DNS verified at search time"
    : evidence === "VERIFIED_IP_RANGE" ? "Official IP list verified at search time"
    : evidence === "DECLARED_USER_AGENT" ? "User-Agent identified"
    : "Not recorded";
}
