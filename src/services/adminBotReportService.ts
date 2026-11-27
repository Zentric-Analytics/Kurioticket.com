import { z } from "zod";
import { requireAdminSession } from "@/lib/auth-guards";
import { BOT_DIRECTORY, BOT_PAGE_SIZE, botFilters, type BotQuery } from "@/lib/adminBotReport";
import { crawlerCatalog, knownCrawler } from "@/lib/botRegistry";
import { getPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { Prisma } from "@/generated/prisma/client";
import { botHistoryWindow, botSearchNetwork, combinedBotHistory, historicalBotSearches, type BotHistoryPointer, type HistoricalBotSearch } from "./adminBotHistory";
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
      // A date filter includes searches recorded before BotActivity existed.
      // All time still includes every registry identity, even after pruning.
      const historicalKeys = timestamp ? await db.$queryRaw<{ identityKey: string }[]>(Prisma.sql`
        SELECT "identityKey" FROM (${historicalBotSearches(environment)}) history
        WHERE TRUE ${botHistoryWindow(filters.window ?? undefined)}
        UNION
        SELECT b."identityKey" FROM "SearchHistory" s
        JOIN "BotActivity" a ON a.id = s."requestId" AND a.environment = ${environment}
        JOIN "BotRegistry" b ON b.id = a."botId" AND b.environment = ${environment}
        WHERE s.query->>'environment' = ${environment}
          AND s.query->>'applicationSource' = 'BOT' AND s."countAsSearch" = TRUE
          AND s."createdAt" >= ${timestamp.gte} AND s."createdAt" < ${timestamp.lt}
      `) : [];
      const where: Prisma.BotRegistryWhereInput = {
        environment, AND: searchIdentity(filters.query),
        OR: timestamp ? [
          { activities: { some: { environment, timestamp } } },
          { identityKey: { in: historicalKeys.map(row => row.identityKey) } },
        ] : undefined,
      };
      const [registry, matching, activity, actualSearches] = await Promise.all([
        db.botRegistry.groupBy({
          by: ["group"], where: { environment }, _count: true,
          _sum: { requests: true, denied: true, rateLimited: true }, _min: { firstSeen: true },
        }),
        db.botRegistry.groupBy({ by: ["group"], where, _count: true }),
        timestamp ? db.botActivity.groupBy({ by: ["decision"], where: { environment, timestamp }, _count: true }) : [],
        db.searchHistory.count({ where: { ...botSearchWhere(environment), createdAt: timestamp } }),
      ]);
      const counts = { ...Object.fromEntries(matching.map(row => [row.group, row._count])), all: matching.reduce((total, row) => total + row._count, 0) } as Record<string, number>;
      const total = counts[filters.group || "all"] ?? 0;
      const page = Math.min(filters.page, Math.max(1, Math.ceil(total / BOT_PAGE_SIZE)));
      const rows = await db.botRegistry.findMany({
        where: { ...where, group: filters.group || undefined }, select: registrySelect,
        orderBy: [{ lastSeen: "desc" }, { id: "desc" }], skip: (page - 1) * BOT_PAGE_SIZE, take: BOT_PAGE_SIZE,
      });
      const countGroup = (group: string) => registry.find(row => row.group === group)?._count ?? 0;
      const countActivity = (decision: string) => activity.find(row => row.decision === decision)?._count ?? 0;
      const lifetime = (key: "requests" | "denied" | "rateLimited") =>
        registry.reduce((total, row) => total + (row._sum[key] ?? BigInt(0)), BigInt(0));
      return {
        counts, total, page, rows,
        firstDetected: registry.reduce<Date | null>((first, row) => {
          const seen = row._min.firstSeen;
          return seen && (!first || seen < first) ? seen : first;
        }, null),
        registry: [registry.reduce((total, row) => total + row._count, 0), countGroup("SEARCH_ENGINE"), countGroup("OTHER_RECOGNIZED"), countGroup("UNKNOWN")],
        activity: [
          timestamp ? activity.reduce((total, row) => total + row._count, 0) : lifetime("requests"),
          actualSearches,
          timestamp ? countActivity("DENIED") : lifetime("denied"),
          timestamp ? countActivity("RATE_LIMITED") : lifetime("rateLimited"),
        ],
      };
    }, { isolationLevel: "RepeatableRead" });
    return { state: "ready", filters: { ...filters, page: data.page }, now, ...data } as const;
  } catch {
    console.error("[admin:bot-management] Directory report unavailable");
    return { state: "unavailable", filters, now } as const;
  }
}

