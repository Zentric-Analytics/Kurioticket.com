import type { ActivityCursor } from "./adminIdentityActivity";

/** Batch size limits one database read, never the total visible history. */
export const COMPLETE_ACTIVITY_BATCH_SIZE = 500;
export type ActivitySourcePrefix = "j" | "s" | "r" | "e";
export type ActivitySourceRow = { id: string; createdAt: Date };

/**
 * Read every authorized matching row before the Activity page is returned.
 * Callers keep all reads inside one snapshot and retain their source predicates.
 * No browser scrolling, page cursor or fixed total limit controls this loop.
 * A failed/non-advancing read rejects the whole result rather than truncating it.
 */
export async function readCompleteActivitySource<T extends ActivitySourceRow>(
  prefix: ActivitySourcePrefix,
  fetchBatch: (after: ActivityCursor | undefined, take: number) => Promise<T[]>,
): Promise<T[]> {
  const rows: T[] = [];
  const boundaries = new Set<string>();
  let after: ActivityCursor | undefined;
  for (;;) {
    const batch = await fetchBatch(after, COMPLETE_ACTIVITY_BATCH_SIZE);
    if (!batch.length) return rows;
    const last = batch[batch.length - 1];
    if (boundaries.has(last.id)) throw new Error("Activity source did not advance");
    boundaries.add(last.id);
    rows.push(...batch);
    if (batch.length < COMPLETE_ACTIVITY_BATCH_SIZE) return rows;
    after = { id: prefix + "-" + last.id, at: last.createdAt.toISOString() };
  }
}

/**
 * Complete reads need a budget proportional to their matching source/visitor
 * batches, not the fixed deadline used by one-page reads. The preflight counts
 * are estimates for timing only: they never cap or select the returned rows.
 * Keep the timer within its supported range; no event-count limit is imposed.
 */
export function completeActivityReadTimeout(sourceCounts: number[], linkedVisitorCount: number): number {
  if (![...sourceCounts, linkedVisitorCount].every(count => Number.isSafeInteger(count) && count >= 0)) {
    throw new Error("Invalid activity read volume");
  }
  // Include the final empty read when a source fills an exact number of batches.
  const sourceBatches = sourceCounts.reduce((total, count) => total + Math.floor(count / COMPLETE_ACTIVITY_BATCH_SIZE) + 1, 0);
  const visitorBatches = Math.ceil(linkedVisitorCount / 100);
  const milliseconds = 30_000 + (sourceBatches + visitorBatches * 2) * 2_000;
  return Math.min(milliseconds, 2_147_483_647);
}
