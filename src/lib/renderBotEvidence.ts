import { isIP } from "node:net";
import { z } from "zod";
import { botTarget } from "@/lib/botPolicy";
import { declaredSearchCrawler } from "@/lib/searchCrawlerGate";
import { publicVisitorIp } from "@/lib/geo/ipinfo";

export const STAGING_BOT_LOG_HOST = "staging.kurioticket.com";
export const renderLogIdPattern = /^[a-zA-Z0-9_-]{8,128}$/;
export const renderLogMaxDelayMs = 30_000;
const methodPattern = /^(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)$/;
const logSchema = z.object({
  timestamp: z.string(),
  message: z.string().max(32768),
  labels: z.array(z.object({ name: z.string(), value: z.string() })).max(64),
});

export type RenderBotCandidate = {
  id: string;
  environment: string;
  renderRequestId: string | null;
  timestamp: Date;
  method: string;
  endpoint: string;
  declaredName: string | null;
  responseStatus: number | null;
};

export type RenderLogMatch = { ip: string; timestamp: Date };

// The metadata prefix is emitted by Render, not parsed from arbitrary text
// inside the request's User-Agent. Unexpected log formats fail closed.
const prefix = /^clientIP="([^"]+)" requestID="([a-zA-Z0-9_-]{8,128})" /;
const messageFormat = /^clientIP="([^"]+)" requestID="([a-zA-Z0-9_-]{8,128})" responseTimeMS=\d+ responseBytes=\d+ userAgent=("(?:[^"\\\r\n]|\\.)*")$/;

export function matchRenderBotLog(row: RenderBotCandidate, input: readonly unknown[], service: string): RenderLogMatch | null {
  if (row.environment !== "staging" || !row.renderRequestId || !renderLogIdPattern.test(row.renderRequestId) || !methodPattern.test(row.method)) return null;
  // Count by the authoritative prefix, even if another field is malformed.
  // A duplicate cannot be resolved using timing alone.
  const matching = input.filter(value => {
    if (!value || typeof value !== "object" || !("message" in value) || typeof value.message !== "string") return false;
    return prefix.exec(value.message)?.[2] === row.renderRequestId;
  });
  if (matching.length !== 1) return null;
  const parsed = logSchema.safeParse(matching[0]);
  if (!parsed.success) return null;
  const log = parsed.data;
  const labels = new Map(log.labels.map(label => [label.name, label.value]));
  if (labels.size !== log.labels.length || labels.get("resource") !== service ||
      labels.get("type") !== "request" || labels.get("host") !== STAGING_BOT_LOG_HOST ||
      labels.get("method") !== row.method) return null;
  const status = labels.get("statusCode") ?? "";
  if (!/^[1-5]\d\d$/.test(status) || (row.responseStatus !== null && Number(status) !== row.responseStatus)) return null;
  const timestamp = new Date(log.timestamp);
  const delay = timestamp.getTime() - row.timestamp.getTime();
  if (!Number.isFinite(delay) || delay < 0 || delay > renderLogMaxDelayMs) return null;

  const match = messageFormat.exec(log.message);
  if (!match || !isIP(match[1]) || match[1].toLowerCase() === "2a06:98c0:3600::103") return null;
  const ip = publicVisitorIp(match[1]);
  if (!ip) return null;
  let agent: unknown;
  try { agent = JSON.parse(match[3]); } catch { return null; }
  if (typeof agent !== "string" || agent.length > 2048 || declaredSearchCrawler(agent) !== row.declaredName) return null;

  const path = labels.get("path") ?? "";
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.length > 8192) return null;
  try {
    const url = new URL("https://" + STAGING_BOT_LOG_HOST + path);
    // Use exactly the same route normalization as the original activity.
    if (url.hostname !== STAGING_BOT_LOG_HOST ||
        botTarget(new Request(url, { method: row.method })).endpoint !== row.endpoint) return null;
  } catch { return null; }
  return { ip, timestamp };
}
