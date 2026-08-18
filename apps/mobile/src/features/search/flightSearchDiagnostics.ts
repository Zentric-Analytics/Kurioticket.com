export type FlightSearchEventLoopSample = {
  maxEventLoopLagMs: number;
  sampleCount: number;
};

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
