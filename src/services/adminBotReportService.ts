import { z } from "zod";
import { requireAdminSession } from "@/lib/auth-guards";
import { BOT_DIRECTORY, BOT_PAGE_SIZE, botFilters, type BotQuery } from "@/lib/adminBotReport";
import { crawlerCatalog } from "@/lib/botRegistry";
import { getPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import type { Prisma } from "@/generated/prisma/client";
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
  verification: true, firstSeen: true, lastSeen: true,
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
      const where: Prisma.BotRegistryWhereInput = {
        environment, AND: searchIdentity(filters.query),
        activities: timestamp ? { some: { environment, timestamp } } : undefined,
      };
      const [registry, matching, activity, actualSearches] = await Promise.all([
        db.botRegistry.groupBy({
          by: ["group"], where: { environment }, _count: true,
          _sum: { requests: true, denied: true, rateLimited: true },
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
        },
      });
      if (!bot) return null;

      const where = { botId: id, environment };
      const historyWhere = {
        ...where, timestamp: within(filters.window), kind: filters.kind, decision: filters.decision,
      };
      const searchWhere = botSearchWhere(environment);
      const [observations, actualRows, total, quota] = await Promise.all([
        db.botActivity.findMany({
          where, orderBy: [{ timestamp: "desc" }, { id: "desc" }], take: 20,
          select: { ip: true, country: true, userAgent: true, declaredName: true, evidence: true,
            networkAsn: true, networkOrganization: true, networkSource: true, edgeRay: true },
        }),
        db.$queryRaw<{ count: bigint }[]>`
          SELECT count(*) FROM "BotActivity" a
          JOIN "SearchHistory" s ON s."requestId" = a.id
          WHERE a."botId" = ${id} AND a.environment = ${environment}
            AND a."dispatchedAt" IS NOT NULL AND s."countAsSearch" = TRUE
            AND s.query->>'environment' = ${environment} AND s.query->>'applicationSource' = 'BOT'
        `,
        filters.window === null ? null : db.botActivity.count({ where: historyWhere }),
        bot.group === "SEARCH_ENGINE" && bot.verification === "VERIFIED" ? (async () => {
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
      const page = Math.min(filters.page, Math.max(1, Math.ceil((total ?? 0) / BOT_PAGE_SIZE)));
      const events = total ? await db.botActivity.findMany({
        where: historyWhere, orderBy: [{ timestamp: "desc" }, { id: "desc" }],
        skip: (page - 1) * BOT_PAGE_SIZE, take: BOT_PAGE_SIZE, omit: { retryKey: true },
      }) : [];
      const dispatched = events.filter(event => event.dispatchedAt);
      const requestIds = dispatched.map(event => event.id);
      const [searches, providers] = requestIds.length ? await Promise.all([
        db.searchHistory.findMany({
          where: { ...searchWhere, requestId: { in: requestIds } },
          select: { id: true, requestId: true, status: true, resultCount: true },
        }),
        db.apiProviderLog.findMany({
          where: {
            createdAt: { gte: new Date(Math.min(...dispatched.map(event => event.timestamp.getTime()))) },
            AND: [{ metadata: { path: ["environment"], equals: environment } }],
            OR: requestIds.map(requestId => ({ metadata: { path: ["requestId"], equals: requestId } })),
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: { id: true, provider: true, service: true, status: true, metadata: true },
        }),
      ]) : [[], []];
      return {
        bot, observations, actual: actualRows[0].count, total, page, quota,
        events: events.map(event => ({
          ...event,
          search: searches.find(search => search.requestId === event.id),
          providers: providers.flatMap(({ metadata, ...provider }) =>
            metadata && typeof metadata === "object" && !Array.isArray(metadata) && metadata.requestId === event.id ? [provider] : []),
        })),
      };
    }, { isolationLevel: "RepeatableRead" });
    if (!data) return { state: "missing" } as const;
    return { state: "ready", filters: { ...filters, page: data.page }, ...data } as const;
  } catch {
    console.error("[admin:bot-management] Bot details unavailable");
    return { state: "unavailable" } as const;
  }
}
