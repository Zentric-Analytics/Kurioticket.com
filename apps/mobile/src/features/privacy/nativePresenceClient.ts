import type { StoredSession } from "../../storage/sessionStorage";

const heartbeatIntervalMs = 30_000;
const requestTimeoutMs = 8_000;
const missingEndpointBackoffMs = 5 * 60_000;
const credentialHeader = "x-kt-presence-session";

type PresenceSession = Pick<StoredSession, "token" | "expires" | "recovery"> | null;
export type ExistingGuestPresenceCredentials = {
  visitorToken?: string | null;
  operationalSearchCredential?: string | null;
};
const visitorTokenPattern = /^[A-Za-z0-9_-]{43}$/;
const nativeSearchCredentialPattern = /^v2\.[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(\d{10,13})\.staging\.(ios|android)\.[A-Za-z0-9_-]{43}$/;

function retryTime(response: Response, now: number) {
  if (response.status === 404 || response.status === 405) return now + missingEndpointBackoffMs;
  if (response.status !== 429 && response.status !== 503) return 0;
  const header = response.headers.get("retry-after");
  if (!header) return 0;
  const time = /^\d+$/.test(header) ? now + Number(header) * 1000 : Date.parse(header);
  return Number.isSafeInteger(time) && time > now ? time : 0;
}

export function createNativePresenceClient(
  baseUrl: string, platform: "ios" | "android", fetcher = fetch,
  readGuestCredentials?: () => ExistingGuestPresenceCredentials,
) {
  const guestActivityEnabled = baseUrl === "https://staging.kurioticket.com";
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

  function guestHeaders(bearer: string | null): Record<string, string> {
    // Reuse existing credentials only. In particular, an expired stored account
    // is not an explicit guest context, and production receives no new headers.
    if (!guestActivityEnabled || bearer !== null || session !== null || !readGuestCredentials) return {};
    try {
      const existing = readGuestCredentials();
      const headers: Record<string, string> = {};
      if (typeof existing.visitorToken === "string" && visitorTokenPattern.test(existing.visitorToken)) {
        headers["x-kt-visitor"] = existing.visitorToken;
      }
      const credential = existing.operationalSearchCredential;
      const match = typeof credential === "string" ? nativeSearchCredentialPattern.exec(credential) : null;
      const expiresAt = match ? Number(match[1]) : 0;
      const now = Date.now();
      if (match && match[2] === platform && Number.isSafeInteger(expiresAt)
          && expiresAt > now && expiresAt <= now + 30 * 60_000) {
        headers["x-kt-search-session"] = credential!;
      }
      return headers;
    } catch {
      // Optional history context must never suppress otherwise valid presence.
      return {};
    }
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
        ...guestHeaders(bearer),
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
    refreshGuestCredentials() {
      if (!guestActivityEnabled || !readGuestCredentials || session !== null) return;
      nextHeartbeatAt = Date.now();
      // Let all account/consent listeners finish before reading their current
      // state. An in-flight heartbeat finishes before this prompt update runs.
      queueMicrotask(schedule);
    },
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
