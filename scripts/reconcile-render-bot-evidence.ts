import { lookup, reverse } from "node:dns/promises";
import { getPrisma } from "@/lib/prisma";
import { knownCrawler } from "@/lib/botRegistry";
import { confirmedOperatorNetwork } from "@/lib/operatorCrawlerNetwork";
import { verifySearchCrawler } from "@/lib/verifiedSearchCrawler";
import { resolveIpinfoLiteCountryContext } from "@/lib/geo/ipinfo";
import { isIsoCountryCode } from "@/lib/geo/context";
import { matchRenderBotLog, renderLogIdPattern, renderLogMaxDelayMs, STAGING_BOT_LOG_HOST, type RenderBotCandidate } from "@/lib/renderBotEvidence";

const maxCandidates = 5000;
const batchSize = 20;
const maxResponseBytes = 2 * 1024 * 1024;
const staging = "staging";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error("Missing configuration: " + name);
  return value;
}

function configuration() {
  if (process.env.TRAVEL_PROVIDER_MODE !== staging ||
      process.env.NEXT_PUBLIC_APP_URL !== "https://" + STAGING_BOT_LOG_HOST) {
    throw new Error("This reconciliation job is restricted to the canonical staging environment.");
  }
  required("DATABASE_URL");
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--apply" && !/^--hours=\d+$/.test(arg) && !arg.startsWith("--end="))) {
    throw new Error("Use --hours=1..720, optionally --end=<UTC ISO timestamp>, and --apply.");
  }
  const hours = Number(args.find(arg => arg.startsWith("--hours="))?.slice(8) ?? "24");
  const endArg = args.find(arg => arg.startsWith("--end="))?.slice(6);
  const now = Date.now();
  const end = endArg ? Date.parse(endArg) : now - 120_000;
  if (!Number.isInteger(hours) || hours < 1 || hours > 720 || !Number.isFinite(end) ||
      (endArg && !endArg.endsWith("Z")) || end > now - 120_000 ||
      end - hours * 3600_000 < now - 30 * 24 * 3600_000) {
    throw new Error("Choose a completed window within Render's last 30 days (subject to workspace retention).");
  }
  const apply = args.includes("--apply");
  if (apply && process.env.BOT_RENDER_RECONCILE_ENABLED !== "true") {
    throw new Error("Apply requires explicit BOT_RENDER_RECONCILE_ENABLED=true.");
  }
  const service = required("BOT_RENDER_LOG_SERVICE_ID");
  const owner = required("BOT_RENDER_LOG_OWNER_ID");
  const apiKey = required("BOT_RENDER_LOG_API_KEY");
  if (!/^srv-[a-z0-9]+$/.test(service) || !/^tea-[a-z0-9]+$/.test(owner)) {
    throw new Error("Invalid Render staging service or workspace identifier.");
  }
  return { service, owner, apiKey, apply, from: new Date(end - hours * 3600_000), to: new Date(end) };
}

async function boundedJson(response: Response): Promise<unknown> {
  if (!response.ok || !response.body) throw new Error("Render log request failed: " + response.status);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxResponseBytes) throw new Error("Render log response exceeded the safe size limit.");
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

