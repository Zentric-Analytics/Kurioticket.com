import type { StoredSession } from "../../storage/sessionStorage";

const heartbeatIntervalMs = 30_000;
const requestTimeoutMs = 8_000;
const missingEndpointBackoffMs = 5 * 60_000;
const credentialHeader = "x-kt-presence-session";

type PresenceSession = Pick<StoredSession, "token" | "expires" | "recovery"> | null;

function retryTime(response: Response, now: number) {
  if (response.status === 404 || response.status === 405) return now + missingEndpointBackoffMs;
  if (response.status !== 429 && response.status !== 503) return 0;
  const header = response.headers.get("retry-after");
  if (!header) return 0;
  const time = /^\d+$/.test(header) ? now + Number(header) * 1000 : Date.parse(header);
  return Number.isSafeInteger(time) && time > now ? time : 0;
}

export function createNativePresenceClient(baseUrl: string, platform: "ios" | "android", fetcher = fetch) {
  let foreground = false;
  let stopped = false;
  let nextHeartbeatAt = 0;
  let retryAt = 0;
  let session: PresenceSession | undefined;
  let credential: string | null = null;
  let rejectedBearer: string | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: AbortController | undefined;

  function activeBearer() {
    if (session === undefined || session?.recovery) return undefined;
    if (session && Date.parse(session.expires) > Date.now()) return session.token;
    return null;
  }

  function postHeartbeat(bearer: string | null, signal: AbortSignal) {
    return fetcher(`${baseUrl}/api/mobile/v1/presence`, {
      method: "POST",
      credentials: "omit",
      signal,
      headers: {
        "x-mobile-platform": platform,
        ...(credential ? { [credentialHeader]: credential } : {}),
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
    });
  }

  function acceptCredential(response: Response) {
    if (response.status !== 202 && response.status !== 204) return false;
    const issued = response.headers.get(credentialHeader);
    if (!issued || issued.length > 512) return false;
    credential = issued;
    return true;
  }

  async function send(bearer: string | null, controller: AbortController) {
    const { signal } = controller;
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      let response = await postHeartbeat(bearer, signal);
      if (stopped || signal.aborted) return;
      if (acceptCredential(response) && response.status === 202) {
        const now = Date.now();
        const currentBearer = activeBearer();
        if (!foreground || currentBearer === undefined || currentBearer === rejectedBearer) return;
        bearer = currentBearer;
        nextHeartbeatAt = now + heartbeatIntervalMs;
        response = await postHeartbeat(bearer, signal);
        if (stopped || signal.aborted) return;
        acceptCredential(response);
      }
      if (response.status === 401 && bearer) rejectedBearer = bearer;
      retryAt = retryTime(response, Date.now());
    } catch {
      // Presence is optional to app operation. The next heartbeat retries.
    } finally {
      clearTimeout(timeout);
      pending = undefined;
      schedule();
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = undefined;
    if (stopped || !foreground || pending) return;
    const bearer = activeBearer();
    if (bearer === undefined || bearer === rejectedBearer) return;

    const now = Date.now();
    const due = Math.max(now, nextHeartbeatAt, retryAt);
    if (due > now) {
      timer = setTimeout(schedule, due - now);
      return;
    }

    pending = new AbortController();
    nextHeartbeatAt = now + heartbeatIntervalMs;
    void send(bearer, pending);
  }

  return {
    setSession(next: PresenceSession) {
      const previous = activeBearer();
      session = next;
      if (activeBearer() !== previous) nextHeartbeatAt = Date.now();
      // A heartbeat already in flight can return the credential needed to move
      // the same presence session from guest to account (or back on logout).
      schedule();
    },
    setForeground(active: boolean) {
      if (foreground === active) return;
      foreground = active;
      schedule();
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
      pending?.abort();
    },
  };
}
