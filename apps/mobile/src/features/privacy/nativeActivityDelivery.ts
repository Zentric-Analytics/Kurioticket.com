type Dependencies<Payload> = {
  context: () => number | null;
  send: (event: Payload, context: number, signal: AbortSignal) => Promise<{ retryable?: boolean }>;
  delay?: (ms: number, signal: AbortSignal) => Promise<void>;
};

const waits = [300, 1000, 2500, 5000] as const;

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>(resolve => {
    if (signal.aborted) return resolve();
    const finish = () => { clearTimeout(timer); signal.removeEventListener("abort", finish); resolve(); };
    const timer = setTimeout(finish, ms);
    signal.addEventListener("abort", finish, { once: true });
  });
}

/** Optional, in-memory requests end as soon as their consent/account generation ends. */
export function createNativeActivityDelivery<Payload extends { eventId: string }>(deps: Dependencies<Payload>) {
  let context = deps.context();
  const pending = new Map<string, AbortController>();

  function contextChanged() {
    const current = deps.context();
    if (current === context) return;
    context = current;
    for (const controller of pending.values()) controller.abort();
    pending.clear();
  }

  function deliver(event: Payload, expectedContext: number) {
    contextChanged();
    if (context !== expectedContext) return;
    pending.get(event.eventId)?.abort();
    const controller = new AbortController();
    pending.set(event.eventId, controller);
    if (pending.size > 32) {
      const oldest = pending.keys().next().value;
      if (oldest) {
        pending.get(oldest)?.abort();
        pending.delete(oldest);
      }
    }
    const active = () => !controller.signal.aborted && deps.context() === expectedContext;
    void (async () => {
      for (let attempt = 0; attempt <= waits.length && active(); attempt++) {
        try {
          const response = await deps.send(event, expectedContext, controller.signal);
          if (!response.retryable) return;
        } catch (error) {
          const failure = error as { code?: string; status?: number } | null;
          if (failure?.code === "cancelled" || failure?.code === "configuration"
            || (failure?.status && failure.status < 500 && failure.status !== 429)) return;
        }
        if (attempt < waits.length && active()) await (deps.delay ?? delay)(waits[attempt], controller.signal);
      }
    })().catch(() => undefined).finally(() => {
      if (pending.get(event.eventId) === controller) pending.delete(event.eventId);
    });
  }

  return { deliver, contextChanged };
}
