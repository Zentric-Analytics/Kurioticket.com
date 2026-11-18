const heartbeatMs = 30_000;
const requestTimeoutMs = 8_000;
const channelName = "kurioticket:online-presence";
const interactionEvents = ["pointerdown", "keydown", "wheel"] as const;

type Browser = Pick<Window, "navigator" | "document" | "addEventListener" | "removeEventListener" | "setTimeout" | "clearTimeout" | "fetch"> & {
  BroadcastChannel?: typeof BroadcastChannel;
};

type TabUpdate = { acceptedAt: number; retryAt: number; pendingUntil?: number };

function retryAfter(value: string | null, now: number) {
  if (!value) return 0;
  const deadline = /^\d+$/.test(value) ? now + Number(value) * 1000 : Date.parse(value);
  return Number.isFinite(deadline) ? Math.max(0, deadline) : 0;
}

function openChannel(browser: Browser) {
  try {
    return browser.BroadcastChannel ? new browser.BroadcastChannel(channelName) : null;
  } catch {
    return null;
  }
}

export function startWebsiteOnlinePresence(browser: Browser) {
  if (browser.navigator.webdriver === true) {
    return { setIdentity() {}, dispose() {} };
  }

  let locks: LockManager | undefined = browser.navigator.locks;
  const channel = openChannel(browser);
  const fallbackJitter = Math.floor(80 + Math.random() * 220);
  let lockAvailableAt = locks ? 0 : Date.now() + fallbackJitter;
  let acceptedAt = 0;
  let serverRetryAt = 0;
  let pendingUntil = 0;
  let attemptedAt = 0;
  let interactedAt: number | null = null;
  let retryOnWake = false;
  let identity: string | null = null;
  let previousIdentity: string | null = null;
  let identityChanged = false;
  let suspended = false;
  let disposed = false;
  let running = false;
  let timer: number | undefined;
  let request: AbortController | undefined;

  function eligible(now: number) {
    return !disposed && !suspended && identity !== null
      && browser.document.visibilityState === "visible" && browser.navigator.onLine !== false
      && interactedAt !== null && now - interactedAt < heartbeatMs;
  }

  function nextAttempt() {
    const sharedCadence = acceptedAt === 0 ? 0 : acceptedAt + heartbeatMs + (locks ? 0 : fallbackJitter);
    const localCadence = attemptedAt === 0 ? 0 : attemptedAt + heartbeatMs;
    return Math.max(lockAvailableAt, serverRetryAt, pendingUntil, identityChanged ? 0 : Math.max(sharedCadence, localCadence));
  }

  function schedule() {
    browser.clearTimeout(timer);
    timer = undefined;
    const now = Date.now();
    if (running || !eligible(now)) return;
    const deadline = nextAttempt();
    if (interactedAt !== null && deadline < interactedAt + heartbeatMs) {
      timer = browser.setTimeout(() => { void send(); }, Math.max(0, deadline - now));
    }
  }

  function publish(update: TabUpdate) {
    if (!disposed) channel?.postMessage(update);
  }

  async function post() {
    const now = Date.now();
    if (!eligible(now) || nextAttempt() > now) return;
    identityChanged = false;
    attemptedAt = now;
    retryOnWake = false;
    if (!locks) publish({ acceptedAt, retryAt: serverRetryAt, pendingUntil: now + requestTimeoutMs });
    const controller = new AbortController();
    request = controller;
    const timeout = browser.setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const heartbeat = () => browser.fetch("/api/identity/online-presence", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        referrerPolicy: "origin",
        signal: controller.signal,
      });
      let response = await heartbeat();
      if (response.status === 202) {
        // Bootstrap only provisions the cookie. Count presence after the browser sends it back.
        if (controller.signal.aborted || !eligible(Date.now())) return;
        response = await heartbeat();
        if (response.status === 202) {
          serverRetryAt = Math.max(serverRetryAt, Date.now() + 2 * heartbeatMs);
          return;
        }
      }
      if (response.status === 204) acceptedAt = Math.max(acceptedAt, now);
      if (response.status === 429 || response.status === 503) {
        const retryAt = retryAfter(response.headers.get("Retry-After"), Date.now());
        if (retryAt > Date.now()) {
          serverRetryAt = Math.max(serverRetryAt, retryAt);
          // An explicit Retry-After sets the cadence for this attempt.
          attemptedAt = 0;
        }
      }
      retryOnWake = response.status >= 500;
    } catch {
      retryOnWake = true;
    } finally {
      browser.clearTimeout(timeout);
      request = undefined;
      publish({ acceptedAt, retryAt: serverRetryAt, pendingUntil: locks ? undefined : 0 });
    }
  }

  async function send() {
    if (running || !eligible(Date.now())) return;
    running = true;
    try {
      if (locks) {
        await locks.request(channelName, { ifAvailable: true }, async (lock) => {
          if (lock) await post();
          else lockAvailableAt = Date.now() + 2_000;
        });
      } else {
        await post();
      }
    } catch {
      // A browser may expose Web Locks but deny access in a restricted context.
      locks = undefined;
      lockAvailableAt = Date.now() + fallbackJitter;
    } finally {
      running = false;
      schedule();
    }
  }

  if (channel) {
    channel.onmessage = (event: MessageEvent<TabUpdate | "sync">) => {
      if (event.data === "sync") {
        const heldUntil = !locks && request ? attemptedAt + requestTimeoutMs : undefined;
        if (acceptedAt || serverRetryAt || heldUntil) {
          publish({ acceptedAt, retryAt: serverRetryAt, pendingUntil: heldUntil });
        }
        return;
      }
      if (!event.data || typeof event.data !== "object") return;
      if (Number.isFinite(event.data.acceptedAt) && event.data.acceptedAt <= Date.now()) {
        acceptedAt = Math.max(acceptedAt, event.data.acceptedAt);
      }
      if (Number.isFinite(event.data.retryAt)) serverRetryAt = Math.max(serverRetryAt, event.data.retryAt);
      if (typeof event.data.pendingUntil === "number" && Number.isFinite(event.data.pendingUntil)) {
        pendingUntil = Math.min(event.data.pendingUntil, Date.now() + requestTimeoutMs);
      }
      schedule();
    };
    channel.postMessage("sync");
  }

  function onInteraction(event: Event) {
    if (!event.isTrusted || browser.document.visibilityState !== "visible") return;
    interactedAt = Date.now();
    schedule();
  }

  function onWake() {
    if (retryOnWake) {
      attemptedAt = 0;
      retryOnWake = false;
    }
    schedule();
  }

  function onPageHide() {
    suspended = true;
    schedule();
  }

  function onPageShow() {
    suspended = false;
    onWake();
  }

  for (const event of interactionEvents) browser.addEventListener(event, onInteraction, { passive: true });
  browser.addEventListener("focus", onWake);
  browser.addEventListener("online", onWake);
  browser.addEventListener("offline", schedule);
  browser.addEventListener("pagehide", onPageHide);
  browser.addEventListener("pageshow", onPageShow);
  browser.document.addEventListener("visibilitychange", onWake);

  return {
    setIdentity(next: string | null) {
      identity = next;
      if (next !== null) {
        if (previousIdentity !== null && previousIdentity !== next) identityChanged = true;
        previousIdentity = next;
      }
      schedule();
    },
    dispose() {
      disposed = true;
      browser.clearTimeout(timer);
      request?.abort();
      channel?.close();
      for (const event of interactionEvents) browser.removeEventListener(event, onInteraction);
      browser.removeEventListener("focus", onWake);
      browser.removeEventListener("online", onWake);
      browser.removeEventListener("offline", schedule);
      browser.removeEventListener("pagehide", onPageHide);
      browser.removeEventListener("pageshow", onPageShow);
      browser.document.removeEventListener("visibilitychange", onWake);
    },
  };
}
