import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { PublicEnvironment } from "@/lib/stagingSafety";

export const presenceCookieName = "kt_online_presence";
export const presenceTokenHeader = "x-kt-presence-session";
export const presenceCredentialTtlSeconds = 30 * 60;
const renewBeforeMs = 5 * 60_000;
const ttlMs = presenceCredentialTtlSeconds * 1000;

export type PresenceTransport = "web" | "native";
type CredentialContext = {
  environment: PublicEnvironment;
  transport: PresenceTransport;
  now: number;
  secret: string;
};

export function presenceSigningSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  return secret && secret.length >= 32 ? secret : undefined;
}

export function isWebsiteOnlinePresenceEnabled() {
  return process.env.ONLINE_PRESENCE_WEB_ENABLED === "true";
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update("online-presence-v1:" + payload).digest("base64url");
}

export function equalPresenceSignatures(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyPresenceCredential(token: string | null, context: CredentialContext) {
  if (!token || token.length > 150) return null;
  const match = /^v1\.([a-f\d-]{36})\.(\d{13})\.(staging|production)\.(web|native)\.([\w-]{43})$/.exec(token);
  if (!match) return null;
  const [, id, expiry, environment, transport, mac] = match;
  const expiresAt = Number(expiry);
  if (environment !== context.environment || transport !== context.transport
      || expiresAt <= context.now || expiresAt > context.now + ttlMs) return null;
  const payload = token.slice(0, token.lastIndexOf("."));
  if (!equalPresenceSignatures(mac, signature(payload, context.secret))) return null;
  return { id, expiresAt };
}

export function renewPresenceCredential(token: string | null, context: CredentialContext) {
  const current = verifyPresenceCredential(token, context);
  const id = current?.id ?? randomUUID();
  const sourceId = createHash("sha256").update(id).digest("hex");
  if (current && current.expiresAt - context.now > renewBeforeMs) {
    return { sourceId, token: token!, renewed: false, newSource: false };
  }

  const payload = ["v1", id, context.now + ttlMs, context.environment, context.transport].join(".");
  return { sourceId, token: payload + "." + signature(payload, context.secret), renewed: true, newSource: !current };
}
