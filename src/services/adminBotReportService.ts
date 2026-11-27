import { z } from "zod";
import { requireAdminSession } from "@/lib/auth-guards";
import { BOT_DIRECTORY, BOT_PAGE_SIZE, botFilters, type BotQuery } from "@/lib/adminBotReport";
import { crawlerCatalog } from "@/lib/botRegistry";
import { getPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { Prisma } from "@/generated/prisma/client";
import { recordedSearchNetwork } from "@/lib/searchNetworkObservation";
import { activityNetworkEvidence, botReportVerification, reportEvidenceSelect } from "@/lib/adminBotNetworkEvidence";
import { recordedSearchCrawler } from "./adminOperationalReadCore";
import { detailHistoryQuery, recordedBotSearchRows, type RecordedBotSearch } from "./recordedBotSearchHistory";
import { botSearchNetwork, combinedBotHistory, type BotHistoryPointer, type HistoricalBotSearch } from "./adminBotHistory";
import { BOT_DAILY_SEARCH_LIMIT, nextSearchTime, utcDayStart } from "./botActivityStore";

type Filters = ReturnType<typeof botFilters>;
type Environment = ReturnType<typeof getPublicEnvironment>;

function botSearchWhere(environment: Environment): Prisma.SearchHistoryWhereInput {
  return {
    countAsSearch: true,
    AND: [
      { query: { path: ["environment"], equals: environment } },
      { query: { path: ["applicationSource"], equals: "BOT" } },
    ],
  };
}

function within(window: Filters["window"]) {
  return window ? { gte: window.from, lt: window.to } : undefined;
}

function searchIdentity(query: string): Prisma.BotRegistryWhereInput | undefined {
  if (!query) return undefined;
  const contains = query.replace(/[\\%_]/g, "\\$&");
  const names = Object.entries(crawlerCatalog)
    .filter(([, entry]) => entry.agent.toLowerCase().includes(query.toLowerCase())).map(([name]) => name);
  return {
    OR: [
      { id: { contains, mode: "insensitive" } },
      { name: { contains, mode: "insensitive" } },
      { name: { in: names } },
      // The UNKNOWN registry key stores the declared token, independent of retained events.
      { group: "UNKNOWN", identityKey: { startsWith: "UNKNOWN:", not: "UNKNOWN:UNATTRIBUTED", contains, mode: "insensitive" } },
      { group: "UNKNOWN", identityKey: { in: names.map(name => "UNKNOWN:" + name) } },
      ...("unknown bot".includes(query.toLowerCase()) ? [{ group: "UNKNOWN" }] : []),
    ],
  };
}

const registrySelect = {
  id: true, identityKey: true, name: true, group: true, category: true, owner: true, access: true,
  verification: true, firstSeen: true, lastSeen: true, requests: true,
} satisfies Prisma.BotRegistrySelect;

export async function readBotDirectory(raw: BotQuery) {
  await requireAdminSession(BOT_DIRECTORY);
  const now = new Date();
  const filters = botFilters(raw, "today", now);
  if (filters.window === null) return { state: "invalid", filters, now } as const;
  const environment = getPublicEnvironment();
  const timestamp = within(filters.window);

  try {
    const data = await getPrisma().$transaction(async db => {
      const recordedCounts = await db.$queryRaw<{ botId: string | null; count: bigint }[]>`
        SELECT "botId", count(*) AS count FROM (${recordedBotSearchRows(environment, filters.window ?? undefined)}) searches
        GROUP BY "botId"
      `;
      const actualSearches = recordedCounts.reduce((total, row) => total + row.count, BigInt(0));
      const unassignedSearches = recordedCounts.find(row => row.botId === null)?.count ?? BigInt(0);
      const where: Prisma.BotRegistryWhereInput = {
        environment, AND: searchIdentity(filters.query),
        OR: timestamp ? [
          { activities: { some: { environment, timestamp } } },
          { id: { in: recordedCounts.flatMap(row => row.botId ? [row.botId] : []) } },
        ] : undefined,
      };
      const [registry, matching, activity] = await Promise.all([
        timestamp ? [] : db.botRegistry.groupBy({
          by: ["group"], where: { environment },
          _sum: { requests: true, denied: true, rateLimited: true },
        }),
        db.botRegistry.groupBy({ by: ["group"], where, _count: true }),
        timestamp ? db.botActivity.groupBy({ by: ["decision"], where: { environment, timestamp }, _count: true }) : [],
      ]);
      const counts = { ...Object.fromEntries(matching.map(row => [row.group, row._count])), all: matching.reduce((total, row) => total + row._count, 0) } as Record<string, number>;
      const total = counts[filters.group || "all"] ?? 0;
      const page = Math.min(filters.page, Math.max(1, Math.ceil(total / BOT_PAGE_SIZE)));
      const rows = await db.botRegistry.findMany({
        where: { ...where, group: filters.group || undefined }, select: {
          ...registrySelect,
          activities: {
            where: { environment }, orderBy: [{ timestamp: "desc" }, { id: "desc" }], take: 1,
            select: reportEvidenceSelect,
          },
        },
        orderBy: [{ lastSeen: "desc" }, { id: "desc" }], skip: (page - 1) * BOT_PAGE_SIZE, take: BOT_PAGE_SIZE,
      });
      const countActivity = (decision: string) => activity.find(row => row.decision === decision)?._count ?? 0;
      const lifetime = (key: "requests" | "denied" | "rateLimited") =>
        registry.reduce((total, row) => total + (row._sum[key] ?? BigInt(0)), BigInt(0));
      return {
        counts, total, page, rows, unassignedSearches,
        registry: [counts.all, counts.SEARCH_ENGINE ?? 0, counts.OTHER_RECOGNIZED ?? 0, counts.UNKNOWN ?? 0],
        activity: [
          timestamp ? activity.reduce((total, row) => total + row._count, 0) : lifetime("requests"),
          actualSearches,
          timestamp ? countActivity("DENIED") : lifetime("denied"),
          timestamp ? countActivity("RATE_LIMITED") : lifetime("rateLimited"),
        ],
      };
    }, { isolationLevel: "RepeatableRead" });
    // Network checks run outside the read-only database transaction.
    const rows = await Promise.all(data.rows.map(async ({ activities, ...bot }) => ({
      ...bot, reportVerification: await botReportVerification(bot, activities[0]),
    })));
    return { state: "ready", filters: { ...filters, page: data.page }, now, ...data, rows } as const;
  } catch {
    console.error("[admin:bot-management] Directory report unavailable");
    return { state: "unavailable", filters, now } as const;
  }
}

type SearchEvidence = { createdAt: string; evidence: Prisma.JsonValue };
type DetailHistoryRows = {
  total: number | null;
  actual: number;
  historicalActual: number;
  page: number;
  searchPage: number;
  pointers: Pick<BotHistoryPointer, "id" | "source">[];
  historical: Array<Omit<HistoricalBotSearch, "timestamp" | "identityKey"> & { timestamp: string }>;
  recordedSearches: Array<Omit<RecordedBotSearch, "createdAt"> & { createdAt: string }>;
  relatedCohorts: { id: string; verification: string; count: number }[];
  latestSearchIp: SearchEvidence | null;
  searchEvidence: SearchEvidence[];
};

function utcJsonDate(timestamp: string) {
  return new Date(timestamp + "Z");
}

function latestSummaryIp(
  activity: { timestamp: Date; ip: string | null; renderLogIp: string | null; reportedIp: string | null } | null,
  search: SearchEvidence | null,
) {
  if (search && (!activity || utcJsonDate(search.createdAt) > activity.timestamp)) {
    const { ipAddress } = recordedSearchNetwork(search.evidence);
    if (ipAddress) return ipAddress;
  }
  return activity?.ip ?? activity?.renderLogIp ?? activity?.reportedIp ?? null;
}

export async function readBotDetails(id: string, raw: BotQuery) {
  await requireAdminSession(BOT_DIRECTORY);
  if (!z.uuid().safeParse(id).success) return { state: "missing" } as const;
  const filters = botFilters(raw, "all");
  const environment = getPublicEnvironment();

  try {
    const data = await getPrisma().$transaction(async db => {
      const bot = await db.botRegistry.findUnique({
        where: { id, environment },
        select: {
          ...registrySelect, requests: true, allowed: true, denied: true, rateLimited: true,
          searchAttempts: true, searches: true, violations: true,
          activities: {
            where: { environment }, orderBy: [{ timestamp: "desc" }, { id: "desc" }], take: 1,
            select: reportEvidenceSelect,
          },
        },
      });
      if (!bot) return null;

      const where = { botId: id, environment };
      const searchWhere = botSearchWhere(environment);
      const requestedSearchPage = typeof raw.searchPage === "string" && /^[1-9]\d{0,8}$/.test(raw.searchPage)
        ? Number(raw.searchPage) : 1;
      const history = combinedBotHistory(environment, id, bot.identityKey, {
        window: filters.window ?? undefined, kind: filters.kind, decision: filters.decision,
      }, Prisma.sql`SELECT id, "createdAt" AS timestamp FROM recorded WHERE "activityId" IS NULL`);
      const [[reportRows], observations, latestIp, quota] = await Promise.all([
        db.$queryRaw<DetailHistoryRows[]>(detailHistoryQuery(environment, id, bot.name, history,
          filters.window !== null, filters.page, requestedSearchPage)),
        db.botActivity.findMany({
          where: { ...where, OR: [
            { country: { not: null } }, { renderLogCountry: { not: null } }, { reportedCountry: { not: null } },
          ] },
          orderBy: [{ timestamp: "desc" }, { id: "desc" }], take: 20,
          select: { country: true, renderLogCountry: true, reportedCountry: true },
        }),
        db.botActivity.findFirst({
          where: { ...where, OR: [{ ip: { not: null } }, { renderLogIp: { not: null } }, { reportedIp: { not: null } }] },
          orderBy: [{ timestamp: "desc" }, { id: "desc" }], select: { timestamp: true, ip: true, renderLogIp: true, reportedIp: true },
        }),
        bot.requests > BigInt(0) && bot.group === "SEARCH_ENGINE" && bot.verification === "VERIFIED" ? (async () => {
          const [{ now }] = await db.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
          const [last, used] = await Promise.all([
            db.botActivity.findFirst({
              where: { ...where, dispatchedAt: { not: null } },
              orderBy: { dispatchedAt: "desc" }, select: { dispatchedAt: true },
            }),
            db.botActivity.count({ where: { ...where, dispatchedAt: { gte: utcDayStart(now) } } }),
          ]);
          return {
            used, remaining: Math.max(0, BOT_DAILY_SEARCH_LIMIT - used), last: last?.dispatchedAt,
            next: nextSearchTime(now, last?.dispatchedAt ?? undefined, used),
          };
        })() : null,
      ]);
      const { pointers, relatedCohorts, recordedSearches, historical, searchEvidence, total, actual, historicalActual, searchPage, page } = reportRows;
      const activityIds = pointers.filter(row => row.source === "activity").map(row => row.id);
      const events = activityIds.length ? await db.botActivity.findMany({
        where: { ...where, id: { in: activityIds } }, omit: { retryKey: true },
      }) : [];
      const dispatched = events.filter(event => event.dispatchedAt);
      const requestIds = dispatched.map(event => event.id);
      const [searches, providers] = await Promise.all([
        activityIds.length ? db.searchHistory.findMany({
          where: { ...searchWhere, requestId: { in: activityIds } },
          select: { id: true, requestId: true, status: true, resultCount: true, query: true },
        }) : [],
        requestIds.length ? db.$queryRaw<{ id: string; provider: string; service: string; status: string; requestId: string }[]>`
          SELECT id, provider, service, status::text AS status, metadata->>'requestId' AS "requestId"
          FROM "ApiProviderLog"
          WHERE "createdAt" >= ${new Date(Math.min(...dispatched.map(event => event.timestamp.getTime())))}
            AND metadata->>'environment' = ${environment}
            AND (metadata->>'requestId') IN (${Prisma.join(requestIds)})
          ORDER BY "createdAt" DESC, id DESC
        ` : [],
      ]);
      const live = events.map(event => {
        const saved = searches.find(search => search.requestId === event.id);
        return {
          ...event, source: "activity" as const,
          search: saved ? {
            id: saved.id, status: saved.status, resultCount: saved.resultCount,
            network: recordedSearchNetwork(saved.query),
          } : undefined,
          providers: providers.flatMap(({ requestId, ...provider }) => requestId === event.id ? [provider] : []),
        };
      });
      const older = historical.map(({ network, ...row }) => ({
        ...row, timestamp: utcJsonDate(row.timestamp), source: "search" as const, ...botSearchNetwork(network),
      }));
      const liveById = new Map(live.map(event => [event.id, event]));
      const olderById = new Map(older.map(event => [event.id, event]));
      const timeline = pointers.flatMap(pointer => {
        const event = pointer.source === "activity" ? liveById.get(pointer.id) : olderById.get(pointer.id);
        return event ? [event] : [];
      });
      return {
        bot, observations, actual, historicalActual,
        latestIp: latestSummaryIp(latestIp, reportRows.latestSearchIp),
        total, page, quota, searchPage, relatedCohorts,
        searchEvidence: searchEvidence.map(row => recordedSearchNetwork(row.evidence)),
        recordedSearches: recordedSearches.map(({ evidence, ...row }) => ({
          ...row, createdAt: utcJsonDate(row.createdAt), network: recordedSearchNetwork(evidence), crawler: recordedSearchCrawler(evidence),
        })),
        events: timeline,
      };
    }, { isolationLevel: "RepeatableRead" });
    if (!data) return { state: "missing" } as const;
    const { activities, ...bot } = data.bot;
    const [reportVerification, events] = await Promise.all([
      botReportVerification(bot, activities[0]),
      Promise.all(data.events.map(async event => event.source === "activity"
        ? { ...event, networkEvidence: await activityNetworkEvidence(event) }
        : event)),
    ]);
    return { state: "ready", filters: { ...filters, page: data.page }, ...data, bot, reportVerification, events } as const;
  } catch {
    console.error("[admin:bot-management] Bot details unavailable");
    return { state: "unavailable" } as const;
  }
}
