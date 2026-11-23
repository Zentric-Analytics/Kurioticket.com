import { hasDisplayOnlyInventory } from "@/shared/presentation/sandboxInventory";
import type { LocationBoundCarSearchParams, NormalizedCarResult } from "@/lib/cars/types";

// Short-lived tab-memory snapshot only; do not persist supplier booking payloads.
const entries = new Map<string, { results: NormalizedCarResult[]; requestId: string | null; savedAt: number }>();
const MAX_AGE = 5 * 60_000;
export function carResultsReturnKey(values: LocationBoundCarSearchParams) { return JSON.stringify(values); }

export function rememberCarResultsReturn(key: string, results: NormalizedCarResult[], requestId: string | null, now = Date.now()) {
  for (const [id, value] of entries) if (now - value.savedAt >= MAX_AGE) entries.delete(id);
  entries.delete(key);
  const liveResults = results.filter(result => !hasDisplayOnlyInventory(result));
  if (results.length > 0 && liveResults.length === 0) return;
  while (entries.size >= 2) entries.delete(entries.keys().next().value!);
  entries.set(key, { results: structuredClone(liveResults), requestId, savedAt: now });
}
export function readCarResultsReturn(key: string, now = Date.now()) {
  const stored = entries.get(key);
  if (!stored || now < stored.savedAt || now - stored.savedAt >= MAX_AGE) {
    entries.delete(key);
    return null;
  }
  return { results: structuredClone(stored.results), requestId: stored.requestId };
}
