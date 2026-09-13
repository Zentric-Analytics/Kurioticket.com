import type { CanonicalLocation, LocationProviderBinding, TravelProduct } from "./types";

const TTL_MS = 15 * 60_000;
type Entry = { canonicalId: string; product: TravelProduct; expiresAt: number; bindings: readonly LocationProviderBinding[] };
const cache = new Map<string, Entry>();

const clean = (now: number) => {
  if (cache.size < 1_000) return;
  for (const [token, entry] of cache) if (entry.expiresAt <= now) cache.delete(token);
};

/** Issues an opaque, short-lived, server-held resolution handle. */
export function issueLocationSelection(location: CanonicalLocation, product: TravelProduct, now = Date.now()) {
  clean(now);
  const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  cache.set(token, { canonicalId: location.id, product, expiresAt: now + TTL_MS, bindings: location.providerBindings ?? [] });
  return token;
}

export type SelectionFailure = "LOCATION_RESOLUTION_FAILED" | "UNSUPPORTED_LOCATION";
export function resolveProviderSelection(input: { id: string; selectionToken?: string }, product: TravelProduct, provider: string, now = Date.now()): { ok: true; value: string } | { ok: false; reason: SelectionFailure } {
  if (!input.selectionToken) return { ok: false, reason: "LOCATION_RESOLUTION_FAILED" };
  const entry = cache.get(input.selectionToken);
  if (!entry || entry.expiresAt <= now || entry.canonicalId !== input.id || entry.product !== product) {
    if (entry) cache.delete(input.selectionToken);
    return { ok: false, reason: "LOCATION_RESOLUTION_FAILED" };
  }
  const matches = entry.bindings.filter((binding) => binding.provider.toLowerCase() === provider.toLowerCase() && binding.verification === "verified");
  return matches.length === 1 ? { ok: true, value: matches[0].value } : { ok: false, reason: "UNSUPPORTED_LOCATION" };
}

export function publicLocationSelection(location: CanonicalLocation, product: TravelProduct) {
  const { providerBindings: _bindings, providerIds: _ids, ...publicLocation } = location;
  return { ...publicLocation, providerBindings: [], selectionToken: issueLocationSelection(location, product) };
}

export function clearLocationSelectionsForTest() { cache.clear(); }
