import { isJourneySourcePath, type ClientJourneyEventType } from "./search-journey";

export type WebJourneyEvent = {
  type: ClientJourneyEventType;
  requestId: string;
  provider?: string;
  sourcePage?: string;
};
type Timer = ReturnType<typeof setTimeout>;
type Dependencies = {
  request: (url: string, init: RequestInit) => Promise<Response>;
  allowed: () => boolean;
  eventId: () => string;
  schedule?: (callback: () => void, delay: number) => Timer;
  cancel?: (timer: Timer) => void;
};
type Pending = {
  payload: WebJourneyEvent & { eventId: string };
  context: string;
  generation: number;
  attempts: number;
  waiting: boolean;
  timer?: Timer;
  controller?: AbortController;
};
const retryDelays = [250, 1000, 3000];
const maximumPendingEvents = 128;
const confirmationWaitMs = 30_000;

export function journeyRequestId(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value.toLowerCase() : null;
}

export function journeySourcePath(value: string): string | undefined {
  const path = value.split(/[?#]/, 1)[0];
  return path.length <= 240 && isJourneySourcePath(path) ? path : undefined;
}

/** Optional delivery is bounded, never awaited by navigation, and uses only a first-party endpoint. */
export function createJourneyEventSender(dependencies: Dependencies) {
  const schedule = dependencies.schedule ?? setTimeout;
  const cancel = dependencies.cancel ?? clearTimeout;
  const pending = new Set<Pending>();
  // Observations survive suspension and withdrawal. A cached display must not
  // become a new impression merely because consent or the session changed.
  const viewed = new Set<string>();
  let context: string | null = null;
  let consent = false;
  let generation = 0;

  function cancelPending() {
    generation += 1;
    for (const event of pending) {
      if (event.timer !== undefined) cancel(event.timer);
      event.controller?.abort();
    }
    pending.clear();
  }

  const current = (event: Pending) => pending.has(event) && event.generation === generation
    && context === event.context && consent && dependencies.allowed();

  async function attempt(event: Pending) {
    if (!current(event)) { pending.delete(event); return; }
    event.attempts += 1;
    const controller = new AbortController();
    event.controller = controller;
    const timeout = schedule(() => controller.abort(), 5000);
    let retry = false;
    try {
      const response = await dependencies.request("/api/journey/events", {
        method: "POST", credentials: "same-origin", cache: "no-store", keepalive: true,
        signal: controller.signal,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(event.payload),
      });
      if (response.ok) {
        const body = await response.json() as { accepted?: boolean; retryable?: boolean };
        retry = body.accepted !== true && body.retryable === true;
      } else retry = response.status === 429 || response.status >= 500;
    } catch {
      retry = true;
    } finally {
      cancel(timeout);
      event.controller = undefined;
    }
    if (!current(event)) { pending.delete(event); return; }
    const delay = retryDelays[event.attempts - 1];
    if (retry && delay !== undefined) event.timer = schedule(() => { event.timer = undefined; void attempt(event); }, delay);
    else pending.delete(event);
  }

  return {
    setContext(next: string | null) {
      if (next === context) return;
      cancelPending();
      consent = false;
      context = next;
    },
    setConsent(enabled: boolean) {
      const allowed = dependencies.allowed();
      if (!enabled || !allowed) {
        consent = false;
        cancelPending();
        return;
      }
      consent = true;
      for (const event of pending) {
        if (!event.waiting) continue;
        if (event.timer !== undefined) cancel(event.timer);
        event.timer = undefined;
        event.waiting = false;
        void attempt(event);
      }
    },
    send(input: WebJourneyEvent) {
      const requestId = journeyRequestId(input.requestId);
      if (!context || !requestId) return false;
      if (input.type === "RESULTS_VIEWED") {
        if (viewed.has(requestId)) return false;
        while (viewed.size >= 256) viewed.delete(viewed.values().next().value!);
        viewed.add(requestId);
      }
      if (!dependencies.allowed() || pending.size >= maximumPendingEvents) return false;
      let eventId: string;
      try { eventId = dependencies.eventId(); } catch { return false; }
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId)) return false;
      const sourcePage = input.sourcePage ? journeySourcePath(input.sourcePage) : undefined;
      const provider = input.provider?.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 100) || undefined;
      const event: Pending = {
        payload: { eventId, type: input.type, requestId, ...(provider ? { provider } : {}), ...(sourcePage ? { sourcePage } : {}) },
        context, generation, attempts: 0, waiting: !consent,
      };
      pending.add(event);
      if (consent) void attempt(event);
      else event.timer = schedule(() => { pending.delete(event); }, confirmationWaitMs);
      return true;
    },
  };
}

export function displayedJourneyRequest(input: {
  response: { searchKey: string; requestId: string | null } | null;
  currentSearchKey: string;
  loading: boolean;
  error: string;
  visibleCount: number;
}) {
  return !input.loading && !input.error && input.visibleCount > 0
    && input.response?.searchKey === input.currentSearchKey ? input.response.requestId : null;
}

type SelectedContext = { requestId: string; actor: string; expiresAt: number };
const selectedContextPrefix = "kurioticket:journey-selection:";
const selectedContextKey = (product: "flight" | "hotel", id: string) => `${selectedContextPrefix}${product}:${id}`;

export function forgetJourneySelections(storage: Pick<Storage, "length" | "key" | "removeItem">) {
  try {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key?.startsWith(selectedContextPrefix)) storage.removeItem(key);
    }
  } catch { /* Unavailable optional storage cannot affect account or consent changes. */ }
}

export function rememberJourneySelection(product: "flight" | "hotel", id: string, requestId: string, actor: string, storage: Pick<Storage, "setItem">, now = Date.now()) {
  try { storage.setItem(selectedContextKey(product, id), JSON.stringify({ requestId, actor, expiresAt: now + 30 * 60_000 })); } catch { /* Optional context must not block navigation. */ }
}

export function readJourneySelection(product: "flight" | "hotel", id: string, actor: string, storage: Pick<Storage, "getItem">, now = Date.now()) {
  try {
    const saved = JSON.parse(storage.getItem(selectedContextKey(product, id)) ?? "null") as SelectedContext | null;
    return saved?.actor === actor && saved.expiresAt > now ? journeyRequestId(saved.requestId) : null;
  } catch { return null; }
}
