import type { PlatformOperations } from "@/components/admin/PlatformHealthDashboard";

const sources = ["WEB", "IOS", "ANDROID", "UNKNOWN"] as const;
const groups = ["searches", "providerCalls", "handoffs"] as const;
const validStates = new Set(["HEALTHY", "DEGRADED", "FAILING", "DISABLED", "UNKNOWN", "MONITORING_UNAVAILABLE"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function isOperationalTotals(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const fields = ["total", "successful", "partial", "failed", "disabled"] as const;
  if (!fields.every(field => isCount(value[field])) || !validStates.has(String(value.state))) return false;
  if (value.averageLatencyMs !== null && !isCount(value.averageLatencyMs)) return false;
  return value.total === Number(value.successful) + Number(value.partial) + Number(value.failed) + Number(value.disabled);
}

/** Reject malformed / unrelated results before replacing the visible snapshot.
 * Unknown or unavailable *service* states remain valid observations. */
export function parsePlatformRefreshSnapshot(payload: unknown, hours: number): PlatformOperations | null {
  if (!isRecord(payload) || ![24, 168, 720].includes(hours)) return null;
  if (payload.environment !== "staging" && payload.environment !== "production") return null;
  if (!isRecord(payload.window) || typeof payload.window.from !== "string" || typeof payload.window.to !== "string") return null;
  const from = Date.parse(payload.window.from), to = Date.parse(payload.window.to);
  if (!Number.isFinite(from) || !Number.isFinite(to) || Math.abs(to - from - hours * 3_600_000) > 1_000) return null;
  if (!isRecord(payload.activity) || !["AVAILABLE", "MONITORING_UNAVAILABLE"].includes(String(payload.activity.state))) return null;
  if (payload.activity.data === null) {
    if (payload.activity.state !== "MONITORING_UNAVAILABLE") return null;
  } else {
    if (payload.activity.state !== "AVAILABLE" || !isRecord(payload.activity.data)) return null;
    for (const kind of groups) {
      const item = payload.activity.data[kind];
      if (!isRecord(item) || !isOperationalTotals(item.combined) || !isRecord(item.applications)) return null;
      if (!sources.every(source => isOperationalTotals((item.applications as Record<string, unknown>)[source]))) return null;
    }
  }
  if (!isRecord(payload.database) || !validStates.has(String(payload.database.state))) return null;
  if (!isRecord(payload.email) || !validStates.has(String(payload.email.state))) return null;
  if (!isRecord(payload.cms) || !validStates.has(String(payload.cms.state))) return null;
  if (!isRecord(payload.nativeApplicationHealth) || !validStates.has(String(payload.nativeApplicationHealth.state))) return null;
  if (!isRecord(payload.scheduledJobs) || typeof payload.scheduledJobs.state !== "string") return null;
  if (payload.scheduledJobs.runs !== null && !Array.isArray(payload.scheduledJobs.runs)) return null;
  if (payload.providerHealth !== null && !Array.isArray(payload.providerHealth)) return null;
  if (payload.alerts !== null && !isRecord(payload.alerts)) return null;
  if (payload.release !== null && !isRecord(payload.release)) return null;
  return payload as PlatformOperations;
}

/** Explicit UTC avoids a server/client hydration timezone mismatch. */
export function formatPlatformRefreshTime(timestamp: string) {
  const parsed = new Date(timestamp);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(11, 16) + " UTC" : "Not available";
}
