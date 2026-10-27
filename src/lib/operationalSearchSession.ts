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
};
export type PreparedOperationalSession = {
  reference: OperationalSessionReference;
  credential: string;
  transport: "web" | "native";
  newCredential: boolean;
};

const tokenId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const signature = /^[A-Za-z0-9_-]{43}$/;

/** Use the server's existing authentication secret, never a public or client secret. */
function secret() {
  const value = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  return value && value.length >= 32 ? value : null;
}
function mac(payload: string, key: string) {
  return createHmac("sha256", key).update("operational-search-v1:" + payload).digest("base64url");
}
function verify(credential: string | null, environment: PublicEnvironment, now: number, key: string): OperationalSessionReference | null {
  if (!credential || credential.length > 250) return null;
  const parts = credential.split(".");
  if (parts.length !== 5 || parts[0] !== "v1" || !tokenId.test(parts[1]) || !/^\\d{10,13}$/.test(parts[2])
      || !["staging", "production"].includes(parts[3]) || !signature.test(parts[4])) return null;
  const timestamp = Number(parts[2]);
  if (!Number.isSafeInteger(timestamp) || timestamp <= now || timestamp > now + operationalSessionTtlSeconds * 1000
      || parts[3] !== environment) return null;
  const payload = parts.slice(0, 4).join(".");
  const expected = Buffer.from(mac(payload, key));
  const received = Buffer.from(parts[4]);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  return { id: parts[1], expiresAt: new Date(timestamp), environment };
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
  const platform = request.headers.get("x-mobile-platform")?.trim().toLowerCase();
  if (platform === "ios" || platform === "android") return "native";
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!isSameOriginRequest(request) || (!origin && fetchSite !== "same-origin")) return null;
  return "web";
}

/** Only invoked after a real user-facing search starts; never on page load. */
export function prepareOperationalSearchSession(
  request: Request, now = Date.now(), environment = getPublicEnvironment(),
): PreparedOperationalSession | null {
  const key = secret();
  const kind = transport(request);
  if (!key || !kind) return null;
  const existing = verify(
    kind === "web" ? readCookie(request) : request.headers.get(operationalSessionHeaderName),
    environment, now, key,
  );
  if (existing) {
    return { reference: existing, credential: kind === "web" ? readCookie(request)! : request.headers.get(operationalSessionHeaderName)!, transport: kind, newCredential: false };
  }
  const reference = { id: randomUUID(), expiresAt: new Date(now + operationalSessionTtlSeconds * 1000), environment };
  const payload = ["v1", reference.id, String(reference.expiresAt.getTime()), environment].join(".");
  return { reference, credential: payload + "." + mac(payload, key), transport: kind, newCredential: true };
}
export function readOperationalSearchSession(request: Request, now = Date.now(), environment = getPublicEnvironment()): OperationalSessionReference | null {
  const key = secret();
  const kind = transport(request);
  if (!key || !kind) return null;
  return verify(kind === "web" ? readCookie(request) : request.headers.get(operationalSessionHeaderName), environment, now, key);
}

/** Add only a search-scoped credential to a search response; do not alter provider requests. */
export function attachOperationalSearchSession<T extends Response>(response: T, prepared: PreparedOperationalSession | null): T {
  if (!prepared?.newCredential) return response;
  if (prepared.transport === "native") response.headers.set("X-Kt-Search-Session", prepared.credential);
  else {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.headers.append("Set-Cookie",
      operationalSessionCookieName + "=" + prepared.credential + "; Path=/; Max-Age=" + operationalSessionTtlSeconds + "; HttpOnly; SameSite=Lax" + secure);
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.append("Vary", prepared.transport === "native" ? "X-Kt-Search-Session" : "Cookie");
  return response;
}