type SearchEvidence = {
  id: string;
  timestamp: Date;
  network: unknown;
  source: "linked" | "historical";
};

async function readSearchEvidence(db: Prisma.TransactionClient, environment: Environment, botId: string, identityKey: string) {
  const rows = await db.$queryRaw<SearchEvidence[]>(Prisma.sql`
    SELECT id, timestamp, network, source FROM (
      SELECT s.id, s."createdAt" AS timestamp, s.query->'searchNetwork' AS network, 'linked'::text AS source
      FROM "SearchHistory" s JOIN "BotActivity" a ON a.id = s."requestId"
      WHERE a."botId" = ${botId} AND a.environment = ${environment}
        AND s.query->>'environment' = ${environment} AND s.query->>'applicationSource' = 'BOT'
        AND s."countAsSearch" = TRUE
      UNION ALL
      SELECT id, timestamp, network, 'historical'::text AS source
      FROM (${historicalBotSearches(environment)}) history WHERE "identityKey" = ${identityKey}
    ) evidence
    WHERE jsonb_typeof(network) = 'object'
      AND (network->>'ipAddress' IS NOT NULL OR network->>'countryCode' IS NOT NULL)
    ORDER BY timestamp DESC, id DESC LIMIT 20
  `);
  return rows.map(({ network, ...row }) => ({ ...row, ...botSearchNetwork(network) }));
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
          ...registrySelect, allowed: true, denied: true, rateLimited: true,
          searchAttempts: true, searches: true, violations: true,
        },
      });
      if (!bot) return null;

      const where = { botId: id, environment };
      const searchWhere = botSearchWhere(environment);
      const history = combinedBotHistory(environment, id, bot.identityKey, {
        window: filters.window ?? undefined, kind: filters.kind, decision: filters.decision,
      });
      const [observations, actualRows, historicalRows, totals, quota, searchEvidence] = await Promise.all([
        db.botActivity.findMany({
          where: { ...where, OR: [
            { ip: { not: null } }, { country: { not: null } },
            { renderLogIp: { not: null } }, { renderLogCountry: { not: null } },
          ] },
          orderBy: [{ timestamp: "desc" }, { id: "desc" }], take: 20,
          select: { ip: true, country: true, renderLogIp: true, renderLogCountry: true },
        }),
        db.$queryRaw<{ count: bigint }[]>`
          SELECT count(*) FROM "BotActivity" a
          JOIN "SearchHistory" s ON s."requestId" = a.id
          WHERE a."botId" = ${id} AND a.environment = ${environment}
            AND s."countAsSearch" = TRUE
            AND s.query->>'environment' = ${environment} AND s.query->>'applicationSource' = 'BOT'
        `,
        db.$queryRaw<{ count: bigint }[]>(Prisma.sql`
          SELECT count(*) FROM (${historicalBotSearches(environment)}) history
          WHERE "identityKey" = ${bot.identityKey}
        `),
        filters.window === null ? null : db.$queryRaw<{ count: bigint }[]>(Prisma.sql`
          SELECT count(*) FROM (${history}) timeline
        `),
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
        readSearchEvidence(db, environment, id, bot.identityKey),
      ]);
      // A prior verified crawler is a separate identity cohort. Show its saved
      // evidence as a reference, never as the IP or verification of this caller.
      const verifiedKey = bot.name && knownCrawler(bot.name)?.category === "search" ? "SEARCH_ENGINE:" + bot.name : null;
      const relatedBot = verifiedKey && verifiedKey !== bot.identityKey ? await db.botRegistry.findFirst({
        where: { environment, identityKey: verifiedKey }, select: { id: true, identityKey: true },
      }) : null;
      const relatedEvidence = relatedBot ? {
        id: relatedBot.id,
        observations: await readSearchEvidence(db, environment, relatedBot.id, relatedBot.identityKey),
      } : null;

      const total = totals === null ? null : Number(totals[0].count);
      const page = Math.min(filters.page, Math.max(1, Math.ceil((total ?? 0) / BOT_PAGE_SIZE)));
      const pointers = total ? await db.$queryRaw<BotHistoryPointer[]>(Prisma.sql`
        SELECT id, timestamp, source FROM (${history}) timeline
        ORDER BY timestamp DESC, source DESC, id DESC
        LIMIT ${BOT_PAGE_SIZE} OFFSET ${(page - 1) * BOT_PAGE_SIZE}
      `) : [];
      const activityIds = pointers.filter(row => row.source === "activity").map(row => row.id);
      const legacyIds = pointers.filter(row => row.source === "search").map(row => row.id);
      const [events, legacy] = await Promise.all([
        activityIds.length ? db.botActivity.findMany({
          where: { ...where, id: { in: activityIds } }, omit: { retryKey: true },
        }) : [],
        legacyIds.length ? db.$queryRaw<HistoricalBotSearch[]>(Prisma.sql`
          SELECT * FROM (${historicalBotSearches(environment)}) history
          WHERE "identityKey" = ${bot.identityKey} AND id IN (${Prisma.join(legacyIds)})
        `) : [],
      ]);
      const dispatched = events.filter(event => event.dispatchedAt);
      const requestIds = dispatched.map(event => event.id);
      const [searches, providers] = await Promise.all([
        activityIds.length ? db.searchHistory.findMany({
          where: { ...searchWhere, requestId: { in: activityIds } },
          select: { id: true, requestId: true, status: true, resultCount: true, query: true },
        }) : [],
        requestIds.length ? db.apiProviderLog.findMany({
          where: {
            createdAt: { gte: new Date(Math.min(...dispatched.map(event => event.timestamp.getTime()))) },
            AND: [{ metadata: { path: ["environment"], equals: environment } }],
            OR: requestIds.map(requestId => ({ metadata: { path: ["requestId"], equals: requestId } })),
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: { id: true, provider: true, service: true, status: true, metadata: true },
        }) : [],
      ]);
      const liveEvents = events.map(event => {
        const saved = searches.find(search => search.requestId === event.id);
        const query = saved?.query;
        const network = query && typeof query === "object" && !Array.isArray(query) ? query.searchNetwork : null;
        return {
          ...event, source: "activity" as const,
          search: saved ? { id: saved.id, status: saved.status, resultCount: saved.resultCount, ...botSearchNetwork(network) } : undefined,
          providers: providers.flatMap(({ metadata, ...provider }) =>
            metadata && typeof metadata === "object" && !Array.isArray(metadata) && metadata.requestId === event.id ? [provider] : []),
        };
      });
      const historicalEvents = legacy.map(({ network, ...row }) => ({
        ...row, source: "search" as const, ...botSearchNetwork(network),
      }));
      const liveById = new Map(liveEvents.map(event => [event.id, event]));
      const legacyById = new Map(historicalEvents.map(event => [event.id, event]));
      const timeline: (typeof liveEvents[number] | typeof historicalEvents[number])[] = [];
      for (const pointer of pointers) {
        const event = pointer.source === "activity" ? liveById.get(pointer.id) : legacyById.get(pointer.id);
        if (event) timeline.push(event);
      }
      const historicalActual = historicalRows[0].count;
      return {
        bot, observations, searchEvidence, relatedEvidence, historicalActual,
        actual: actualRows[0].count + historicalActual, total, page, quota, events: timeline,
      };
    }, { isolationLevel: "RepeatableRead" });
    if (!data) return { state: "missing" } as const;
    return { state: "ready", filters: { ...filters, page: data.page }, ...data } as const;
  } catch {
    console.error("[admin:bot-management] Bot details unavailable");
    return { state: "unavailable" } as const;
  }
}
