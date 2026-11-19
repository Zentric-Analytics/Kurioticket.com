import { onlinePresenceHeartbeatMs as heartbeatMs } from "./onlinePresence";

const presenceTokenHeader = "x-kt-presence-session";

const requestTimeoutMs = 8_000;
const channelName = "kurioticket:online-presence";

type Browser = Pick<Window, "navigator" | "document" | "addEventListener" | "removeEventListener" | "setTimeout" | "clearTimeout" | "fetch"> & {
  BroadcastChannel?: typeof BroadcastChannel;
};

type TabUpdate = { acceptedAt: number; retryAt: number; pendingUntil?: number; credential?: string };

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
  // Memory-only credential shared among active same-origin tabs. Never persisted.
  let credential: string | null = null;
  let acceptedAt = 0;
  let serverRetryAt = 0;
  let pendingUntil = 0;
  let attemptedAt = 0;
  let retryOnWake = false;
  let identity: string | null = null;
  let previousIdentity: string | null = null;
  let identityChanged = false;
  let suspended = false;
  let disposed = false;
  let running = false;
  let timer: number | undefined;
  let request: AbortController | undefined;

  function eligible() {
    return !disposed && !suspended && identity !== null
      && browser.document.visibilityState === "visible" && browser.navigator.onLine !== false;
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
    if (running || !eligible()) return;
    const deadline = nextAttempt();
    timer = browser.setTimeout(() => { void send(); }, Math.max(0, deadline - now));
  }

  function publish(update: TabUpdate) {
    if (!disposed) channel?.postMessage({ ...update, ...(credential ? { credential } : {}) });
  }

  function rememberCredential(response: Response) {
    const supplied = response.headers.get(presenceTokenHeader);
    if (!supplied || supplied.length > 150 || !/^v1\.[\w.-]+$/.test(supplied)) return;
    credential = supplied;
  }

  async function post() {
    const now = Date.now();
    if (!eligible() || nextAttempt() > now) return;
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
        ...(credential ? { headers: { [presenceTokenHeader]: credential } } : {}),
      });
      let response = await heartbeat();
      if (response.status === 202) rememberCredential(response);
      if (response.status === 202) {
        // Bootstrap only issues the in-memory credential. Count presence after the browser returns it.
        if (controller.signal.aborted || !eligible()) return;
        response = await heartbeat();
        if (response.status === 202) rememberCredential(response);
        if (response.status === 202) {
          serverRetryAt = Math.max(serverRetryAt, Date.now() + 2 * heartbeatMs);
          return;
        }
      }
      if (response.status === 204) {
        rememberCredential(response);
        acceptedAt = Math.max(acceptedAt, now);
      }
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
    if (running || !eligible()) return;
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
        if (acceptedAt || serverRetryAt || heldUntil || credential) {
          publish({ acceptedAt, retryAt: serverRetryAt, pendingUntil: heldUntil });
        }
        return;
      }
      if (!event.data || typeof event.data !== "object") return;
      if (typeof event.data.credential === "string" && event.data.credential.length <= 150 && /^v1\.[\w.-]+$/.test(event.data.credential)) {
        credential = event.data.credential;
      }
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

  function onPause() {
    request?.abort();
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
    onPause();
  }

  function onPageShow() {
    suspended = false;
    onWake();
  }

  function onVisibilityChange() {
    if (browser.document.visibilityState === "visible") onWake();
    else onPause();
  }

  browser.addEventListener("focus", onWake);
  browser.addEventListener("online", onWake);
  browser.addEventListener("offline", onPause);
  browser.addEventListener("pagehide", onPageHide);
  browser.addEventListener("pageshow", onPageShow);
  browser.document.addEventListener("visibilitychange", onVisibilityChange);

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
      browser.removeEventListener("focus", onWake);
      browser.removeEventListener("online", onWake);
      browser.removeEventListener("offline", onPause);
      browser.removeEventListener("pagehide", onPageHide);
      browser.removeEventListener("pageshow", onPageShow);
      browser.document.removeEventListener("visibilitychange", onVisibilityChange);
    },
  };
}
