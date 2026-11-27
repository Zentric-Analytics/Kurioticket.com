import { createHash, randomUUID } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import type { botTarget, observeBot } from "@/lib/botPolicy";

type Bot = Awaited<ReturnType<typeof observeBot>>;
type Target = ReturnType<typeof botTarget>;

export const BOT_SEARCH_COOLDOWN_MS = 30 * 60_000;
export const BOT_DAILY_SEARCH_LIMIT = 5;
export const BOT_ACTIVITY_RETENTION_DAYS = 90;

export function botCrawlRequestsPerMinute(group: string) {
  return group === "SEARCH_ENGINE" ? 600 : 120;
}

export function utcDayStart(now: Date) {
  return new Date(now.toISOString().slice(0, 10) + "T00:00:00.000Z");
}

export function nextSearchTime(now: Date, latest: Date | undefined, used: number) {
  const cooldown = latest ? latest.getTime() + BOT_SEARCH_COOLDOWN_MS : 0;
  const daily = used >= BOT_DAILY_SEARCH_LIMIT ? utcDayStart(now).getTime() + 86_400_000 : 0;
  return new Date(Math.max(now.getTime(), cooldown, daily));
}

export async function recordBotAttempt(request: Request, bot: Bot, target: Target, reason: string | null, edgeBlock?: { id: string; status: number; timestamp: Date }) {
  const environment = getPublicEnvironment();
  const method = /^(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)$/.test(request.method) ? request.method : "OTHER";
  return getPrisma().$transaction(async tx => {
    if (edgeBlock) {
      await tx.$queryRaw`SELECT 1::int FROM pg_advisory_xact_lock(hashtext('bot-edge-event'), hashtext(${edgeBlock.id}))`;
      const existing = await tx.botActivity.findUnique({ where: { id: edgeBlock.id }, select: { botId: true } });
      if (existing) return { id: edgeBlock.id, botId: existing.botId, status: edgeBlock.status, retryAfter: null };
    }
    // Updating this row serializes decisions for the same environment and identity.
    const registry = await tx.botRegistry.upsert({
      where: { environment_identityKey: { environment, identityKey: bot.identityKey } },
      create: {
        id: randomUUID(), environment, identityKey: bot.identityKey, name: bot.name,
        group: bot.group, category: bot.category, owner: bot.owner, verification: bot.verification, access: bot.access,
      },
      update: { verification: bot.verification },
    });
    const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    const timestamp = edgeBlock?.timestamp ?? now;
    const start = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
    const crawlCount = registry.crawlWindow?.getTime() === start.getTime() ? registry.crawlCount : 0;
    const crawl = target.crawl && !reason;
    const throttled = edgeBlock?.status === 429 || crawl && crawlCount >= botCrawlRequestsPerMinute(bot.group);
    const searchPending = !reason && target.mainSearch;
    const status = edgeBlock?.status ?? (reason ? 403 : throttled ? 429 : null);
    const activity = await tx.botActivity.create({
      data: {
        id: edgeBlock?.id ?? randomUUID(), botId: registry.id, environment, timestamp,
        endpoint: target.endpoint, kind: target.kind, product: target.product, method,
        declaredName: bot.declaredName, verification: bot.verification, evidence: bot.evidence,
        ip: bot.ip, country: bot.country, userAgent: bot.userAgent, edgeRay: bot.edgeRay,
        networkAsn: bot.networkAsn, networkOrganization: bot.networkOrganization, networkSource: bot.networkSource,
        decision: throttled ? "RATE_LIMITED" : reason ? "DENIED" : searchPending ? "PENDING" : "ALLOWED",
        reason: reason ?? (throttled ? "CRAWL_LIMIT" : searchPending ? "VALIDATION_PENDING" : "PUBLIC_CRAWL"),
        responseStatus: status,
      },
    });
    await tx.botRegistry.update({
      where: { id: registry.id },
      data: {
        firstSeen: timestamp < registry.firstSeen ? timestamp : registry.firstSeen,
        lastSeen: timestamp > registry.lastSeen ? timestamp : registry.lastSeen, requests: { increment: 1 }, searchAttempts: { increment: target.product ? 1 : 0 },
        allowed: { increment: status || searchPending ? 0 : 1 }, denied: { increment: reason && !throttled ? 1 : 0 },
        rateLimited: { increment: throttled ? 1 : 0 }, violations: { increment: reason ? 1 : 0 },
        ...(crawl && !throttled ? { crawlWindow: start, crawlCount: crawlCount + 1 } : {}),
      },
    });
    return { id: activity.id, botId: registry.id, status, retryAfter: throttled ? Math.ceil((start.getTime() + 60_000 - now.getTime()) / 1000) : null };
  });
}

