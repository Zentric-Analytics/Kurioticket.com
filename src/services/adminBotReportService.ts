import { z } from "zod";
import { requireAdminSession } from "@/lib/auth-guards";
import { BOT_DIRECTORY, BOT_PAGE_SIZE, botFilters, type BotQuery } from "@/lib/adminBotReport";
import { crawlerCatalog, recognizedCrawler, currentBotAccess } from "@/lib/botRegistry";
import { getPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { Prisma } from "@/generated/prisma/client";
import { recordedSearchNetwork } from "@/lib/searchNetworkObservation";
import { activityNetworkEvidence, botReportVerification, reportEvidenceSelect } from "@/lib/adminBotNetworkEvidence";
import { detailHistoryQuery, recordedBotSearchRows, summarizeBotNetwork } from "./recordedBotSearchHistory";
import { botRequestHistory, botRequestSummaryQuery, type BotHistoryPointer, type BotRequestSummary } from "./adminBotHistory";
import { BOT_ACTIVITY_RETENTION_DAYS } from "./botActivityStore";

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
    const rows = data.rows.map(({ activities, ...bot }) => ({
      ...bot, access: currentBotAccess(bot, environment), reportVerification: botReportVerification(bot, activities[0]),
    }));
    return { state: "ready", filters: { ...filters, page: data.page }, now, ...data, rows } as const;
  } catch {
    console.error("[admin:bot-management] Directory report unavailable");
    return { state: "unavailable", filters, now } as const;
  }
}

type DetailHistoryRows = {
  total: number | null;
  actual: number;
  summaryActual: number | null;
  historicalActual: number;
  page: number;
  pointers: Pick<BotHistoryPointer, "id">[];
  networkCountryCodes: string[];
};

export async function readBotDetails(id: string, raw: BotQuery) {
  await requireAdminSession(BOT_DIRECTORY);
  if (!z.uuid().safeParse(id).success) return { state: "missing" } as const;
  const now = new Date();
  const filters = botFilters(raw.kind === "HISTORICAL_SEARCH" ? { ...raw, kind: undefined } : raw, "all", now);
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
      const history = botRequestHistory(environment, id, {
        window: filters.window ?? undefined, kind: filters.kind, decision: filters.decision,
      });
      // The existing country summary can include related recorded network observations.
      const summaryName = bot.group !== "UNKNOWN" && recognizedCrawler(bot.name) ? bot.name : null;
      const [{ pointers, total, actual, summaryActual, historicalActual, page, networkCountryCodes }] =
        await db.$queryRaw<DetailHistoryRows[]>(detailHistoryQuery(environment, id, summaryName, history,
          filters.window !== null, filters.page, 1, filters.window));
      // Lifetime counters survive the existing request retention policy. Do
      // not substitute a partial retained-event count for an older date range.
      const retentionCutoff = new Date(now.getTime() - BOT_ACTIVITY_RETENTION_DAYS * 86_400_000);
      let requestSummary: BotRequestSummary | null = null;
      if (filters.window === undefined) {
        requestSummary = { requests: bot.requests, allowed: bot.allowed, denied: bot.denied,
          searchAttempts: bot.searchAttempts, searches: bot.searches };
      } else if (filters.window && (filters.window.from >= retentionCutoff || bot.firstSeen >= retentionCutoff)) {
        [requestSummary] = await db.$queryRaw<BotRequestSummary[]>(
          botRequestSummaryQuery(environment, id, filters.window));
      }
      const activityIds = pointers.map(row => row.id);
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
          ...event,
          search: saved ? {
            id: saved.id, status: saved.status, resultCount: saved.resultCount,
            network: recordedSearchNetwork(saved.query),
          } : undefined,
          providers: providers.flatMap(({ requestId, ...provider }) => requestId === event.id ? [provider] : []),
        };
      });
      const liveById = new Map(live.map(event => [event.id, event]));
      return {
        bot, actual, summaryActual, requestSummary, historicalActual, total, page,
        countries: summarizeBotNetwork([], networkCountryCodes).countries,
        events: pointers.flatMap(({ id }) => {
          const event = liveById.get(id);
          return event ? [event] : [];
        }),
      };
    }, { isolationLevel: "RepeatableRead" });
    if (!data) return { state: "missing" } as const;
    const { activities, ...bot } = data.bot;
    const reportVerification = botReportVerification(bot, activities[0]);
    // Request-specific network evidence remains separate from the summary.
    const events = await Promise.all(data.events.map(async event => ({ ...event, networkEvidence: await activityNetworkEvidence(event) })));
    return { state: "ready", filters: { ...filters, page: data.page }, now, ...data, bot: { ...bot, access: currentBotAccess(bot, environment) }, reportVerification, events } as const;
  } catch {
    console.error("[admin:bot-management] Bot details unavailable");
    return { state: "unavailable" } as const;
  }
}
