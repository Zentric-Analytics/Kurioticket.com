import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { isSameOriginRequest } from "@/lib/visitor-identity";
import { getPublicEnvironment, type PublicEnvironment } from "@/lib/stagingSafety";

export const operationalSessionCookieName = "kt_search_session";
export const operationalSessionHeaderName = "x-kt-search-session";
export const operationalSessionTtlSeconds = 30 * 60;

export type OperationalSessionReference = {
  id: string;
  expiresAt: Date;
  environment: PublicEnvironment;
  /** Signed native transport declaration, not device attestation or account identity. */
  nativePlatform?: "ios" | "android";
};
export type PreparedOperationalSession = {
  reference: OperationalSessionReference;
  credential: string;
  transport: "web" | "native";
  newCredential: boolean;
  /** Only server-admitted, non-browser native searches may use this for guest operational attribution. */
  guestNativeAttribution?: boolean;
};

const tokenId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const signature = /^[A-Za-z0-9_-]{43}$/;

/** Use the server's existing authentication secret, never a public or client secret. */
function secret() {
  const value = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  return value && value.length >= 32 ? value : null;
}
function mac(payload: string, key: string, version: "v1" | "v2" = "v1") {
  return createHmac("sha256", key).update("operational-search-" + version + ":" + payload).digest("base64url");
}
function nativePlatform(request: Request): "ios" | "android" | null {
  const declared = request.headers.get("x-mobile-platform");
  return declared === "ios" || declared === "android" ? declared : null;
}
function verify(credential: string | null, environment: PublicEnvironment, now: number, key: string): OperationalSessionReference | null {
  if (!credential || credential.length > 250) return null;
  const parts = credential.split(".");
  const version = parts[0];
  if ((version !== "v1" && version !== "v2") || parts.length !== (version === "v1" ? 5 : 6)
      || !tokenId.test(parts[1]) || !/^\d{10,13}$/.test(parts[2])
      || !["staging", "production"].includes(parts[3]) || !signature.test(parts[parts.length - 1])) return null;
  const platform = version === "v2" ? parts[4] : null;
  if (version === "v2" && platform !== "ios" && platform !== "android") return null;
  const timestamp = Number(parts[2]);
  if (!Number.isSafeInteger(timestamp) || timestamp <= now || timestamp > now + operationalSessionTtlSeconds * 1000
      || parts[3] !== environment) return null;
  const payload = parts.slice(0, -1).join(".");
  const expected = Buffer.from(mac(payload, key, version));
  const received = Buffer.from(parts[parts.length - 1]);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  return { id: parts[1], expiresAt: new Date(timestamp), environment,
    ...(platform === "ios" || platform === "android" ? { nativePlatform: platform } : {}) };
}
function readCookie(request: Request) {
  const cookies = request.headers.get("cookie") || "";
  for (const entry of cookies.split(";")) {
    const split = entry.indexOf("=");
    if (split >= 0 && entry.slice(0, split).trim() === operationalSessionCookieName)
      return entry.slice(split + 1).trim();
  }
  return null;
}
/** Do not issue an operational session to cron, server-side requests or cross-site callers. */
function transport(request: Request): "web" | "native" | null {
  const platform = nativePlatform(request);
  if (platform) {
    // Browser scripts can spoof the mobile platform header. Never expose the
    // operational credential in a readable header to browser requests.
    if (request.headers.has("cookie") || request.headers.has("origin") || request.headers.has("sec-fetch-site")
        || request.headers.has("sec-fetch-mode") || request.headers.has("sec-fetch-dest")) return null;
    return "native";
  }
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!isSameOriginRequest(request) || (!origin && fetchSite !== "same-origin")) return null;
  return "web";
}

/** Only invoked after a real user-facing search starts; never on page load.
 * Existing installed bundles only understand v1. They retain exact v1 continuity;
 * v2 is negotiated only by clients that can read and return the new credential. */
export function prepareOperationalSearchSession(
  request: Request, now = Date.now(), environment = getPublicEnvironment(),
): PreparedOperationalSession | null {
  const key = secret();
  const kind = transport(request);
  if (!key || !kind) return null;
  const platform = kind === "native" ? nativePlatform(request) : null;
  const supportsV2 = kind === "native" && request.headers.get("x-kt-search-protocol") === "v2";
  const supplied = kind === "web" ? readCookie(request) : request.headers.get(operationalSessionHeaderName);
  const existing = verify(supplied, environment, now, key);
  // A previously signed platform cannot silently be reassigned to another OS.
  if (kind === "native" && existing?.nativePlatform && existing.nativePlatform !== platform) return null;
  if (existing && (kind === "web" ? !existing.nativePlatform : existing.nativePlatform === platform || !supportsV2)) {
    return { reference: existing, credential: supplied!, transport: kind, newCredential: false,
      guestNativeAttribution: kind === "native" && Boolean(existing.nativePlatform) };
  }
  // A native v1 credential is still valid continuity for legacy clients, but
  // does not establish an OS. Only v2-capable clients receive OS-bound v2.
  // An invalid supplied credential may be replaced to recover client state,
  // but it never earns guest source attribution on that request.
  const version = supportsV2 ? "v2" : "v1";
  const reference: OperationalSessionReference = {
    id: existing?.id ?? randomUUID(), expiresAt: new Date(now + operationalSessionTtlSeconds * 1000), environment,
    ...(version === "v2" && platform ? { nativePlatform: platform } : {}),
  };
  const payload = [version, reference.id, String(reference.expiresAt.getTime()), environment,
    ...(version === "v2" && platform ? [platform] : [])].join(".");
  return { reference, credential: payload + "." + mac(payload, key, version), transport: kind,
    newCredential: true, guestNativeAttribution: version === "v2" && !supplied || version === "v2" && Boolean(existing) };
}
export function readOperationalSearchSession(request: Request, now = Date.now(), environment = getPublicEnvironment()): OperationalSessionReference | null {
  const key = secret();
  const kind = transport(request);
  if (!key || !kind) return null;
  const reference = verify(kind === "web" ? readCookie(request) : request.headers.get(operationalSessionHeaderName), environment, now, key);
  if (kind === "web") return reference && !reference.nativePlatform ? reference : null;
  // Native v1 is valid *session continuity* for older installed app bundles,
  // not a verified iOS/Android source. A v2 platform must match the request.
  return reference && (!reference.nativePlatform || reference.nativePlatform === nativePlatform(request)) ? reference : null;
}

/** Add only a search-scoped credential to a search response; do not alter provider requests. */
export function attachOperationalSearchSession<T extends Response>(response: T, prepared: PreparedOperationalSession | null): T {
  if (!prepared?.newCredential) return response;
  if (prepared.transport === "native") response.headers.set("X-Kt-Search-Session", prepared.credential);
  else {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.headers.append("Set-Cookie",
      operationalSessionCookieName + "=" + prepared.credential + "; Path=/api; Max-Age=" + operationalSessionTtlSeconds + "; HttpOnly; SameSite=Lax" + secure);
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.append("Vary", prepared.transport === "native" ? "X-Kt-Search-Session" : "Cookie");
  return response;
}