async function readLogs(config: ReturnType<typeof configuration>, rows: RenderBotCandidate[]) {
  const ids = rows.flatMap(row => row.renderRequestId && renderLogIdPattern.test(row.renderRequestId) ? [row.renderRequestId] : []);
  if (!ids.length) return [];
  const url = new URL("https://api.render.com/v1/logs");
  url.searchParams.set("ownerId", config.owner);
  url.searchParams.append("resource", config.service);
  url.searchParams.append("type", "request");
  url.searchParams.append("host", STAGING_BOT_LOG_HOST);
  url.searchParams.set("startTime", new Date(Math.min(...rows.map(row => row.timestamp.getTime())) - 1000).toISOString());
  url.searchParams.set("endTime", new Date(Math.max(...rows.map(row => row.timestamp.getTime())) + renderLogMaxDelayMs + 1000).toISOString());
  url.searchParams.set("limit", "100");
  url.searchParams.append("text", '/requestID="(?:' + ids.join("|") + ')"/');
  const payload = await boundedJson(await fetch(url, {
    headers: { Authorization: "Bearer " + config.apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(15_000), redirect: "error", cache: "no-store",
  }));
  if (!payload || typeof payload !== "object" || !("logs" in payload) || !Array.isArray(payload.logs) ||
      !("hasMore" in payload) || payload.hasMore !== false) {
    // Never infer uniqueness from a truncated or unrecognized response.
    throw new Error("Render log results are incomplete. Use a narrower reconciliation window.");
  }
  return payload.logs as unknown[];
}

async function corroborate(name: string | null, ip: string): Promise<string | null> {
  const crawler = knownCrawler(name);
  if (crawler?.category === "search") {
    const req = new Request("https://" + STAGING_BOT_LOG_HOST + "/", { headers: { "User-Agent": crawler.agent } });
    const match = await verifySearchCrawler(req, { clientIp: () => ip, reverseIp: reverse, forwardHost: hostname => lookup(hostname, { all: true }) });
    if (match === name) return name === "DUCKDUCKBOT" ? "OFFICIAL_IP_LIST" : "FORWARD_CONFIRMED_DNS";
  }
  return await confirmedOperatorNetwork(name, ip) ? "OFFICIAL_CRAWLER_NETWORK" : null;
}

async function main() {
  const config = configuration();
  const db = getPrisma();
  try {
    const rows = await db.botActivity.findMany({
      where: { environment: staging, ip: null, renderLogIp: null, renderRequestId: { not: null },
        timestamp: { gte: config.from, lt: config.to } },
      select: { id: true, environment: true, timestamp: true, endpoint: true, method: true, declaredName: true, responseStatus: true, renderRequestId: true },
      orderBy: [{ timestamp: "asc" }, { id: "asc" }], take: maxCandidates + 1,
    });
    if (rows.length > maxCandidates) throw new Error("Too many candidates; select a smaller completed window.");
    const counts = { candidates: rows.length, matched: 0, unmatched: 0, ambiguous: 0, countries: 0, corroborated: 0, saved: 0, skippedOnWrite: 0 };
    const countries = new Map<string, string | null>();
    const corroborations = new Map<string, string | null>();
    for (let index = 0; index < rows.length; index += batchSize) {
      const batch = rows.slice(index, index + batchSize);
      const logs = await readLogs(config, batch);
      for (const row of batch) {
        if (!row.renderRequestId || await db.botActivity.count({ where: { environment: staging, renderRequestId: row.renderRequestId } }) !== 1) {
          counts.ambiguous++;
          continue;
        }
        const match = matchRenderBotLog(row, logs, config.service);
        if (!match) { counts.unmatched++; continue; }
        counts.matched++;
        if (!countries.has(match.ip)) {
          const context = process.env.IPINFO_TOKEN?.trim()
            ? await resolveIpinfoLiteCountryContext(match.ip, { allowMeFallback: false, timeoutMs: 1200 }) : null;
          const code = context?.countryCode;
          countries.set(match.ip, code && isIsoCountryCode(code) ? code : null);
        }
        const country = countries.get(match.ip) ?? null;
        if (country) counts.countries++;
        const key = (row.declaredName ?? "") + ":" + match.ip;
        if (!corroborations.has(key)) {
          corroborations.set(key, await corroborate(row.declaredName, match.ip).catch(() => null));
        }
        const corroboration = corroborations.get(key) ?? null;
        if (corroboration) counts.corroborated++;
        if (!config.apply) continue;
        const saved = await db.$transaction(async tx => {
          if (await tx.botActivity.count({ where: { environment: staging, renderRequestId: row.renderRequestId } }) !== 1) return 0;
          const result = await tx.botActivity.updateMany({
            where: { id: row.id, environment: staging, renderRequestId: row.renderRequestId,
              timestamp: row.timestamp, endpoint: row.endpoint, method: row.method, declaredName: row.declaredName,
              responseStatus: row.responseStatus, ip: null, renderLogIp: null },
            data: { renderLogIp: match.ip, renderLogCountry: country, renderLogTimestamp: match.timestamp,
              renderLogRecoveredAt: new Date(), renderLogCorroboration: corroboration },
          });
          return result.count;
        }, { isolationLevel: "Serializable" });
        counts.saved += saved;
        if (!saved) counts.skippedOnWrite++;
      }
    }
    // Counts only: no IPs, paths, log bodies, IDs or credentials in job output.
    console.info("[render-bot-evidence]", { mode: config.apply ? "apply" : "dry-run", from: config.from.toISOString(), to: config.to.toISOString(), ...counts });
  } finally {
    await db.$disconnect();
  }
}

main().catch(() => {
  // Database, log and provider errors may contain credentials or request data.
  console.error("[render-bot-evidence] Reconciliation stopped. Check approved configuration, retention and provider availability. Do not log raw responses.");
  process.exitCode = 1;
});
