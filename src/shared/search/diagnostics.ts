/** Operational timing only. Never accepts criteria, payloads or credentials. */
export type SearchDiagnosticProduct = "flight" | "hotel" | "car";
export const searchDiagnosticPhases = [
  "initiation", "admission", "correlation", "timer-start", "timer-expired", "timer-stop", "cancelled", "terminal",
  "response-received", "body-start", "body-complete", "validation", "state-publication",
  "viewport-reported", "final-inventory", "supplier-start", "supplier-complete",
  "normalization", "deduplication", "aggregation", "cache-queued", "cache-start", "cache-encode", "cache-complete", "projection", "serialization",
] as const;
export type SearchDiagnosticPhase = typeof searchDiagnosticPhases[number];
export type SearchDiagnosticMetrics = {
  count?: number; acceptedCount?: number; rejectedCount?: number; bytes?: number;
  durationMs?: number; deadlineMs?: number; status?: number;
  category?: string; completed?: boolean; provider?: string; relatedRequestId?: string;
};
const categories = new Set(["success", "empty", "partial", "skipped", "timeout", "ui-deadline", "cancelled", "superseded", "screen-cleanup", "network", "http", "invalid-response", "invalid-json", "invalid-schema", "configuration", "validation", "rate-limit", "unavailable", "server", "failed"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createSearchDiagnostics(
  product: SearchDiagnosticProduct,
  requestId: string | undefined,
  source: "native" | "server" | "web",
  options: { now?: () => number; startedAt?: number; sink?: (event: Record<string, unknown>) => void; platform?: string; span?: "transport" | "presentation" | "route" | "service" | "supplier" | "serialization" | "normalization" | "aggregation" } = {},
) {
  const now = () => { try { const n = (options.now ?? (() => performance.now()))(); return Number.isFinite(n) ? n : 0; } catch { return 0; } };
  const started = typeof options.startedAt === "number" && Number.isFinite(options.startedAt) ? options.startedAt : now();
  return (phase: SearchDiagnosticPhase, metrics: SearchDiagnosticMetrics = {}) => {
    try {
      if (!requestId || !uuid.test(requestId) || !searchDiagnosticPhases.includes(phase)) return;
      const event: Record<string, unknown> = { version: 1, product, requestId: requestId.toLowerCase(), source, phase, elapsedMs: Math.max(0, now() - started) };
      if (options.span && ["transport", "presentation", "route", "service", "supplier", "serialization", "normalization", "aggregation"].includes(options.span)) event.span = options.span;
      if (options.platform === "android" || options.platform === "ios" || options.platform === "web") event.platform = options.platform;
      for (const key of ["count", "acceptedCount", "rejectedCount", "bytes", "durationMs", "deadlineMs", "status"] as const) {
        const n = metrics[key];
        if (typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER) event[key] = n;
      }
      if (metrics.category && categories.has(metrics.category)) event.category = metrics.category;
      if (metrics.provider === "kayak" || metrics.provider === "duffel") event.provider = metrics.provider;
      if (metrics.relatedRequestId && uuid.test(metrics.relatedRequestId)) event.relatedRequestId = metrics.relatedRequestId.toLowerCase();
      if (typeof metrics.completed === "boolean") event.completed = metrics.completed;
      if (options.sink) options.sink(event); else console.info("[search:lifecycle]", JSON.stringify(event));
    } catch { /* Optional diagnostics must never interrupt search execution. */ }
  };
}
