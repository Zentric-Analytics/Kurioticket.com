/** Per-process cache backpressure. The deadline bounds admission, not an active transaction. */
export function createCacheWriteGate(now = Date.now) {
  let tail: Promise<unknown> = Promise.resolve();
  let queued = 0;
  let unavailableUntil = 0;
  return async function run<T>(task: () => Promise<T>, deadline = now() + 10_000): Promise<T> {
    if (queued >= 8 || now() < unavailableUntil) throw new Error("Cache persistence temporarily unavailable");
    queued++;
    const previous = tail;
    let release!: () => void;
    const slot = new Promise<void>(resolve => { release = resolve; });
    // An expired waiter may release its own slot before its predecessor ends.
    // Keep that predecessor in the chain so successors cannot overlap a writer.
    tail = previous.then(() => slot);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        previous,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error("Cache persistence deadline exceeded")), Math.max(0, deadline - now()));
        }),
      ]);
      clearTimeout(timer);
      if (now() >= deadline || now() < unavailableUntil) throw new Error("Cache persistence deadline exceeded");
      try { return await task(); }
      catch (error) { unavailableUntil = now() + 5_000; throw error; }
    } finally { clearTimeout(timer); queued--; release(); }
  };
}
export const runCacheWrite = createCacheWriteGate();
