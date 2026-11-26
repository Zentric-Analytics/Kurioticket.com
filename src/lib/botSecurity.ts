import { automationSignal, botAccess, botTarget, observeBot } from "@/lib/botPolicy";
import { finishBotSearch, recordBotAttempt, reserveBotSearch } from "@/services/botActivityStore";
import { searchCrawlerMetadata, type SearchCrawlerIdentity } from "@/lib/searchCrawlerGate";

function denial(status: number, retryAfter?: number | null) {
  return Response.json({ error: status === 429 ? "Bot request limit reached." : status === 409
    ? "Search identifier already used." : status === 503 ? "Bot security is temporarily unavailable." : "Bot access denied." }, {
    status,
    headers: { "Cache-Control": "private, no-store", ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}) },
  });
}

export async function enforceBotIngress(request: Request, signal: NonNullable<ReturnType<typeof automationSignal>>, blockedBy?: string) {
  const target = botTarget(request);
  // The canonical POST handlers own their entire request lifecycle.
  if (target.mainSearch && !blockedBy) return null;
  try {
    const bot = await observeBot(request, signal);
    const reason = blockedBy ?? botAccess(bot, target);
    const attempt = await recordBotAttempt(request, bot, target, reason);
    return attempt.status ? denial(attempt.status, attempt.retryAfter) : null;
  } catch {
    console.error("[bot-security] ingress activity unavailable");
    return denial(503);
  }
}

export type BotSearch = {
  crawler: SearchCrawlerIdentity;
  requestId: string;
  reserve: () => Promise<Response | null>;
  outcome: (value: string) => void;
};

export async function withBotSearch(request: Request, run: (bot?: BotSearch) => Promise<Response>) {
  const signal = automationSignal(request);
  if (!signal) return run();

  const started = performance.now();
  const target = botTarget(request);
  let bot;
  let attempt;
  try {
    bot = await observeBot(request, signal);
    const reason = botAccess(bot, target) ?? (!target.mainSearch ? "SEARCH_NOT_ALLOWED" : null);
    attempt = await recordBotAttempt(request, bot, target, reason);
    if (attempt.status) return denial(attempt.status, attempt.retryAfter);
  } catch {
    console.error("[bot-security] search activity unavailable");
    return denial(503);
  }

  let status = 500;
  let outcome: string | undefined;
  let dispatched = false;
  try {
    const response = await run({
      crawler: bot.crawler!,
      requestId: attempt.id,
      reserve: async () => {
        try {
          const result = await reserveBotSearch(attempt, request.headers.get("x-search-request-id"), request.signal);
          dispatched = !result.status;
          return dispatched ? null : denial(result.status, result.retryAfter);
        } catch {
          console.error("[bot-security] search reservation unavailable");
          return denial(503);
        }
      },
      outcome: (value) => { outcome = value; },
    });
    status = response.status;
    return response;
  } catch (error) {
    if (dispatched && !outcome && target.product) {
      try {
        const { logSearchHistory } = await import("@/services/operationalActivityService");
        await logSearchHistory({
          requestId: attempt.id, type: target.product, query: searchCrawlerMetadata(bot.crawler),
          applicationSource: "BOT", userId: null, visitorId: null, resultCount: 0, status: "FAILED",
          latencyMs: Math.round(performance.now() - started),
        });
      } catch {
        console.error("[bot-security] failed search history unavailable");
      }
    }
    throw error;
  } finally {
    await finishBotSearch(attempt, status, performance.now() - started,
      dispatched ? outcome ?? (status >= 400 ? "FAILED" : "COMPLETED") : undefined)
      .catch(() => console.error("[bot-security] final search activity unavailable"));
  }
}
