import { applicationSources, applicationMetadata, type ApplicationSource } from "@/lib/application-source";

export type OperationalState = "HEALTHY" | "DEGRADED" | "FAILING" | "DISABLED" | "UNKNOWN" | "MONITORING_UNAVAILABLE";
export type OperationalGroup = { kind: string; source: string | null; status: string; count: bigint | number; latency: bigint | number | null; latencyCount?: bigint | number };
export type OperationalTotals = { total: number; successful: number; partial: number; failed: number; disabled: number; averageLatencyMs: number | null; state: OperationalState };
function safeCount(value: bigint | number) {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid operational aggregate");
  return count;
}
export function summarizeOperationalGroups(rows: OperationalGroup[], kind: string, source?: ApplicationSource): OperationalTotals {
  const result: OperationalTotals = { total: 0, successful: 0, partial: 0, failed: 0, disabled: 0, averageLatencyMs: null, state: "UNKNOWN" };
  let latency = 0, latencySamples = 0;
  for (const row of rows.filter(row => row.kind === kind && (!source || applicationMetadata({ applicationSource: row.source as ApplicationSource }).applicationSource === source))) {
    const count = safeCount(row.count);
    const status = row.status;
    if (!["SUCCESS", "PARTIAL", "FAILED", "DEGRADED", "DISABLED"].includes(status)) throw new Error("Unknown operational status");
    result.total = safeCount(result.total + count);
    if (status === "SUCCESS") result.successful += count;
    if (status === "PARTIAL" || status === "DEGRADED") result.partial += count;
    if (status === "FAILED") result.failed += count;
    if (status === "DISABLED") result.disabled += count;
    latency += safeCount(row.latency ?? 0);
    latencySamples += safeCount(row.latencyCount ?? 0);
  }
  const attempted = result.total - result.disabled;
  result.averageLatencyMs = latencySamples ? Math.round(latency / latencySamples) : null;
  result.state = !result.total ? "UNKNOWN" : !attempted ? "DISABLED" : attempted < 10 ? "UNKNOWN"
    : result.failed / attempted >= 0.5 ? "FAILING" : result.failed || result.partial ? "DEGRADED" : "HEALTHY";
  return result;
}
export function partitionOperationalGroups(rows: OperationalGroup[]) {
  return Object.fromEntries(["searches", "handoffs", "providerCalls"].map(kind => [kind, {
    combined: summarizeOperationalGroups(rows, kind),
    applications: Object.fromEntries(applicationSources.map(source => [source, summarizeOperationalGroups(rows, kind, source)])),
  }]));
}
