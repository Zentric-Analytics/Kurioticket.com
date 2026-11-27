export type FlightSearchEventLoopSample = {
  maxEventLoopLagMs: number;
  sampleCount: number;
};

export type FlightSearchCheckpoint =
  | "flight-search:start"
  | "flight-search:response-received"
  | "flight-search:parsed"
  | "flight-search:validated"
  | "flight-search:derived-ready"
  | "flight-search:render-ready"
  | "flight-search:initial-card-mounted";

type SafeCheckpointDetails = {
  requestId?: string;
  resultCount?: number;
  serverResultCount?: number;
  acceptedResultCount?: number;
  rejectedResultIds?: string[];
  responseBytes?: string | null;
  elapsedMs?: number;
  origin?: string;
  destination?: string;
  tripType?: string;
  platform: string;
};

export function logFlightSearchCheckpoint(phase: FlightSearchCheckpoint, details: SafeCheckpointDetails) {
  try {
    const safe: Record<string, unknown> = {};
    if (details.requestId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(details.requestId)) safe.requestId = details.requestId;
    if (details.platform === "android" || details.platform === "ios") safe.platform = details.platform;
    for (const key of ["resultCount", "serverResultCount", "acceptedResultCount", "elapsedMs"] as const) {
      const value = details[key]; if (typeof value === "number" && Number.isFinite(value) && value >= 0) safe[key] = value;
    }
    if (details.rejectedResultIds) safe.rejectedCount = details.rejectedResultIds.length;
    if (details.responseBytes && /^\d+$/.test(details.responseBytes)) safe.responseBytes = Number(details.responseBytes);
    console.info(`[${phase}]`, safe);
  } catch { /* Logging must never interrupt search execution. */ }
}

/**
 * Development-only event-loop sampler. A pending fetch should produce almost no
 * drift; synchronous parsing or rendering shows up as a delayed interval tick.
 */
export function startFlightSearchEventLoopMonitor(
  intervalMs = 100,
  now: () => number = () => performance.now(),
) {
  let expected = now() + intervalMs;
  let maxEventLoopLagMs = 0;
  let sampleCount = 0;
  const timer = setInterval(() => {
    const current = now();
    maxEventLoopLagMs = Math.max(maxEventLoopLagMs, current - expected);
    sampleCount += 1;
    expected = current + intervalMs;
  }, intervalMs);

  return (): FlightSearchEventLoopSample => {
    clearInterval(timer);
    return { maxEventLoopLagMs, sampleCount };
  };
}

export function responseByteLength(raw: string) {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(raw).byteLength;
  return unescape(encodeURIComponent(raw)).length;
}
