export const CLIENT_FX_REVALIDATE_MS=5*60_000;
/** Honor server expiry; legacy payloads receive a bounded client revalidation window. */
export function currencySnapshotExpiry(payload:{stale?:boolean;fetchedAt:string;cacheExpiresAt?:string},receivedAt=Date.now()) {
  const fetchedAt=Date.parse(payload.fetchedAt);
  if(payload.stale || !Number.isFinite(fetchedAt) || fetchedAt>receivedAt+60_000) return receivedAt;
  const declared=payload.cacheExpiresAt ? Date.parse(payload.cacheExpiresAt) : receivedAt+CLIENT_FX_REVALIDATE_MS;
  return Number.isFinite(declared)?Math.min(declared,receivedAt+CLIENT_FX_REVALIDATE_MS):receivedAt;
}
