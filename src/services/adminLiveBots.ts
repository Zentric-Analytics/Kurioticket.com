import { Prisma } from "@/generated/prisma/client";
import { BOT_PAGE_SIZE } from "@/lib/adminBotReport";
import { adminUtcTodayStart } from "@/lib/adminReportingRanges";
import type { LiveBotFilter } from "@/lib/adminLiveBotNavigation";
import { onlinePresenceWindowSeconds } from "@/lib/onlinePresence";
import { withOptionalDb } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";

const recordedName = Prisma.sql`COALESCE(NULLIF(BTRIM(a."declaredName"), ''), NULLIF(BTRIM(b.name), ''))`;
const identity = Prisma.sql`UPPER(${recordedName})`;

function botEvidence(environment: string) {
  return Prisma.sql`
    FROM "BotActivity" a
    JOIN "BotRegistry" b ON b.id = a."botId" AND b.environment = a.environment
    WHERE a.environment = ${environment} AND ${recordedName} IS NOT NULL
  `;
}

function activeCutoff(now: Date) {
  return new Date(now.getTime() - onlinePresenceWindowSeconds * 1000);
}

function latestLiveBots(now: Date, includeToday: boolean) {
  const cutoff = activeCutoff(now);
  const day = adminUtcTodayStart(now);
  // Group recorded names for display while taking verification from the latest request.
  // The rolling window can include evidence from the previous UTC day.
  return Prisma.sql`
    SELECT DISTINCT ON (${identity})
      ${identity} AS key, ${recordedName} AS name, a.timestamp AS "lastSeen", a.verification,
      a.timestamp > ${cutoff} AS active, a.timestamp >= ${day} AS today
    ${botEvidence(getPublicEnvironment())}
      AND a.timestamp <= ${now}
      AND (a.timestamp > ${cutoff} ${includeToday ? Prisma.sql`OR a.timestamp >= ${day}` : Prisma.empty})
    ORDER BY ${identity}, a.timestamp DESC, a.id DESC
  `;
}

export async function readActiveBotTotal(now: Date) {
  return withOptionalDb(async db => {
    const [row] = await db.$queryRaw<{ total: number }[]>`
      SELECT COUNT(*)::int AS total FROM (${latestLiveBots(now, false)}) bots
    `;
    return row.total;
  }, null);
}

type LiveBot = {
  key: string;
  name: string;
  lastSeen: Date;
  verification: string;
  active: boolean;
  today: boolean;
};

export async function readLiveBotDirectory(now = new Date()) {
  return withOptionalDb(async db => {
    const rows = await db.$queryRaw<LiveBot[]>`
      SELECT * FROM (${latestLiveBots(now, true)}) bots ORDER BY "lastSeen" DESC, key
    `;
    return { now: rows.filter(row => row.active), today: rows.filter(row => row.today) };
  }, null);
}

type LatestBot = Omit<LiveBot, "today"> & {
  botId: string;
  owner: string | null;
  group: string;
  category: string | null;
};

export type LiveBotEvent = {
  id: string;
  timestamp: Date;
  kind: string;
  endpoint: string;
  product: string | null;
  decision: string;
  responseStatus: number | null;
  executionOutcome: string | null;
  dispatched: boolean;
};

export async function readLiveBotActivity(key: string, filter: LiveBotFilter, requestedPage: number, now = new Date()) {
  const day = adminUtcTodayStart(now);
  const cutoff = activeCutoff(now);
  const scope = Prisma.sql`${botEvidence(getPublicEnvironment())} AND ${identity} = ${key}`;
  return withOptionalDb(db => db.$transaction(async tx => {
    const [bot] = await tx.$queryRaw<LatestBot[]>`
      SELECT ${identity} AS key, ${recordedName} AS name, a."botId", b.owner, b."group", b.category,
        a.timestamp AS "lastSeen", a.verification, a.timestamp > ${cutoff} AS active
      ${scope} AND a.timestamp <= ${now}
      ORDER BY a.timestamp DESC, a.id DESC LIMIT 1
    `;
    if (!bot) return { state: "missing" } as const;

    const today = Prisma.sql`a.timestamp >= ${day} AND a.timestamp <= ${now}`;
    const dispatched = Prisma.sql`a."dispatchedAt" >= ${day} AND a."dispatchedAt" <= ${now}`;
    const historyFilter = filter === "searches" ? Prisma.sql`AND a.kind = 'SEARCH_ATTEMPT'`
      : filter === "crawling" ? Prisma.sql`AND a.kind IN ('PAGE', 'API', 'RESOURCE')` : Prisma.empty;
    const [metrics] = await tx.$queryRaw<{
      requests: bigint; attempts: bigint; dispatched: bigint; denied: bigint; history: number;
    }[]>`
      SELECT COUNT(*) FILTER (WHERE ${today}) AS requests,
        COUNT(*) FILTER (WHERE ${today} AND a.product IS NOT NULL) AS attempts,
        COUNT(*) FILTER (WHERE ${dispatched}) AS dispatched,
        COUNT(*) FILTER (WHERE ${today} AND a.decision = 'DENIED') AS denied,
        (COUNT(*) FILTER (WHERE a.timestamp <= ${now} ${historyFilter}))::int AS history
      ${scope}
    `;
    const page = Math.max(1, Math.min(requestedPage, Math.ceil(metrics.history / BOT_PAGE_SIZE)));
    const events = await tx.$queryRaw<LiveBotEvent[]>`
      SELECT a.id, a.timestamp, a.kind, a.endpoint, a.product, a.decision, a."executionOutcome", a."responseStatus",
        COALESCE(a."dispatchedAt" <= ${now}, FALSE) AS dispatched
      ${scope} AND a.timestamp <= ${now} ${historyFilter}
      ORDER BY a.timestamp DESC, a.id DESC
      LIMIT ${BOT_PAGE_SIZE} OFFSET ${(page - 1) * BOT_PAGE_SIZE}
    `;
    const cohorts = await tx.$queryRaw<{ botId: string; verification: string; dispatched: boolean }[]>`
      SELECT "botId", verification, dispatched FROM (
        SELECT DISTINCT ON (a."botId")
          a."botId", a.verification, a.timestamp, a.id,
          BOOL_OR(COALESCE(a."dispatchedAt" <= ${now}, FALSE)) OVER (PARTITION BY a."botId") AS dispatched
        ${scope} AND a.timestamp <= ${now}
        ORDER BY a."botId", a.timestamp DESC, a.id DESC
      ) cohorts ORDER BY timestamp DESC, id DESC
    `;
    return { state: "ready", bot, metrics, page, events, cohorts, day } as const;
  }, { isolationLevel: "RepeatableRead" }), null);
}
