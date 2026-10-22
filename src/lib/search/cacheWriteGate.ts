/** Per-process backpressure for optional cache persistence, not provider quotas. */
export function createCacheWriteGate(now = Date.now) {
  let tail: Promise<unknown> = Promise.resolve();
  let queued = 0;
  let unavailableUntil = 0;
  return async function run<T>(task: () => Promise<T>, deadline = now() + 10_000): Promise<T> {
    if (queued >= 8 || now() < unavailableUntil) throw new Error("Cache persistence temporarily unavailable");
    queued++;
    const previous = tail;
    let release!: () => void;
    tail = new Promise<void>(resolve => { release = resolve; });
    try {
      await previous;
      if (now() >= deadline || now() < unavailableUntil) throw new Error("Cache persistence deadline exceeded");
      try { return await task(); }
      catch (error) { unavailableUntil = now() + 5_000; throw error; }
    } finally { queued--; release(); }
  };
}
export const runCacheWrite = createCacheWriteGate();
