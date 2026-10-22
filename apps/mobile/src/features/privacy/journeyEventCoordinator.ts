export type JourneyEvent = {
  eventId: string;
  type: "RESULTS_VIEWED" | "OFFER_SELECTED";
  requestId: string;
  provider?: string;
  sourcePage: string;
};
export type JourneyEventResponse = { accepted: boolean; retryable?: boolean };

type Dependencies = {
  context: () => number | null;
  createId: () => string;
  send: (event: JourneyEvent, context: number, signal: AbortSignal) => Promise<JourneyEventResponse>;
  schedule?: (callback: () => void, delayMs: number) => () => void;
};
type PendingEvent = {
  event: JourneyEvent;
  context: number;
  controller: AbortController;
  attempts: number;
  cancelRetry?: () => void;
};

const retryDelays = [250, 1000, 3000];
const maximumSearches = 64;
const maximumEvents = 256;

export function journeySourcePath(value: string) {
  const path = value.split(/[?#]/, 1)[0];
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") && path.length <= 240 ? path : undefined;
}

function validRequestId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 100 && value.trim() === value;
}

function retryableFailure(error: unknown) {
  const failure = error as { status?: number; code?: string } | null;
  if (failure?.code === "cancelled" || failure?.code === "configuration") return false;
  return failure?.status === undefined || failure.status === 0 || failure.status === 429 || failure.status >= 500;
}

/** Optional, in-memory delivery only: no events survive a refusal or account change. */
export class JourneyEventCoordinator {
  private context: number | null = null;
  private searches = new Set<string>();
  private events = new Map<string, PendingEvent>();

  constructor(private readonly dependencies: Dependencies) {}

  captureContext = () => {
    this.contextChanged();
    return this.context;
  };

  contextChanged = () => {
    const next = this.dependencies.context();
    if (next === this.context) return;
    this.clear();
    this.context = next;
  };

  private clear() {
    for (const pending of this.events.values()) {
      pending.cancelRetry?.();
      pending.controller.abort();
    }
    this.events.clear();
    this.searches.clear();
  }

  /** Register only the actual response ID, under the consent context that started its search. */
  rememberSearch(requestId: unknown, context: number | null) {
    this.contextChanged();
    if (!validRequestId(requestId) || context === null || context !== this.context) return;
    this.searches.add(requestId);
    if (this.searches.size > maximumSearches) this.searches.delete(this.searches.values().next().value!);
  }

  resultsViewed(requestId: string | undefined, sourcePage: string, displayedCount: number) {
    if (displayedCount <= 0) return;
    return this.enqueue("RESULTS_VIEWED", requestId, sourcePage);
  }

  offerSelected(requestId: string | undefined, offerId: string, provider: string | undefined, sourcePage: string) {
    if (!offerId) return;
    return this.enqueue("OFFER_SELECTED", requestId, sourcePage, offerId, provider);
  }

  private enqueue(type: JourneyEvent["type"], requestId: string | undefined, sourcePage: string, offerId = "", provider?: string) {
    this.contextChanged();
    const sourcePath = journeySourcePath(sourcePage);
    if (this.context === null || !validRequestId(requestId) || !this.searches.has(requestId) || !sourcePath) return;
    // Re-renders, reopening cached details and repeated presses on the same offer
    // do not create duplicate funnel steps. Delivery retries retain this UUID.
    const key = JSON.stringify([type, requestId, sourcePath, offerId]);
    const existing = this.events.get(key);
    if (existing) return existing.event.eventId;
    let eventId: string;
    try { eventId = this.dependencies.createId(); }
    catch { return; }
    const pending: PendingEvent = {
      event: {
        eventId, type, requestId, sourcePage: sourcePath,
        ...(provider?.trim() ? { provider: provider.trim().slice(0, 100) } : {}),
      },
      context: this.context,
      controller: new AbortController(),
      attempts: 0,
    };
    this.events.set(key, pending);
    if (this.events.size > maximumEvents) {
      const oldest = this.events.entries().next().value!;
      oldest[1].cancelRetry?.();
      oldest[1].controller.abort();
      this.events.delete(oldest[0]);
    }
    void Promise.resolve().then(() => this.deliver(pending));
    return pending.event.eventId;
  }

  private async deliver(pending: PendingEvent) {
    this.contextChanged();
    if (pending.controller.signal.aborted || this.context !== pending.context) return;
    pending.attempts += 1;
    let retry = false;
    try {
      const response = await this.dependencies.send(pending.event, pending.context, pending.controller.signal);
      retry = !response.accepted && response.retryable === true;
    } catch (error) {
      retry = retryableFailure(error);
    }
    this.contextChanged();
    const delay = retryDelays[pending.attempts - 1];
    if (!retry || delay === undefined || pending.controller.signal.aborted || this.context !== pending.context) return;
    const schedule = this.dependencies.schedule ?? ((callback: () => void, delayMs: number) => {
      const timer = setTimeout(callback, delayMs);
      return () => clearTimeout(timer);
    });
    pending.cancelRetry = schedule(() => { pending.cancelRetry = undefined; void this.deliver(pending); }, delay);
  }
}
