import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";

import type { CanonicalLocation, LocationProviderBinding, TravelProduct } from "./types";

const TTL_MS = 15 * 60_000;
const TOKEN_VERSION = "v1";
const TOKEN_MAX_LENGTH = 200;
type Payload = { id: string; product: TravelProduct; exp: number; bindings: LocationProviderBinding[] };

function secret() {
  const value = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  // Tests and local development need deterministic configuration without requiring a secret file.
  if (!value && process.env.NODE_ENV !== "production") return "kurioticket-local-location-selection-key-only";
  if (!value) throw new Error("Location selection authority is not configured");
  return value;
}

function key() {
  return createHash("sha256").update("kurioticket:location-selection:v1:").update(secret()).digest();
}

function encodePayload(payload: Payload) {
  const compact = JSON.stringify([
    payload.id,
    payload.product,
    payload.exp,
    payload.bindings.map(({ provider, value, kind, verification, provenance }) => [provider, value, kind ?? "", verification, provenance]),
  ]);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(TOKEN_VERSION));
  const encrypted = Buffer.concat([cipher.update(deflateRawSync(Buffer.from(compact))), cipher.final()]);
  const token = `${TOKEN_VERSION}.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
  if (token.length > TOKEN_MAX_LENGTH) throw new Error("Location selection exceeds the supported token size");
  return token;
}

function decodePayload(token: string): Payload | null {
  try {
    if (token.length > TOKEN_MAX_LENGTH) return null;
    const [version, ivText, tagText, encryptedText, extra] = token.split(".");
    if (version !== TOKEN_VERSION || !ivText || !tagText || !encryptedText || extra !== undefined) return null;
    const iv = Buffer.from(ivText, "base64url");
    const tag = Buffer.from(tagText, "base64url");
    const encrypted = Buffer.from(encryptedText, "base64url");
    if (iv.length !== 12 || tag.length !== 16 || encrypted.length < 1) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAAD(Buffer.from(TOKEN_VERSION));
    decipher.setAuthTag(tag);
    const compressed = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    if (compressed.length > 16_384) return null;
    const decoded = JSON.parse(inflateRawSync(compressed, { maxOutputLength: 16_384 }).toString("utf8")) as unknown;
    if (!Array.isArray(decoded) || decoded.length !== 4) return null;
    const [id, product, exp, rawBindings] = decoded;
    if (typeof id !== "string" || id.length < 1 || id.length > 160) return null;
    if (product !== "flights" && product !== "hotels" && product !== "cars" && product !== "packages") return null;
    if (typeof exp !== "number" || !Number.isSafeInteger(exp) || !Array.isArray(rawBindings) || rawBindings.length > 12) return null;
    const bindings: LocationProviderBinding[] = [];
    for (const raw of rawBindings) {
      if (!Array.isArray(raw) || raw.length !== 5) return null;
      const [provider, value, kind, verification, provenance] = raw;
      if (typeof provider !== "string" || provider.length < 1 || provider.length > 40) return null;
      if (typeof value !== "string" || value.length < 1 || value.length > 180) return null;
      if (typeof kind !== "string" || kind.length > 40) return null;
      if (verification !== "verified" && verification !== "unverified") return null;
      if (provenance !== "provider-discovery" && provenance !== "catalogue" && provenance !== "operator") return null;
      bindings.push({ provider, value, kind: kind || undefined, verification, provenance });
    }
    return { id, product, exp, bindings };
  } catch {
    return null;
  }
}

/** Issues an opaque, short-lived, portable server-authenticated resolution handle. */
export function issueLocationSelection(location: CanonicalLocation, product: TravelProduct, now = Date.now()) {
  return encodePayload({
    id: location.id,
    product,
    exp: now + TTL_MS,
    bindings: (location.providerBindings ?? []).slice(0, 12),
  });
}

export type SelectionFailure = "LOCATION_RESOLUTION_FAILED" | "UNSUPPORTED_LOCATION";
export function resolveProviderSelection(input: { id: string; selectionToken?: string }, product: TravelProduct, provider: string, now = Date.now()): { ok: true; value: string } | { ok: false; reason: SelectionFailure } {
  if (!input.selectionToken) return { ok: false, reason: "LOCATION_RESOLUTION_FAILED" };
  const payload = decodePayload(input.selectionToken);
  if (!payload || payload.exp <= now || payload.id !== input.id || payload.product !== product) {
    return { ok: false, reason: "LOCATION_RESOLUTION_FAILED" };
  }
  const matches = payload.bindings.filter((binding) => binding.provider.toLowerCase() === provider.toLowerCase() && binding.verification === "verified");
  return matches.length === 1 ? { ok: true, value: matches[0].value } : { ok: false, reason: "UNSUPPORTED_LOCATION" };
}

export function publicLocationSelection(location: CanonicalLocation, product: TravelProduct) {
  const publicLocation = { ...location };
  delete publicLocation.providerBindings;
  delete publicLocation.providerIds;
  return { ...publicLocation, providerBindings: [], selectionToken: issueLocationSelection(location, product) };
}
