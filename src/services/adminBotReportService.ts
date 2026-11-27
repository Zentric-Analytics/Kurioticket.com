import { z } from "zod";
import { requireAdminSession } from "@/lib/auth-guards";
import { BOT_DIRECTORY, BOT_PAGE_SIZE, botFilters, type BotQuery } from "@/lib/adminBotReport";
import { crawlerCatalog } from "@/lib/botRegistry";
import { getPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { Prisma } from "@/generated/prisma/client";
import { recordedSearchNetwork } from "@/lib/searchNetworkObservation";
import { recordedSearchCrawler } from "./adminOperationalReadCore";
import { recordedBotSearchRows, type RecordedBotSearch } from "./recordedBotSearchHistory";
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
        db.botRegistry.groupBy({
          by: ["group"], where: { environment }, _count: true,
          _sum: { requests: true, denied: true, rateLimited: true }, _min: { firstSeen: true },
        }),
        db.botRegistry.groupBy({ by: ["group"], where, _count: true }),
        timestamp ? db.botActivity.groupBy({ by: ["decision"], where: { environment, timestamp }, _count: true }) : [],
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
        counts, total, page, rows, unassignedSearches,
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
      const recorded = recordedBotSearchRows(environment);
      const [observations, actualRows, total, quota, searchEvidence, relatedCohorts] = await Promise.all([
        db.botActivity.findMany({
          where, orderBy: [{ timestamp: "desc" }, { id: "desc" }], take: 20,
          select: { ip: true, country: true, userAgent: true, declaredName: true, evidence: true,
            networkAsn: true, networkOrganization: true, networkSource: true, edgeRay: true,
            renderLogIp: true, renderLogCountry: true, reportedIp: true, reportedCountry: true },
        }),
        db.$queryRaw<{ count: bigint }[]>`
          SELECT count(*) FROM (${recorded}) searches WHERE "botId" = ${id}
        `,
        filters.window === null ? null : db.botActivity.count({ where: historyWhere }),
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
        db.$queryRaw<Pick<RecordedBotSearch, "evidence">[]>`
          SELECT evidence FROM (${recorded}) searches WHERE "botId" = ${id}
            AND (evidence->'searchNetwork'->>'ipAddress' IS NOT NULL OR evidence->'searchNetwork'->>'countryCode' IS NOT NULL)
          ORDER BY "createdAt" DESC, id DESC LIMIT 20
        `,
        bot.name ? db.$queryRaw<{ id: string; verification: string; count: bigint }[]>`
          SELECT b.id, b.verification, count(*) AS count
          FROM (${recorded}) searches JOIN "BotRegistry" b ON b.id = searches."botId"
          WHERE b.environment = ${environment} AND b.name = ${bot.name} AND b.id <> ${id}
          GROUP BY b.id, b.verification ORDER BY count(*) DESC, b.id LIMIT 10
        ` : Promise.resolve([]),
      ]);
      const actual = Number(actualRows[0].count);
      const requestedSearchPage = typeof raw.searchPage === "string" && /^[1-9]\d{0,8}$/.test(raw.searchPage)
        ? Number(raw.searchPage) : 1;
      const searchPage = Math.min(requestedSearchPage, Math.max(1, Math.ceil(actual / BOT_PAGE_SIZE)));
      const recordedSearches = actual ? await db.$queryRaw<RecordedBotSearch[]>`
        SELECT * FROM (${recorded}) searches WHERE "botId" = ${id}
        ORDER BY "createdAt" DESC, id DESC OFFSET ${(searchPage - 1) * BOT_PAGE_SIZE} LIMIT ${BOT_PAGE_SIZE}
      ` : [];
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
        bot, observations, actual, total, page, quota, searchPage, relatedCohorts,
        searchEvidence: searchEvidence.map(row => recordedSearchNetwork(row.evidence)),
        recordedSearches: recordedSearches.map(({ evidence, ...row }) => ({
          ...row, network: recordedSearchNetwork(evidence), crawler: recordedSearchCrawler(evidence),
        })),
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
