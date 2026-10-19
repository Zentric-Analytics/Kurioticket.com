import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";

import type { CanonicalLocation, LocationProviderBinding, TravelProduct } from "./types";

const TTL_MS = 15 * 60_000;
const TOKEN_VERSION = "v2";
const LEGACY_TOKEN_VERSION = "v1";
const TOKEN_MAX_LENGTH = 200;
type Payload = { id: string; product: TravelProduct; exp: number; bindings: LocationProviderBinding[] };

export class LocationSelectionSizeError extends Error {
  constructor() {
    super("Location selection exceeds the supported token size");
    this.name = "LocationSelectionSizeError";
  }
}

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
  const version = payload.product === "hotels" ? TOKEN_VERSION : LEGACY_TOKEN_VERSION;
  const fields = [
    payload.product,
    payload.exp,
    // `kind` is display metadata and is not needed to resolve a provider value.
    // Keeping it out of the token leaves room for long airport and landmark IDs.
    payload.bindings.map(({ provider, value, verification, provenance }) => [provider, value, verification, provenance]),
  ];
  // Hotel IDs already travel with the selection. Authenticate that exact ID as
  // additional data instead of repeating a long destination label in the token.
  const compact = JSON.stringify(version === TOKEN_VERSION ? fields : [payload.id, ...fields]);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(version === TOKEN_VERSION ? JSON.stringify([version, payload.id]) : version));
  const encrypted = Buffer.concat([cipher.update(deflateRawSync(Buffer.from(compact))), cipher.final()]);
  const token = `${version}.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
  if (token.length > TOKEN_MAX_LENGTH) throw new LocationSelectionSizeError();
  return token;
}

function decodePayload(token: string, selectedId: string): Payload | null {
  try {
    if (typeof selectedId !== "string" || selectedId.length < 1 || selectedId.length > 160) return null;
    if (token.length > TOKEN_MAX_LENGTH) return null;
    const [version, ivText, tagText, encryptedText, extra] = token.split(".");
    if ((version !== TOKEN_VERSION && version !== LEGACY_TOKEN_VERSION) || !ivText || !tagText || !encryptedText || extra !== undefined) return null;
    const iv = Buffer.from(ivText, "base64url");
    const tag = Buffer.from(tagText, "base64url");
    const encrypted = Buffer.from(encryptedText, "base64url");
    if (iv.length !== 12 || tag.length !== 16 || encrypted.length < 1) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAAD(Buffer.from(version === TOKEN_VERSION ? JSON.stringify([version, selectedId]) : version));
    decipher.setAuthTag(tag);
    const compressed = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    if (compressed.length > 16_384) return null;
    const decoded = JSON.parse(inflateRawSync(compressed, { maxOutputLength: 16_384 }).toString("utf8")) as unknown;
    if (!Array.isArray(decoded) || decoded.length !== (version === TOKEN_VERSION ? 3 : 4)) return null;
    const [id, product, exp, rawBindings] = version === TOKEN_VERSION ? [selectedId, ...decoded] : decoded;
    if (typeof id !== "string" || id.length < 1 || id.length > 160) return null;
    if (product !== "flights" && product !== "hotels" && product !== "cars" && product !== "packages") return null;
    if (typeof exp !== "number" || !Number.isSafeInteger(exp) || !Array.isArray(rawBindings) || rawBindings.length > 12) return null;
    const bindings: LocationProviderBinding[] = [];
    for (const raw of rawBindings) {
      if (!Array.isArray(raw) || (raw.length !== 4 && raw.length !== 5)) return null;
      // Accept the original five-field payload while issuing the compact form.
      const [provider, value, kind, verification, provenance] = raw.length === 4
        ? [raw[0], raw[1], "", raw[2], raw[3]]
        : raw;
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
  const payload = decodePayload(input.selectionToken, input.id);
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