type Attempt = Awaited<ReturnType<typeof recordBotAttempt>>;

export async function reserveBotSearch(attempt: Attempt, suppliedId: string | null, signal: AbortSignal) {
  const retryKey = suppliedId ? createHash("sha256").update(suppliedId).digest("hex") : null;
  return getPrisma().$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "BotRegistry" WHERE id = ${attempt.botId} FOR UPDATE`;
    const current = await tx.botActivity.findUniqueOrThrow({ where: { id: attempt.id } });
    if (current.decision !== "PENDING") return { status: 409 };
    if (signal.aborted) return { status: 499 };
    const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    const duplicate = retryKey && await tx.botActivity.findUnique({
      where: { botId_retryKey: { botId: attempt.botId, retryKey } },
      select: { id: true },
    });
    const where = { botId: attempt.botId, dispatchedAt: { not: null } };
    const latest = await tx.botActivity.findFirst({ where, orderBy: { dispatchedAt: "desc" }, select: { dispatchedAt: true } });
    const used = await tx.botActivity.count({ where: { ...where, dispatchedAt: { gte: utcDayStart(now) } } });
    const next = nextSearchTime(now, latest?.dispatchedAt ?? undefined, used);
    if (duplicate || next > now) {
      const status = duplicate ? 409 : 429;
      await tx.botActivity.update({ where: { id: attempt.id }, data: {
        decision: duplicate ? "DENIED" : "RATE_LIMITED", reason: duplicate ? "DUPLICATE_SEARCH" : "SEARCH_QUOTA", responseStatus: status,
      } });
      await tx.botRegistry.update({ where: { id: attempt.botId }, data: {
        ...(duplicate ? { denied: { increment: 1 } } : { rateLimited: { increment: 1 } }),
      } });
      return { status, retryAfter: duplicate ? undefined : Math.ceil((next.getTime() - now.getTime()) / 1000) };
    }
    if (signal.aborted) return { status: 499 };
    // This is the dispatch boundary. A result, upstream failure or disconnect
    // cannot reopen the slot. An indeterminate crash after commit keeps the slot.
    await tx.botActivity.update({ where: { id: attempt.id }, data: {
      decision: "ALLOWED", reason: "SEARCH_DISPATCH", dispatchedAt: now, retryKey,
    } });
    await tx.botRegistry.update({ where: { id: attempt.botId }, data: {
      allowed: { increment: 1 }, searches: { increment: 1 },
    } });
    return { status: 0 };
  });
}

export async function finishBotSearch(attempt: Attempt, status: number, durationMs: number, outcome?: string) {
  await getPrisma().$transaction(async tx => {
    const data = { responseStatus: status, durationMs: Math.round(durationMs) };
    const pending = await tx.botActivity.updateMany({ where: { id: attempt.id, decision: "PENDING" }, data: {
      ...data, decision: status === 429 ? "RATE_LIMITED" : "DENIED",
      reason: status === 429 ? "APPLICATION_RATE_LIMIT" : "SEARCH_NOT_DISPATCHED",
    } });
    if (pending.count) {
      await tx.botRegistry.update({ where: { id: attempt.botId }, data: status === 429
        ? { rateLimited: { increment: 1 } } : { denied: { increment: 1 } } });
    } else {
      await tx.botActivity.update({ where: { id: attempt.id }, data: { ...data, executionOutcome: outcome } });
    }
  });
}

export async function pruneBotActivity() {
  return getPrisma().$executeRaw`
    DELETE FROM "BotActivity" WHERE id IN (
      SELECT id FROM "BotActivity"
      WHERE environment = ${getPublicEnvironment()} AND "timestamp" < (clock_timestamp() AT TIME ZONE 'UTC') - ${BOT_ACTIVITY_RETENTION_DAYS} * interval '1 day'
      ORDER BY "timestamp" LIMIT 10000
    )
  `;
}
