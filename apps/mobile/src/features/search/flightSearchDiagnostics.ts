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
  responseBytes?: string | null;
  elapsedMs?: number;
  origin?: string;
  destination?: string;
  tripType?: string;
  platform: string;
  airlineImagePolicy?: "remote" | "initials-only";
};

export function logFlightSearchCheckpoint(phase: FlightSearchCheckpoint, details: SafeCheckpointDetails) {
  console.info(`[${phase}]`, details);
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
