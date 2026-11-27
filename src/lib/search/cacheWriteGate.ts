import { currentSearchDiagnostics } from "./diagnosticContext";
/** Per-process backpressure for optional cache persistence, not provider quotas. */
export function createCacheWriteGate(now = Date.now) {
  let tail: Promise<unknown> = Promise.resolve();
  let queued = 0;
  let unavailableUntil = 0;
  return async function run<T>(task: () => Promise<T>, deadline = now() + 10_000): Promise<T> {
    const trace = currentSearchDiagnostics();
    const queuedAt = performance.now();
    trace?.("cache-queued");
    if (queued >= 8 || now() < unavailableUntil) { trace?.("cache-complete", { category: "unavailable" }); throw new Error("Cache persistence temporarily unavailable"); }
    queued++;
    const previous = tail;
    let release!: () => void;
    tail = new Promise<void>(resolve => { release = resolve; });
    try {
      await previous;
      if (now() >= deadline || now() < unavailableUntil) { trace?.("cache-complete", { category: "timeout", durationMs: performance.now() - queuedAt }); throw new Error("Cache persistence deadline exceeded"); }
      trace?.("cache-start", { durationMs: performance.now() - queuedAt });
      const startedAt = performance.now();
      try { const result = await task(); trace?.("cache-complete", { category: "success", durationMs: performance.now() - startedAt }); return result; }
      catch (error) { trace?.("cache-complete", { category: "failed", durationMs: performance.now() - startedAt }); unavailableUntil = now() + 5_000; throw error; }
    } finally { queued--; release(); }
  };
}
export const runCacheWrite = createCacheWriteGate();
