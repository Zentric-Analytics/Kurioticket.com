import { z } from "zod";
import { requireAdminApiSession } from "@/lib/admin";
import { getPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { BOT_DAILY_SEARCH_LIMIT, nextSearchTime, utcDayStart } from "@/services/botActivityStore";

const noStore = { "Cache-Control": "private, no-store" };
const filters = z.object({
  bot: z.uuid().optional(),
  view: z.enum(["registry", "activity"]).default("registry"),
  group: z.enum(["SEARCH_ENGINE", "OTHER_RECOGNIZED", "UNKNOWN"]).optional(),
  status: z.enum(["VERIFIED", "DECLARED", "UNVERIFIED", "SUSPICIOUS"]).optional(),
  decision: z.enum(["ALLOWED", "DENIED", "RATE_LIMITED", "PENDING"]).optional(),
  kind: z.enum(["PAGE", "API", "RESOURCE", "SEARCH_ATTEMPT"]).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  cursor: z.string().max(100).regex(/^[a-z0-9:-]+$/i).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(request: Request) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;
  const parsed = filters.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return Response.json({ error: "Invalid report filters." }, { status: 400, headers: noStore });
  const { bot, view, group, status, decision, kind, from, to, cursor, limit } = parsed.data;
  if (from && to && new Date(from) >= new Date(to)) {
    return Response.json({ error: "Report start must precede report end." }, { status: 400, headers: noStore });
  }
  const date = from || to ? { gte: from ? new Date(from) : undefined, lt: to ? new Date(to) : undefined } : undefined;
  const environment = getPublicEnvironment();
  const db = getPrisma();
  const page = { ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), take: limit + 1 };

  if (view === "activity") {
    const rows = await db.botActivity.findMany({
      where: {
        environment, botId: bot, verification: status, decision, kind,
        timestamp: date, bot: group ? { group } : undefined,
      },
      orderBy: [{ timestamp: "desc" }, { id: "desc" }], ...page,
    });
    const searches = rows.slice(0, limit).filter(row => row.dispatchedAt).map(row => row.id);
    const [history, providers] = searches.length ? await Promise.all([
      db.searchHistory.findMany({ where: { requestId: { in: searches } }, select: { id: true, requestId: true } }),
      db.apiProviderLog.findMany({
        where: { createdAt: { gte: new Date(Math.min(...rows.map(row => row.timestamp.getTime()))) },
          AND: [{ metadata: { path: ["environment"], equals: environment } }],
          OR: searches.map(id => ({ metadata: { path: ["requestId"], equals: id } })) },
        take: 1000, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { id: true, provider: true, service: true, status: true, metadata: true },
      }),
    ]) : [[], []];
    const items = rows.slice(0, limit).map(({ retryKey: _retryKey, ...row }) => ({
      ...row,
      searchHistoryId: history.find(search => search.requestId === row.id)?.id ?? null,
      providerCalls: providers.flatMap(({ metadata, ...provider }) =>
        metadata && typeof metadata === "object" && !Array.isArray(metadata) && metadata.requestId === row.id ? [provider] : []),
    }));
    return Response.json({ items, nextCursor: rows.length > limit ? items.at(-1)?.id : null }, { headers: noStore });
  }

  const rows = await db.botRegistry.findMany({
    where: { environment, id: bot, group, verification: status, firstSeen: date },
    orderBy: [{ lastSeen: "desc" }, { id: "desc" }], ...page,
  });
  const [{ now }] = await db.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  const identities = rows.slice(0, limit).filter(row => row.group === "SEARCH_ENGINE").map(row => row.id);
  const usage = identities.length ? await db.botActivity.groupBy({
    by: ["botId"], where: { botId: { in: identities }, dispatchedAt: { gte: new Date(Math.min(utcDayStart(now).getTime(), now.getTime() - 1_800_000)) } },
    _max: { dispatchedAt: true },
  }) : [];
  const counts = identities.length ? await db.botActivity.groupBy({
    by: ["botId"], where: { botId: { in: identities }, dispatchedAt: { gte: utcDayStart(now) } }, _count: true,
  }) : [];
  const items = rows.slice(0, limit).map(row => {
    const { identityKey: _identityKey, crawlWindow: _crawlWindow, crawlCount: _crawlCount,
      requests, allowed, denied, rateLimited, searchAttempts, searches, violations, ...bot } = row;
    const dailyLimit = row.group === "SEARCH_ENGINE" ? BOT_DAILY_SEARCH_LIMIT : 0;
    const used = counts.find(count => count.botId === row.id)?._count ?? 0;
    return {
      ...bot,
      totals: Object.fromEntries(Object.entries({ requests, allowed, denied, rateLimited, searchAttempts, searches, violations })
        .map(([name, value]) => [name, value.toString()])),
      dailyLimit, used, remaining: Math.max(0, dailyLimit - used),
      nextSearchAt: dailyLimit ? nextSearchTime(now, usage.find(item => item.botId === row.id)?._max.dispatchedAt ?? undefined, used) : null,
    };
  });
  return Response.json({ items, nextCursor: rows.length > limit ? items.at(-1)?.id : null }, { headers: noStore });
}
