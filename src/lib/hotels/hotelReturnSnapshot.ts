import type { PublicHotelResult } from "@/lib/types";

// Browser-memory only: restore this navigation, not a shared provider cache.
// Never persist provider payloads to localStorage or extend freshness on reads.
const snapshots = new Map<string, { results: PublicHotelResult[]; expiresAt: number }>();
const TTL = 5 * 60_000;
export function rememberHotelReturnSnapshot(key: string, results: PublicHotelResult[], now = Date.now()) {
  for (const [id, entry] of snapshots) if (entry.expiresAt <= now) snapshots.delete(id);
  snapshots.delete(key);
  while (snapshots.size >= 2) snapshots.delete(snapshots.keys().next().value!);
  snapshots.set(key, { results: structuredClone(results), expiresAt: now + TTL });
}
export function readHotelReturnSnapshot(key: string, now = Date.now()) {
  const entry = snapshots.get(key);
  if (!entry || entry.expiresAt <= now) {
    snapshots.delete(key);
    return null;
  }
  return { results: structuredClone(entry.results) };
}
