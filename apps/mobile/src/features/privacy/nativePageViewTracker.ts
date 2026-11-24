import { pageViewCanLink, pageViewRequestId, type PageViewKey, type PageViewPayload } from "../../../../../src/lib/pageViewCatalog";

type Dependencies = {
  context: () => number | null;
  createId: () => string;
  send: (event: PageViewPayload, context: number, signal: AbortSignal) => Promise<{ accepted: boolean; retryable?: boolean }>;
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

/** In-memory, consent-scoped delivery. Each real visit keeps its event ID
 * across retries and correlation enrichment. No pre-consent or disk backlog. */
export class NativePageViewTracker {
  private context: number | null = null;
  private current: PageViewPayload | null = null;
  private section: PageViewKey | null = null;
  private pending = new Map<string, AbortController>();
  constructor(private readonly deps: Dependencies) {}
  contextChanged = () => {
    const context = this.deps.context();
    if (context === this.context) return;
    this.context = context;
    this.current = null;
    this.section = null;
    for (const controller of this.pending.values()) controller.abort();
    this.pending.clear();
  };
  observe(key: PageViewKey | null, visible: boolean, reference?: unknown) {
    this.contextChanged();
    if (this.context === null || !visible) return;
    if (!key) { this.current = null; this.section = null; return; }
    const requestId = pageViewCanLink(key) ? pageViewRequestId(reference) : undefined;
    if (this.current?.pageKey === key) {
      if (!requestId || this.current.requestId === requestId) return;
      if (!this.current.requestId) {
        this.current = { ...this.current, requestId };
        this.deliver(this.current);
        return;
      }
      // A different actual search on the same visible results screen.
    }
    const previousPageKey = this.current?.pageKey;
    this.current = { eventId: this.deps.createId(), pageKey: key, ...(previousPageKey ? { previousPageKey } : {}), ...(requestId ? { requestId } : {}) };
    this.section = null;
    this.deliver(this.current);
  }
  observeResult(key: PageViewKey, reference: unknown) {
    this.contextChanged();
    if (this.current?.pageKey !== key || !pageViewCanLink(key)) return;
    this.observe(key, true, reference);
  }
  observeHomeSection(key: PageViewKey) {
    this.contextChanged();
    if (this.context === null || this.current?.pageKey !== "home" || this.section === key) return;
    const previousPageKey = this.section ?? "home";
    this.section = key;
    this.deliver({ eventId: this.deps.createId(), pageKey: key, previousPageKey });
  }
  private deliver(event: PageViewPayload) {
    const context = this.context;
    if (context === null) return;
    this.pending.get(event.eventId)?.abort();
    const controller = new AbortController();
    this.pending.set(event.eventId, controller);
    // A bounded queue prevents unlimited optional requests during outages.
    if (this.pending.size > 32) {
      const oldest = this.pending.keys().next().value;
      if (oldest) { this.pending.get(oldest)?.abort(); this.pending.delete(oldest); }
    }
    const active = () => !controller.signal.aborted && this.deps.context() === context;
    void (async () => {
      for (let attempt = 0; attempt <= waits.length && active(); attempt++) {
        try {
          const response = await this.deps.send(event, context, controller.signal);
          if (!response.retryable) return;
        } catch (error) {
          const status = (error as { status?: number } | null)?.status;
          if (status && status < 500 && status !== 429) return;
        }
        if (attempt < waits.length && active()) await (this.deps.delay ?? delay)(waits[attempt], controller.signal);
      }
    })().catch(() => undefined).finally(() => {
      if (this.pending.get(event.eventId) === controller) this.pending.delete(event.eventId);
    });
  }
}
